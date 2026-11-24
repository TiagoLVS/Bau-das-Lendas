# Etapa 02 — Backend, PostgreSQL e integração

Data: 20/11/2026. Execução exclusivamente local; sem publicação nem operações de escrita no Git.

## 1. Objetivo

Consolidar a API principal, preparar Python, validar PostgreSQL/migrações/persistência e integração móvel mantendo frontend, catálogo, recompensas e RA. Referência: AUDITORIA-TECNICA e instrução da etapa 02. One Page/XRD/Plano acadêmico não foram encontrados; não foram modificados.

## 2. Problemas identificados

Entrada antiga oferecia só health. README inicial ensinava iniciar essa API e informava que saúde não consultava banco. Ambiente Python ausente. Docker CLI/Compose disponíveis, mas daemon inacessível, inclusive após consulta fora do sandbox. Auxiliar local_postgres era específico de Windows. Configuração permitia SQLite/cookies inseguros em produção quando configurados explicitamente. SQLite não ativava foreign_keys. Testes de navegador antigos assumiam Chrome Windows. Persistia falha de sequência das assombrações, fora do escopo.

## 3. Correções realizadas

- `backend/main.py` reexporta a mesma instância de `app.main`; não existem mais duas implementações independentes.
- Settings exige PostgreSQL, cookies Secure e origens HTTPS quando APP_ENV=production. Desenvolvimento/teste seguem explícitos; sem fallback SQLite.
- SQLite ativa PRAGMA foreign_keys em conexões da aplicação e fixtures. Teste tenta inserir referências inválidas e comprova rejeição em ambos os bancos.
- Testes são APP_ENV=test; alvo PostgreSQL deve ter nome bau_test e cada fixture cria schema UUID isolado. Migração 0001 preservada sem alteração.
- Helper único `backend/run.py` carrega arquivo explícito e inicia API/migração/seed/testes; run_tests mantém compatibilidade com `.env.test`, removendo dependência de porta Windows.
- Compose de desenvolvimento informa APP_ENV; configuração independente de Compose de testes não reutiliza volume do projeto.
- READMEs atualizados; frontend e cliente HTTP não precisaram de mudança nesta etapa.

## 4. Arquivos criados

Versionáveis: `backend/run.py`, `backend/compose.test.yaml`, `backend/.env.test.example`, `backend/tests/test_bootstrap.py`, `tests/stage02-mobile-browser.mjs`, este relatório e `docs/DIRETRIZES-DO-PROJETO.md`.

Locais ignorados: `backend/.venv/` e `backend/.env.test` (credenciais de teste exclusivas, modo 0600). Artefatos temporários em `/tmp`: cluster PostgreSQL, logs, navegadores, script de verificação HTTP e JUnit. Não são dependências da aplicação entregue ao visitante.

## 5. Arquivos modificados nesta etapa

`.gitignore`, `README.md`, `backend/README.md`, `frontend/README.md`, `backend/main.py`, `backend/app/core/config.py`, `backend/app/db/session.py`, `backend/compose.yaml`, `backend/.env.example`, `backend/run_tests.py`, `backend/tests/conftest.py`, `backend/tests/test_config.py`.

Modificações preexistentes em package.json, public/ra.js, tests/api-ra.test.mjs, vite.config.ts, modelo e carregadores foram preservadas. README já tinha instruções de npm start, que foram mantidas. AUDITORIA-TECNICA permanece histórico intacto. Sem alterações de schema histórico, imagens, histórias, modelo, animações, estilo, navegação, assombrações ou regras de recompensa.

## 6. Dependências instaladas

Python 3.14.4: ambiente `backend/.venv`, instalação do lock existente sem atualização indiscriminada e sem pacotes globais. Principais versões: FastAPI 0.162.0, Uvicorn 0.54.0, SQLAlchemy 2.0.55, Alembic 1.20.1, Psycopg 3.3.6, Pydantic 2.14.2, PyJWT 2.15.1, pwdlib 0.3.1, argon2-cffi 25.1.0, pytest 9.2.0 e HTTPX 0.28.1. Lock permanece fonte da lista completa. `pip check`: nenhuma dependência quebrada.

