# Etapa 04 — Recompensas diárias e histórico

Data: 20/11/2026. Execução local exclusivamente com dados fictícios. Referências consultadas: auditoria, etapas 02/03, diretrizes e PDFs One Page, XRD e Plano de Projeto. Os PDFs foram preservados. A decisão específica desta etapa mantém 60 cartas e jsQR, sem antecipar mudanças de Flip/navegação/MindAR.

## 1. Objetivo

Implementar uma recompensa por usuário e dia de calendário America/Sao_Paulo, histórico individual e contador informativo, com idempotência, transações, concorrência e preservação dos registros antigos.

## 2. Estado anterior

POST /api/draws concedia cartas não adquiridas em solicitações sucessivas com chaves diferentes. DrawRequest guardava snapshot idempotente, UserCard impedia duplicação no álbum e o PostgreSQL bloqueava a linha do usuário. Em 60/60, o serviço antigo retornava legend=null. Não havia daily_rewards, disponibilidade diária, histórico consultável nem contador.

## 3. Regras implementadas

Uma concessão por usuário em cada data de São Paulo, determinada apenas no backend. Renovação à meia-noite local, não 24 horas após resgate. Sem acumular dias ausentes, streaks ou novos atributos. Antes de 60/60, seleção entre faltantes; depois, repetidas são permitidas e registradas sem duplicar a coleção. Retry confirmado devolve o mesmo resultado e não consome outro dia. Regra diária é independente do rate limiting técnico.

## 4. Arquivos criados nesta etapa

- `backend/alembic/versions/0002_daily_rewards.py`.
- `backend/tests/test_rewards.py` e `backend/tests/test_reward_migration.py`.
- `backend/tests/browser_reward_fixture.py`, limitado ao banco/contas fictícias desta etapa.
- `public/reward-clock.js` e `src/Recompensas.tsx`.
- `tests/reward-clock.test.mjs`, `tests/stage04-rewards-browser.mjs`, `tests/stage04-album-browser.mjs`.
- Este relatório.

Arquivos não rastreados de etapas anteriores e os PDFs já presentes não foram tratados como criações desta etapa.

## 5. Arquivos modificados nesta etapa

Backend: `app/models/__init__.py`, `app/services/collection.py`, `app/routers/game.py`, `tests/conftest.py`, `tests/test_game.py`, `tests/test_security.py`, `tests/test_bootstrap.py`.

Frontend: `public/api.js`, `public/ra.js`, `src/api.ts`, `src/Conta.tsx`, `src/Album.tsx`.

Testes frontend: `tests/api-ra.test.mjs`, `tests/auth-session.test.mjs`. Documentação: `README.md`, `backend/README.md`, `docs/DIRETRIZES-DO-PROJETO.md` e este documento. Demais alterações locais das etapas anteriores foram preservadas. Sem mudança de dependências, imagens, catálogo, estilos globais, GLB, shaders, rastreador ou documentos acadêmicos.

## 6. Tabela daily_rewards

Campos: id UUID como String(36); user_id FK users; legend_id FK legends; reward_date Date (dia local); claimed_at DateTime(timezone=True), enviado em UTC; draw_request_id FK draw_requests e único; is_new Boolean para distinguir novas/repetidas nativas.

Unicidade `uq_daily_user_date(user_id,reward_date)` impede duplicação de concessões nativas por dia. Índice `ix_daily_rewards_user_claimed(user_id,claimed_at)`. Preservadas todas as constraints anteriores, especialmente UserCard(user_id,legend_id) e DrawRequest(user_id,idempotency_key). Nenhuma segunda operação independente de sorteio criada.

## 7. Migração Alembic

Revisão **0002**, dependente de 0001. Adiciona somente a tabela/constraints/índice, sem modificar 0001 nem registros existentes. Validada do zero e sobre schema 0001 com contas, conquistas e múltiplos sorteios antigos. Alembic check sem divergência de metadata. Migração aplicada apenas em schemas novos de teste e no banco isolado bau_test criado nesta etapa; nenhum banco real de desenvolvimento/produção migrado.

