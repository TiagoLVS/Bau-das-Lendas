# Etapa 03 — Autenticação, sessões e segurança

Data: 20/11/2026. Escopo local, sem publicação. Referências: auditoria, relatório da etapa 02, diretrizes, código e PDFs One Page, XRD e Plano de Projeto, agora disponíveis em docs. Os PDFs foram consultados e preservados. Divergências de recompensas/MindAR não foram implementadas nesta etapa.

## 1. Objetivo

Consolidar cadastro/login, proteção das senhas, sessões persistidas/revogáveis, isolamento de contas, limitação técnica de requisições e comportamento móvel, preservando interface, catálogo, baú, rastreamento e sorteios.

## 2. Estado anterior

FastAPI/SQLAlchemy, Argon2id, JWT HS256, cookies HttpOnly/SameSite=Lax, tabela auth_sessions, autorização pela sessão e CSRF/CORS já existiam. PostgreSQL/SQLite e migração 0001 haviam sido validados. Não se reconstruiu esse sistema. Faltavam rate limiting e sincronização completa de sessão entre contextos do frontend. A etapa 02 já exigia PostgreSQL, HTTPS e Secure na configuração de produção.

## 3. Fragilidades identificadas

- Login/cadastro sem limite podiam consumir recursos e facilitar tentativas automatizadas; sorteio sem proteção técnica de volume.
- UI de perfil era consultada só ao montar; RA não limpava integralmente recompensa após mudança externa da sessão.
- Respostas antigas podiam chegar após login/logout em outra aba.
- Uvicorn pode interpretar headers encaminhados por padrão em determinados peers; não é aceitável assumir X-Forwarded-For do visitante como identidade confiável.
- Não havia tratamento explícito de formato inválido dos identificadores JWT ou hash não reconhecido.
- Cabeçalhos da API cobriam cache e MIME, mas não enquadramento/referrer.
- Sessões expiradas permanecem armazenadas; não existe manutenção automática, e não foi executada limpeza de dados.

## 4. Correções implementadas

RateLimiter temporário e atômico por processo, limites configuráveis de login/cadastro e sorteio, limitação adicional de falhas de login, respostas 429 com Retry-After. Bloqueios expiram e não são associados ao e-mail de uma conta. Identificadores JWT devem ser UUIDs válidos, além das verificações já existentes. Verificação de senha usa verify_and_update: atualiza parâmetros antigos somente após senha válida, sem reset de contas. Hash desconhecido/entrada inválida produz falha genérica, sem expor dados.

Cliente compartilhado passa a sinalizar login/logout/401, comunicar apenas eventos sem dados por BroadcastChannel e rejeitar respostas anteriores à revisão da sessão. Perfil revalida em foco/visibilidade e limpa conta antiga; RA descarta resposta atrasada, recompensa, textura/cartas HTML e estado privado. Álbum/casa reutilizam os listeners de autenticação já existentes. Não foram redesenhados componentes.

API retorna X-Frame-Options=DENY e Referrer-Policy=strict-origin-when-cross-origin, preservando nosniff/no-store, inclusive nos erros tratados 403/429. Comandos oficiais de Uvicorn usam --no-proxy-headers. Não foram acrescentados CSP/HSTS definitivos, que dependem da hospedagem futura.

## 5. Arquivos criados nesta etapa

- `backend/app/core/rate_limit.py`: limitador em memória.
- `backend/tests/test_security.py`: limites/concorrência, cookies, JWT, sessões, hashes e isolamento.
- `tests/auth-session.test.mjs`: 401, resposta antiga e 429 no cliente compartilhado.
- `tests/stage03-auth-browser.mjs`: autenticação e troca de conta entre abas em viewports móveis.
- Este relatório.

Arquivos da etapa 02 e PDFs que já estavam não rastreados foram preservados; não são criações desta etapa.

## 6. Arquivos modificados nesta etapa

`backend/app/core/config.py`, `backend/app/main.py`, `backend/app/routers/auth.py`, `backend/app/routers/deps.py`, `backend/app/routers/game.py`, `backend/run.py`, `backend/Dockerfile`, `backend/compose.yaml`, `backend/.env.example`, `backend/README.md`, `README.md`, `public/api.js`, `public/ra.js`, `src/api.ts`, `src/Conta.tsx`, `tests/api-ra.test.mjs`.

