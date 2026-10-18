# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download SmolLM2 model so container starts instantly without waiting at runtime
RUN python -c "from transformers import AutoModelForCausalLM, AutoTokenizer; m='HuggingFaceTB/SmolLM2-360M-Instruct'; AutoTokenizer.from_pretrained(m); AutoModelForCausalLM.from_pretrained(m)"

# Copy application files
COPY main.py .
COPY run.py .
COPY chatbot_llm.py .
COPY static/ static/

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
