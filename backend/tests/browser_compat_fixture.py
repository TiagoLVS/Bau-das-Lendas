"""Fixture de compatibilidade: somente contas fictícias novas em bau_test local."""
from pathlib import Path
from datetime import datetime, timedelta, timezone
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.models import AuthSession, User, UserCard


def prepare(user_id, action):
    load_dotenv(Path(__file__).resolve().parents[1] / '.env.test', override=True)
    url = make_url(os.environ['DATABASE_URL'])
    if os.environ.get('APP_ENV') != 'test' or (url.host, url.port, url.database) != ('127.0.0.1', 55439, 'bau_test'):
        raise RuntimeError('Destino não é o banco isolado autorizado.')
    engine = create_engine(url)
    with Session(engine) as db, db.begin():
        user = db.get(User, user_id)
        if not user or user.username != 'Compatibilidade móvel':
            raise RuntimeError('Conta não é fixture de compatibilidade.')
        if action == 'seed':
            db.add(UserCard(user_id=user.id, legend_id='loira-do-banheiro'))
        elif action == 'expire':
            for session in db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)):
                session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        else:
            raise RuntimeError('Ação não reconhecida.')
    engine.dispose()

if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
    print('Fixture aplicada apenas à conta fictícia de compatibilidade.')