Não foi executado downgrade. Antes de implantar em ambiente real, obter autorização, backup e janela de atualização; não manter servidores antigos ilimitados operando junto dos novos. Clientes antigos usando /draws são compatíveis com o novo servidor, mas código servidor antigo não implementa a regra.

## 8. Preservação do legado

**Sem backfill de sorteios antigos em daily_rewards.** Importar vários sucessos de um mesmo dia violaria UNIQUE usuário/data ou exigiria perda de informação. DrawRequest é a fonte de histórico completa e continua intacta.

Para elegibilidade, o serviço procura DrawRequest do usuário com legend_id não nulo no intervalo UTC correspondente ao dia local. Esse campo era gravado pelo serviço anterior somente quando concedia carta; registros antigos legend_id=null não consumem recompensa. Entre múltiplos sucessos antigos, o representante do dia é o primeiro por created_at e id, deterministicamente. Todos continuam no histórico. O próprio dia de ativação fica utilizado se houver um sucesso anterior naquele dia.

Não se reconstrói is_new quando o legado não possui evidência: retorna null e a UI informa “tipo não informado”. Records legados sem concessão aparecem como registro sem carta, successful=false. Snapshots idempotentes não são reescritos; uma chave antiga pode retornar contrato anterior, inclusive legend=null. Conquistas administrativas que só tenham UserCard, sem registro de sorteio, não são inventadas como resgates diários.

## 9. Operação diária

1. Autorizar pela sessão autenticada.
2. Bloquear a linha do usuário no PostgreSQL.
3. Recuperar snapshot da mesma chave, se existente.
4. Capturar UTC atual no servidor, após obter o lock.
5. Calcular dia e limites UTC de São Paulo; conferir catálogo e sucessos do dia.
6. Selecionar carta e, se nova, inserir UserCard.
7. Inserir DrawRequest com snapshot e DailyReward associado.
8. Commit antes de responder.

Recompensa já utilizada gera 409 e não grava tentativa como novo resgate. Erro antes de confirmar resulta em rollback. Status de frontend pode ficar desatualizado entre consulta e clique; a concessão verifica tudo novamente no servidor.

## 10. Fuso e relógio

ZoneInfo('America/Sao_Paulo'); datas/horas conscientes de fuso. O backend calcula limites com a meia-noite local de cada data, convertida para UTC, respeitando regras do fuso em vez de somar 24 horas ao último resgate. UTC 02:59:59 corresponde a 23:59:59 local nas datas de teste; um segundo depois permite outro dia.

created_at/claimed_at nativos são UTC. SQLite devolve timestamps sem tz; a convenção UTC do schema anterior é reaplicada explicitamente ao lê-los. Datas locais são ISO YYYY-MM-DD e horários ISO 8601 com offset. Nenhum horário, data ou user_id enviado pelo visitante determina elegibilidade. Os relógios controláveis dos testes substituem apenas o serviço de recompensas, não a validação real de expiração JWT.

## 11. Seleção uniforme

Reaproveitado secrets.randbelow entre candidatas ordenadas pelo número. Lendas já adquiridas são excluídas enquanto restarem faltantes. O teste original de 60/59 candidatas continua, agora em dias controlados diferentes. Catálogo exige exatamente 60 registros; vazio, parcial ou falha de consulta retorna 503 e não consome recompensa. IDs, histórias, origens e artes não foram alterados.

## 12. Cartas repetidas

Após 60/60, candidatas passam a ser as 60 lendas. is_new=false e is_duplicate=true. Não inserir nem alterar UserCard: progresso fica 60/60 e a data original de conquista permanece. DailyReward e DrawRequest registram o novo resgate. A UI permite abertura em álbum completo e informa “Carta repetida”; não foi adicionado inventário de cópias, moeda, XP ou raridade.

