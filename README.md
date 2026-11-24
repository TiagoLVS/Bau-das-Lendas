# Baú das Lendas

O escopo educativo vigente é exploratório, narrativo e cultural: descoberta e coleção de cartas, histórias, origens, tradições, contextos, curiosidades, dossiês e Flip de leitura livre. Não haverá quizzes, questionários ou atividades de selecionar respostas. A antiga Etapa 12 e a T19 foram canceladas. Consulte a [decisão definitiva e errata dos PDFs históricos](docs/DECISAO-ESCOPO-SEM-QUIZZES.md).

Projeto universitário de Tiago Pereira e Giovanna Duarte. Aplicação com realidade
aumentada, baú 3D e álbum de cartas e uma recompensa diária por conta. Entrega final: 17/12/2026.

Esta base corresponde ao cartão **Criar repositório e iniciar FastAPI**, do Marco 2.
Autenticação, catálogo, coleção e integração da RA serão implementados nas próximas
tarefas. A estimativa inicial de 5 horas do cartão não representa tempo realizado.

## Organização

- `backend/`: API Python e dependências fixadas.
- `src/` e `public/`: aplicação React e experiências HTML/JavaScript.
- `frontend/`: orientações do frontend.
- `assets/`: imagens, modelos 3D e recursos compartilhados.
- `docs/`: documentação técnica e alinhamentos da dupla.

## Pré-requisitos

Git, Node.js compatível com Vite 8 (validado em Node 24) e Python 3.12+ com
`pip` e suporte a `venv` (validado nesta etapa em Python 3.14.4).
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

Para testar o frontend com os arquivos de produção, execute na raiz:

```sh
npm start
```

Esse comando sincroniza os recursos, verifica o TypeScript, gera o build e só
então inicia o preview em <http://localhost:5175>. A API continua precisando
rodar separadamente na porta 8000, conforme abaixo. Encerre outro servidor que
esteja usando a porta 5175 antes de iniciar. Para testar a câmera no celular,
use o túnel HTTPS apontando para essa porta.

Para abrir novamente o último build sem reconstruí-lo, use `npm run preview`.
Depois de editar arquivos, reinicie com `npm start` para atualizar o build.
Durante o desenvolvimento, `npm run dev` continua disponível com recarga
automática. O preview serve para testes locais da versão de produção.

Execute todos os comandos abaixo na **raiz do projeto** (`bau-das-lendas/`).

Prepare o ambiente Python (nenhum pacote global):

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.lock.txt
```

No Windows use `backend/.venv/Scripts/python.exe` para o mesmo ambiente.
A aplicação oferecida ao usuário continua exclusivamente web.

Prepare `backend/.env` a partir de `backend/.env.example` **apenas se não existir**,
substituindo os placeholders por segredos exclusivos. Para desenvolvimento, use
`APP_ENV=development`; produção exige PostgreSQL, origens HTTPS e cookies Secure.
Com Docker disponível, a execução centralizada de banco e API é:

```sh
cd backend
docker compose up --build -d
```

Isso aplica migração/seed ao banco desse Compose. Use somente banco novo de
desenvolvimento ou ambiente cuja migração esteja autorizada. Nunca aponte testes
para banco de produção. Para um PostgreSQL já preparado, inicie apenas a API da raiz:

```sh
backend/.venv/bin/python backend/run.py api
```

O helper também oferece `migrate`, `seed` e `test`, sempre com configuração explícita.
Não execute migrations/seed sobre banco existente sem autorização.

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
{"status":"ok"}
```

O endpoint consulta o banco e retorna erro quando ele está indisponível. A interface Swagger carrega
recursos de um CDN e precisa de internet para renderizar completamente.

Para encerrar API/frontend, pressione **Ctrl+C** nos terminais correspondentes.
Para parar o Compose: `cd backend && docker compose stop`. Não remova volumes.
O ambiente `backend/.venv/` e arquivos `.env*` reais ficam ignorados pelo Git.
Consulte os comandos de teste isolado e limitações em [Etapa 02](docs/ETAPA-02-BACKEND-POSTGRESQL.md).

## Recompensas diárias e histórico

A regra atual é uma recompensa por dia de calendário em America/Sao_Paulo,
controlada no servidor. O perfil mostra disponibilidade e histórico; a RA aguarda
confirmação da API. Cartas repetidas só são sorteadas após completar 60/60, sem
duplicar o álbum. `/api/draws` continua como alias do resgate diário.
Veja [Etapa 04](docs/ETAPA-04-RECOMPENSAS-HISTORICO.md) para contrato, migração
0002, preservação dos sorteios anteriores e testes. A migração foi aplicada
somente ao banco isolado de testes, não ao seu banco de desenvolvimento/produção.

## Autenticação e segurança

Consulte [Etapa 03](docs/ETAPA-03-AUTENTICACAO-SEGURANCA.md) para limites de
requisição, sessões/cookies, testes de isolamento e preparação HTTPS.
O backend usa limitação temporária em memória por processo, sem mudar recompensas.
Não iniciar múltiplos workers supondo que as cotas sejam compartilhadas.

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
