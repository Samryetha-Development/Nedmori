#!/usr/bin/env python3
"""Start the Nedmori dev stack: FastAPI on 127.0.0.1:8787 and Vite on 127.0.0.1:3000.

Python counterpart to dev.mjs — Ctrl-C stops both.
"""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent

API = ("uv", ["run", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8787"])
WEB = ("pnpm", ["exec", "vite", "--host", "127.0.0.1", "--port", "3000", "--strictPort"])


def command(tool: str, args: list[str]) -> list[str]:
    """Resolve tool on PATH, wrapping Windows .cmd/.bat shims with cmd /c."""
    path = shutil.which(tool)
    if path is None:
        sys.exit(f"bootstrap: '{tool}' not found on PATH")
    if os.name == "nt" and path.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c", path, *args]
    return [path, *args]


def spawn(tool: str, args: list[str], cwd: Path) -> subprocess.Popen:
    # A fresh process group lets us signal the tools' own children (reloaders, workers).
    return subprocess.Popen(command(tool, args), cwd=cwd, start_new_session=os.name != "nt")


def terminate(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if os.name == "nt":
            proc.terminate()
        else:
            os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass


def stop_all(procs: list[subprocess.Popen]) -> None:
    for proc in procs:
        terminate(proc)
    for proc in procs:
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


def main() -> int:
    procs = [spawn(*API, cwd=ROOT / "backend"), spawn(*WEB, cwd=ROOT)]
    print("bootstrap: api http://127.0.0.1:8787  web http://127.0.0.1:3000  (Ctrl-C to stop)", flush=True)

    stopping = False

    def handle(_signum, _frame) -> None:
        nonlocal stopping
        if stopping:
            return
        stopping = True
        stop_all(procs)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle)
    signal.signal(signal.SIGTERM, handle)

    while True:
        if all(proc.poll() is not None for proc in procs):
            return 0
        for proc in procs:
            code = proc.poll()
            if code:  # one side died — take the other down with it
                stop_all(procs)
                return code
        time.sleep(0.2)


if __name__ == "__main__":
    raise SystemExit(main())
