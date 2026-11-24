from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import get_settings
from app.models import Legend, User, UserCard
from app.routers.deps import current_user
from app.schemas import EmptyDraw, LegendOut
from app.services.catalog import legend_data
from app.services.collection import draw, progress, reward_status, history

router = APIRouter(prefix='/api', tags=['coleção'])


@router.get('/legends', response_model=list[LegendOut], response_model_exclude_unset=True)
def legends(db: Session = Depends(get_db)):
    result = [legend_data(l) for l in db.scalars(select(Legend).order_by(Legend.numero))]
    if len(result) != 60:
        raise HTTPException(503, 'Catálogo ainda não foi preparado.')
    return result


@router.get('/album/progress')
def album_progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return progress(db, user.id)


@router.get('/album')
def album(user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Uma consulta mantém posições e progresso no mesmo snapshot.
    rows = db.execute(select(Legend, UserCard).outerjoin(UserCard,
        (UserCard.legend_id == Legend.id) & (UserCard.user_id == user.id)).order_by(Legend.numero)).all()
    if len(rows) != 60:
        raise HTTPException(503, 'Catálogo ainda não foi preparado.')
    obtained = sum(card is not None for _, card in rows)
    return {'positions': [
        {'numero': legend.numero, 'unlocked': card is not None,
         'legend': legend_data(legend) if card else None,
         'collected_at': card.collected_at if card else None} for legend, card in rows],
        'progress': {'total': len(rows), 'obtained': obtained, 'remaining': len(rows) - obtained,
                     'complete': len(rows) == 60 and obtained == 60}}


@router.post('/rewards/open')
@router.post('/draws')
def create_draw(request: Request, idempotency_key: Annotated[str, Header(min_length=1, max_length=128, pattern=r'^[A-Za-z0-9._:-]+$')],
                body: EmptyDraw | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    settings = get_settings()
    request.app.state.rate_limiter.check('draw', user.id, settings.rate_draw_limit, settings.rate_window_seconds)
    result = draw(db, user.id, idempotency_key)
    db.commit()
    return result


@router.get('/rewards/status')
def daily_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return reward_status(db, user.id)


@router.get('/rewards/history')
def reward_history(limit: int = Query(default=10, ge=1, le=50), offset: int = Query(default=0, ge=0, le=100000),
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    return history(db, user.id, limit, offset)