Chromium e WebKit da instalação Playwright existente foram baixados em `/tmp/bau-etapa02-browsers`, sem pacotes do sistema. Chromium iniciou; WebKit exige libmanette. Nenhuma biblioteca nova adicionada ao package.json. PostgreSQL 18 já estava instalado.

## 7. Configuração do backend

Entrada oficial `app.main:app`; compatibilidade `main:app` usa a mesma instância. Rotas verificadas: saúde, OpenAPI, auth register/login/logout/me, legends, album/progress, album e draws. API em 127.0.0.1:8000; frontend/proxy em localhost:5175. Usuários identificados por JWT em cookie e sessão persistida; nenhum user_id arbitrário foi aceito para conceder cartas.

## 8. PostgreSQL

Criado cluster exclusivamente de testes com PostgreSQL 18 já instalado, diretório aleatório `/tmp/bau-etapa02-pg-*`, porta 55439 em 127.0.0.1, usuário/segredo exclusivos e autenticação SCRAM. Banco novo `bau_test`; nenhum banco preexistente acessado ou migrado. Caminho local em `/tmp/bau-etapa02-pg-path` permite retomar/parar o cluster. Esta é alternativa local para validação, não um instalador nem versão da aplicação por sistema operacional.

Dados fictícios de integração foram preservados nesse banco. Fixtures criam/removem somente seus próprios schemas temporários. O cluster é temporário em /tmp e não substitui armazenamento durável de desenvolvimento/produção.

## 9. Docker

Compose v5.6.0 disponível. Consultas info/ps/volume não conseguiram acessar daemon: fora do sandbox, socket /var/run/docker.sock ausente. Não se pode afirmar que containers/volumes foram inventariados nem que Docker foi validado em execução. Nenhum container/volume removido ou serviço administrativo iniciado.

`backend/compose.test.yaml`: projeto `bau-etapa02-test`, PostgreSQL 17, banco bau_test, volume `bau_etapa02_test_data` no namespace independente do projeto, healthcheck e bind localhost:55439. Senha/usuário vêm de arquivo ignorado; não há segredo no YAML. Não iniciar esse Compose na porta 55439 enquanto o cluster temporário estiver ativo. Não reutilizar o volume de desenvolvimento.

`backend/compose.yaml`: caminho centralizado para API+banco de desenvolvimento, volume existente preservado. Dockerfile já usa `app.main:app`, usuário não root e dependências bloqueadas; não foi necessário alterá-lo. A imagem não foi construída nesta execução.

## 10. Migrações Alembic e seed

No banco isolado novo: `alembic upgrade head`, seed duas vezes e `alembic check` aprovados. Nenhuma operação nova de upgrade detectada. Models/schema correspondem: users, legends, user_cards, draw_requests, auth_sessions e alembic_version. Testes validam unicidade e FKs, 60 IDs/posições e seed idempotente que conserva dados. Nenhuma daily_rewards criada. Não foi usado create_all para substituir Alembic.

## 11. Variáveis de ambiente

- APP_ENV: development, test ou production; produção tem validações obrigatórias.
- DATABASE_URL: conexão explícita; PostgreSQL em produção. Nunca trocar silenciosamente por SQLite.
- TEST_DATABASE_URL: exclusivamente banco separado bau_test; fixtures usam schemas únicos.
- JWT_SECRET: segredo aleatório com ao menos 32 caracteres, sem placeholder.
- COOKIE_SECURE: false somente HTTP local de desenvolvimento/testes; produção obriga true.
- ALLOWED_ORIGINS: origens explícitas; produção HTTPS. Usar origem do navegador/túnel real.
- SESSION_MINUTES: 120 por padrão, limites do Settings preservados.
- CATALOG_PATH: opcional; padrão aponta ao JSON oficial de 60 lendas.
- POSTGRES_PASSWORD: Compose de desenvolvimento.
- POSTGRES_TEST_PASSWORD/USER/PORT: Compose de testes.
- VITE_PUBLIC_URL: endereço público do QR; não configura CORS nem TLS.

