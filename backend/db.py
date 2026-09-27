from pathlib import Path

from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, create_engine


def build_engine(database_url: str):
    """Create the SQLModel engine, keeping an in-memory database on one connection."""
    if database_url == "sqlite://":
        return create_engine(
            database_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    if database_url.startswith("sqlite:///"):
        Path(database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(database_url)


def create_db_and_tables(engine) -> None:
    SQLModel.metadata.create_all(engine)
