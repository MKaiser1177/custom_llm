@echo off
title Casual LLM - Web UI
echo Starting Casual LLM FastAPI Server...
if exist "my_env\Scripts\python.exe" (
    my_env\Scripts\python.exe run.py %*
) else (
    python run.py %*
)
pause
