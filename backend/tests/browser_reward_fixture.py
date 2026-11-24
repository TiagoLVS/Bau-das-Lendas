"""Dados fictícios de viewport; recusa destino diferente do cluster isolado de testes."""
from pathlib import Path
import os
import sys
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.models import DrawRequest, Legend, User, UserCard
from app.services.catalog import legend_data


def prepare(user_id, mode):
    load_dotenv(Path(__file__).resolve().parents[1] / '.env.test', override=True)
    url = make_url(os.environ['DATABASE_URL'])
    if os.environ.get('APP_ENV') != 'test' or (url.host, url.port, url.database) != ('127.0.0.1', 55439, 'bau_test'):
        raise RuntimeError('Fixture exige banco isolado de testes.')
    engine = create_engine(url)
    with Session(engine) as db, db.begin():
        user = db.get(User, user_id)
        if not user or not user.username.startswith('Etapa 04'):
            raise RuntimeError('Fixture permite apenas conta fictícia desta etapa.')
        legends = list(db.scalars(select(Legend).order_by(Legend.numero)))
        if mode == 'legacy':
            for i, legend in enumerate(legends[:12]):
                stamp = datetime.now(timezone.utc) - timedelta(days=i+2)
                db.add(UserCard(user_id=user.id, legend_id=legend.id, collected_at=stamp))
                db.add(DrawRequest(user_id=user.id, legend_id=legend.id, idempotency_key=f'fixture-{i}',
                    result={'legend': legend_data(legend)}, created_at=stamp))
        elif mode == 'complete':
            db.add_all(UserCard(user_id=user.id, legend_id=legend.id) for legend in legends)
        else: raise RuntimeError('Modo de fixture desconhecido.')
    engine.dispose()

if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
    print('Fixture fictícia preparada no banco isolado.')
