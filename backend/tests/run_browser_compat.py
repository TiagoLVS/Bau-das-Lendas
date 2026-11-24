"""Runner local da auditoria; somente cluster próprio, novo ou marcado, em bau_test."""
from pathlib import Path
import os
import signal
import socket
import subprocess
import sys
import time

from dotenv import load_dotenv
import httpx
import psycopg
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / 'tests/artifacts/compat-mobile/runtime'
PG = Path('/usr/lib/postgresql/18/bin')


def main():
    load_dotenv(ROOT / 'backend/.env.test', override=True)
    url = make_url(os.environ['DATABASE_URL'])
    if os.environ.get('APP_ENV') != 'test' or (url.host, url.port, url.database) != ('127.0.0.1', 55439, 'bau_test'):
        raise RuntimeError('Recusado: requer APP_ENV=test e 127.0.0.1:55439/bau_test.')
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for port in (8000, 5175, 55439):
        with socket.socket() as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('127.0.0.1', port))
    data = RUNTIME / 'pgdata'
    marker = RUNTIME / 'owned-test-cluster'
    fresh = not data.exists()
    if fresh:
        if marker.exists():
            raise RuntimeError('Cluster marcado ausente; não reconstruir silenciosamente.')
        password_file = RUNTIME / 'init-password'
        fd = os.open(password_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:
            stream.write(url.password)
        try:
            subprocess.run([PG / 'initdb', '-D', data, '--username', url.username,
                            '--pwfile', password_file, '--auth-local=scram-sha-256',
                            '--auth-host=scram-sha-256'], check=True, stdout=subprocess.DEVNULL)
        finally:
            password_file.unlink(missing_ok=True)
        marker.write_text('Auditoria mobile; somente dados fictícios; bau_test\n')
    if not marker.is_file() or (data / 'PG_VERSION').read_text().strip() != '18':
        raise RuntimeError('Diretório não é o cluster próprio de testes.')
    api = preview = None
    logs = []
    started = False
    try:
        subprocess.run([PG / 'pg_ctl', '-D', data, '-l', RUNTIME / 'postgres.log',
                        '-o', '-h 127.0.0.1 -p 55439 -k /tmp', '-w', 'start'],
                       check=True, stdout=subprocess.DEVNULL)
        started = True
        if fresh:
            with psycopg.connect(host=url.host, port=url.port, user=url.username,
                                 password=url.password, dbname='postgres', autocommit=True) as db:
                db.execute('CREATE DATABASE bau_test')
            for command in ('migrate', 'seed'):
                subprocess.run([sys.executable, 'backend/run.py', '--env-file',
                                'backend/.env.test', command], cwd=ROOT, check=True,
                               stdout=subprocess.DEVNULL)
        with psycopg.connect(host=url.host, port=url.port, user=url.username,
                             password=url.password, dbname='bau_test') as db:
            assert db.execute('SELECT version_num FROM alembic_version').fetchone()[0] == '0002'
            assert db.execute('SELECT count(*) FROM legends').fetchone()[0] == 60
        print('Cluster próprio isolado confirmado; bau_test/0002/60 lendas.', flush=True)
        for label, args, cwd in (
            ('api', [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host',
                     '127.0.0.1', '--port', '8000', '--no-proxy-headers'], ROOT / 'backend'),
            ('preview', ['node', 'node_modules/vite/bin/vite.js', 'preview', '--outDir',
                         str(RUNTIME / 'dist'), '--host', '127.0.0.1'], ROOT),
        ):
            log = (RUNTIME / f'{label}.log').open('w')
            logs.append(log)
            process = subprocess.Popen(args, cwd=cwd, stdout=log, stderr=log)
            if label == 'api':
                api = process
            else:
                preview = process
        for address in ('http://127.0.0.1:8000/api/health', 'http://localhost:5175/'):
            for _ in range(100):
                try:
                    if httpx.get(address, timeout=1).status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(.15)
            else:
                raise RuntimeError('Serviço de teste indisponível.')
        env = dict(os.environ, BAU_TEST_ORIGIN='http://localhost:5175',
                   BAU_TEST_DATABASE='bau_test', PLAYWRIGHT_BROWSERS_PATH=str(RUNTIME / 'browsers'))
        # Retomada da auditoria: apenas cenários faltantes e repetições dirigidas.
        phases = [
            dict(BAU_COMPAT_ENGINE='WebKit', BAU_COMPAT_CASE='iphone13,iphone15,iphone15max,android-small,pixel', BAU_COMPAT_SKIP_HOUSE='1'),
            dict(BAU_COMPAT_ENGINE='WebKit', BAU_COMPAT_CASE='se-320,se-375', BAU_COMPAT_STEPS='cadastro-login-cookie-reload,sessao-expirada-troca-conta-falha-rede'),
            dict(BAU_COMPAT_ENGINE='Chromium', BAU_COMPAT_CASE='iphone15max', BAU_COMPAT_STEPS='cadastro-login-cookie-reload,album-bloqueadas-desbloqueadas-virada,portais-e-css-safari'),
        ]
        if os.environ.get('BAU_COMPAT_ONLY_QR') == '1':
            phases = [dict(BAU_COMPAT_ENGINE='WebKit', BAU_COMPAT_CASE='iphone13', BAU_COMPAT_STEPS='cadastro-login-cookie-reload,portais-e-css-safari,recompensa-api-qr-simulado-persistencia')]
        for index, phase in enumerate(phases, 1):
            print(f'Fase de retomada {index}/{len(phases)}', flush=True)
            result = subprocess.run(['node', 'tests/compat-mobile-browser.mjs'], cwd=ROOT,
                                    env=dict(env, BAU_COMPAT_DPR='1', **phase), timeout=1800)
            print(f'Fase {index} exit={result.returncode}; consultar JSON para classificação.', flush=True)
    finally:
        for process in (preview, api):
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
        for log in logs:
            log.close()
        if started:
            subprocess.run([PG / 'pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'],
                           check=True, stdout=subprocess.DEVNULL)
        print('FIM: serviços próprios encerrados; dados fictícios preservados.', flush=True)


if __name__ == '__main__':
    def interrupt(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, interrupt)
    main()
