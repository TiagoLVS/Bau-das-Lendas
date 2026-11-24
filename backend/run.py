"""Comandos comuns da API; execute da raiz ou da pasta backend."""
import argparse
import os
from pathlib import Path
import subprocess
import sys

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, default=ROOT / '.env')
    parser.add_argument('command', choices=['api', 'migrate', 'seed', 'test'])
    args = parser.parse_args()
    if not args.env_file.is_file():
        parser.error('Arquivo de ambiente ausente; prepare-o sem sobrescrever configurações existentes.')
    load_dotenv(args.env_file.resolve(), override=True)
    commands = {
        'api': ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--no-proxy-headers'],
        'migrate': ['-m', 'alembic', 'upgrade', 'head'],
        'seed': ['-m', 'app.services.catalog'],
        'test': ['-m', 'pytest', '-q', '-p', 'no:cacheprovider'],
    }
    if args.command == 'test':
        from sqlalchemy.engine import make_url
        url = os.environ.get('TEST_DATABASE_URL')
        if url and make_url(url).database != 'bau_test':
            parser.error('TEST_DATABASE_URL deve usar um banco dedicado chamado bau_test.')
    return subprocess.call([sys.executable, *commands[args.command]], cwd=ROOT)


if __name__ == '__main__':
    raise SystemExit(main())
