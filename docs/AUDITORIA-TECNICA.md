# Auditoria técnica — Baú das Lendas

Data: 20/11/2026, America/Sao_Paulo. Escopo: cópia local do repositório, sem implementação de correções.

**Errata de escopo — 23/11/2026:** este relatório preserva os achados históricos. Referências abaixo a quiz/atividade cultural avaliativa como ausência ou recomendação não são requisitos vigentes. T19 e antiga Etapa 12: **CANCELADAS POR DECISÃO DE ESCOPO**. A aprendizagem será atendida por cartas, Flip, histórias, dossiês e exploração cultural. A [decisão definitiva](DECISAO-ESCOPO-SEM-QUIZZES.md) prevalece sobre as recomendações históricas incompatíveis.

## 1. Resumo executivo

Existe uma aplicação funcional em nível de código e testes unitários: frontend React/TypeScript, casa e galeria HTML/JavaScript, API FastAPI, persistência SQLAlchemy/Alembic, catálogo de 60 lendas, álbum individual, sorteio autenticado e baú GLB animado. Não está comprovada a execução integral nesta máquina nem a entrega dos requisitos educativos e diários.

As principais divergências são: sorteios ilimitados em vez de recompensa diária; nenhuma carta repetida ao completar o catálogo; jsQR em lugar de MindAR no fluxo ativo; somente oito cartas com ilustração oficial; bibliografia insuficiente e nenhuma atividade cultural implementada. O QR é compartilhado, sem vínculo exclusivo por conta.

A suíte Node executada apresentou **32 aprovações e 1 reprovação**. TypeScript e build passaram; GLB carregou e suas três animações foram verificadas por Three.js. Python está bloqueado por ausência de pytest no interpretador disponível; não foi localizado ambiente virtual Linux do projeto. Não há `.env` na raiz nem em `backend` nesta cópia. Nenhum acesso ao PostgreSQL foi feito, nenhuma tabela ou dado foi alterado. Blender MCP indisponível.

One Page, XRD e Plano de Projeto não foram encontrados pelo nome no repositório. A referência normativa desta auditoria é o pedido do usuário. Documentos em `docs/` registram decisões anteriores diferentes, inclusive sorteios ilimitados: essa divergência precisa de decisão humana. Resultados históricos não foram reapresentados como testes atuais.

## 2. Estrutura atual do projeto

| Local | Função e situação |
| --- | --- |
| `backend/app/` | API efetiva: main, routers, schemas, models, services, db e core. |
| `backend/alembic/` | Migração 0001 cria cinco tabelas de domínio. |
| `backend/main.py` | API inicial obsoleta: só health, sem autenticação ou jogo. O comando do README principal ainda pode iniciar esta API errada. |
| `backend/tests/` | Testes de jogo/autenticação/configuração/demonstração; variantes SQLite e PostgreSQL. |
| `frontend/` | README de planejamento desatualizado; o frontend real está em `src/` e `public/`. |
| `src/` | React: App, Conta, Album, Portais, cartas, imagens, experiência 3D e catálogo gerado. |
| `public/` | RA estática, API compartilhada, rastreador QR, modelo GLB, bibliotecas locais e casa/galeria. |
| `public/casa/` | Experiência HTML/JS paralela à React; reutiliza API e metadados visuais legados. |
| `assets/` | README; não é a origem principal dos recursos atuais. |
| `cartas/` | Uma ilustração PNG original da Loira, preservada; apresentação ativa usa derivados/JPG. |
| `docs/` | Orientações, auditorias históricas, evidências antigas, validação visual e inventários. |
| `scripts/` | Sincronizam catálogo e imagens e copiam jsQR/Three; há preparação de imagens Python. |
| `tests/` | Testes Node, scripts Playwright e smoke HTTP; alguns escrevem dados reais se executados sem isolamento. |
| `package.json` / `package-lock.json` | Dependências Node, dev, build, preview e start. |
| `vite.config.ts` | React, porta 5175, proxy `/api` para 8000, regras de acesso e preview. |
| `tsconfig.json` | TypeScript estrito em vários aspectos, sem emissão, inclui apenas `src/`; JS público não é coberto pelo tsc. |
| `index.html` | Entrada Vite da aplicação React. |
| `qrcodes.html` | Redirecionamento para `/?portais=1`; não é gerador de QR individual. Não é entrada multipágina declarada do build. |
| `public/marcador.html` | Compatibilidade/redirecionamento para o fluxo de portais. |
| `backend/.env.example` | Exemplo de configuração sem credenciais reais; requer substituições. |
| `.gitignore` | Ignora ambientes, segredos, dados de banco, dist, artefatos e backups. |
| `backend/Dockerfile`, `backend/compose.yaml` | API Python 3.12 e PostgreSQL 17 com volume persistente e healthcheck. |