## 13. Idempotência

Consulta usuário/chave ocorre antes da disponibilidade e do relógio. Uma resposta confirmada é devolvida sem reconstrução, mesmo após a meia-noite ou quando o catálogo depois estiver indisponível. Não acrescenta histórico, UserCard ou DailyReward. Chaves são isoladas por usuário. Chaves novas no mesmo dia recebem 409; no próximo dia podem conceder. Repetir uma chave antiga no próximo dia não impede usar outra chave para aquele novo dia.

A RA conserva a chave pendente em sessionStorage separado por conta para recuperar resposta perdida, sem usá-la para autorizar elegibilidade. “RECUPERAR ABERTURA” é identificado como recuperação, não nova recompensa. Conflito diário de uma chave sem resultado confirmado limpa a tentativa local; erros de transporte preservam a chave.

## 14. Transações e concorrência

SELECT FOR UPDATE do usuário serializa os dois endpoints no PostgreSQL READ COMMITTED; a hora só é lida depois do lock para não aplicar um dia anterior após esperar à meia-noite. UNIQUE usuário/data é barreira adicional. Escritas são confirmadas juntas; teste injeta falha no insert de DailyReward depois das outras escritas e comprova rollback integral/disponibilidade preservada.

Concorrência PostgreSQL em TestClient e HTTP de rede: oito pedidos com chaves distintas resultaram em **1 sucesso e 7 conflitos**. Pedidos com a mesma chave recuperam um único snapshot. Mistura de /draws e /rewards/open compartilha o mesmo lock/regra. SQLite não é apresentado como prova de concorrência real; produção continua exigindo PostgreSQL.

## 15. Endpoints

Todos exigem autenticação válida e retornam no-store. POSTs preservam CSRF/CORS e rate limit por usuário do sorteio, compartilhado entre aliases.

| Endpoint | Contrato |
| --- | --- |
| GET /api/rewards/status | available, local_date, server_now, next_available_at, timezone, complete, progress e today_reward (ou null). |
| POST /api/rewards/open | Idempotency-Key obrigatório; corpo vazio/{}; concede ou recupera snapshot. |
| POST /api/draws | Alias do mesmo handler/serviço, sem bypass diário. |
| GET /api/rewards/history | limit padrão 10, máximo 50; offset padrão 0, máximo 100000; items/total/has_more. |

Resposta nativa de abertura preserva id/legend/progress/remaining/complete e acrescenta is_new/is_duplicate/reward_date/claimed_at/next_available_at/timezone. Campos extras no corpo são rejeitados. Consulta pública do catálogo e endpoints do álbum permanecem.

Erros: 401 sessão inválida; 403 proteção de origem/header; **409 detail.code=DAILY_REWARD_USED**, message e status atual; **429** excesso técnico com Retry-After; 422 entrada inválida; 503 catálogo/banco indisponível. Cliente preserva detalhes estruturados em ApiError sem expor stack interno. Retry idempotente confirmado é 200, não novo erro de negócio.

## 16. Histórico individual

Query parte de DrawRequest, filtra user_id da sessão, une DailyReward/Legend e ordena created_at DESC, id DESC. Inclui snapshot da carta quando disponível e fallback ao catálogo para identificador conhecido. Horário UTC, data local, tipo comprovado ou null, legacy e successful. Nunca aceita proprietário arbitrário. Não oculta sorteios antigos múltiplos nem inventa carta em registro sem concessão.

Perfil existente recebe `<details>` com loading, vazio, erro/retry, miniatura original quando disponível, nome, data/hora local, tipo e “Carregar mais registros”. Nenhuma aba principal adicionada. Paginação por offset é adequada ao MVP; inserções concorrentes provocam invalidação/reconsulta da lista, não append cego de resposta anterior.

## 17. Contador informativo

