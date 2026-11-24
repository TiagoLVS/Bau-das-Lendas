import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_configuration_errors_do_not_print_secrets():
    secret = 'private-jwt-' + 'z' * 48
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, database_url='postgresql+psycopg://user:private-db@localhost/bau',
                 jwt_secret=secret, allowed_origins=['*'])
    assert secret not in str(caught.value)
    assert 'private-db' not in str(caught.value)


@pytest.mark.parametrize('overrides', [
    {'database_url': 'sqlite://'},
    {'cookie_secure': False},
    {'allowed_origins': ['http://example.com']},
])
def test_production_requires_postgresql_secure_cookie_and_https(overrides):
    options = dict(database_url='postgresql+psycopg://localhost/test',
                   jwt_secret='test-' + 'x' * 48, app_env='production',
                   cookie_secure=True, allowed_origins=['https://example.com'])
    options.update(overrides)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **options)


def test_production_configuration_is_accepted():
    settings = Settings(_env_file=None, database_url='postgresql+psycopg://localhost/test',
                        jwt_secret='test-' + 'x' * 48, app_env='production',
                        cookie_secure=True, allowed_origins=['https://example.com'])
    assert settings.cookie_secure
