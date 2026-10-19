# Casual LLM

Casual LLM is a local chatbot built around Hugging Face's
[`HuggingFaceTB/SmolLM2-360M-Instruct`](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct).
It runs inference on the CPU and provides a browser-based chat UI, a FastAPI
backend, and a simple terminal chat program.

## Features

- Responsive web UI with dark and light themes.
- Streaming chat responses, conversation history, and starter prompts.
- Conversation history, theme, and settings saved in the browser's
  `localStorage`.
- Assistant personas, a custom system prompt, and controls for temperature,
  top-p, maximum generated tokens, and repetition penalty.
- Markdown-style response formatting and code-copy buttons.
- FastAPI endpoints for streaming and non-streaming chat, health, and model
  information.
- Terminal chatbot in `chatbot_llm.py`.
- Optional Docker image and Windows launcher scripts.

## Requirements

- Python 3.11 recommended.
- Internet access the first time the model is loaded, to download it from
  Hugging Face.
- Enough memory and disk space for PyTorch, Transformers, and the model weights.
  CPU inference speed depends on your machine.

## Run the web app

Create and activate a virtual environment from the project directory.

### Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python run.py
```

### macOS or Linux

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python run.py
```

The app is available at <http://127.0.0.1:8000>. The first run downloads the
model, so startup may take longer. The launcher opens the browser automatically.
To start it without opening a browser:

```bash
python run.py --no-browser
```

The launcher also accepts `--host`, `--port`, and `--reload`. For example:

```bash
python run.py --host 127.0.0.1 --port 8080 --reload
```

The Windows convenience launchers `start_web.bat` and `start_web.ps1` use
`my_env\Scripts\python.exe` if present, otherwise they use `python` on `PATH`.

## Terminal chatbot

With the project dependencies installed, start the standalone terminal chat:

```bash
python chatbot_llm.py
```

Enter `exit` to quit. This CLI loads the same model directly and has its own
fixed generation settings; it does not use the web server.

## API

Interactive API documentation is available at <http://127.0.0.1:8000/docs>.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/chat` | Generate a complete response as JSON. |
| `POST` | `/api/chat/stream` | Stream response tokens as Server-Sent Events. |
| `GET` | `/api/health` | Report model loading/readiness and errors. |
| `GET` | `/api/model-info` | Report model name and default generation settings. |

Both chat endpoints accept a JSON body like:

```json
{
  "messages": [
    {"role": "user", "content": "Tell me a quick joke!"}
  ],
  "system_prompt": "You are a friendly assistant.",
  "temperature": 0.7,
  "top_p": 0.85,
  "max_new_tokens": 256,
  "repetition_penalty": 1.15
}
```

`messages` is required. The remaining fields are optional; their defaults are
shown above. The API accepts temperatures from `0` to `2`, top-p values from `0`
to `1`, `max_new_tokens` from `1` to `1024`, and repetition penalties from `1`
to `2`. The web UI exposes narrower ranges for these controls.

The non-streaming endpoint responds with:

```json
{
  "role": "assistant",
  "content": "A generated response."
}
```

The streaming endpoint responds with `text/event-stream` and sends events such
as `data: {"token": "Hello"}` followed by `data: {"done": true}`. Generation
errors are sent as an event with an `error` field.

## Docker

Build and run the image from the project root:

```bash
docker build -t casual-llm .
docker run --rm -p 8000:8000 casual-llm
```

Open <http://localhost:8000>. The Docker build downloads the model into the
image, so the image can be large. The container runs the FastAPI app on
`0.0.0.0:8000`.

## Project layout

```text
casual_llm/
├── main.py              # FastAPI app, model loading, and API endpoints
├── run.py               # Server launcher and browser opener
├── chatbot_llm.py       # Standalone terminal chatbot
├── start_web.bat        # Windows Command Prompt launcher
├── start_web.ps1        # Windows PowerShell launcher
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker image definition
├── .dockerignore        # Files excluded from Docker build context
└── static/
    ├── index.html       # Web UI markup
    ├── style.css        # Web UI styling
    └── app.js           # Browser-side chat, settings, and streaming logic
```

## Notes

- Model inference runs locally on the CPU. Chat requests are handled by this
  app; the model is not called through a hosted inference API.
- The browser stores conversation history and preferences in `localStorage`.
  Clearing browser storage removes that data.
- The API has no authentication. Keep it bound to localhost unless you have
  added appropriate access controls before exposing it to a network.
- Review the model's [Hugging Face page](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct)
  for its license and usage terms.