`public/reward-clock.js` é compartilhado entre React e RA. Usa server_now e next_available_at, acrescidos somente de tempo monotônico performance.now, sem usar Date.now para elegibilidade. Exibe disponibilidade ou horas/minutos. Atualiza no máximo a cada 30 s; ao zerar mostra verificação e consulta novamente (com pequena espera de 1 s para evitar laço acelerado).

Foco, visibilidade, evento online e evento de resgate provocam revalidação. Erros tentam novamente após 30 s ou evento de recuperação; payload inválido não cria timer de 0 ms. dispose cancela timer e invalida respostas pendentes. Trocar relógio do navegador não muda a regra; mesmo um contador manipulado nunca autoriza resgate no servidor.

## 18. Integração com o álbum

Recompensa confirmada emite bau-reward-change sem dados pessoais para atualizar consumidores e outras abas. Álbum reaproveita sua consulta autenticada e seus guards contra resposta antiga. A consulta recarrega cartas desbloqueadas e progresso do servidor. Carta repetida não aumenta posições. Testes de UI verificam nova carta no número correto, reload sem duplicação e troca para conta vazia.

## 19. Integração com a RA

Modelo, materiais, Idle/OpenChest/CloseChest, QR e rastreador intactos. A RA consulta status antes da câmera, permite câmera independentemente do catálogo/API e só oferece nova abertura se disponível. Confirmação de /rewards/open antecede OpenChest e revelação. Em 409 aceita status do servidor, não anima nem cria carta. Usuário indisponível vê contador e pode voltar ao álbum/perfil. Álbum completo não bloqueia resgate repetido no dia elegível.

Chave pendente pode recuperar abertura anterior já confirmada; essa opção é identificada. “Voltar ao baú” fecha a tampa sem fingir novo sorteio. Link de consulta ao Grimório foi preservado. Sessão/troca de conta limpa recompensa, texto, textura e contador anteriores.

## 20. Alterações funcionais e falha corrigida

Nenhum redesenho, alteração de abas ou novo Flip. Novo componente no perfil usa tipografia/cores e botões existentes, miniaturas preservadas, quebra de linha, botões de 44 px e lista vertical. Apenas mensagens/controles necessários mudaram na RA.

A checagem adicional encontrou timeout real na paginação WebKit 320. React e importação do módulo público podiam criar canais BroadcastChannel separados na mesma página e duplicar o evento local de resgate, interrompendo a paginação. Cliente agora compartilha revisão/canal por documento, sem armazenar JWT ou dados privados nessa estrutura. Revisão explícita da lista reinicia consulta invalidada. Teste Node e teste de browser verificam um evento por concessão mesmo com duas importações. Sincronização entre documentos e guards de sessão foram preservados.

## 21. Resultados SQLite

**41 APROVADOS**, além de 8 testes gerais compartilhados com a suíte. Regra diária, fronteira de dia/UTC, repetição, histórico, paginação, autenticação/segurança e migração com legado. **3 IGNORADOS**: as variantes de concorrência que exigem PostgreSQL real. FKs ativadas e constraint de diário testada. O teste de catálogo parcial/vazio não grava DailyReward/DrawRequest.

## 22. Resultados PostgreSQL/Python

**44 casos PostgreSQL APROVADOS**, incluindo concorrência de ambos os endpoints, unicidade, rollback, modelo/schema e preservação do legado. **8 testes gerais APROVADOS**. Total: **93 APROVADOS, 3 IGNORADOS, nenhum reprovado** (8 gerais, 41 SQLite e 44 PostgreSQL). JUnit local em /tmp/bau-etapa04-results.xml. Warning preexistente Starlette/HTTPX permanece.