`.env.test` contém somente credenciais do cluster criado nesta etapa. Não foi criado/sobrescrito `.env` de desenvolvimento. Git ignora arquivo real e venv; `.env.test.example` foi explicitamente liberado no ignore. Não copiar credenciais para documentação, frontend ou argumentos de comandos.

## 12. Inicialização reproduzível

### Preparar Python

Da raiz, se o ambiente ainda não existir:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.lock.txt
```

No Windows o executável do mesmo venv é `backend/.venv/Scripts/python.exe`. Não é outra versão da aplicação. O auxiliar legado local_postgres.py não é recomendado no Kubuntu.

### Caminho centralizado de desenvolvimento com Docker

Preparar `backend/.env` baseado em `.env.example` somente se não existir, com segredos aleatórios próprios e APP_ENV=development. Pode editar manualmente; não usar placeholders. Depois:

```sh
cd backend
docker compose up --build -d
```

Isso inicia banco, executa migração e seed e inicia API; só usar contra banco novo de desenvolvimento ou cuja migração esteja autorizada. Em outro terminal, da raiz:

```sh
npm start
```

Frontend em http://localhost:5175; API em http://127.0.0.1:8000, saúde /api/health, docs /docs e schema /openapi.json. HTTP local usa COOKIE_SECURE=false. `npm run dev` oferece recarga; `npm run preview` reutiliza build. O build isolado não inicia API nem banco.

### Banco já configurado e autorizado

Da raiz:

```sh
backend/.venv/bin/python backend/run.py api
```

Para banco novo autorizado, antes da API, usar `backend/run.py migrate` e `backend/run.py seed` com o mesmo Python. Não aplicar esses comandos automaticamente em bancos antigos.

### Reutilizar a instância temporária validada nesta etapa

Enquanto /tmp e `backend/.env.test` existirem, o cluster pode ser reiniciado assim, sem sudo:

```sh
BAU_TEST_PG_DIR="$(cat /tmp/bau-etapa02-pg-path)"
/usr/lib/postgresql/18/bin/pg_ctl -D "$BAU_TEST_PG_DIR/data" -l "$BAU_TEST_PG_DIR/server.log" -o "-h 127.0.0.1 -p 55439 -k $BAU_TEST_PG_DIR" -w start
backend/.venv/bin/python backend/run.py --env-file backend/.env.test api
```

Em outro terminal, `npm start`. O arquivo de ambiente usa o usuário do cluster temporário. Não copiar uma URL aleatória nem apontar esse fluxo para produção. Se /tmp tiver sido limpo, usar o Compose de testes com ambiente novo, não tentar recriar dados antigos.

### Banco Compose exclusivo de testes, quando daemon disponível

Prepare `backend/.env.test` apenas se ausente, a partir do exemplo, com senha e JWT aleatórios; preserve um arquivo existente. Escolha porta livre e nome de usuário consistente na URL e POSTGRES_TEST_USER.

```sh
docker compose --env-file backend/.env.test -f backend/compose.test.yaml up -d
backend/.venv/bin/python backend/run.py --env-file backend/.env.test migrate
backend/.venv/bin/python backend/run.py --env-file backend/.env.test seed
backend/.venv/bin/python backend/run.py --env-file backend/.env.test test
```

Nunca executar dois bancos na mesma porta. Não há alteração automática de senha em volume já inicializado.

## 13. Encerramento

Ctrl+C nos terminais de API e frontend. Para Compose de desenvolvimento: `cd backend && docker compose stop`. Para Compose de testes:

```sh
docker compose --env-file backend/.env.test -f backend/compose.test.yaml stop
```

Para o cluster temporário desta etapa:

```sh
BAU_TEST_PG_DIR="$(cat /tmp/bau-etapa02-pg-path)"
/usr/lib/postgresql/18/bin/pg_ctl -D "$BAU_TEST_PG_DIR/data" -m fast -w stop
```

Sem down -v, remoção de volume, reset, initdb em dados existentes ou exclusão de banco. API e preview criados pelo teste HTTP foram encerrados automaticamente; o cluster temporário foi parado ao finalizar e seu diretório preservado.

## 14. Testes SQLite

**APROVADO:** 17 casos SQLite. **NÃO EXECUTADOS/IGNORADOS:** 2 casos de concorrência na variante SQLite, pois exigem PostgreSQL. PRAGMA foreign_keys=1 e rejeição real de FK inválida comprovados. Migrations em arquivo tmp_path; sem dados do usuário. Sete testes gerais adicionais aprovados, incluindo requisitos de produção e compatibilidade de entrada.

## 15. Testes PostgreSQL

**APROVADO:** 19 casos PostgreSQL, incluindo concorrência com oito solicitações simultâneas com chaves iguais e distintas, unicidade, idempotência, isolamento, catálogo e persistência. Total da suíte: **43 passaram, 2 ignorados**, nenhum reprovado. JUnit temporário em /tmp/bau-etapa02-results.xml. Warning existente de depreciação Starlette/HTTPX; não foi adicionada nova biblioteca para removê-lo.

Comando executado via helper: `backend/.venv/bin/python backend/run.py --env-file backend/.env.test test`. Execução final equivalente também gerou JUnit e usou os mesmos bancos isolados.

## 16. Testes Node

`node --test --test-isolation=none tests/*.test.mjs`: **32 APROVADOS, 1 REPROVADO**. A falha preexistente é tests/hauntings.test.mjs: sequência esperada olhos/espelho/saci/lobo/boitata versus espelho/lobo/saci/alta/boitata. Lógica e expectativa não foram modificadas. Suíte completa continua reprovada e não é bloqueio corrigido por esta etapa.

## 17. TypeScript e build

**APROVADO:** `npm run build`, incluindo hooks existentes de sincronização, tsc e Vite. Arquivos gerados preservaram o conteúdo do catálogo/ilustrações. Aviso de chunk principal de 874,03 kB (249,28 kB gzip) permanece; otimização é futura. `pip check`, sintaxe do teste móvel e git diff --check aprovados. Nenhuma troca de dependências frontend.

## 18. Integração frontend/backend

**APROVADO em HTTP real:** API Uvicorn principal e Vite preview, não mocks. Proxy /api, saúde e OpenAPI, catálogo de 60, cadastro fictício, sorteio, retry com a mesma chave, álbum, segundo usuário com zero cartas e persistência de conta/sessão/carta após encerrar e reiniciar o processo Uvicorn. Clientes acessaram localhost:5175; apenas backend conectou PostgreSQL. Nenhuma regra de sorteio foi alterada. Script de orquestração temporário em /tmp/bau-etapa02-http.py; teste durável de nova instância também em test_bootstrap.py.

## 19. Viewport móvel

`tests/stage02-mobile-browser.mjs`, com BAU_TEST_ORIGIN=http://localhost:5175 e PLAYWRIGHT_BROWSERS_PATH=/tmp/bau-etapa02-browsers, executado apenas com API conectada a bau_test.

- **Android/Chromium 360×800: APROVADO.** Cadastro pela UI, sessão após reload, catálogo/API, sorteio, álbum, logout/login, carregamento GLB/JPG e mensagem após abortar conexão API. Perfil sem overflow horizontal.
- **iPhone/WebKit 390×844: BLOQUEADO.** Binário baixado, mas biblioteca do sistema libmanette-0.2-0 ausente; navegador não iniciou. Não se declara aprovação Safari.
- Sem câmera física, vídeo real, validação de lente ou gesto de abertura nesta etapa. Não se trata de aprovação em Android/iPhone real.

Para repetir: iniciar API e frontend somente com ambiente de testes isolado e então:

```sh
BAU_TEST_ORIGIN=http://localhost:5175 PLAYWRIGHT_BROWSERS_PATH=/tmp/bau-etapa02-browsers node tests/stage02-mobile-browser.mjs
```

O script cria contas fictícias e cartas; não executar contra API/banco de produção. Se navegadores não existirem, usar a instalação Playwright do projeto para baixá-los em pasta de testes. Bibliotecas do sistema exigem ação manual do responsável.

## 20. Responsividade identificada

Perfil em 360×800 não apresentou rolagem horizontal na medição executada. Navegação, formulários e abertura do álbum foram utilizáveis nesse percurso; não houve auditoria de cada carta, paisagem ou todos os painéis. Inspeção de CSS continua identificando textos de HUD/recompensa de 9–13 px, botões pequenos em algumas regiões e navegação fragmentada entre React/casa/galeria. São pontos para etapa futura de legibilidade, toque, foco e navegação, sem reformulação agora. Nenhuma sobreposição específica foi comprovada no teste limitado; não declarar todas as telas responsivas.

## 21. Pendências em smartphones físicos

Chrome Android e Safari iOS com HTTPS, câmera/permissões reais, papel do QR, rastreamento e perda/retorno, estabilidade/performance WebGL, materiais GLB, legibilidade, toque, orientação, consumo e retomada após alternar apps. Viewport emulado não substitui esses testes. Baú/jsQR/animações preservados; Blender não é necessário para executar aplicação.

## 22. Pendências HTTPS/publicação

Definir domínio/reverse proxy TLS para dist e `/api` na mesma origem; APP_ENV=production, COOKIE_SECURE=true, origens HTTPS exatas, segredos próprios e PostgreSQL não exposto. Não há localhost fixo no cliente HTTP da aplicação; localhost do proxy é configuração do servidor local. Não usar Vite dev/preview como hospedagem final. Validar rate limit, backup/restore e observabilidade antes de publicar. Nenhum serviço externo configurado/publicado.

## 23. Bloqueios e intervenção humana

1. Docker: iniciar/disponibilizar daemon ao usuário por configuração administrativa local, se desejar usar Compose. Nenhum sudo foi executado. A validação PostgreSQL não ficou dependente disso porque usou cluster isolado existente em ferramentas do sistema.
2. WebKit: instalar manualmente `libmanette-0.2-0` (em Debian/Kubuntu, `apt install libmanette-0.2-0`, com privilégios administrativos providenciados pelo responsável). O instalador Playwright sugeriu esse pacote; nenhuma instalação administrativa feita aqui.
3. Dispositivos físicos/origem HTTPS não disponíveis para validação de câmera real.
4. Falha das assombrações requer decisão do autor em etapa própria; não foi mascarada.
5. Relatos acadêmicos não disponibilizados e diretrizes de recompensa/curadoria permanecem para etapas futuras.

Não há sucesso integral de todos os critérios móveis: Chromium passou, WebKit e aparelhos físicos permanecem sem validação. Docker Compose foi preparado, não executado.

## 24. Próxima etapa recomendada

Com backend e persistência agora testados, revisar os resultados com o responsável e escolher a próxima etapa de navegação/Flip/responsividade conforme DIRETRIZES-DO-PROJETO. Antes de afirmar compatibilidade iOS, resolver biblioteca WebKit e testar Safari físico. Recompensas, QR individual, conteúdo educativo e mudanças de RA não foram antecipados.

Nenhum commit, add, push, pull, merge, checkout, reset, branch ou publicação executado. Identidade visual, trabalho preexistente e dados externos preservados.
