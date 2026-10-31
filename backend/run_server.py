import uvicorn
import sys
import os

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("Starting uvicorn on http://0.0.0.0:8000 ...", flush=True)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, log_level="info")
