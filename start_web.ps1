
Write-Host "Starting Casual LLM FastAPI Server..." -ForegroundColor Cyan

$pythonExe = Join-Path $PSScriptRoot "my_env\Scripts\python.exe"

if (Test-Path $pythonExe) {
    & $pythonExe (Join-Path $PSScriptRoot "run.py") $args
} else {
    python (Join-Path $PSScriptRoot "run.py") $args
}
