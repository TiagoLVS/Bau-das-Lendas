from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limit import RateLimiter
from app.core.security import COOKIE_NAME
from app.models import AuthSession, User
from conftest import HEADERS, register


def test_limiter_expiry_capacity_and_concurrent_requests():
    now = [0.0]
    limiter = RateLimiter(clock=lambda: now[0], capacity=1)
    def attempt(_):
        try:
            limiter.check('test', 'same-client', 5, 10)
            return True
        except HTTPException as error:
            assert error.status_code == 429 and error.headers['Retry-After'] == '10'
            return False
    with ThreadPoolExecutor(max_workers=16) as pool:
        assert sum(pool.map(attempt, range(32))) == 5
    with pytest.raises(HTTPException):
        limiter.check('test', 'other-client', 5, 10)
    now[0] = 10
    limiter.check('test', 'other-client', 5, 10)
    assert len(limiter.buckets) == 1


def test_login_register_rate_limits_and_spoofed_forwarded_header(client, app, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, 'rate_login_limit', 2)
    monkeypatch.setattr(settings, 'rate_register_limit', 2)
    now = [0.0]
    app.state.rate_limiter.clock = lambda: now[0]
    for route in ['login', 'register']:
        for i in range(2):
            assert client.post(f'/api/auth/{route}', json={}, headers={'X-Forwarded-For': f'1.2.3.{i}'}).status_code == 422
        result = client.post(f'/api/auth/{route}', json={}, headers={'X-Forwarded-For': '9.9.9.9'})
        assert result.status_code == 429 and int(result.headers['Retry-After']) > 0
    now[0] = settings.rate_window_seconds + 1
    assert client.post('/api/auth/login', json={}).status_code == 422


def test_invalid_logins_are_generic_and_temporarily_limited(client, app, monkeypatch):
    register(client)
    settings = get_settings()
    monkeypatch.setattr(settings, 'rate_login_failure_limit', 2)
    now = [0.0]
    app.state.rate_limiter.clock = lambda: now[0]
    errors = []
    for email in ['absent@example.com', 'jogador@example.com']:
        result = client.post('/api/auth/login', json={'email': email, 'password': 'invalid-password-123'})
        assert result.status_code == 401
        errors.append(result.json())
    assert errors[0] == errors[1]
    result = client.post('/api/auth/login', json={'email': 'jogador@example.com', 'password': 'senha-de-teste-123'})
    assert result.status_code == 429
    now[0] = settings.rate_login_failure_window_seconds + 1
    assert client.post('/api/auth/login', json={'email': 'jogador@example.com', 'password': 'senha-de-teste-123'}).status_code == 200


def test_draw_throttle_is_per_user_and_does_not_change_rewards(client, app, monkeypatch, reward_clock):
    settings = get_settings()
    monkeypatch.setattr(settings, 'rate_draw_limit', 2)
    now = [0.0]
    app.state.rate_limiter.clock = lambda: now[0]
    register(client)
    for i in range(2):
        assert client.post('/api/draws', headers={'Idempotency-Key': f'allowed-{i}'}).status_code == (200 if i == 0 else 409)
    assert client.post('/api/draws', headers={'Idempotency-Key': 'blocked'}).status_code == 429
    assert client.get('/api/album/progress').json()['obtained'] == 1
    now[0] = settings.rate_window_seconds + 1
    assert client.post('/api/draws', headers={'Idempotency-Key': 'allowed-after-wait'}).status_code == 409
    reward_clock[0] += timedelta(days=1)
    now[0] += settings.rate_window_seconds + 1
    assert client.post('/api/draws', headers={'Idempotency-Key': 'allowed-next-day'}).status_code == 200
    register(client, 'second@example.com')
    assert client.post('/api/draws', headers={'Idempotency-Key': 'second-account'}).status_code == 200


