"""Nedmori local API: problem metadata is served as JSON, submissions live in SQLite.

Rendering happens in the browser, so this service only validates and stores.
"""

from __future__ import annotations

import json
import os
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from starlette.exceptions import HTTPException as StarletteHTTPException

from db import build_engine, create_db_and_tables
from models import Submission, SubmissionRead

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT / "backend" / "data" / "nedmori.db"
PROBLEM_IDS = {problem["id"] for problem in json.loads((ROOT / "data" / "problems.json").read_text("utf8"))}

LANGUAGES = ("C++ 17", "Python 3", "Java 17")
MAX_CODE_CHARS = 200_000
MAX_BODY_BYTES = 1_000_000


async def read_json(request: Request) -> dict:
    """Read a JSON object body, refusing to buffer more than MAX_BODY_BYTES."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
        raise HTTPException(413, "Request body too large")
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BODY_BYTES:
            raise HTTPException(413, "Request body too large")
        chunks.append(chunk)
    raw = b"".join(chunks)
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON") from None
    return parsed if isinstance(parsed, dict) else {}


def create_app(database_url: str | None = None) -> FastAPI:
    url = database_url or os.environ.get("NEDMORI_DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    engine = build_engine(url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        create_db_and_tables(engine)
        yield

    app = FastAPI(title="nedmori-api", lifespan=lifespan)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True, "service": "nedmori-api"}

    @app.get("/api/submissions", response_model=list[SubmissionRead])
    def list_submissions(problem_id: int | None = Query(default=None, alias="problemId")):
        with Session(engine) as session:
            statement = select(Submission).order_by(Submission.created_at.desc())
            if problem_id and problem_id > 0:
                statement = statement.where(Submission.pid == problem_id)
            return session.exec(statement).all()

    @app.post("/api/submissions", response_model=SubmissionRead, status_code=201)
    async def create_submission(request: Request):
        payload = await read_json(request)
        pid = payload.get("pid")
        language = payload.get("language")
        code = payload.get("code")

        if pid not in PROBLEM_IDS:
            raise HTTPException(400, "Unknown problem")
        if language not in LANGUAGES:
            raise HTTPException(400, "Unsupported language")
        if not isinstance(code, str) or not code.strip() or len(code) > MAX_CODE_CHARS:
            raise HTTPException(400, "Code must contain 1-200000 characters")

        record = Submission(
            id=f"N{int(time.time() * 1000)}-{secrets.token_hex(2)}",
            pid=pid,
            status="Pending",
            language=language,
            time="—",
            memory="—",
            date=datetime.now().strftime("%m-%d %H:%M"),
            kind="server",
            code=code,
        )
        with Session(engine) as session:
            session.add(record)
            session.commit()
            session.refresh(record)
        return record

    return app


app = create_app()