Há duas implementações de interface (React e casa estática), dois catálogos sincronizados e módulos visuais legados. Isso não comprova que todos sejam descartáveis. `backend/main.py` é especificamente incompatível com o fluxo completo. Variantes de imagens e originais não devem ser tratadas como lixo.

### Estado Git preservado

Commit consultado: `89485a0`. Já existiam alterações em `README.md`, `package.json`, `public/ra.js`, `tests/api-ra.test.mjs`, `vite.config.ts`; não rastreados: `public/chest-model.js`, `public/models/`, `public/vendor/loaders/`, `public/vendor/utils/`. São parte da evidência auditada, não alterações realizadas nesta etapa. O único documento acrescentado por esta auditoria é este arquivo. Sem add, commit, push, pull, merge, branch ou descarte.

## 3. Tecnologias utilizadas

Instalações Node verificadas por `npm ls --depth=0`: React/ReactDOM 19.3.1, Three 0.160.0, Vite 8.3.4, TypeScript 6.0.3, jsQR 1.4.0, qrcode.react 4.2.0, react-flipbook 3.2.2, Playwright 1.64.1. Nenhuma dependência direta ausente nessa consulta; diferenças de versões de patch em relação às faixas do package são normais.

Backend declara FastAPI, Uvicorn, SQLAlchemy 2, Psycopg, Alembic, Pydantic, pwdlib/Argon2, PyJWT, pytest e HTTPX; possui requirements com faixas e lock separado. MindAR não está nas dependências nem é utilizado pelo rastreador ativo. Não se substituiu biblioteca durante a auditoria. O modelo foi produzido anteriormente no Blender; conexão atual não disponível.

## 4. Funcionalidades existentes

Código de cadastro/login/logout/sessão, hash Argon2id, JWT e cookies; catálogo público, álbum autenticado, progresso, cartas seladas e descobertas; sorteios transacionais com idempotência; retorno da RA ao login; exploração 3D, histórias, galeria e virada de cartas; tratamento de imagens ausentes, erros e carregamento; câmera mediante toque, reconhecimento do QR 02, perda/retorno do alvo; GLB com tampa separada e três ações.

A existência de código não equivale a teste ponta a ponta aprovado nesta execução. Os estados específicos estão na matriz.

## 5. Funcionalidades incompletas

Validação física da RA; acessibilidade integral; catálogo ilustrado e referenciado; adaptação da infraestrutura Windows para Kubuntu; publicação com HTTPS e cookies seguros; alinhamento MindAR/QR; histórico de recompensas acessível ao usuário. A coleção individual é implementada, mas não foi validada agora contra PostgreSQL real.

## 6. Funcionalidades ausentes

Regra diária, fuso São Paulo para o resgate, tabela daily_rewards, endpoint `/api/rewards/open`, repetição após completar coleção, atividade cultural/quiz, bibliografia estruturada por carta, QR exclusivo por conta, comprovação de percurso educativo de 5–15 minutos. Confirmação de e-mail, recuperação de senha e limitação de login também não foram encontradas.

## 7. Problemas técnicos identificados

1. **Alta:** README principal indica `uvicorn main:app --app-dir backend`, que inicializa a API mínima, enquanto o produto exige `app.main:app`. `frontend/README.md` também descreve estágio anterior.
2. **Alta:** especificação de recompensa diária difere do código e dos testes atuais. Não basta bloquear o botão: faltam regra e unicidade por usuário/data no servidor/banco.
3. **Alta:** rastreamento é QR por homografia aproximada, não MindAR. Confirmar arquitetura com os documentos antes de qualquer troca.
4. **Média:** teste de apresentação de assombrações falha: esperado `olhos, espelho, saci, lobo, boitata`; atual `espelho, lobo, saci, alta, boitata`. Resolver contrato de apresentação antes de mudar teste ou implementação.
5. **Média:** build principal de 874,03 kB (249,28 kB gzip) gera aviso de chunk acima de 500 kB; desempenho físico não medido. Static scripts e GLB têm carregamento separado.
6. **Média:** `backend/local_postgres.py` usa executáveis `.exe`, caminho Windows e `CREATE_NO_WINDOW`; não serve diretamente para Kubuntu.
7. **Média:** `scripts/preparar-leitor-qr.mjs` atualiza Three/jsQR, mas não copia GLTFLoader e BufferGeometryUtils. Uma atualização futura de Three pode deixar addons vendorizados incompatíveis. Hoje as versões examinadas são compatíveis.
8. **Média:** SQLite não reproduz `SELECT FOR UPDATE`; constraints previnem duplicação, mas não comprovam concorrência da regra. Não foi encontrado PRAGMA foreign_keys no engine: integridade referencial SQLite precisa de validação específica.
9. **Baixa:** `qrcodes.html` fica fora de `public` e não há configuração multipágina; não presumir publicação desse arquivo no build. O portal React é o caminho ativo.
10. **Média:** GLB e carregadores ainda não rastreados no Git. Estão presentes localmente, mas podem faltar em outra cópia/publicação se não forem incluídos futuramente pelo responsável.

