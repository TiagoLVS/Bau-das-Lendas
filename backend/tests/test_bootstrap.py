import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi.testclient import TestClient

from conftest import HEADERS


def test_legacy_entry_is_the_complete_api():
    from main import app as legacy
    from app.main import app
    assert legacy is app
    paths = app.openapi()['paths']
    assert {'/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/logout',
            '/api/auth/me', '/api/legends', '/api/album', '/api/draws'} <= paths.keys()


def test_sqlite_enforces_foreign_keys(engine):
    if engine.dialect.name == 'sqlite':
        with engine.connect() as connection:
            assert connection.execute(text('PRAGMA foreign_keys')).scalar() == 1
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(text("INSERT INTO user_cards (id, user_id, legend_id, collected_at) VALUES ('invalid-fk', 'missing-user', 'missing-legend', CURRENT_TIMESTAMP)"))


def test_collection_survives_new_app_instance(client, app, engine):
    from app.main import create_app
    from app.db.session import get_db
    from conftest import register
    user = register(client)
    result = client.post('/api/draws', headers={'Idempotency-Key': 'persist-restart'}).json()
    replacement = create_app()
    replacement.dependency_overrides[get_db] = app.dependency_overrides[get_db]
    with TestClient(replacement, headers=HEADERS) as second:
        second.cookies.update(client.cookies)
        assert second.get('/api/auth/me').json()['id'] == user['id']
        album = second.get('/api/album').json()
        assert album['progress']['obtained'] == 1
        assert next(p['legend']['id'] for p in album['positions'] if p['unlocked']) == result['legend']['id']

        assert second.get('/api/rewards/status').json()['available'] is False
        assert second.post('/api/rewards/open', headers={'Idempotency-Key': 'after-restart'}).status_code == 409
