# Casual LLM — SmolLM2 Chatbot & FastAPI Web UI

A modern, responsive AI chatbot powered by Hugging Face's lightweight `HuggingFaceTB/SmolLM2-360M-Instruct` language model running locally on CPU.

Casual LLM provides both an **interactive Web UI** built with HTML5, CSS3, and JavaScript, backed by a **FastAPI server** supporting real-time token-by-token streaming via Server-Sent Events (SSE), and a **minimal terminal CLI** for quick console testing.

---

## ✨ Features

- **🎨 Modern Web UI**:
  - Responsive, clean layout built with vanilla HTML, CSS, and JavaScript (no heavy build tools or Node.js required).
  - **Dark & Light Mode**: Seamless theme toggle with persisted theme preference.
  - **Real-Time Streaming**: Word-by-word streaming generation with blinking cursor and instant responsiveness.
  - **Stop Generation**: Cancel generation mid-stream with a single click.
  - **Multi-Session Chat History**: Create new chats, switch between conversations, and delete chats (stored securely in `localStorage`).
  - **Markdown & Code Rendering**: Nicely rendered markdown headings, lists, inline code, and syntax blocks with a 1-click "Copy Code" button.
  - **Inference Parameter Controls**: Live sliders for Temperature, Top-P, Max Tokens, and Repetition Penalty.
  - **Persona Presets**: Easily switch between *Cheerful & Friendly*, *Expert Coder*, *Concise & Direct*, *Creative Writer*, or custom system instructions.
  - **Starter Prompt Chips**: Quick one-click prompts on empty chats to start chatting immediately.

- **⚡ FastAPI Deployment**:
  - `POST /api/chat/stream`: Real-time streaming generation endpoint using Hugging Face's `TextIteratorStreamer` and Server-Sent Events (SSE).
  - `POST /api/chat`: Synchronous JSON endpoint for standard API requests.
  - `GET /api/health`: Health status & CPU model readiness probe.
  - `GET /api/model-info`: Returns current model name and default inference hyperparameters.
  - Interactive Swagger API documentation available at `/docs`.
  - Static file hosting mounting `/static` and root routing to the UI.

- **🐳 Production & Docker Deployment**:
  - Container-ready `Dockerfile` with multi-platform CPU compatibility.
  - 1-click Windows launcher scripts (`start_web.bat` and `start_web.ps1`).

- **💻 Original CLI Preserved**:
  - Classic terminal chat mode is still available via `chatbot_llm.py`.

---

## 📁 Project Structure

```text
casual_llm/
├── main.py              # FastAPI server (SSE streaming, endpoints, static mounts)
├── run.py               # Launcher script with auto-browser opening & CLI args
├── start_web.bat        # 1-click Windows Command Prompt launcher
├── start_web.ps1        # 1-click Windows PowerShell launcher
├── chatbot_llm.py       # Terminal CLI chatbot
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container build configuration
├── .dockerignore        # Docker build ignore patterns
├── static/              # Frontend Web UI
│   ├── index.html       # Semantic HTML layout, modals, and templates
│   ├── style.css        # Responsive CSS styling, dark/light theme variables
│   └── app.js           # Client logic: SSE streaming reader, markdown parser, history
└── README.md            # Project documentation
```

---

## 🚀 Quick Start (Local Web UI)

### 1. Activate the Project Environment

On Windows (PowerShell):
```powershell
.\my_env\Scripts\Activate.ps1
```

On Windows (Command Prompt):
```cmd
my_env\Scripts\activate.bat
```

### 2. Install Requirements

```powershell
pip install -r requirements.txt
```

### 3. Launch the Server

Run the Python launcher:
```powershell
python run.py
```

Or double-click `start_web.bat` (or run `.\start_web.ps1`).

Your browser will automatically open:
- **Web UI**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### CLI Options for `run.py`

```powershell
python run.py --host 0.0.0.0 --port 8080 --no-browser --reload
```

- `--host`: Bind address (default `127.0.0.1`).
- `--port`: Port number (default `8000`).
- `--no-browser`: Disable automatic browser opening.
- `--reload`: Enable hot-reloading for code development.

---

## 🔌 API Reference

### 1. `POST /api/chat/stream`
Streams generated tokens in real-time as Server-Sent Events (`text/event-stream`).

**Request Body**:
```json
{
  "messages": [
    {"role": "user", "content": "Tell me a quick joke!"}
  ],
  "system_prompt": "You are a very friendly assistant.",
  "temperature": 0.7,
  "top_p": 0.85,
  "max_new_tokens": 256,
  "repetition_penalty": 1.15
}
```

**SSE Event Stream**:
```text
data: {"token": "Why"}

data: {"token": " don't"}

data: {"token": " scientists"}

...

data: {"done": true}
```

### 2. `POST /api/chat`
Standard non-streaming JSON endpoint.

**Response**:
```json
{
  "role": "assistant",
  "content": "Why don't scientists trust atoms? Because they make up everything!"
}
```

### 3. `GET /api/health`
Returns health status and model availability.

**Response**:
```json
{
  "status": "ready",
  "model_name": "HuggingFaceTB/SmolLM2-360M-Instruct",
  "device": "cpu",
  "error": null
}
```

---

## 🐳 Docker Deployment

You can build and deploy the containerized application anywhere Docker is supported:

```bash
# Build the Docker image
docker build -t casual-llm .

# Run the container on port 8000
docker run -p 8000:8000 casual-llm
```

Then visit `http://localhost:8000`.

---

## ⌨️ Terminal CLI Mode

If you prefer using the command-line interface directly in your terminal, run:

```powershell
python chatbot_llm.py
```

Type `exit` to quit the session.

---

## 📄 License

This project is created for local experimentation and deployment of lightweight open-source language models. Review the `HuggingFaceTB/SmolLM2-360M-Instruct` license on Hugging Face for model usage terms.