Alterações locais anteriores nesses arquivos não foram descartadas. Nenhuma mudança em ilustrações, JSON de lendas, GLB, ações do Blender, geometria, estilo, navegação ou assombrações.

## 7. Política de validação

Mantida: nome 2–80 caracteres, aparado; e-mail válido até 254, normalizado para minúsculas e único; senha 10–128 caracteres, sem nova exigência de composição. Senha não é aparada. Backend valida independentemente dos campos HTML. Campos extras em cadastro/login/sorteio são rejeitados. Erro 422 não reflete valores enviados. Duplicata de cadastro permanece 409 por requisito; isso ainda permite inferência de existência via cadastro, mitigada em frequência, não eliminada. Login incorreto e conta inexistente retornam a mesma mensagem 401.

## 8. Argon2id

pwdlib recomendado já instalado: Argon2id v19, memória 65.536 KiB, custo de tempo 3, paralelismo 4. Salt aleatório por senha; teste compara hashes de usuários com a mesma senha sem imprimi-los. Hash e senha não são devolvidos na API nem registrados em logs da aplicação. Conta inexistente verifica hash dummy para reduzir diferenças triviais de tempo.

verify_and_update conserva o hash atual quando adequado e permite atualização de parâmetros antigos apenas no login bem-sucedido. Teste usa hash fictício de custo antigo e comprova que login inválido não o altera. Nenhuma senha real redefinida; nenhuma migração de hashes em massa. Política não garante ausência de todos os canais temporais; não houve teste de timing estatístico.

## 9. JWT

HS256 explicitamente permitido; exp, iat, sub e jti obrigatórios; issuer bau-das-lendas e audience bau-web. sub identifica usuário, jti identifica sessão, ambos UUIDs válidos. Testes rejeitam algoritmo diferente, emissor/audiência errados, token adulterado/expirado, jti inexistente/inválido e sessão associada a outro usuário. Não se emitem tokens paralelos ou tokens no corpo da resposta.

JWT_SECRET obrigatório, mínimo 32 caracteres e sem placeholder SUBSTITUA. Não há segredo padrão no código; configurar valor aleatório forte. Comprimento não prova aleatoriedade: geração/gestão segura continua sendo responsabilidade de operação. Nenhum segredo foi publicado neste documento.

## 10. Sessões

AuthSession persistida continua sendo consultada a cada autorização. Expiração é checada no token e no banco. Logout remove somente a sessão atual; token revogado retorna 401 e outras sessões válidas continuam funcionando. Expiração padrão 120 minutos, sem renovação silenciosa ou autenticação exclusiva pelo frontend. Persistência após reinício da API foi novamente verificada em HTTP real.

Não foi implementado logout global. Não foi criada rotina automática de exclusão. Avaliação: uma futura manutenção controlada poderá remover apenas auth_sessions expiradas depois de retenção aprovada; deve ter modo de inspeção e corte explícito, sem tocar users/user_cards/draw_requests. Nenhuma limpeza foi executada contra banco real ou de desenvolvimento.

## 11. Cookies

HttpOnly, SameSite=Lax, host-only (sem Domain), Path=/api, Max-Age coerente com SESSION_MINUTES. Cookie Secure obrigatório em produção; false permitido apenas em desenvolvimento/teste HTTP. Logout usa os mesmos atributos e Max-Age=0. Testes cobrem emissão com Secure false/true, remoção e revogação. Fluxo HTTP real validou persistência pelo cookie; não houve TLS público real nesta etapa.

Frontend não lê o JWT e não o salva em localStorage. O cookie é enviado via credentials=include. Chave de idempotência em sessionStorage não é credencial e permanece separada por conta.

## 12. Proteção contra excesso de requisições

| Variável | Padrão | Identidade | Janela |
| --- | --- | --- | --- |
| RATE_LOGIN_LIMIT | 20 | Cliente da conexão, todas as tentativas | RATE_WINDOW_SECONDS=60 s |
| RATE_REGISTER_LIMIT | 10 | Cliente da conexão, inclusive payload inválido | 60 s |
| RATE_DRAW_LIMIT | 120 | Usuário autenticado | 60 s |
| RATE_LOGIN_FAILURE_LIMIT | 8 | Cliente da conexão, logins inválidos | RATE_LOGIN_FAILURE_WINDOW_SECONDS=300 s |

