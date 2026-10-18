import sys
import os
import json
import time
import urllib.request
import urllib.error
import threading

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn
from main import app, model_state, load_model

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8899, log_level="warning")

def test_endpoints():
    print("Pre-loading model for test...")
    load_model()
    assert model_state["ready"] is True, "Model should be loaded"

    print("Starting background test server on 127.0.0.1:8899...")
    t = threading.Thread(target=run_server, daemon=True)
    t.start()

    
    url_base = "http://127.0.0.1:8899"
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"{url_base}/api/health", timeout=2) as res:
                if res.status == 200:
                    break
        except Exception:
            time.sleep(0.5)
    else:
        print("[FAIL] Server failed to start within timeout.")
        return False

    
    print("Testing GET / ...")
    req = urllib.request.Request(f"{url_base}/")
    with urllib.request.urlopen(req) as res:
        html = res.read().decode("utf-8")
        assert res.status == 200
        assert "Casual LLM" in html
        print("[PASS] GET / returned index.html correctly.")

    
    print("Testing GET /api/health ...")
    with urllib.request.urlopen(f"{url_base}/api/health") as res:
        data = json.loads(res.read().decode("utf-8"))
        assert res.status == 200
        assert data["status"] == "ready"
        print("[PASS] Health status:", data)

    
    print("Testing GET /api/model-info ...")
    with urllib.request.urlopen(f"{url_base}/api/model-info") as res:
        data = json.loads(res.read().decode("utf-8"))
        assert res.status == 200
        assert "SmolLM2" in data["model_name"]
        print("[PASS] Model info:", data["model_name"])

    
    print("Testing POST /api/chat ...")
    chat_payload = json.dumps({
        "messages": [{"role": "user", "content": "Hi! Answer with just 'Hello world!'"}],
        "max_new_tokens": 20,
        "temperature": 0.3
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{url_base}/api/chat",
        data=chat_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        result = json.loads(res.read().decode("utf-8"))
        print("[PASS] Chat response:", result)
        assert "content" in result
        assert len(result["content"]) > 0

    
    print("Testing POST /api/chat/stream ...")
    stream_payload = json.dumps({
        "messages": [{"role": "user", "content": "Count from 1 to 3."}],
        "max_new_tokens": 20,
        "temperature": 0.3
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{url_base}/api/chat/stream",
        data=stream_payload,
        headers={"Content-Type": "application/json"}
    )
    tokens = []
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        assert "text/event-stream" in res.headers.get("Content-Type", "")
        for line in res:
            line_str = line.decode("utf-8").strip()
            if line_str.startswith("data:"):
                raw_json = line_str[5:].strip()
                if raw_json:
                    parsed = json.loads(raw_json)
                    if "token" in parsed:
                        tokens.append(parsed["token"])
    full_stream_text = "".join(tokens)
    print("[PASS] Streamed output:", full_stream_text)
    assert len(tokens) > 0, "Expected at least 1 streaming token"

    print("\nALL 5 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    success = test_endpoints()
    if not success:
        sys.exit(1)
