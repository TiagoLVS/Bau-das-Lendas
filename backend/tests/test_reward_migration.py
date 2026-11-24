from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from sqlalchemy import create_engine, select, func, text, inspect
from sqlalchemy.orm import Session

from app.models import DailyReward, DrawRequest, User, UserCard, Legend
from app.services.catalog import seed_catalog, legend_data
from app.services.collection import draw, reward_status, history
from conftest import ROOT


def test_incremental_migration_preserves_multiple_legacy_successes(engine, tmp_path, monkeypatch):
    schema = None
    if engine.dialect.name == 'postgresql':
        schema = 'legacy_' + uuid4().hex
        with engine.begin() as c: c.execute(text(f'CREATE SCHEMA {schema}'))
        legacy = create_engine(engine.url, connect_args={'options': f'-csearch_path={schema}'})
    else:
        legacy = create_engine(f'sqlite:///{tmp_path / "legacy.db"}')
        from app.db.session import enable_sqlite_foreign_keys
        enable_sqlite_foreign_keys(legacy)
    config = Config(str(ROOT / 'alembic.ini'))
    config.set_main_option('script_location', str(ROOT / 'alembic'))
    try:
        with legacy.begin() as c:
            config.attributes['connection'] = c
            command.upgrade(config, '0001')
        stamp = datetime(2026, 11, 20, 12, tzinfo=timezone.utc)
        with Session(legacy) as db, db.begin():
            seed_catalog(db)
            user = User(username='Legado', email='legacy@example.com', password_hash='test-only-unused')
            db.add(user);db.flush();uid = user.id
            legends = list(db.scalars(select(Legend).order_by(Legend.numero).limit(2)))
            snapshot = {'id': 'old-success', 'legend': legend_data(legends[0]), 'complete': False}
            first = DrawRequest(user_id=uid, legend_id=legends[0].id, idempotency_key='old-1', result=snapshot, created_at=stamp)
            second = DrawRequest(user_id=uid, legend_id=legends[1].id, idempotency_key='old-2', result={'legend': legend_data(legends[1])}, created_at=stamp+timedelta(hours=1))
            empty = DrawRequest(user_id=uid, legend_id=None, idempotency_key='old-empty', result={'legend': None}, created_at=stamp-timedelta(days=1))
            db.add_all([first, second, empty]);db.flush();first_id=first.id
            db.add_all(UserCard(user_id=uid, legend_id=l.id, collected_at=stamp) for l in legends)
        with legacy.begin() as c:
            config.attributes['connection'] = c
            command.upgrade(config, 'head')
        monkeypatch.setattr('app.services.collection.utc_now', lambda: stamp+timedelta(hours=2))
        with Session(legacy) as db:
            assert db.scalar(select(func.count()).select_from(User)) == 1
            assert db.scalar(select(func.count()).select_from(UserCard)) == 2
            assert db.scalar(select(func.count()).select_from(DrawRequest)) == 3
            assert db.scalar(select(func.count()).select_from(DailyReward)) == 0
            assert reward_status(db, uid)['today_reward']['id'] == first_id
            assert draw(db, uid, 'old-1') == snapshot
            with pytest.raises(HTTPException) as blocked: draw(db, uid, 'new-key')
            assert blocked.value.status_code == 409
            db.rollback()
            rows = history(db, uid, 10, 0)['items']
            assert len(rows) == 3 and all(r['is_new'] is None for r in rows)
            assert sum(r['successful'] for r in rows) == 2
            # Registro antigo sem carta não consome recompensa daquele dia.
            assert reward_status(db, uid, stamp-timedelta(days=1))['available']
        monkeypatch.setattr('app.services.collection.utc_now', lambda: stamp+timedelta(days=1))
        with Session(legacy) as db, db.begin():
            assert draw(db, uid, 'old-1') == snapshot
            assert reward_status(db, uid)['available']
            assert draw(db, uid, 'new-day')['is_new']
        with Session(legacy) as db:
            assert db.scalar(select(func.count()).select_from(DrawRequest)) == 4
            assert db.scalar(select(func.count()).select_from(UserCard)) == 3
    finally:
        legacy.dispose()
        if schema:
            with engine.begin() as c: c.execute(text(f'DROP SCHEMA {schema} CASCADE'))