Após oito falhas, tentativas seguintes do mesmo cliente aguardam a saída das falhas da janela; sucesso anterior ao bloqueio limpa a sequência. Não é um bloqueio de e-mail/conta, nem permanente. IPs atrás de NAT podem compartilhar cota; valores podem ser ajustados. Sorteio continua sem regra diária e sem mudança da seleção/idempotência: somente rajadas técnicas recebem 429 temporário. Leituras não são limitadas por esta implementação.

Janela deslizante, relógio monotônico, Lock cobrindo leitura/contagem/inserção, limite de 10.000 buckets e remoção de expirados. Identidades são chaves derivadas por SHA-256, apenas em memória, sem logs. Isso é pseudonimização transitória, não promessa de anonimização de IP. Se a capacidade estiver ocupada, novas chaves recebem 429 curto em vez de crescimento ilimitado.

Não há dependência adicional ou tabela. **Por processo:** reiniciar zera limites; vários workers multiplicam cotas; não há garantia distribuída. Arquitetura proporcional ao protótipo com um único worker. PostgreSQL já existente é a opção a avaliar para limites compartilhados por transação/migração se houver escala; Redis não foi adicionado. Limitação por IP não impede ataques distribuídos e não substitui proteção operacional do proxy.

Identidade vem de request.client.host, nunca de headers lidos diretamente. run.py, Dockerfile e Compose usam --no-proxy-headers. Atrás de proxy, a cota de login/cadastro pode ser compartilhada por todos através do peer até configuração segura. Antes de mudar: aceitar apenas IPs de proxy confiável, restringir acesso direto ao backend e fazer o proxy substituir headers encaminhados por valores próprios. Nunca confiar em `*` nem aceitar a cadeia X-Forwarded-For fornecida pelo visitante.

## 13. CSRF e CORS

POST/PUT/PATCH/DELETE exigem Origin explicitamente autorizado e X-Bau-Request:1; faltantes e origem indevida retornam 403. CORS continua com lista explícita, credentials=true, GET/POST e headers necessários. Não foi aberto wildcard. CORS isolado não é CSRF: a verificação adicional de origem/header foi preservada e testada. Clientes legítimos da mesma origem e o proxy Vite passaram.

## 14. Proteção individual e estado do frontend

Álbum/progresso e sorteio derivam dono de current_user/current_session. Payload user_id forjado é rejeitado; query user_id não altera dono da consulta. Testes com A/B provam que conquista de B não aparece para A, inclusive após trocar cookie. Histórico permanece interno vinculado ao usuário; não foi adicionado endpoint que aceite proprietário arbitrário.

Cliente JS mantém uma revisão em memória; resposta de revisão antiga é rejeitada com erro de aplicação 409 (não é resposta HTTP 409 do servidor). 401 de rota privada limpa dados uma vez e comunica expiração; 401 de login inválido não derruba outra sessão válida. Mensagens entre abas contêm somente os sinais changed/expired, sem IDs, tokens ou dados pessoais. Um evento de expiração recebido não é retransmitido em loop.

Perfil, álbum/casa e RA revalidam a sessão. RA oculta recompensa antiga imediatamente, limpa faces/canvas e ignora respostas do sorteio anterior. A chave pendente continua disponível apenas na namespace da conta ao voltar a autenticar, sem criar recompensa fictícia. Foco/visibilidade revalida, mas não há polling contínuo: expiração é percebida na próxima resposta autenticada, retorno à aba ou mudança de sessão conhecida. Sem BroadcastChannel, retorno ao foco e requisições continuam revalidando; não se promete notificação instantânea em abas inativas nesses navegadores.

## 15. Produção, privacidade e cabeçalhos

APP_ENV=production continua exigindo PostgreSQL, cookies Secure e origens HTTPS; sem fallback SQLite. .env.test e venv continuam ignorados. Cliente usa /api relativo; futura hospedagem deve manter frontend/API na mesma origem HTTPS. Não publicar Vite como servidor definitivo.

Cabeçalhos adicionados pertencem à **API**. Servidor de estáticos/reverse proxy futuro deve configurar também proteção contra iframe, MIME e referrer para HTML/assets. CSP precisa considerar importmap, estilos, WebGL e fontes existentes; HSTS só após domínio/TLS aprovados. Nenhuma CSP/HSTS definitiva foi imposta, nem câmera/WebGL desabilitados.