## 8. Problemas de segurança identificados

Boas práticas no código: Argon2id; validação e normalização de e-mail; email UNIQUE; JWT HS256 com exp/iat/sub/jti/issuer/audience; sessão persistida e revogável; cookie HttpOnly/SameSite=Lax; autorização pelo cookie; CSRF por Origin explícito e `X-Bau-Request`; CORS com credenciais e origens explícitas; erros 422 e SQL sem dados sensíveis; escaping nas cartas HTML; álbum filtrado pelo usuário autenticado.

Pendências: nenhum rate limit de login/cadastro/sorteio; ausência de verificação de e-mail e recuperação de senha; expiração remove acesso mas não há rotina identificada de limpeza de sessões/requisições; Compose permite COOKIE_SECURE=false por padrão, adequado só ao HTTP local; produção exige revisão. `allowedHosts:true` no Vite foi adotado para túneis: restringir hosts quando o domínio for conhecido e não usar servidor dev/preview como hospedagem definitiva. Não se fez pentest nem auditoria de vulnerabilidades online das dependências.

O endpoint de sorteio não comprova leitura física do QR: qualquer usuário autenticado pode chamar a API com headers válidos. O QR atual é navegação/alvo visual, não uma credencial nem autorização de resgate. Se exclusividade do baú passar a ser requisito, validar o vínculo no servidor sem transformar o QR em substituto da sessão.

## 9. Estado do banco de dados

Modelos e migração: `users`, `legends`, `user_cards`, `draw_requests`, `auth_sessions`; mais alembic_version quando migrado. `cards` não existe sob esse nome: `legends` representa o catálogo. `daily_rewards` não existe. Não há relacionamentos ORM `relationship()`, mas há FKs explícitas suficientes para consultas atuais.

Unicidade: e-mail, número de lenda, usuário/lenda, usuário/chave idempotente. UserCard referencia usuário e lenda; DrawRequest referencia ambos; AuthSession referencia usuário. Exclusão em cascata não está definida. Alterações futuras de conta/exclusão precisam respeitar essas FKs.

`get_engine()` usa exatamente DATABASE_URL; não há fallback automático de PostgreSQL para SQLite. SQLite é usado explicitamente nas fixtures de teste. A configuração não obriga o dialeto PostgreSQL em produção; uma URL SQLite configurada manualmente seria aceita. Não foi possível confirmar schema, contagens, migração aplicada, conexão ou persistência do banco existente. O JSON de evidência e os relatos de PostgreSQL 18 em docs são históricos, não prova do estado atual. Não foram iniciados bancos, migrations, seeds ou scripts de demonstração.

## 10. Estado da autenticação

Rotas: POST `/api/auth/register`, `/login`, `/logout`; GET `/api/auth/me`. Cadastro exige nome 2–80, e-mail válido até 254 e senha 10–128. Nome é aparado; e-mail normalizado para minúsculas. IntegrityError de cadastro vira 409. UserOut exclui hash. Logout revoga a sessão atual; outras sessões continuam válidas até revogação/expiração.

Sessão é validada contra banco a cada rota privada; não se confia em user_id recebido pelo frontend. JWT não fica em localStorage; cookie permite persistência ao recarregar. Configuração padrão Secure=true no Settings, mas exemplos locais/Compose usam false. Interface de conta está integrada ao cliente compartilhado. Tudo isso foi verificado por leitura nesta etapa; suíte Python não executou.

## 11. Estado do catálogo de cartas

Inventário local nas pastas `cartas`, `assets` e `public`, sem contar node_modules/dist: **19 imagens**: 9 JPG, 7 WebP, 2 SVG, 1 PNG. Comparação SHA-256 não encontrou duplicatas byte a byte; isso não exclui semelhança visual entre original, versão e recorte.

- Nove JPG de cartas em `public/casa/img/cartas/`, todos 768×1152: Loira do Banheiro, Kayako Saeki, Kiyohime, Tamamo-no-Mae, Kisaragi Station, Hachishakusama, Meng Jiangnü, Kuldhara e Saci.
- Oito pertencem ao catálogo oficial. Saci é exposição, sem posição/conquista no catálogo. A decisão anterior está documentada em CARTAS-INTEGRADAS.
- PNG original em `cartas/`: Loira, 1024×1536.
- WebP Loira: 320×359, 640×718, 939×1054; Kuldhara: 320×400, 640×800, 960×1200 e 1100×1375. São recursos derivados/legados; as fontes oficiais atuais apontam aos JPG.
- Dois SVG de versos reaproveitados pelo sistema visual.

