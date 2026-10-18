import os
import json
import asyncio
import threading
import warnings
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

warnings.filterwarnings("ignore")

MODEL_NAME = "HuggingFaceTB/SmolLM2-360M-Instruct"


model_state = {
    "model": None,
    "tokenizer": None,
    "lock": threading.Lock(),
    "ready": False,
    "error": None
}

def load_model():
    """Loads tokenizer and model into CPU memory."""
    try:
        print(f"Loading model '{MODEL_NAME}' on CPU...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.unk_token or tokenizer.eos_token

        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            device_map="cpu",
            torch_dtype=torch.float32,
        )
        model.eval()

        model_state["tokenizer"] = tokenizer
        model_state["model"] = model
        model_state["ready"] = True
        print(f"Model '{MODEL_NAME}' loaded successfully.")
    except Exception as e:
        model_state["error"] = str(e)
        print(f"Error loading model: {e}")
        raise e

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    load_thread = threading.Thread(target=load_model, daemon=True)
    load_thread.start()
    yield
    

app = FastAPI(
    title="Casual LLM API",
    description="FastAPI backend for SmolLM2-360M-Instruct with interactive Web UI",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")

class ChatRequest(BaseModel):
    messages: List[Message]
    system_prompt: Optional[str] = "You are a very friendly and cheerful assistant. Always respond in a warm, casual, and encouraging tone."
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(default=0.85, ge=0.0, le=1.0)
    max_new_tokens: Optional[int] = Field(default=256, ge=1, le=1024)
    repetition_penalty: Optional[float] = Field(default=1.15, ge=1.0, le=2.0)


def prepare_messages(req: ChatRequest) -> List[dict]:
    formatted_messages = []
    
    
    if req.system_prompt:
        formatted_messages.append({"role": "system", "content": req.system_prompt})
        
    for msg in req.messages:
        if msg.role in ["user", "assistant"]:
            formatted_messages.append({"role": msg.role, "content": msg.content})

    
    if len(formatted_messages) > 11:
        formatted_messages = [formatted_messages[0]] + formatted_messages[-10:]

    return formatted_messages


@app.get("/api/health")
async def health_check():
    return {
        "status": "ready" if model_state["ready"] else ("error" if model_state["error"] else "loading"),
        "model_name": MODEL_NAME,
        "device": "cpu",
        "error": model_state["error"]
    }

@app.get("/api/model-info")
async def model_info():
    return {
        "model_name": MODEL_NAME,
        "default_system_prompt": "You are a very friendly and cheerful assistant. Always respond in a warm, casual, and encouraging tone.",
        "defaults": {
            "temperature": 0.7,
            "top_p": 0.85,
            "max_new_tokens": 256,
            "repetition_penalty": 1.15,
        },
        "status": "ready" if model_state["ready"] else "loading"
    }

@app.post("/api/chat")
async def chat_sync(req: ChatRequest):
    if not model_state["ready"]:
        if model_state["error"]:
            raise HTTPException(status_code=500, detail=f"Model failed to load: {model_state['error']}")
        raise HTTPException(status_code=503, detail="Model is still loading. Please wait a moment.")

    tokenizer = model_state["tokenizer"]
    model = model_state["model"]

    messages = prepare_messages(req)

    def generate_response():
        with model_state["lock"]:
            tokenized = tokenizer.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=True,
                return_tensors="pt",
                return_dict=True,
                max_length=512,
                truncation=True
            )
            with torch.inference_mode():
                outputs = model.generate(
                    tokenized["input_ids"],
                    attention_mask=tokenized["attention_mask"],
                    max_new_tokens=req.max_new_tokens,
                    temperature=max(req.temperature, 0.01),
                    top_p=req.top_p,
                    do_sample=req.temperature > 0,
                    repetition_penalty=req.repetition_penalty,
                    no_repeat_ngram_size=3,
                    pad_token_id=tokenizer.pad_token_id
                )
                generated_tokens = outputs[0][tokenized["input_ids"].shape[-1]:]
                return tokenizer.decode(generated_tokens, skip_special_tokens=True)

    loop = asyncio.get_running_loop()
    response_text = await loop.run_in_executor(None, generate_response)
    return {"role": "assistant", "content": response_text.strip()}

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    if not model_state["ready"]:
        if model_state["error"]:
            raise HTTPException(status_code=500, detail=f"Model failed to load: {model_state['error']}")
        raise HTTPException(status_code=503, detail="Model is still loading. Please wait a moment.")

    tokenizer = model_state["tokenizer"]
    model = model_state["model"]

    messages = prepare_messages(req)

    tokenized = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
        return_dict=True,
        max_length=512,
        truncation=True
    )

    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

    generation_kwargs = dict(
        input_ids=tokenized["input_ids"],
        attention_mask=tokenized["attention_mask"],
        streamer=streamer,
        max_new_tokens=req.max_new_tokens,
        temperature=max(req.temperature, 0.01),
        top_p=req.top_p,
        do_sample=req.temperature > 0,
        repetition_penalty=req.repetition_penalty,
        no_repeat_ngram_size=3,
        pad_token_id=tokenizer.pad_token_id
    )

    async def sse_event_generator():
        
        model_state["lock"].acquire()
        try:
            thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
            thread.daemon = True
            thread.start()

            for token in streamer:
                
                data = json.dumps({"token": token})
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.001)

            
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"
        finally:
            if model_state["lock"].locked():
                model_state["lock"].release()

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"message": "Casual LLM API is running. UI not found in static/index.html."})
