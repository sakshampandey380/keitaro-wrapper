import socket
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger(__name__)


def _is_postgres_reachable(host: str = "127.0.0.1", port: int = 5432, timeout: float = 0.8) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


if settings.DATABASE_URL.startswith("postgresql") and not _is_postgres_reachable():
    logger.warning(
        "PostgreSQL at localhost:5432 is currently unreachable (Docker Desktop stopped). "
        "Falling back to local SQLite database (keitaro_wrapper.db) so the app runs without interruption."
    )
    ACTIVE_DATABASE_URL = "sqlite:///./keitaro_wrapper.db"
    engine = create_engine(
        ACTIVE_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    ACTIVE_DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(
        ACTIVE_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