`public/lendas-ra.json` contém 60 entradas com história e origem preenchidas. Oito caminhos de imagem oficiais resolvem em disco; **52 entradas sem ilustração**. `public/card-art.js` e `public/legend-images.js` explicitam associações; `src/data/lendas.ts` é sincronizado. O seed persiste os mesmos IDs e campos em legends; sua execução real não foi feita.

As primeiras oito cartas ilustradas são as listadas acima, exceto Saci. Exemplos sem arte: Bakunawa, Flautista de Hamelin, Negrinho do Pastoreio, Boitatá, Baba Yaga e Kappa. A lista completa é calculável pelos caminhos do JSON e tem inventário histórico em IMAGENS.md.

Não há campos estruturados de referências/fontes no catálogo oficial. Existem menções esparsas a reportagens/estudos nas histórias e rótulos de fonte no legado `public/casa/js/lendas.js`, reaproveitados por `house-catalog.js`; rótulos como “CATÁLOGO OFICIAL” não são referência bibliográfica. Não foi validada a precisão cultural das narrativas. Kayako é explicitamente classificada como ficção cinematográfica; distinguir criações contemporâneas, tradição oral e fatos históricos na curadoria. **O mínimo de dez cartas completas e referenciadas não está atendido.** Não se criaram fontes nem imagens.

## 12. Estado do sistema de recompensas

POST `/api/draws`: autenticado, corpo vazio, chave Idempotency-Key obrigatória e validada. `collection.draw` bloqueia a linha do usuário no PostgreSQL, recupera snapshot anterior da mesma chave, escolhe uniformemente entre lendas não adquiridas, insere conquista e histórico, e confirma na rota. Chaves diferentes permitem aberturas sucessivas no mesmo dia. UserCard é único por usuário/lenda. Datas de histórico são UTC geradas pelo servidor, sem regra diária America/Sao_Paulo.

Ao completar 60, retorna `legend:null`, não sorteia repetida; interface encerra novas conquistas. `draw_requests` guarda histórico/snapshot, mas não é daily_rewards nem há endpoint/tela de histórico pessoal dedicado. `/api/rewards/open` não existe. Concorrência PostgreSQL tem teste escrito; não executado agora. Idempotência não equivale a limitar um resgate diário. Não há tempo mínimo de permanência exigido para sorteio.

## 13. Estado da realidade aumentada

Fluxo ativo: `public/ra.html` → ra.js → QRTrackerThree/qr-pose.js → Three local. Usa jsQR, não MindAR. Nenhum `.mind` encontrado. QR 01 abre site; QR 02 contém a URL exata `/ra.html` da mesma origem. O próprio QR 02 é também o alvo do rastreamento por cantos; não há imagem física separada. URLs com parâmetros/QR de outra origem não são aceitas pelo comparador atual. Não há QR exclusivo por conta.

Câmera exige secure context/getUserMedia; solicitação em clique, vídeo muted/playsInline, preferência pela traseira, mensagens para negação, ausência e câmera ocupada. API e modelo carregam independentemente da permissão; indisponibilidade de coleção bloqueia sorteio, não o botão da câmera. A pose usa FOV aproximado, recorte do vídeo e suavização; não mede escala física nem oferece SLAM ou âncora persistente. Alvo ausente por 350 ms esconde grupo; reenquadramento recupera após leituras válidas.

Baú usa GLB externo, escala .52, deslocamentos do modelo e grupo relativos ao alvo. Toque em abrir aguarda resposta real de `/draws`; só então toca OpenChest. Carta emerge, recompensa HTML mostra três faces; escanear novamente toca CloseChest e exige afastar alvo. Mixer e recompensa usam tempo real, com teste de regressão para poucos quadros. Perda do alvo pode ocultar a abertura; comportamento físico e proporções finais permanecem não validados.

`pagehide` chama dispose: interrompe stream/RAF, loop Three, listeners e recursos de geometria/material/textura. A verificação automática de dispose cobre o rastreador, não prova ausência de todo vazamento em aparelhos. O carregamento GLB é assíncrono e não tem cancelamento explícito ao sair; revisar ciclo de vida se perfis reais mostrarem recursos retidos. HUD tem role=status/aria-live; overlay da recompensa tem aria-modal, mas não há contenção completa de foco no código RA.

## 14. Estado da modelagem 3D

