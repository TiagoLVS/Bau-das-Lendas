"""Compatibilidade: testes usam configuração explícita em .env.test."""
import sys
from pathlib import Path

from run import main

if __name__ == '__main__':
    sys.argv = [sys.argv[0], '--env-file', str(Path(__file__).resolve().parent / '.env.test'), 'test']
    raise SystemExit(main())
