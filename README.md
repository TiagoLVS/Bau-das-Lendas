# Baú das Lendas

Projeto universitário de Tiago Pereira e Giovanna Duarte. Aplicação com realidade
aumentada, baú 3D e álbum de cartas sem limite diário. Entrega final: 17/12/2026.

Esta base corresponde ao cartão **Criar repositório e iniciar FastAPI**, do Marco 2.
Autenticação, catálogo, coleção e integração da RA serão implementados nas próximas
tarefas. A estimativa inicial de 5 horas do cartão não representa tempo realizado.

## Organização

- `backend/`: API Python e dependências fixadas.
- `frontend/`: HTML, CSS e JavaScript do navegador.
- `assets/`: imagens, modelos 3D e recursos compartilhados.
- `docs/`: documentação técnica e alinhamentos da dupla.

## Pré-requisitos

Git e Python 3.14 com `pip` e suporte a `venv` (ambiente validado: Python 3.14.4).
É necessário acesso à internet para instalar os pacotes e enviar código ao GitHub.
Verifique no terminal:

```sh
git --version
python --version
python -m pip --version
```

No Linux, use `python3` no lugar de `python` antes de ativar o ambiente, se necessário.
Se a distribuição separar o suporte a ambientes virtuais, instale o pacote `python3-venv`.

## Executar localmente

Execute todos os comandos abaixo na **raiz do projeto** (`bau-das-lendas/`).

Linux (Bash):

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --reload
```

Windows (PowerShell):

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --reload
```

Se a política do PowerShell impedir a ativação, utilize o Prompt de Comando (cmd):

```bat
py -3.14 -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --reload
```

A API ficará em <http://127.0.0.1:8000>. Abra:

- Saúde: <http://127.0.0.1:8000/api/health>.
- Swagger UI: <http://127.0.0.1:8000/docs>.
- Esquema OpenAPI: <http://127.0.0.1:8000/openapi.json>.

Em outro terminal, faça uma requisição (no PowerShell, use `curl.exe`):

```sh
curl -i http://127.0.0.1:8000/api/health
```

Resposta esperada: HTTP 200, conteúdo `application/json` e:

```json
{"status":"ok","project":"Baú das Lendas"}
```

O endpoint não usa banco de dados ou outros serviços. A interface Swagger carrega
recursos de um CDN e precisa de internet para renderizar completamente.

Para encerrar o servidor, pressione **Ctrl+C**. Depois, execute `deactivate` para
sair do ambiente virtual. A pasta `.venv/` nunca deve ser versionada.

## Integração e GitHub

Consulte [docs/integracao.md](docs/integracao.md) para o contrato inicial e as
pendências com a Giovanna. As verificações estão em
[docs/verificacao.md](docs/verificacao.md).

Repositório existente: <https://github.com/TiagoLVS/Bau-das-Lendas>.
Caso o envio não esteja disponível no seu terminal, autentique e envie pela raiz:

```sh
gh auth login --hostname github.com
git remote -v
# Apenas se origin ainda não existir:
git remote add origin https://github.com/TiagoLVS/Bau-das-Lendas.git
git push -u origin main
```