`public/models/bau-das-lendas.glb`: **358.744 bytes**, **6.572 triângulos**, 8 materiais, 14 meshes renderizáveis devido à divisão por material. Isso não significa 14 objetos autorais: o modelo preserva Base/Tampa sob BauDasLendas. Loader e animações carregaram com Three instalado.

Clipes: Idle 2 s (0° de deslocamento); OpenChest 2 s (aproximadamente 105°); CloseChest 2 s (aproximadamente 105° no sentido de fechamento). Verificação numérica de início/fim não é revisão visual de interpenetração ou toda topologia. O modelo já substitui as antigas primitivas do baú em RA. Materiais carregados sem textura externa; não houve render físico nesta etapa. Não há `.blend` no repositório pesquisado; eventual arquivo fora dele não foi inventariado.

Consultas MCP get_addon_status/get_scene_info falharam por conexão indisponível em localhost:9876. Cena atual, materiais no Blender, pivô autoral e estado das ações lá não puderam ser inspecionados agora. Nenhuma ferramenta de mutação ou geração foi usada. Melhorias futuras podem reexportar o mesmo GLB mantendo nomes Idle/OpenChest/CloseChest e o contrato do carregador; não se precisa substituir o fluxo da aplicação.

## 15. Estado da experiência educativa

Há leitura de histórias/origens em dossiês, álbum e galeria, busca e exploração temática. Não há quiz/desafio cultural com lógica identificada. Assombrações e easter eggs não demonstram, por si, atividade educativa. Não foi cronometrado percurso de 5–15 minutos, nem houve avaliação com estudantes. Fontes e linguagem precisam de revisão curatorial. Há conteúdo de terror/violência que deve ser contextualizado para o público universitário/alvo definido.

Interface contém controles de movimento reduzido, alt em imagens, labels, teclado em vários componentes e avisos de estado. Não se realizou auditoria WCAG, contraste ou leitor de tela. Textos pequenos no HUD/cartas e gestão de foco da RA precisam de avaliação. Recompensa depende do toque/API, não de ficar um tempo mínimo lendo; preservar essa separação.

## 16. Estado da infraestrutura

Kubuntu: frontend tem dependências disponíveis e compila. Backend não pode ser considerado pronto: falta pytest no Python disponível, nenhum venv Linux localizado, `.env` ausente, banco não consultado. `docker` e `psql` existem no PATH; daemon, containers e conectividade não foram testados. Script local de PostgreSQL é específico de Windows. Docker oferece caminho Linux possível, ainda não aprovado por execução.

Compose usa PostgreSQL 17, persistência em volume, espera saúde do banco e aplica migrations/seed antes de Uvicorn. Não iniciado para preservar estado. Dockerfile roda usuário não root e não publica frontend. É necessário reverse proxy/hospedagem do dist, TLS e encaminhamento `/api` na mesma origem. Não há configuração TLS/reverse proxy de produção completa identificada no Compose. Cookies Secure e ALLOWED_ORIGINS devem refletir HTTPS real; VITE_PUBLIC_URL só altera conteúdo do QR, não configura câmera/CORS.

`npm start` faz build e preview; `npm run preview` reutiliza dist. Ambos não iniciam API/PostgreSQL. Hooks predev/prebuild regravam arquivos gerados, por isso não foram usados na auditoria. Vite preview é ferramenta de teste local, não hospedagem definitiva. Arquivos de raiz fora do build exigem atenção às entradas. README principal mistura estágio inicial e comandos novos; consolidar instalação antes de entrega.

## 17. Matriz de requisitos

Legenda de prioridade: P0 bloqueia validação/decisão central; P1 necessária para requisitos/segurança; P2 qualidade/organização. “CONCLUÍDO E TESTADO” se limita à evidência descrita, não aprova produção. Status de APIs lidas sem execução Python permanece “IMPLEMENTADO, MAS NÃO TESTADO”.

