from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from . import config

__all__ = ["connect", "query", "one", "run", "init_schema", "Jsonb"]


@contextmanager
def connect():
    with psycopg.connect(config.DATABASE_URL, row_factory=dict_row, autocommit=True) as conn:
        yield conn


def query(sql, params=None):
    with connect() as c:
        return c.execute(sql, params or ()).fetchall()


def one(sql, params=None):
    with connect() as c:
        return c.execute(sql, params or ()).fetchone()


def run(sql, params=None):
    with connect() as c:
        c.execute(sql, params or ())


def init_schema():
    with connect() as c:
        c.execute((Path(__file__).parent / "schema.sql").read_text())
        c.execute((Path(__file__).parent / "schema_extras.sql").read_text())


def log_run(agent, summary, patient_id=None, document_id=None, status="done", actor="AI helper", saved=False):
    run(
        "INSERT INTO agent_run (agent, patient_id, document_id, summary, status, actor, saved_run) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (agent, patient_id, document_id, summary, status, actor, saved),
    )
