# Verificação da base — 02/11/2026

Executado em Linux com Python 3.14.4:

- Criação e ativação de `.venv/` conforme o README.
- Instalação das dependências e fixação de todas as versões em `backend/requirements.txt`.
- Reexecução de `python -m pip install -r backend/requirements.txt` sem conflitos.
- `python -m pip check`: nenhuma dependência incompatível.
- Inicialização pela raiz: `python -m uvicorn main:app --app-dir backend --reload`.
- Requisição HTTP real a `/api/health`: HTTP 200, `application/json`, corpo
  `{"status":"ok","project":"Baú das Lendas"}` validado por igualdade.
- Requisição HTTP real a `/docs`: HTTP 200, HTML contendo Swagger UI.
- Requisição HTTP real a `/openapi.json`: HTTP 200 e rota de saúde presente.
- Revisão dos arquivos da entrega: somente código, documentação e dependências.
- `.venv/` e `backend/__pycache__/` ignorados pelo Git; nenhuma credencial incluída.

Os comandos de Windows foram documentados, mas não executados neste ambiente Linux.
A renderização do CDN do Swagger em navegador e a integração da RA não foram testadas.
Nenhum arquivo anterior da equipe estava disponível para reutilização.

O repositório existente `TiagoLVS/Bau-das-Lendas` foi identificado vazio e público.
A autenticação do terminal `gh` estava inválida; o conector GitHub estava autenticado.
As orientações de integração permanecem pendentes de alinhamento com a Giovanna.