| Funcionalidade | Status atual | Arquivos | Evidência / problema | Correção recomendada | Prioridade | Dependências |
| --- | --- | --- | --- | --- | --- | --- |
| Dependências Node | CONCLUÍDO E TESTADO | package/lock | npm ls sem faltantes diretas | Manter lock | P2 | Node compatível |
| TypeScript/build | CONCLUÍDO E TESTADO | tsconfig, vite | tsc e build temporário aprovados | Revisar bundle | P2 | node_modules |
| Inicialização API documentada | IMPLEMENTADO COM ERROS | README, backend/main.py | Comando pode subir API mínima | Documentar app.main:app | P0 | Responsável técnico |
| Banco local integral | BLOQUEADO | db/session, .env.example | Config/ambiente Python ausentes | Preparar ambiente sem tocar dados existentes | P0 | Credenciais e autorização |
| PostgreSQL sem fallback | IMPLEMENTADO, MAS NÃO TESTADO | db/session.py | URL explícita; sem substituição automática | Confirmar conexão read-only | P0 | Banco acessível |
| Migrações/FKs/unicidade | IMPLEMENTADO, MAS NÃO TESTADO | models, alembic/0001 | Cinco tabelas e constraints | Validar banco real | P1 | PostgreSQL de teste |
| SQLite isolado | IMPLEMENTADO, MAS NÃO TESTADO | tests/conftest.py | tmp_path e engine próprio | Rodar suíte e verificar FKs | P1 | Python dependências |
| Cadastro e e-mail único | IMPLEMENTADO, MAS NÃO TESTADO | routers/auth, schemas | Validação, normalização, 409 | Executar testes HTTP | P1 | API/test DB |
| Login/logout/sessão | IMPLEMENTADO, MAS NÃO TESTADO | auth, deps, Conta | JWT e sessão revogável | Confirmar reload/logout real | P1 | API/test DB |
| Argon2/JWT/HttpOnly | IMPLEMENTADO, MAS NÃO TESTADO | core/security, auth | Configuração e testes escritos | Executar testes de segurança | P1 | Python |
| Secure/HTTPS | PARCIALMENTE IMPLEMENTADO | config, compose | Flag existe; Compose false local | Configurar produção HTTPS | P1 | Infra/domínio |
| CSRF/CORS | IMPLEMENTADO, MAS NÃO TESTADO | main.py, public/api.js | Origem/header obrigatórios | Testar origem de implantação | P1 | API |
| Isolamento de coleção | PARCIALMENTE IMPLEMENTADO | album, collection, testes | Node de troca de conta passa; SQL não rodou | Validar dois usuários PostgreSQL | P1 | DB isolado |
| Rate limiting | NÃO IMPLEMENTADO | auth/game | Nenhum limitador encontrado | Limitar tentativas e tráfego | P1 | Política/infra |
| Recuperação/verificação e-mail | NÃO IMPLEMENTADO | auth/Conta | Sem rotas/fluxo | Definir necessidade e implementar | P2 | Serviço e-mail |
| Catálogo 60 histórias/origens | PARCIALMENTE IMPLEMENTADO | lendas-ra.json | Campos presentes; fontes incompletas | Curadoria e fontes | P1 | Pesquisa humana |
| Dez cartas completas | PARCIALMENTE IMPLEMENTADO | card-art, imagens | Oito ilustradas oficiais, sem bibliografia estruturada | Completar ao menos dez referenciadas | P1 | Artes/fontes autorizadas |
| Álbum/progresso no servidor | IMPLEMENTADO, MAS NÃO TESTADO | game.py, Album.tsx | Consultas filtradas, estado de erro | Validar persistência HTTP/DB | P1 | API/PostgreSQL |
| Troca de conta no frontend | CONCLUÍDO E TESTADO | colecao.js, collection.test | Teste Node de resposta atrasada passa | Ampliar a navegador | P2 | API real |
| Recompensa diária | NÃO IMPLEMENTADO | collection.py | Chaves distintas abrem ilimitado | Regra backend e constraint data/usuário | P0 | Aprovação da regra |
| Fuso São Paulo de resgate | NÃO IMPLEMENTADO | models/collection | UTC de histórico não é dia local | Definir dia no servidor | P1 | Regra diária |
| daily_rewards e rewards/open | NÃO IMPLEMENTADO | models/game | Nomes/rota inexistentes | Projetar migração/contrato | P1 | Aprovação/backend |
| Preferir não adquiridas | IMPLEMENTADO, MAS NÃO TESTADO | collection.py | Candidatos excluem UserCard | Rodar testes Python | P1 | Test DB |
| Repetir após completar | NÃO IMPLEMENTADO | collection.py | Retorna legend:null | Definir sorteio após 60 | P1 | Regra de produto |
| Álbum sem duplicatas | IMPLEMENTADO, MAS NÃO TESTADO | UserCard/0001 | UNIQUE user_id/legend_id | Validar SQL | P1 | DB |
| Concorrência/idempotência | PARCIALMENTE IMPLEMENTADO | collection/tests | Lock PG e snapshot; mock Node de retry passa | Rodar concorrência PG | P1 | DB de teste |
| Histórico de resgates visível | PARCIALMENTE IMPLEMENTADO | DrawRequest | Histórico interno sem UI/GET dedicado | Criar contrato após decisão diária | P2 | Backend/UI |
| Conta/navegação/galeria | IMPLEMENTADO, MAS NÃO TESTADO | Conta/App/casa | Telas e integração lidas; sem navegador atual | Testar percurso desktop/mobile | P1 | API/browser |
| Câmera/permissão/cleanup | CONCLUÍDO E TESTADO | qr-tracker.test | Testes simulados passam | Validar aparelhos físicos | P1 | HTTPS/smartphone |
| MindAR e .mind | NÃO IMPLEMENTADO | qr-tracker/package | jsQR ativo; sem alvo .mind | Alinhar decisão arquitetural | P0 | Documentos/responsável |
| QR 02/pose/perda e retorno | CONCLUÍDO E TESTADO | qr-pose/qr-tracker | Testes numéricos e simulados passam | Calibrar/validar impressão e lente | P1 | Dispositivo físico |
| QR individual por conta | NÃO IMPLEMENTADO | Portais/qr-pose/auth | Dois QR compartilhados | Projetar vínculo seguro | P2 | Regra de acesso |
| Ancoragem/escala física | PARCIALMENTE IMPLEMENTADO | qr-pose/ra.js | Homografia e FOV aproximados | Validar estabilidade física | P1 | Marcador/celular |
| Baú GLB e três ações | CONCLUÍDO E TESTADO | models/chest-model | Parse real e rotação 105° | Conferir visualmente no aparelho | P1 | WebGL/QR |
| Abertura/revelação/retry | CONCLUÍDO E TESTADO | ra/api-ra.test | Fluxo mock e baixo FPS aprovados | Teste HTTP real+vídeo | P1 | API/test DB |
| Blender MCP/cena atual | BLOQUEADO | Servidor localhost:9876 | Consultas sem conexão | Abrir Blender e conectar MCP | P2 | Intervenção humana |
| Projeto autoral .blend | BLOQUEADO | Repositório | Nenhum .blend localizado | Identificar arquivo original | P2 | Usuário/Blender |
| Fontes culturais verificáveis | PARCIALMENTE IMPLEMENTADO | JSON/legado lendas | Menções dispersas, sem bibliografia uniforme | Curadoria por carta | P1 | Pesquisa |
| Atividade cultural curta avaliativa (T19) | CANCELADA POR DECISÃO DE ESCOPO | Planejamento histórico | Achado original: não implementada na auditoria de 20/11 | Não implementar; manter cartas, Flip, histórias, dossiês e exploração cultural | — | Decisão de 23/11/2026 |
| Percurso 5–15 minutos | IMPLEMENTADO, MAS NÃO TESTADO | App/casa/dossiês | Exploração/leitura existem; tempo não medido | Roteiro e teste com usuários | P1 | Atividade e conteúdo |
| Responsividade/acessibilidade | PARCIALMENTE IMPLEMENTADO | CSS/Album/ra | Media queries, alt, aria; foco RA incompleto | Auditoria física/teclado/leitor | P1 | Browser/aparelhos |
| Assombrações demonstráveis | IMPLEMENTADO COM ERROS | EventCatalog/hauntings.test | Uma asserção de sequência falha | Decidir sequência e reconciliar | P1 | Autor dessa parte |
| Docker/Kubuntu | PARCIALMENTE IMPLEMENTADO | compose/Dockerfile/local_postgres | Compose existe; auxiliar é Windows | Validar caminho Linux | P0 | Dependências/config |
| Publicação mesma origem | PARCIALMENTE IMPLEMENTADO | Vite/API/docs | Proxy local; sem TLS de produção pronto | Preparar deploy futuro | P1 | Autorização/infra |

