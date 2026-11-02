"""API inicial do projeto Baú das Lendas."""

from fastapi import FastAPI

app = FastAPI(title="Baú das Lendas", version="0.1.0")


@app.get("/api/health", tags=["Saúde"])
def health() -> dict[str, str]:
    """Confirma que a API está disponível sem depender de serviços externos."""
    return {"status": "ok", "project": "Baú das Lendas"}