def test_password_salts_and_private_data_isolation(client, engine):
    a = register(client)
    token_a = client.cookies.get(COOKIE_NAME)
    b = register(client, 'other@example.com')
    with Session(engine) as db:
        hashes = [db.get(User, u['id']).password_hash for u in [a, b]]
        assert all(h.startswith('$argon2id$v=19$m=65536,t=3,p=4$') for h in hashes)
        assert hashes[0] != hashes[1]
    assert 'password' not in str(client.get('/api/auth/me').json()).lower()
    rejected = client.post('/api/draws', headers={'Idempotency-Key': 'foreign'}, json={'user_id': a['id']})
    assert rejected.status_code == 422
    assert client.get(f"/api/album?user_id={a['id']}").json()['progress']['obtained'] == 0
    assert client.post('/api/draws', headers={'Idempotency-Key': 'own'}).status_code == 200
    client.cookies.clear(); client.cookies.set(COOKIE_NAME, token_a)
    assert client.get('/api/album').json()['progress']['obtained'] == 0
    assert client.get('/api/album', params={'user_id': b['id']}).json()['progress']['obtained'] == 0
    assert client.get('/api/auth/me', params={'user_id': b['id']}).json()['id'] == a['id']
    assert client.post('/api/draws', headers={'Idempotency-Key': 'forged-owner'}, json={'user_id': b['id']}).status_code == 422


@pytest.mark.parametrize('change', ['missing', 'wrong-user', 'malformed-id', 'issuer', 'audience', 'algorithm'])
def test_invalid_signed_sessions_are_rejected(client, change):
    user = register(client)
    cookie = client.cookies.get(COOKIE_NAME)
    claims = jwt.decode(cookie, get_settings().jwt_secret, algorithms=['HS256'], audience='bau-web')
    algorithm = 'HS256'
    if change == 'missing': claims['jti'] = str(uuid4())
    if change == 'wrong-user': claims['sub'] = str(uuid4())
    if change == 'malformed-id': claims['jti'] = 'invalid-session-id'
    if change == 'issuer': claims['iss'] = 'other'
    if change == 'audience': claims['aud'] = 'other'
    if change == 'algorithm': algorithm = 'HS384'
    invalid = jwt.encode(claims, get_settings().jwt_secret, algorithm=algorithm)
    client.cookies.clear();client.cookies.set(COOKIE_NAME, invalid)
    assert client.get('/api/auth/me').status_code == 401


def test_logout_revokes_current_session_only(client, engine):
    register(client)
    old = client.cookies.get(COOKIE_NAME)
    client.post('/api/auth/login', json={'email': 'jogador@example.com', 'password': 'senha-de-teste-123'})
    current = client.cookies.get(COOKIE_NAME)
    response = client.post('/api/auth/logout')
    assert response.status_code == 204
    assert 'Max-Age=0' in response.headers['set-cookie']
    client.cookies.clear();client.cookies.set(COOKIE_NAME, current)
    assert client.get('/api/album').status_code == 401
    client.cookies.clear();client.cookies.set(COOKIE_NAME, old)
    assert client.get('/api/auth/me').status_code == 200


def test_cookies_and_security_headers(client, monkeypatch):
    settings = get_settings()
    for secure in [False, True]:
        monkeypatch.setattr(settings, 'cookie_secure', secure)
        response = client.post('/api/auth/login', json={'email': 'absent@example.com', 'password': 'password-test-123'})
        assert response.status_code == 401
        response = client.post('/api/auth/register', json={'username': 'Teste', 'email': f'secure-{secure}@example.com', 'password': 'password-test-123'})
        cookie = response.headers['set-cookie']
        assert ('; Secure' in cookie) == secure
        assert 'HttpOnly' in cookie and 'SameSite=lax' in cookie and 'Path=/api' in cookie
        assert f'Max-Age={settings.session_minutes * 60}' in cookie
    for response in [client.get('/api/health'), client.post('/api/draws', headers={'Origin': 'https://evil.example'})]:
        assert response.headers['X-Frame-Options'] == 'DENY'
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        assert response.headers['Referrer-Policy'] == 'strict-origin-when-cross-origin'
        assert response.headers['Cache-Control'] == 'no-store'


def test_hash_upgrade_only_after_successful_login(client, engine):
    from argon2 import PasswordHasher
    user = register(client)
    legacy = PasswordHasher(time_cost=1, memory_cost=8192, parallelism=1).hash('senha-de-teste-123')
    with Session(engine) as db, db.begin():
        db.get(User, user['id']).password_hash = legacy
    assert client.post('/api/auth/login', json={'email': user['email'], 'password': 'wrong-password-123'}).status_code == 401
    with Session(engine) as db:
        assert db.get(User, user['id']).password_hash == legacy
    assert client.post('/api/auth/login', json={'email': user['email'], 'password': 'senha-de-teste-123'}).status_code == 200
    with Session(engine) as db:
        updated = db.get(User, user['id']).password_hash
        assert updated != legacy and '$m=65536,t=3,p=4$' in updated