Suíte completa executada com .env.test e schemas UUID próprios; migration antiga inalterada. Testes anteriores de sorteios sucessivos foram atualizados justificadamente: avançam o relógio de recompensas entre dias; em coleção completa esperam repetida; concorrência com chaves distintas espera um sucesso. Testes de segurança/idempotência/isolamento não foram removidos. O limite técnico continua testado separadamente do 409 diário.

## 23. Resultados Node

**43 APROVADOS, 1 REPROVADO**, 44 casos no total. Falha conhecida de sequência em tests/hauntings.test.mjs permanece intacta e fora do escopo. Novos testes cobrem contador/zero/cleanup/status malformado, relógio do navegador, notificação única, conflito diário sem animação, repetida em 60/60 e recuperação pendente. Mock de RA continua distinguido do rastreamento real com vídeo sintético.

Comando: `node --test --test-isolation=none tests/*.test.mjs`.

## 24. TypeScript e build

`tsc --noEmit`, `npm run build`, sintaxe dos scripts e git diff --check APROVADOS. Build completo inclui os sincronizadores existentes, sem mudança do conteúdo das 60 lendas/artes. Chunk principal ~880 kB ainda gera aviso >500 kB; não se alegou melhoria de desempenho físico. pip check aprovado; nenhuma dependência Python/Node nova. Navegadores Playwright anteriores haviam sido removidos de /tmp e foram baixados novamente só no cache de teste, sem pacote administrativo/global.

## 25. Integração HTTP

API principal Uvicorn e preview Vite reais, cookie/CSRF/proxy reais e banco bau_test. **APROVADOS:** migração/seed/check, catálogo, concessão concorrente (1/7), snapshot repetido, status/histórico, isolamento entre contas e indisponibilidade mantida após reiniciar Uvicorn. Chave confirmada continua 200 depois do reinício e nova chave continua 409. Não foram usados mocks para essas respostas.

Orquestração local temporária /tmp/bau-stage04-http.py verifica portas livres e encerra apenas seus processos. Não iniciou Docker nem serviços administrativos. O cluster anterior da etapa 02 não existia mais; criado outro PG18 em diretório /tmp/bau-etapa04-pg-*, loopback:55439/bau_test, preservando .env.test. Nenhum banco real acessado.

## 26. Mobile e execução dos testes de interface

Chromium e WebKit com toque, **320×568, 360×800, 390×844 e 412×915**. Cenários: legado paginado, carta nova, catálogo completo/repetida, reload, login/logout, indisponibilidade antes da câmera, 409 legado, relógio de parede alterado e recuperação de rede. Medição de overflow horizontal nas áreas alteradas e inspeção de capturas locais. Histórico 320 legível, com rolagem vertical e sem overflow horizontal medido. Nenhuma reforma geral de responsividade.

Fluxo completo em Chromium 360 com QR/vídeo sintéticos: QR incorreto rejeitado, QR 02 reconhecido, GLB real, API real, animação/revelação, retorno e botão bloqueado no mesmo dia. Não é câmera física. Demais sete casos não usaram vídeo. Regressão de autenticação da etapa 03 foi executada nos dois engines; teste adicional do álbum também passou em ambos.

Primeiro conjunto de oito passou; uma checagem adicional de reconexão revelou a duplicação de evento descrita na seção 20. Ela foi reproduzida com diagnóstico por etapa, corrigida e coberta por teste. **Repetição final após correção: oito casos APROVADOS (os quatro tamanhos em ambos os engines), inclusive recuperação de rede e paginação.** A tentativa reprovada anterior foi mantida no relato, não mascarada. WebKit usa ambiente de processo isolado das variáveis Snap incompatíveis, como na etapa 03; nenhuma dependência administrativa instalada.

Para executar com API e preview apontando EXCLUSIVAMENTE para bau_test:

