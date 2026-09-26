# Casual LLM Chatbot

A lightweight local chatbot that runs a small instruction-tuned language model from Hugging Face in the terminal. The app loads `HuggingFaceTB/SmolLM2-360M-Instruct`, keeps a short chat history, and generates warm, casual responses based on your prompts.

## What this project does

This project is a minimal command-line chat interface built with:

- Python
- Hugging Face `transformers`
- PyTorch
- A local model downloaded from Hugging Face

It is designed for experimenting with small open-source LLMs without needing a web UI or remote API.

## Project files

- `chatbot_llm.py` — main chatbot script
- `my_env/` — local virtual environment with Python dependencies

## Requirements

Before running the chatbot, make sure you have:

- Python 3.11
- Internet access to download the Hugging Face model on first run
- A machine capable of running a ~360M parameter model in CPU mode

## Setup

### 1. Open a terminal in the project folder

From the project root:

```powershell
cd "C:\Users\Vedant Agrawal\Desktop\casual_llm"
```

### 2. Use the project virtual environment

The workspace already includes a local environment in `my_env/`.

```powershell
.\my_env\Scripts\Activate.ps1
```

If you are using Command Prompt instead of PowerShell:

```cmd
my_env\Scripts\activate.bat
```

### 3. Install or verify dependencies

If needed, install the required packages:

```powershell
python -m pip install transformers torch
```

This project uses the Hugging Face `transformers` library and PyTorch.

## Run the chatbot

Start the app with:

```powershell
python chatbot_llm.py
```

You will see output similar to:

```text
Loading model...
Chatbot started. Type 'exit' to quit.
> 
```

Then type a message and press Enter. The model will respond in the terminal.

## How it works

The script does the following:

1. Loads the `SmolLM2-360M-Instruct` tokenizer and model.
2. Sets a friendly system prompt.
3. Keeps the last few messages as context to maintain a short conversation history.
4. Encodes the prompt with `apply_chat_template`.
5. Generates a response with `model.generate(...)`.
6. Prints the generated answer to the console.

The loop continues until you type:

```text
exit
```

## Example interaction

```text
> Hello there!
Bot: Hi! It’s great to meet you. How can I help today?

> Tell me a fun fact about Python.
Bot: Python is a very beginner-friendly language, and it’s used in everything from automation to AI research.
```

## Notes and customization

You can customize the behavior by editing `chatbot_llm.py`:

- Change the model name
- Modify the system prompt
- Adjust generation settings like:
  - `max_new_tokens`
  - `temperature`
  - `top_p`
  - `repetition_penalty`
- Change the number of recent messages kept in history

## Troubleshooting

### Model download is slow

The first run downloads the model files from Hugging Face. This may take a few minutes depending on your internet speed.

### CUDA or GPU issues

This script is configured to run on CPU using:

```python
device_map="cpu"
```

If you want to try GPU execution later, you can update the model loading code accordingly.

### Runtime errors from missing packages

If Python reports missing imports, reinstall the dependencies:

```powershell
python -m pip install transformers torch
```

## License

This project is intended for local experimentation and learning. If you plan to use it in a production or public-facing setting, review the model license and the Hugging Face terms for the specific model you download.

## Summary

This is a simple personal/local LLM chatbot for learning, prototyping, and experimenting with small transformer models directly from your terminal.
