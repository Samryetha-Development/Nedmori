from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from main import create_app

SUBMISSION = {"pid": 1002, "language": "Python 3", "code": "print(3)"}


@pytest.fixture
def client():
    with TestClient(create_app("sqlite://")) as test_client:
        yield test_client


def post(client, **overrides):
    return client.post("/api/submissions", json={**SUBMISSION, **overrides})


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True, "service": "nedmori-api"}


def test_submission_lifecycle(client):
    created = post(client)

    assert created.status_code == 201
    record = created.json()
    assert record["status"] == "Pending"
    assert record["kind"] == "server"
    assert record["code"] == "print(3)"
    assert record["pid"] == 1002
    assert "created_at" not in record

    listed = client.get("/api/submissions").json()
    assert [item["id"] for item in listed] == [record["id"]]


def test_lists_newest_first_and_filters_by_problem(client):
    first = post(client, pid=1002).json()
    second = post(client, pid=1004).json()

    assert [item["id"] for item in client.get("/api/submissions").json()] == [second["id"], first["id"]]
    assert [item["id"] for item in client.get("/api/submissions", params={"problemId": 1002}).json()] == [first["id"]]
    assert client.get("/api/submissions", params={"problemId": 0}).json() != []


def test_rejects_unknown_problem(client):
    response = post(client, pid=9999)

    assert response.status_code == 400
    assert response.json() == {"error": "Unknown problem"}


def test_rejects_unsupported_language(client):
    response = post(client, language="Rust")

    assert response.status_code == 400
    assert response.json() == {"error": "Unsupported language"}


@pytest.mark.parametrize("code", ["", "   ", "x" * 200_001])
def test_rejects_bad_code(client, code):
    response = post(client, code=code)

    assert response.status_code == 400
    assert response.json() == {"error": "Code must contain 1-200000 characters"}


def test_rejects_invalid_json(client):
    response = client.post("/api/submissions", content=b"{not json", headers={"content-type": "application/json"})

    assert response.status_code == 400
    assert response.json() == {"error": "Invalid JSON"}


def test_rejects_oversized_body(client):
    response = client.post(
        "/api/submissions",
        content=b"x" * 1_100_000,
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json() == {"error": "Request body too large"}


def test_keeps_every_submission_when_requests_arrive_concurrently(tmp_path):
    with TestClient(create_app(f"sqlite:///{tmp_path / 'submissions.db'}")) as concurrent:
        with ThreadPoolExecutor(max_workers=8) as pool:
            responses = list(pool.map(lambda index: post(concurrent, code=f"// {index}"), range(8)))

        assert [response.status_code for response in responses] == [201] * 8
        assert len(concurrent.get("/api/submissions").json()) == 8
