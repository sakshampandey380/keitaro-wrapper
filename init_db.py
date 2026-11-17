"""
Database initialization & migration helper script.
1. Connects to PostgreSQL default 'postgres' database and creates 'keitaro_wrapper' if it doesn't exist.
2. Runs `alembic upgrade head` programmatically to ensure all tables and indexes are up-to-date.
"""
import sys
from urllib.parse import urlparse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from alembic.config import Config
from alembic import command
from app.config import settings


def ensure_database_exists() -> None:
    parsed = urlparse(settings.DATABASE_URL.replace("+psycopg2", ""))
    db_name = parsed.path.lstrip("/") or "keitaro_wrapper"
    user = parsed.username or "postgres"
    password = parsed.password or "postgres"
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    print(f"[init_db] Checking PostgreSQL server at {host}:{port} for database '{db_name}'...")
    conn = psycopg2.connect(
        dbname="postgres",
        user=user,
        password=password,
        host=host,
        port=port,
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
    exists = cur.fetchone()
    if not exists:
        print(f"[init_db] Creating database '{db_name}'...")
        cur.execute(f'CREATE DATABASE "{db_name}"')
        print(f"[init_db] Database '{db_name}' created successfully.")
    else:
        print(f"[init_db] Database '{db_name}' already exists.")

    cur.close()
    conn.close()


def run_migrations() -> None:
    print("[init_db] Running Alembic migrations (`alembic upgrade head`)...")
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(alembic_cfg, "head")
    print("[init_db] Migrations applied successfully!")


if __name__ == "__main__":
    try:
        ensure_database_exists()
        run_migrations()
    except Exception as exc:
        print(f"[init_db] ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
