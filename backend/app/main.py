import logging

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limit import RateLimiter, client_identity
from fastapi import HTTPException
from app.db.session import get_db
from app.routers import auth, game


def security_headers(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response


def create_app():
    settings = get_settings()
    app = FastAPI(title='Baú das Lendas', version='1.0.0')
    app.state.rate_limiter = RateLimiter()

    @app.middleware('http')
    async def csrf_and_cache(request: Request, call_next):
        # Header não simples + origem explícita: bloqueia submissões CSRF, inclusive login.
        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            if (request.headers.get('origin') not in settings.allowed_origins or
                    request.headers.get('x-bau-request') != '1'):
                response = JSONResponse({'detail': 'Origem ou proteção CSRF inválida.'}, status_code=403)
                return security_headers(response)
        try:
            if request.method == 'POST' and request.url.path in {'/api/auth/login', '/api/auth/register'}:
                scope = 'login' if request.url.path.endswith('/login') else 'register'
                limit = settings.rate_login_limit if scope == 'login' else settings.rate_register_limit
                app.state.rate_limiter.check(scope, client_identity(request), limit, settings.rate_window_seconds)
            response = await call_next(request)
        except HTTPException as error:
            response = JSONResponse({'detail': error.detail}, status_code=error.status_code, headers=error.headers)
        return security_headers(response)

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        logging.getLogger(__name__).error('Falha no banco: %s', type(exc).__name__)
        return JSONResponse({'detail': 'Banco indisponível. Tente novamente com a mesma chave.'}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # O erro padrão inclui o input rejeitado, inclusive senhas. Não o devolva.
        return JSONResponse({'detail': 'Confira os dados informados.'}, status_code=422)

    @app.get('/api/health')
    def health(db: Session = Depends(get_db)):
        db.execute(text('SELECT 1'))
        return {'status': 'ok'}

    app.include_router(auth.router)
    app.include_router(game.router)
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True,
                       allow_methods=['GET', 'POST'],
                       allow_headers=['Content-Type', 'Idempotency-Key', 'X-Bau-Request'])
    return app


app = create_app()