```sh
BAU_TEST_ORIGIN=http://localhost:5175 BAU_TEST_DATABASE=bau_test PLAYWRIGHT_BROWSERS_PATH=/tmp/bau-etapa04-browsers node tests/stage04-rewards-browser.mjs
BAU_TEST_ORIGIN=http://localhost:5175 BAU_TEST_DATABASE=bau_test PLAYWRIGHT_BROWSERS_PATH=/tmp/bau-etapa04-browsers node tests/stage04-album-browser.mjs
```

Script de browser cria contas fictícias. Fixture de legado/coleção completa recusa ambiente que não seja test, banco/porta isolados e conta sem prefixo “Etapa 04”. Não é endpoint nem arquivo público. Nunca executar esses testes sobre produção.

## 27. Pendências

Falha das assombrações, testes físicos Android/iPhone, HTTPS público, perfis reais de performance, acessibilidade completa e otimização do bundle permanecem pendentes. Sem publicação, nova navegação, Flip, cartas, desafios ou QR exclusivo. Docker não foi necessário para esta validação e seu daemon não foi iniciado. Atualização da base real requer autorização futura.

## 28. Limitações, comandos e implantação futura

Calendário depende do relógio correto do servidor e dados de fuso; contador é aproximado em latência e nunca autoriza resgate. Tipos de cartas legadas podem ser desconhecidos. Paginação por offset pode mudar com novas inserções; UI invalida/reconsulta após eventos. Garantia de concorrência comprovada em PostgreSQL, não em SQLite. Limites técnicos da etapa 03 permanecem em memória por processo; regra diária persiste no banco mesmo com múltiplos workers/reinício.

A API não comprova criptograficamente leitura física do QR; isso continua fora do MVP. Não há acúmulo diário, cópias negociáveis ou recompensa por tempo mínimo de uso.

Banco de teste atual pode ser retomado, enquanto os arquivos temporários existirem:

```sh
BAU_TEST_PG_DIR="$(cat /tmp/bau-etapa04-pg-path)"
/usr/lib/postgresql/18/bin/pg_ctl -D "$BAU_TEST_PG_DIR/data" -l "$BAU_TEST_PG_DIR/server.log" -o "-h 127.0.0.1 -p 55439 -k $BAU_TEST_PG_DIR" -w start
backend/.venv/bin/python backend/run.py --env-file backend/.env.test migrate
backend/.venv/bin/python backend/run.py --env-file backend/.env.test api
```

Em outro terminal, `npm start`; testes Python: `backend/.venv/bin/python backend/run.py --env-file backend/.env.test test`. Use somente banco autorizado. Não apontar esse helper a dados reais para validar a migração. API/preview: Ctrl+C. Banco de teste:

```sh
/usr/lib/postgresql/18/bin/pg_ctl -D "$BAU_TEST_PG_DIR/data" -m fast -w stop
```

Instâncias de API/preview criadas por esta execução foram encerradas; cluster de teste parado ao finalizar, dados temporários preservados. /tmp é volátil: se removido, preparar outro ambiente isolado, não sobrescrever dados ou arquivo de ambiente existente. Caminho Compose alternativo permanece documentado na etapa 02. Não executar down -v nem apagar bancos.

Em desenvolvimento/produção reais, revisar backup, regra de legado, timezone e parada das versões antigas antes da aplicação manual autorizada de 0002. Produção exige PostgreSQL, HTTPS, cookies Secure e proxy confiável; nada disso foi enfraquecido nesta etapa.

## 29. Próxima etapa e preservação

Revisar os resultados com o responsável e aguardar instruções da etapa 05. Navegação/Flip e conteúdo educativo continuam para etapas próprias. Não se iniciaram funcionalidades futuras.

Conquistas, contas e sorteios anteriores preservados, incluindo múltiplos sucessos antigos do mesmo dia; ilustrações, catálogo, casa, galeria, assombrações, baú, materiais, animações e jsQR intactos. Não houve uso do Blender MCP, sudo, instalação global, exclusão de bancos/volumes, escrita de segredos na documentação, alteração dos PDFs ou operação de escrita no Git/GitHub.