Dados persistidos permanecem nome, e-mail, hash, IDs e datas/sessões/coleção/histórico. Não se coletou novo dado pessoal no banco. Rastreador processa pixels localmente via vídeo/canvas/jsQR; chamadas de API são conta, progresso e sorteio, não imagens/vídeos. Não foram encontrados envio de frames ou gravação/upload de câmera no fluxo ativo. Fontes externas Google já existentes na RA podem gerar requisições de rede de recursos; não foram adicionadas nesta etapa e merecem revisão de privacidade na hospedagem. Nenhuma telemetria ou rastreador publicitário foi acrescentado.

## 16. Banco e ambiente de testes

Nenhuma tabela, coluna ou migração nova; 0001 e registros existentes preservados. Instância da etapa 02 foi verificada por caminho temporário, PG_VERSION=18 e URL de destino sem imprimir credenciais: loopback:55439/bau_test, APP_ENV=test. Reiniciada somente essa instância. Fixtures SQLite usam arquivos temporários; PostgreSQL usa schemas UUID novos em bau_test e limpa apenas esses schemas.

Não houve migração ou limpeza contra banco de produção/desenvolvimento. Contas HTTP/browser são fictícias e ficam no banco isolado. API/preview foram encerrados após cada integração; PostgreSQL de testes foi parado ao finalizar, com diretório preservado. Dependências existentes passaram pip check; nenhuma dependência Python/Node/sistema foi adicionada nesta etapa.

## 17. Resultados SQLite

**30 casos SQLite APROVADOS.** Cobertura: cadastro/validação, e-mail duplicado, hashes/salt/atualização segura, login/logout, cookies, JWT/sessões, FKs, isolamento, idempotência e limites. Duas variantes de concorrência do sorteio permanecem ignoradas no SQLite por exigirem SELECT FOR UPDATE real. Isso não foi apresentado como aprovação de concorrência PostgreSQL. Contagens discriminadas e total abaixo foram obtidos da execução final/JUnit.

## 18. Resultados PostgreSQL e Python

**70 APROVADOS, 2 IGNORADOS, 0 REPROVADOS.** São 8 testes gerais, 30 casos SQLite aprovados e 32 casos PostgreSQL aprovados. Concorrência real de sorteios com oito solicitações executada no PostgreSQL; concorrência do limitador testada também com threads. Todos os testes de banco usam migrações Alembic e schemas isolados. Warning preexistente Starlette/HTTPX de depreciação permanece; não se atualizou biblioteca para escondê-lo.

Execução: helper da etapa 02 carregando `.env.test`, equivalente a pytest -q -p no:cacheprovider; JUnit local em /tmp/bau-etapa02-results.xml. Testes adicionais cobrem emissão/remoção de cookies, headers, spoof de X-Forwarded-For, expiração do bloqueio por relógio falso sem sleep, capacidade, conta inexistente, sessão inexistente/revogada, algoritmo/issuer/audience, proprietário forjado e hashes antigos.

## 19. Resultados Node, TypeScript e build

- Node completo: **36 APROVADOS, 1 REPROVADO** (37 casos). Falha conhecida em tests/hauntings.test.mjs: sequência de demonstração. Não se alterou lógica nem expectativa.
- Novos testes de revisão da sessão, 401 sem loop, 429 e limpeza de recompensa RA: APROVADOS.
- `tsc --noEmit`: APROVADO.
- `npm run build`: APROVADO, incluindo sincronizadores existentes. Aviso de chunk >500 kB permanece (principal ~875 kB); desempenho físico não foi inferido a partir do build.
- `git diff --check`, sintaxe JS e `pip check`: APROVADOS. Sem alteração de dependências bloqueadas.

## 20. Integração HTTP real

APROVADO: API principal Uvicorn com --no-proxy-headers e preview via proxy /api, catálogo de 60, cadastro, sessão, sorteio, retry idempotente, isolamento e recuperação após reiniciar processo da API. Também HTTP 429/Retry-After, rejeição de cabeçalho X-Forwarded-For como bypass, CSRF indevido e álbum sem autenticação. Nenhum token/senha foi impresso.

Orquestrador temporário `/tmp/bau-etapa03-http.py` reaproveita o ambiente isolado da etapa 02, inicia processos próprios, verifica portas livres e encerra apenas esses processos. Testes duráveis estão em backend/tests e stage03-auth-browser. Não foi validado HTTPS público real ou configuração do reverse proxy final.

## 21. Integração móvel

