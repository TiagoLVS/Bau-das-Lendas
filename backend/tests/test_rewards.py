from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.core.security import new_id
from app.models import DailyReward, DrawRequest, Legend, User, UserCard
from app.services.collection import reward_status, history
from conftest import HEADERS, ROOT, register


def open_reward(client, key='first', endpoint='/api/rewards/open', **options):
    return client.post(endpoint, headers={'Idempotency-Key': key}, **options)


def test_daily_status_boundaries_and_idempotency(client, engine, reward_clock):
    register(client)
    # 02:59:59 UTC é 23:59:59 do dia anterior em São Paulo.
    reward_clock[0] = datetime(2026, 11, 21, 2, 59, 59, tzinfo=timezone.utc)
    status = client.get('/api/rewards/status').json()
    assert status['available'] and status['local_date'] == '2026-11-20'
    assert status['next_available_at'] == '2026-11-21T03:00:00+00:00'
    first = open_reward(client).json()
    assert first['is_new'] and not first['is_duplicate']
    for endpoint in ['/api/draws', '/api/rewards/open']:
        blocked = open_reward(client, 'different', endpoint)
        assert blocked.status_code == 409
        assert blocked.json()['detail']['code'] == 'DAILY_REWARD_USED'
    assert client.get('/api/rewards/status').json()['today_reward']['id'] == first['id']
    reward_clock[0] += timedelta(seconds=1)
    assert open_reward(client).json() == first  # Retry antigo não consome o novo dia.
    assert client.get('/api/rewards/status').json()['available']
    second = open_reward(client, 'second').json()
    assert second['reward_date'] == '2026-11-21' and second['legend']['id'] != first['legend']['id']
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(DailyReward)) == 2
        assert db.scalar(select(func.count()).select_from(UserCard)) == 2


def test_server_time_and_user_are_not_client_parameters(client, reward_clock):
    register(client)
    assert open_reward(client, 'spoof', json={'date': '2099-01-01', 'user_id': str(uuid4())}).status_code == 422
    assert open_reward(client, 'valid').status_code == 200
    assert open_reward(client, 'query', params={'date': '2099-01-01'}).status_code == 409
    assert client.get('/api/rewards/status', params={'user_id': str(uuid4()), 'date': '2099-01-01'}).json()['available'] is False


def test_daily_history_is_private_and_paginated(client, reward_clock):
    a = register(client)
    cookie_a = dict(client.cookies)
    for i in range(3):
        assert open_reward(client, f'day-{i}').status_code == 200
        reward_clock[0] += timedelta(days=1)
    page1 = client.get('/api/rewards/history?limit=2').json()
    page2 = client.get('/api/rewards/history?limit=2&offset=2').json()
    assert page1['total'] == 3 and page1['has_more'] and len(page1['items']) == 2
    assert len(page2['items']) == 1 and not page2['has_more']
    assert page1['items'][0]['claimed_at'] > page1['items'][1]['claimed_at']
    assert all(row['is_new'] is True and not row['legacy'] for row in page1['items'])
    assert client.get('/api/rewards/history?limit=51').status_code == 422
    assert client.get('/api/rewards/history?offset=-1').status_code == 422
    register(client, 'other@example.com')
    assert client.get('/api/rewards/history', params={'user_id': a['id']}).json()['total'] == 0
    assert client.get('/api/rewards/status').json()['available']
    assert open_reward(client, 'day-0').status_code == 200  # Mesma chave, outro dono.
    client.post('/api/auth/logout')
    for path in ['/api/rewards/status', '/api/rewards/history']:
        assert client.get(path).status_code == 401
    assert open_reward(client).status_code == 401


def test_last_card_and_repeated_reward_preserve_album(client, engine, reward_clock):
    user = register(client)
    with Session(engine) as db, db.begin():
        legends = list(db.scalars(select(Legend).order_by(Legend.numero)))
        db.add_all(UserCard(user_id=user['id'], legend_id=l.id) for l in legends[:59])
        last = legends[-1].id
    result = open_reward(client).json()
    assert result['legend']['id'] == last and result['is_new'] and result['complete']
    reward_clock[0] += timedelta(days=1)
    repeated = open_reward(client, 'repeat').json()
    assert repeated['is_duplicate'] and repeated['is_new'] is False
    assert repeated['progress']['obtained'] == 60
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(UserCard)) == 60
        assert db.scalar(select(func.count()).select_from(DailyReward)) == 2
    assert client.get('/api/rewards/history').json()['items'][0]['is_new'] is False


