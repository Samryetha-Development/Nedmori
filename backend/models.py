from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    """Aware UTC — SQLModel's default datetime column rejects naive values."""
    return datetime.now(timezone.utc)


class SubmissionBase(SQLModel):
    pid: int = Field(index=True)
    status: str
    language: str
    time: str
    memory: str
    date: str
    kind: str
    code: str


class Submission(SubmissionBase, table=True):
    id: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=utcnow, index=True)


class SubmissionRead(SubmissionBase):
    """Response shape — same fields the JSON store exposed, plus the id."""

    id: str
