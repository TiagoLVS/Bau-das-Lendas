from functools import lru_cache

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.core.config import get_settings


def enable_sqlite_foreign_keys(engine):
    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, record):
        cursor = connection.cursor()
        cursor.execute('PRAGMA foreign_keys=ON')
        cursor.close()


@lru_cache
def get_engine():
    url = get_settings().database_url
    options = {'connect_args': {'connect_timeout': 5}} if url.startswith('postgresql') else {}
    engine = create_engine(url, pool_pre_ping=True, **options)
    if engine.dialect.name == 'sqlite':
        enable_sqlite_foreign_keys(engine)
    return engine


def get_db():
    with Session(get_engine(), expire_on_commit=False) as session:
        yield session