def test_missing_catalog_never_consumes_reward(client, engine):
    register(client)
    with Session(engine) as db, db.begin():
        db.query(Legend).delete()
    assert open_reward(client).status_code == 503
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(DailyReward)) == 0
        assert db.scalar(select(func.count()).select_from(DrawRequest)) == 0


def test_rollback_after_partial_writes_preserves_availability(client, engine):
    register(client)
    def fail(*_):
        raise OperationalError('test', {}, Exception('test failure'))
    event.listen(DailyReward, 'before_insert', fail)
    try:
        assert open_reward(client).status_code == 503
    finally:
        event.remove(DailyReward, 'before_insert', fail)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(UserCard)) == 0
        assert db.scalar(select(func.count()).select_from(DrawRequest)) == 0
        assert db.scalar(select(func.count()).select_from(DailyReward)) == 0
    assert client.get('/api/rewards/status').json()['available']
    assert open_reward(client).status_code == 200


def test_daily_database_constraint(client, engine, reward_clock):
    user = register(client)
    result = open_reward(client).json()
    with Session(engine) as db:
        original = db.scalar(select(DailyReward))
        other = DrawRequest(user_id=user['id'], legend_id=original.legend_id, idempotency_key='other', result={})
        db.add(other);db.flush()
        db.add(DailyReward(user_id=user['id'], legend_id=original.legend_id, reward_date=original.reward_date,
                          claimed_at=reward_clock[0], draw_request_id=other.id, is_new=False))
        with pytest.raises(IntegrityError): db.commit()


def test_partial_catalog_does_not_consume_daily_reward(client, engine):
    register(client)
    with Session(engine) as db, db.begin():
        last = db.scalar(select(Legend).order_by(Legend.numero.desc()))
        db.delete(last)
    assert open_reward(client).status_code == 503
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(DailyReward)) == 0


def test_timestamp_is_captured_after_lock_at_midnight(client, engine, monkeypatch):
    user = register(client)
    # Evento do engine muda o relógio quando a consulta de lock já terminou.
    stamp = [datetime(2026, 11, 21, 2, 59, 59, tzinfo=timezone.utc)]
    monkeypatch.setattr('app.services.collection.utc_now', lambda: stamp[0])
    def after_lock(conn, cursor, statement, parameters, context, executemany):
        compiled_statement = getattr(context.compiled, 'statement', None)
        if getattr(compiled_statement, '_for_update_arg', None) is not None:
            stamp[0] = datetime(2026, 11, 21, 3, 0, tzinfo=timezone.utc)
    event.listen(engine, 'after_cursor_execute', after_lock)
    try: result = open_reward(client).json()
    finally: event.remove(engine, 'after_cursor_execute', after_lock)
    assert result['reward_date'] == '2026-11-21'


def test_concurrent_legacy_and_new_endpoints_share_daily_lock(client, app, engine):
    if engine.dialect.name != 'postgresql':
        pytest.skip('Concorrência validada exclusivamente no PostgreSQL real.')
    register(client)
    cookies = dict(client.cookies)
    barrier = Barrier(8)
    def send(i):
        with TestClient(app, headers=HEADERS, cookies=cookies) as other:
            barrier.wait(timeout=20)
            result = open_reward(other, f'parallel-{i}', '/api/draws' if i % 2 else '/api/rewards/open')
            return result.status_code
    with ThreadPoolExecutor(max_workers=8) as pool: codes = list(pool.map(send, range(8)))
    assert codes.count(200) == 1 and codes.count(409) == 7
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(DailyReward)) == 1
        assert db.scalar(select(func.count()).select_from(DrawRequest)) == 1
        assert db.scalar(select(func.count()).select_from(UserCard)) == 1


def test_expired_session_cannot_read_or_claim_rewards(client, engine):
    from app.models import AuthSession
    register(client)
    with Session(engine) as db, db.begin():
        db.scalar(select(AuthSession)).expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    assert open_reward(client).status_code == 401
    assert client.get('/api/rewards/status').status_code == 401
    assert client.get('/api/rewards/history').status_code == 401
