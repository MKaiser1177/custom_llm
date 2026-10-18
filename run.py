import argparse
import sys
import webbrowser
import threading
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn

def open_browser_after_delay(url: str, delay: float = 1.5):
    """Opens browser after server starts."""
    def _open():
        time.sleep(delay)
        webbrowser.open(url)
    threading.Thread(target=_open, daemon=True).start()

def main():
    parser = argparse.ArgumentParser(description="Start the Casual LLM FastAPI Web UI")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host IP to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    parser.add_argument("--no-browser", action="store_true", help="Do not open browser automatically")

    args = parser.parse_args()

    url = f"http://{args.host}:{args.port}"
    print("=" * 60)
    print("  Casual LLM - SmolLM2-360M FastAPI Server")
    print(f"  Web UI:   {url}")
    print(f"  API Docs: {url}/docs")
    print("=" * 60)

    if not args.no_browser:
        open_browser_after_delay(url)

    uvicorn.run("main:app", host=args.host, port=args.port, reload=args.reload)

if __name__ == "__main__":
    main()
