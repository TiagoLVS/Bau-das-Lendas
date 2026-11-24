import secrets
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select

from app.core.security import new_id
from app.models import DailyReward, DrawRequest, Legend, User, UserCard
from app.services.catalog import legend_data

ZONE = ZoneInfo('America/Sao_Paulo')


def utc_now():
    return datetime.now(timezone.utc)


def aware(value):
    # O SQLite devolve datetimes sem tz; os dados históricos deste schema são UTC.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def day_bounds(now):
    local_date = aware(now).astimezone(ZONE).date()
    start = datetime.combine(local_date, time.min, ZONE).astimezone(timezone.utc)
    end = datetime.combine(local_date + timedelta(days=1), time.min, ZONE).astimezone(timezone.utc)
    return local_date, start, end


def progress(db, user_id):
    total = db.scalar(select(func.count()).select_from(Legend))
    if total != 60:
        raise HTTPException(503, 'Catálogo indisponível: execute o seed das 60 lendas.')
    obtained = db.scalar(select(func.count()).select_from(UserCard).where(UserCard.user_id == user_id))
    return {'total': total, 'obtained': obtained, 'remaining': total - obtained,
            'complete': obtained == total}


def received_today(db, user_id, start, end):
    # Primeiro sucesso no dia é representante determinístico do legado. Não se
    # alteram snapshots, conquistas ou os demais registros antigos daquele dia.
    return db.scalar(select(DrawRequest).where(
        DrawRequest.user_id == user_id, DrawRequest.legend_id.is_not(None),
        DrawRequest.created_at >= start, DrawRequest.created_at < end
    ).order_by(DrawRequest.created_at, DrawRequest.id).limit(1))


def reward_status(db, user_id, now=None):
    now = aware(now or utc_now())
    local_date, start, end = day_bounds(now)
    state = progress(db, user_id)
    received = received_today(db, user_id, start, end)
    return {'available': received is None, 'local_date': local_date.isoformat(),
            'server_now': now.isoformat(), 'next_available_at': end.isoformat(),
            'timezone': ZONE.key, 'complete': state['complete'], 'progress': state,
            'today_reward': None if received is None else {
                'id': received.id, 'legend_id': received.legend_id,
                'claimed_at': aware(received.created_at).isoformat(),
                'is_new': received.result.get('is_new')}}


def draw(db, user_id, key):
    # Autenticação iniciou a transação; o lock dura até commit/rollback da rota.
    # A hora é capturada DEPOIS do lock, inclusive ao atravessar a meia-noite.
    db.scalar(select(User).where(User.id == user_id).with_for_update())
    previous = db.scalar(select(DrawRequest).where(
        DrawRequest.user_id == user_id, DrawRequest.idempotency_key == key))
    if previous:
        return previous.result
    now = aware(utc_now())
    status = reward_status(db, user_id, now)
    local_date, _, _ = day_bounds(now)
    if not status['available']:
        raise HTTPException(409, {'code': 'DAILY_REWARD_USED',
            'message': 'Você já recebeu a recompensa de hoje.', 'status': status})
    owned = select(UserCard.legend_id).where(UserCard.user_id == user_id)
    candidates = list(db.scalars(select(Legend).where(Legend.id.not_in(owned)).order_by(Legend.numero)))
    is_new = bool(candidates)
    if not candidates:
        candidates = list(db.scalars(select(Legend).order_by(Legend.numero)))
    # progress já exige exatamente 60; nenhuma carta é inventada se indisponível.
    if not candidates:
        raise HTTPException(503, 'Catálogo indisponível. Tente novamente mais tarde.')
    legend = candidates[secrets.randbelow(len(candidates))]
    draw_id = new_id()
    if is_new:
        db.add(UserCard(user_id=user_id, legend_id=legend.id, collected_at=now))
        db.flush()
    state = progress(db, user_id)
    result = {'id': draw_id, 'legend': legend_data(legend), 'progress': state,
              'remaining': state['remaining'], 'complete': state['complete'],
              'is_new': is_new, 'is_duplicate': not is_new,
              'reward_date': local_date.isoformat(), 'claimed_at': now.isoformat(),
              'next_available_at': status['next_available_at'], 'timezone': ZONE.key}
    db.add(DrawRequest(id=draw_id, user_id=user_id, idempotency_key=key,
                       legend_id=legend.id, result=result, created_at=now))
    db.flush()
    db.add(DailyReward(user_id=user_id, legend_id=legend.id, reward_date=local_date,
                       claimed_at=now, draw_request_id=draw_id, is_new=is_new))
    db.flush()
    return result


def history(db, user_id, limit, offset):
    total = db.scalar(select(func.count()).select_from(DrawRequest).where(DrawRequest.user_id == user_id))
    rows = db.execute(select(DrawRequest, DailyReward, Legend).outerjoin(
        DailyReward, DailyReward.draw_request_id == DrawRequest.id).outerjoin(
        Legend, Legend.id == DrawRequest.legend_id).where(DrawRequest.user_id == user_id)
        .order_by(DrawRequest.created_at.desc(), DrawRequest.id.desc()).limit(limit).offset(offset)).all()
    items = []
    for record, daily, legend in rows:
        stamp = aware(record.created_at)
        items.append({'id': record.id, 'legend_id': record.legend_id,
            'legend': record.result.get('legend') or (legend_data(legend) if legend else None),
            'claimed_at': stamp.isoformat(), 'reward_date': stamp.astimezone(ZONE).date().isoformat(),
            'is_new': daily.is_new if daily else record.result.get('is_new'),
            'legacy': daily is None, 'successful': record.legend_id is not None})
    return {'items': items, 'total': total, 'limit': limit, 'offset': offset,
            'has_more': offset + len(items) < total}