## 18. Resultados dos testes realizados

| Classificação | Comando/verificação | Resultado desta execução |
| --- | --- | --- |
| APROVADOS E REPROVADO | `node --test --test-isolation=none tests/*.test.mjs` | 33 testes: 32 passaram, 1 falhou (sequência das assombrações). Exit 1; suíte completa NÃO aprovada. |
| APROVADO | `node_modules/.bin/tsc --noEmit` | Exit 0. Apenas escopo TypeScript configurado. |
| APROVADO | `node_modules/.bin/vite build --outDir /tmp/bau-auditoria-20261120-dist` | Exit 0; aviso de chunk >500 kB e saída fora da raiz. Sem prebuild/sincronização; não alterou dist do projeto. |
| APROVADO | `npm ls --depth=0` | Dependências diretas instaladas, exit 0. Não é auditoria CVE. |
| APROVADO | GLTFLoader.parseAsync + AnimationMixer sobre GLB real | 6.572 triângulos, 8 materiais, clipes de 2 s; Idle 0°, Open/Close ~105°. Sem render visual. |
| APROVADO | Inventário com pathlib/Pillow/SHA-256 | 19 imagens, dimensões lidas, zero duplicatas exatas; oito caminhos oficiais existentes. |
| BLOQUEADO | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -c backend/pytest.ini backend/tests -p no:cacheprovider -q` | `No module named pytest`. Nenhum teste Python executado/aprovado. |
| BLOQUEADO | MCP get_addon_status/get_scene_info | Blender inacessível em localhost:9876; cena não inspecionada. |
| NÃO EXECUTADO | Smoke HTTP, Playwright, concorrência PostgreSQL | API/config/DB isolado não preparados; scripts podem criar contas e conquistas. Não executados contra dados existentes. |
| NÃO EXECUTADO | Docker Compose, serviços locais e PostgreSQL real | Não iniciar nem modificar infraestrutura nesta auditoria. |
| DEPENDE DE HARDWARE/HTTPS | Android/iPhone, câmera, impressão, estabilidade, toque, performance, leitor de tela | Sem teste físico nesta execução. |

Os relatórios de 04–05/11 em docs têm resultados anteriores em Windows/PostgreSQL. Não substituem os testes bloqueados acima. Não foram instaladas dependências. Nenhum teste de produção foi simulado como aprovação.

## 19. Ordem recomendada de implementação

1. Confirmar documentos e regras: diário versus ilimitado, repetidas após coleção, papel de MindAR e QR exclusivo. Não migrar com ambiguidade de produto.
2. Consolidar execução local Kubuntu, entrada correta da API, ambiente Python e banco exclusivo de teste; executar autenticação/persistência/concorrência antes de mexer no banco de demonstração.
3. Após aprovação, desenhar recompensa diária com migração, unicidade por usuário/dia São Paulo, histórico e idempotência. Manter conquistas antigas.
4. Corrigir divergência das assombrações de acordo com o roteiro aprovado.
5. Recomendação histórica: completar dez cartas ilustradas e referenciadas e revisar curadoria. A proposta então citada de acrescentar atividade cultural avaliativa foi cancelada em 23/11/2026; manter leitura e exploração cultural, sem avaliação ou tempo obrigatório.
6. Validar GLB/RA em HTTPS em Android/iPhone; só então decidir ajuste de rastreador, escala, desempenho e ciclo de vida.
7. Acessibilidade, rate limit, observabilidade, backup e configuração de produção; publicar apenas com autorização futura.

## 20. Comandos necessários para executar o projeto

Comandos orientativos; não executados automaticamente nesta auditoria, exceto os testes explicitamente relatados. Não sobrescrever `.env` nem inicializar um banco que contenha dados. Não rodar seeds/migrations em produção sem plano e autorização.

Frontend, com dependências existentes:

```sh
npm start
# build e preview local na porta 5175; requer API separada
# durante desenvolvimento: npm run dev
# para reutilizar o último build: npm run preview
```

Backend no Kubuntu, depois que o usuário autorizar instalação caso necessária:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.lock.txt
cd backend
# Preparar .env local a partir de .env.example SOMENTE se não existir.
# Configurar banco PostgreSQL autorizado, JWT secreto, cookie e origens.
# Em banco novo/teste autorizado: aplicar alembic upgrade head e seed separadamente.
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Para testes Python isolados, com dependências já disponíveis:

```sh
cd backend
# Usar ambiente de teste sem TEST_DATABASE_URL de produção.
# SQLite usa tmp_path; PostgreSQL só com banco TEST_DATABASE_URL dedicado.
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m pytest -p no:cacheprovider -q
```

Não executar `backend/run_tests.py` sem revisar configuração: foi feito para instância Windows local e lê `.env`. Não usar `local_postgres.py` no Kubuntu como se fosse portátil. Compose (`cd backend && docker compose up --build`) só depois de preparar segredos e autorizar criação/início de serviços; não foi executado aqui. Para smartphone, usar HTTPS na mesma origem com `/api` encaminhado, COOKIE_SECURE=true e ALLOWED_ORIGINS exata. Abrir por IP HTTP não habilita normalmente a câmera.

## 21. Bloqueios que dependem de intervenção humana

- Disponibilizar One Page, XRD e Plano de Projeto e decidir as divergências de regra/tecnologia.
- Autorizar preparação de dependências Python ausentes e fornecer configuração local segura, sem compartilhar credenciais no relatório/chat.
- Identificar PostgreSQL de desenvolvimento e banco separado de testes; nenhum estado atual foi presumido.
- Abrir Blender/conectar MCP e identificar o .blend autoral, se revisão da cena for necessária.
- Disponibilizar Android/iPhone e origem HTTPS autorizada para validação física.
- Fornecer/revisar fontes e autorizar ilustrações necessárias; decidir público e roteiro educativo.
- Decidir a sequência de apresentação esperada para o teste reprovado.

Auditoria encerrada. Nenhuma correção, mudança de interface, banco, cena, imagem, dependência ou serviço externo foi realizada. Apenas este documento foi criado; alterações locais preexistentes foram preservadas.
