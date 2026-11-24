import json
from pathlib import Path
import pytest
from pydantic import ValidationError
from sqlalchemy import select,func
from sqlalchemy.orm import Session
from app.models import UserCard, DrawRequest, Legend
from app.services.catalog import seed_catalog,legend_data
from app.schemas import CulturalContent
from conftest import register


def test_public_cultural_catalog(client):
    entries=client.get('/api/legends').json()
    assert len(entries)==60
    assert entries[0]['cultura']['codigoPais']=='BR'
    assert entries[2]['cultura']['curiosidades']
    assert entries[57]['cultura']['resumoEducativo'] is None
    assert entries[2]['nome']=='Kiyohime'
    assert 'serpente' in entries[2]['historia']
    assert entries[2]['cultura']['resumoEducativo']!=entries[2]['historia']
    assert len(entries[0]['cultura']['resumoEducativo'].split())>=60


def test_reseed_preserves_acquisitions_history_and_snapshots(client,engine):
    with Session(engine) as db,db.begin():
        for row in db.scalars(select(Legend)):
            row.attributes={k:v for k,v in row.attributes.items() if k!='cultura'}
    register(client,'cultural@example.com')
    draw=client.post('/api/rewards/open',headers={'Idempotency-Key':'cultural-claim'})
    assert draw.status_code==200
    before=client.get('/api/album').json()
    history=client.get('/api/rewards/history').json()
    with Session(engine) as db,db.begin():
        snapshots=[(r.id,r.result)for r in db.scalars(select(DrawRequest))]
        seed_catalog(db);seed_catalog(db)
        assert db.scalar(select(func.count()).select_from(Legend))==60
        assert db.scalar(select(func.count()).select_from(UserCard))==1
        assert [(r.id,r.result)for r in db.scalars(select(DrawRequest))]==snapshots
    after=client.get('/api/album').json()
    assert after['progress']==before['progress']
    assert [(p['numero'],p['unlocked'],p['collected_at'])for p in after['positions']]==[(p['numero'],p['unlocked'],p['collected_at'])for p in before['positions']]
    updated=client.get('/api/rewards/history').json()
    assert updated['total']==history['total']
    for item in updated['items']:
        if item.get('legend'):item['legend'].pop('cultura',None)
    assert updated==history
    assert client.post('/api/rewards/open',headers={'Idempotency-Key':'cultural-claim'}).json()==draw.json()
    assert client.post('/api/rewards/open',headers={'Idempotency-Key':'new-claim'}).status_code==409


def test_optional_legacy_and_unicode(engine,tmp_path):
    source=json.loads((Path(__file__).resolve().parents[2]/'public/lendas-ra.json').read_text())
    source[0].pop('cultura')
    source[1]['cultura']={'revisao':{'estado':'pendente','resumo':'pendente'}}
    path=tmp_path/'legacy.json';path.write_text(json.dumps(source,ensure_ascii=False))
    with Session(engine)as db,db.begin():
        seed_catalog(db,path)
        assert 'cultura'not in legend_data(db.get(Legend,source[0]['id']))
        value=legend_data(db.get(Legend,source[1]['id']))['cultura']
        assert value['curiosidades']==[] and value['resumoEducativo'] is None
        assert db.get(Legend,'meng-jiangnu').historia==source[6]['historia']


def test_import_rejects_html_without_changing_catalog(engine,tmp_path):
    source=json.loads((Path(__file__).resolve().parents[2]/'public/lendas-ra.json').read_text())
    source[0]['cultura']['resumoEducativo']='<img src=x onerror=alert(1)>'
    path=tmp_path/'bad.json';path.write_text(json.dumps(source))
    with Session(engine)as db:
        original=db.get(Legend,source[0]['id']).attributes.copy()
        with pytest.raises(ValidationError):seed_catalog(db,path)
        assert db.get(Legend,source[0]['id']).attributes==original