`tests/stage03-auth-browser.mjs`, viewport 390×844, toque habilitado:

- **Chromium: APROVADO.** Cadastro UI, login/logout, reload, sessão revogada no servidor, limpeza do perfil, RA sem câmera física, sincronização entre abas, troca A/B, atraso artificial de resposta antiga rejeitado e falha de conexão sem inventar dados.
- **WebKit: APROVADO no mesmo percurso emulado.** Não equivale a Safari/iPhone físico.

Na primeira tentativa WebKit iniciou, mas falhou ao navegar. Diagnóstico com página HTTP mínima reproduziu conflito de módulos Snap: WPENetworkProcess carregava libpthread de core20 incompatível com glibc. Remover apenas variáveis GTK/GIO com caminhos Snap do ambiente do processo do navegador permitiu HTTP e execução completa. Essa isolação está no teste; não altera ambiente administrativo ou frontend, não instala bibliotecas e não reduz mecanismos de segurança da aplicação. A limitação antiga de libmanette não foi reproduzida nesta etapa.

Não se validou câmera física, TLS público, todos os tamanhos/orientações, leitor de tela ou performance em celular. Scripts da etapa 02 não foram reclassificados como testes Safari físicos.

Para repetir, com PostgreSQL de testes, API em 8000 e preview em 5175:

```sh
backend/.venv/bin/python backend/run.py --env-file backend/.env.test test
node --test --test-isolation=none tests/*.test.mjs
npm run build
BAU_TEST_ORIGIN=http://localhost:5175 PLAYWRIGHT_BROWSERS_PATH=/tmp/bau-etapa02-browsers node tests/stage03-auth-browser.mjs
```

O último comando cria contas fictícias e uma conquista; executar exclusivamente com API apontada ao banco isolado. Inicialização/encerramento do cluster continuam documentados na etapa 02. Navegadores de teste em /tmp podem ser removidos pelo sistema e precisam ser disponibilizados novamente pelo fluxo Playwright existente.

## 22. Pendências

Falha das assombrações; dispositivos físicos Android/Safari; HTTPS real, configuração de proxy e cabeçalhos estáticos; dimensionamento de limites considerando NAT e exposição pública; política de retenção de sessões; documentação interna de fontes culturais e futuras etapas visuais/educativas. Recuperação de senha, verificação de e-mail e MFA continuam fora do escopo, sem SMTP ou serviços externos adicionados.

## 23. Limitações

Não é pentest completo. Limites em memória não protegem de todo DDoS, ataques distribuídos ou múltiplos processos; capacidade finita pode temporariamente negar clientes novos sob carga. Reinício limpa contadores. Sem proxy confiável configurado, múltiplos visitantes podem compartilhar cota do peer. Hash de IP em memória não é anonimização forte. Foco/401/BroadcastChannel não oferecem revogação por push do servidor quando a aba permanece ociosa. Sessão expirada continua inacessível no servidor mesmo antes de a UI tomar conhecimento.

HTTP local com cookie Secure=false não prova implantação TLS. Headers da API não protegem automaticamente página HTML servida por outro servidor. Não se executou rotina de manutenção nem se adicionou rastreamento de eventos pessoais. Não se coletaram métricas de força bruta distribuída ou timing de senha.

## 24. Recomendações antes de publicar

Usar segredo aleatório por ambiente e PostgreSQL privado; HTTPS/same-origin e Secure obrigatórios. Manter um worker para cotas globais atuais; se escalar, projetar limites compartilhados no PostgreSQL antes de aumentar workers. Definir proxy confiável com headers sobrescritos e backend inacessível diretamente; não confiar em X-Forwarded-For arbitrário. Aplicar headers de segurança também aos estáticos e definir CSP/HSTS só depois de testar RA. Configurar limite de corpo/conexões, logs sem dados sensíveis, backups/restore e política de retenção aprovada. Testar celulares reais. Nenhuma publicação foi realizada.

## 25. Próxima etapa

Revisar os resultados com o responsável e aguardar instrução da etapa 04. Navegação, Flip, recompensas, QR individual, conteúdo educativo, mudanças de RA e modelagem não foram antecipados.

Identidade visual e regras de recompensas preservadas. Sem alterações em documentos acadêmicos, uso do Blender MCP, instalação global, sudo, remoção de bancos/volumes ou operações de escrita no Git. Nenhuma mudança enviada ao GitHub.
