# Etapa 06 — Navegação do frontend

Data: 21/11/2026. **Estado atual: estabilização 06.2 concluída; aceite técnico automatizado aprovado, com os limites de diagnóstico e homologação descritos na seção final.** As seções 1–5 preservam o estado e as reprovações da Etapa 06.1. A Etapa 07 não foi iniciada.

## 1. Histórico: estado anterior à implementação

A auditoria inicial encontrou sete destinos destacados no menu React: Explorar (travessia), Lendas, Grimório, Cartas, Portais, Minha conta e Invocar em RA. A casa e a galeria possuíam menus próprios. Naquela fase somente a auditoria havia sido realizada; a afirmação anterior “nenhum arquivo da aplicação foi modificado” referia-se exclusivamente a esse momento.

O plano era organizar três destinos, manter Perfil independente e conservar acessos secundários no contexto apropriado. Foram identificados como contratos de compatibilidade os parâmetros de painéis, URLs HTML, aliases de QR, retornos de autenticação e o listener de `#nav-corredor`. Os estados locais de abertura/fechamento não foram convertidos em um novo roteador.

Na continuação anterior, a navegação foi implementada e passou na matriz inicial de oito viewports, toque em 320 px e regressões principais dos dois motores. Node teve 46 aprovações e a falha conhecida das assombrações; Python teve 40 aprovações. Um teste negativo do catálogo no Chromium excedeu 20 s aguardando `load`. Permaneceram pendentes teclado, cobertura dos parâmetros e capturas dedicadas em paisagem. Capturas de etapas anteriores são evidências históricas; não representam a validação atual.

Evidências históricas: [matriz inicial](../tests/artifacts/etapa06/browser.json), [toque](../tests/artifacts/etapa06/interactions.json), [primeira regressão](../tests/artifacts/etapa06/run.log), [integridade](../tests/artifacts/etapa06/integrity.json).

## 2. Alterações já implementadas

| Área | Destino e comportamento preservado |
| --- | --- |
| Início | `/`: apresentação, travessia, casa e ação contextual “Lendas e dossiês” |
| Explorar | `/?portais=1`: Portais reutilizado, orientações, disponibilidade via Perfil e entrada explícita na RA |
| Álbum | `/?album=1`: coleção individual, progresso, bloqueios, inspeção e história; acesso interno à galeria pública |
| Perfil | `/?conta=1`: link independente fora do nav Principal, reutilizando cadastro, login, logout, histórico e contador |
| Casa | `/casa/index.html`: três destinos e Perfil; `#nav-corredor` preservado como “Entrar direto na casa”, com listener original |
| Galeria | `/casa/cartas.html`: três destinos e Perfil; filtros, pesquisa, ampliação e Flip existente preservados |
| RA | `/ra.html`: experiência imersiva e retorno existentes; câmera solicitada pelo botão; nenhuma barra sobre o vídeo |

Foram alterados na implementação anterior: `src/App.tsx`, `src/Album.tsx`, `src/Portais.tsx`, `src/style.css`, `public/casa/index.html`, `public/casa/cartas.html`, `public/casa/css/estilo.css` e `public/casa/css/cartas.css`. Os links principais são âncoras nativas, mantendo histórico e inicialização por query. Não foi instalada biblioteca de roteamento. Movimento reduzido permanece em controle próprio.

Cores, fontes, variáveis, ilustrações e identidade visual foram preservadas. Os QR continuam apontando para `/` e `/ra.html`, derivados da origem ou `VITE_PUBLIC_URL`. A galeria pública não concede propriedade. As correções mobile da Etapa 04.1 foram mantidas. Nenhum novo Flip foi implementado.

## 3. Validação final: método e evidências

A execução atual utiliza build de produção, Chromium e WebKit headless, contas fictícias e PostgreSQL isolado `bau_test` em loopback. O runner confere o banco existente, versão `0002` e 60 lendas, sem executar migration ou seed de catálogo. As fixtures de regressão afetam somente contas fictícias. Os serviços próprios são encerrados ao fim da execução.

Testes: `tests/navigation-final.mjs`, `tests/navigation-html-controls.mjs`, `tests/catalog-timeout-diagnostic.mjs`, `tests/stage03-auth-browser.mjs`, `tests/mobile-fixes-regression.mjs`, runner `backend/tests/run_navigation_final.py` e suítes Node/Python existentes. O contexto responsivo usa viewport e toque; a validação de teclado usa teclado real da automação, sem cliques, `force:true` ou foco programático nos destinos. Isso não substitui ensaio em aparelho físico.

### Teclado

Percursos iniciados em Início, Explorar e Álbum verificam estado ativo por `aria-current`, Perfil fora do nav, Tab, Shift+Tab, Espaço no botão Menu, Enter em Explorar e Perfil, indicador visual de foco, fechamento por Escape e continuação do percurso após voltar ao conteúdo. Cada avanço verifica ausência de foco em elemento com `display:none`, `visibility:hidden` ou caixa sem dimensões.

A investigação WebKit confirmou que, após Escape remover o botão focado do diálogo, `document.hasFocus()` ficava falso e cinco Tabs consecutivos permaneciam no BODY. Além de sincronizar o teste com o foco inicial e o fechamento, foi corrigido `src/App.tsx`: o fechamento de painéis/Álbum devolve o foco, após renderização, ao Menu visível ou à marca em desktop. O teste continua usando somente teclado para alcançar os destinos. As capturas também aguardam opacidade final dos painéis; animações CSS são concluídas pela opção de screenshot, sem alterar a preferência visual da aplicação.

### Links, parâmetros e histórico

| Caminho / parâmetro | Verificação |
| --- | --- |
| `/` | Início e acesso contextual |
| `/?lendas=1` | Índice de lendas |
| `/?album=1` | Álbum |
| `/?conta=1` | Perfil / Conta |
| `/?portais=1` | Explorar e QR |
| `/casa/index.html` | Entrada e `#nav-corredor` |
| `/casa/cartas.html` | Galeria carregada |
| `/casa/cartas.html?carta=saci-perere` | Carta válida em exposição e abertura direta |
| `/ra.html` | Botão de início da experiência |
| `/marcador.html`, `/qrcodes.html` | Redirecionamento para `/?portais=1` |
| `retorno=ritual` | Login fictício seguido de `/ra.html` |
| `retorno=cartas` | Login fictício seguido da galeria |
| `retorno=album` | Login fictício seguido de abertura do Álbum no estado existente |
| `assombracoes=1` | URL e reload preservados; painel de laboratório continua condicionado a `import.meta.env.DEV`, conforme código existente |
| `demonstracao=1`, `apresentacao=1` | Parâmetros isolados preservados; combinação ativa `.demonstracao-assombrada` |

Foi encontrado e corrigido um defeito real: o alias `qrcodes.html` da raiz não era incluído pelo build. Foi adicionada uma cópia byte a byte em `public/qrcodes.html`, mantendo exatamente o redirecionamento existente e sem mudar QR algum.

Os 15 caminhos/combinações passaram nos dois motores na execução após a correção do alias (ver `attempt-3.json`). Na matriz seguinte, Chromium teve timeout transitório aguardando `DOMContentLoaded` na carta do Saci; a [repetição isolada](../tests/artifacts/etapa06-final/deep-link-recheck.json), com o mesmo limite de 15 s, abertura e reload, passou sem erro JavaScript. A falha da rodada completa permanece no JSON, sem ser convertida em aprovação. Não foi comprovada a causa desse timeout distinto do cenário negativo de catálogo.

O teste abre e recarrega cada URL; também percorre Voltar e Avançar entre Conta e Álbum. Os aliases aguardam o destino em `DOMContentLoaded`, seguido de verificação de conteúdo. Não se exige `load` de recursos externos para comprovar redirecionamento.

### Responsividade e capturas atuais

A inspeção visual em 320 px comprovou que o livro cobria o novo acesso “Galeria pública”; os controles inferiores também ultrapassavam o viewport. `src/style.css` garante a camada e a reserva do link. `src/album.css` mantém o livro no fluxo normal em telas pequenas e permite rolagem vertical quando necessário, mantendo seu tamanho legível, o componente e as regras do Flip. A matriz agora exige que o link e o controle Próximo sejam alcançáveis sem sobreposição.

A matriz cobre as seis superfícies (Início, Explorar, Álbum, Perfil, casa e galeria) nas seis dimensões 320×568, 360×800, 390×844, 430×932, 568×320 e 844×390, nos dois motores. Verifica largura do documento, limites do menu aberto e botão Fechar visível nos painéis. As capturas atuais obrigatórias abrangem Início, Explorar, Álbum e Perfil em todas as dimensões. As capturas adicionais de casa/galeria WebKit permanecem como apoio. A validação complementar dos links HTML obteve 12 combinações Chromium e 12 WebKit aprovadas, verificando os três destinos e Perfil por posição e hit testing após rolagem. No teste WebKit foi necessário aguardar explicitamente a presença das âncoras antes de ler seus textos; as leituras vazias iniciais estão preservadas no artefato original. Evidências: [primeira execução HTML](../tests/artifacts/etapa06-final/html-controls.json), [repetição WebKit](../tests/artifacts/etapa06-final/html-controls-recheck.json). O screenshot da casa no Chromium excedeu o limite mesmo após carregar fontes; a captura adicional foi retirada da matriz obrigatória, mantendo integralmente as verificações de responsividade da casa e galeria. Isso não reduz as quatro superfícies exigidas para screenshots. As capturas usam dados fictícios e mascaram campos de email/senha.

Evidências atuais ficam em [etapa06-final](../tests/artifacts/etapa06-final/). [O JSON final](../tests/artifacts/etapa06-final/report.json) contém os resultados por motor; os PNG têm nomes com motor, dimensão e superfície. As capturas históricas não foram renomeadas como atuais.

### Capturas principais desta validação

| Motor | Início 390×844 | Explorar 390×844 | Álbum 390×844 | Perfil 390×844 | Menu em 568×320 |
| --- | --- | --- | --- | --- | --- |
| Chromium | [Início](../tests/artifacts/etapa06-final/Chromium-390-844-inicio.png) | [Explorar](../tests/artifacts/etapa06-final/Chromium-390-844-explorar.png) | [Álbum](../tests/artifacts/etapa06-final/Chromium-390-844-album.png) | [Perfil](../tests/artifacts/etapa06-final/Chromium-390-844-perfil.png) | [Paisagem](../tests/artifacts/etapa06-final/Chromium-568-320-inicio.png) |
| WebKit | [Início](../tests/artifacts/etapa06-final/WebKit-390-844-inicio.png) | [Explorar](../tests/artifacts/etapa06-final/WebKit-390-844-explorar.png) | [Álbum](../tests/artifacts/etapa06-final/WebKit-390-844-album.png) | [Perfil](../tests/artifacts/etapa06-final/WebKit-390-844-perfil.png) | [Paisagem](../tests/artifacts/etapa06-final/WebKit-568-320-inicio.png) |

### Diagnóstico do timeout Chromium

A reprodução isolada de `catalog-failure`, com e sem observadores de eventos, passou aguardando `load` em aproximadamente 0,6 s: aviso correto, entrada desabilitada e nenhum pedido pendente na execução observada. Não houve indisponibilidade do servidor de testes nessa reprodução. O erro JavaScript `Catálogo oficial indisponível.` é esperado e continua exigido pelo teste.

Na matriz completa, o aviso apareceu em 564 ms enquanto `loadEventEnd` ainda era zero e quatro pedidos a `fonts.gstatic.com` continuavam pendentes. Isso demonstra que o conteúdo funcional pode ficar pronto antes das fontes externas. Não permite atribuir com certeza o timeout histórico a uma requisição específica, pois aquela execução não possuía o mesmo rastreio.

A correção pontual em `tests/mobile-fixes-regression.mjs` troca somente a espera da navegação negativa para `DOMContentLoaded`. As asserções do texto do aviso, erro JavaScript e botão desabilitado permanecem intactas. O limite de 20 s não foi aumentado. Nenhuma alteração foi feita na aplicação, autenticação, CORS ou CSRF para contornar esse cenário negativo; as correções de alias, foco e layout são defeitos independentes comprovados nesta validação.

Evidências: [diagnóstico isolado](../tests/artifacts/etapa06-final/timeout-diagnostic.json), [primeira matriz desta validação](../tests/artifacts/etapa06-final/attempt-1.json), [execução inicial](../tests/artifacts/etapa06-final/run.log), [segunda execução](../tests/artifacts/etapa06-final/run-2.log), [regressão após correções](../tests/artifacts/etapa06-final/run-3.log), [matriz final](../tests/artifacts/etapa06-final/run-4.log).

## 4. Resultados consolidados

| Verificação | Resultado atual |
| --- | --- |
| Node | 46 aprovados; 1 falha conhecida da sequência das assombrações (teste e sequência intactos) |
| Python / PostgreSQL | 40 aprovados; 39 casos SQLite desmarcados; 1 aviso preexistente do TestClient |
| TypeScript | Aprovado (`tsc --noEmit`) |
| Vite | Build aprovado; aviso de bundle grande preservado |
| Cadastro, login, logout e sessões | Aprovados Chromium/WebKit, incluindo reload, revogação, sincronização entre abas, troca A/B e descarte de resposta antiga |
| Recompensa, histórico, contador e coleção | Aprovados Chromium/WebKit |
| Galeria, Flip e rotação | Aprovados Chromium/WebKit |
| RA / GLB / animações | Aprovados Chromium/WebKit: 6.572 triângulos, 8 materiais, Idle estático e OpenChest/CloseChest com variação de 105° |
| Catálogo: restauração, fallback e erro ativo | Aprovados Chromium/WebKit; erro ativo Chromium passou após espera funcional |
| Catálogo: cancelamentos forçados ao voltar | Chromium aprovado; WebKit reprovado por mensagem de access control em requisição cancelada |
| Teclado | Aprovado Chromium/WebKit, nas três áreas e acesso independente ao Perfil |
| Links antigos e parâmetros | Os 15 caminhos/combinações passaram nos dois motores na execução 3; execução 4 Chromium teve timeout transitório na carta, aprovado na repetição isolada com reload |
| Responsividade | Aprovada nos dois motores: 72 combinações superfície/dimensão, incluindo as duas orientações horizontais |
| Menus HTML | 24 combinações aprovadas; preservadas falhas históricas da leitura sem espera antes da repetição WebKit |
| Screenshots finais | 48 capturas atualizadas após o último ajuste de CSS; principais imagens revisadas visualmente nos dois motores |
| Resultado global da matriz final | 9 de 10 grupos aprovados; exit 1 preservado pelo timeout transitório do link Chromium, sem mascarar a falha |


Logs: [Node](../tests/artifacts/etapa06-final/node.log), [Python](../tests/artifacts/etapa06-final/python.log), [build](../tests/artifacts/etapa06-final/build.log), [autenticação e regressões](../tests/artifacts/etapa06-final/run-3.log).

A execução 4 testou o build final após o ajuste de layout; as regressões funcionais e Python constam da execução 3. Os logs globais continuam com falhas: a execução 3 inclui a falha WebKit de cancelamento e uma medição de link multilinha posteriormente corrigida no teste para usar o primeiro retângulo real do texto; a execução 4 preserva o timeout transitório Chromium descrito acima. Não são apresentados como suítes integralmente verdes. Não houve aumento de limites para obter aprovação.

A conferência final de [integridade](../tests/artifacts/etapa06-final/integrity.json) confirmou 48 PNG atuais, 24 combinações dos menus HTML, alias idêntico ao original e encerramento dos serviços. Dos 107 arquivos do snapshot anterior à implementação, 98 permaneceram idênticos e nove diferem: os oito da implementação anterior, agora com as correções de App/style, e `src/album.css`. O alias público é um arquivo adicional. Backend da aplicação, catálogo e modelo do snapshot permanecem idênticos.

## 5. Pendências e aceite

A falha conhecida da sequência das assombrações permanece separada e sem alteração no teste ou na sequência. O WebKit voltou a apresentar cancelamento de `/api/album` e, na regressão mais recente, `/api/auth/me`, com mensagem de access control durante navegação forçada. Esse cenário continua REPROVADO; as asserções não foram removidas e não houve flexibilização de segurança. Autenticação normal, troca de contas e os outros cenários de catálogo passaram. Não foi estabelecida relação causal entre essa mensagem do motor e a reorganização da navegação.

Ensaios físicos de Safari/Android, teclado virtual, safe areas, barras reais e câmera continuam fora da execução headless. O adaptador sintético WebKit já bloqueado em etapa anterior não foi substituído. Modelo, animações, marcadores, rastreamento e permissões reais de câmera não foram modificados.

Nesta validação, foram adicionados os testes/runner mencionados e reorganizado somente este relatório existente. As correções de produto foram limitadas a `src/App.tsx` (retorno de foco), `src/style.css` e `src/album.css` (acesso à galeria e controles), e ao novo alias `public/qrcodes.html`. A mudança no teste negativo não modifica o produto. Nenhuma dependência foi instalada, nenhum arquivo do backend da aplicação foi alterado e nenhum catálogo, ilustração, GLB ou regra de recompensa foi modificado. Nenhum comando Git de escrita, branch, commit, push ou publicação foi executado.


**Aceite final:** as verificações solicitadas foram executadas e documentadas; a navegação possui aceite funcional com ressalvas. O aceite integral da Etapa 06 permanece pendente da falha WebKit nos cancelamentos forçados e da falha conhecida das assombrações, mantida fora da correção desta etapa. O timeout adicional de carta não se repetiu isoladamente, mas continua registrado como instabilidade da execução completa. Uma exigência de suíte 100% verde ainda não é atendida.

Antes de considerar a Etapa 07 sob esse critério, é necessário resolver essas falhas de regressão e estabilizar a execução completa. Os ensaios físicos pendentes continuam necessários para homologar a experiência RA em smartphones; não são substituídos por screenshots headless. Não há reconstrução pendente do menu nem novas funcionalidades iniciadas.

Arquivos desta validação: `src/App.tsx`, `src/style.css`, `src/album.css`, `public/qrcodes.html` (novo), `tests/mobile-fixes-regression.mjs`, `tests/navigation-final.mjs` (novo), `tests/navigation-html-controls.mjs` (novo), `tests/catalog-timeout-diagnostic.mjs` (novo), `backend/tests/run_navigation_final.py` (novo) e este documento. Os artefatos de teste permanecem na pasta ignorada existente. A Etapa 07 não foi iniciada.

## Estabilização final — Etapa 06.2

Esta seção registra a estabilização posterior. As seções 1–5 e seus resultados reprovados permanecem como histórico da Etapa 06.1; não descrevem o aceite atual desta continuação.

### Diagnóstico WebKit e segurança

A aplicação foi mantida intacta durante a reprodução. Foram registrados requests, requestfailed, erros de página, console, documentos e eventos de saída/restauração. O cliente compartilhado `public/api.js` usa AbortController com limite de 15 s, converte falhas de transporte em ApiError de status 0 e não transforma esse estado em sucesso nem em expiração 401. Sua revisão de sessão invalida respostas anteriores; Conta/Álbum mantêm guardas active/version e removem listeners no cleanup. OfficialCollection verifica novamente a identidade antes de publicar o álbum. Os efeitos React descartam respostas após cleanup; não fazem cancelamento de transporte ao desmontar. A coleção usa sua própria revisão para impedir publicação de refresh antigo. O navegador cancela requests do documento descartado; o AbortController do cliente cobre seu limite de transporte. Essas proteções não foram modificadas.

O primeiro diagnóstico executou oito retornos forçados por motor, com requests pessoais pendentes. WebKit registrou `Load request cancelled` em `/api/album` e `/api/auth/me`, junto da saída do documento. Uma mensagem “access control” foi registrada para o fetch do fallback `/lendas-ra.json`, em `cartas-flip.js:76`, dois milissegundos depois de beforeunload e cinco antes de pagehide, embora esse fetch esteja dentro de try/catch. A abertura seguinte funcionou. Isso comprova que esse texto do WebKit, isoladamente, não comprova uma rejeição CORS nem uma promise sem tratamento.

A reprodução completa anterior à mudança da asserção também passou nos dois motores: a mensagem pessoal intermitente não reapareceu nessa execução. Não se atribui retroativamente uma causa certa aos logs antigos sem correlação suficiente. Os rastreios atuais distinguem cancelamento confirmado de falha ativa; nenhuma exceção de autenticação foi simplesmente descartada.

Foi adicionado o observador de teste `tests/navigation-errors.mjs`. Uma ocorrência só é esperada se: motor WebKit; stack contendo a URL exata e o texto Fetch API/access control; mesma origem; endpoint `/api/auth/me` ou `/api/album`; request GET correspondente iniciado no documento anterior e antes da intenção de navegar; requestfailed exatamente `Load request cancelled`; proximidade máxima de 500 ms entre os eventos; e navegação daquele documento efetivamente confirmada. Requests criados depois da intenção de sair, origens diferentes, falhas de rede/CORS ativas, erros arbitrários e navegações não confirmadas continuam reprovando. Os eventos brutos, cancelamentos reconhecidos e erros inesperados ficam no JSON, e os listeners permanecem instalados.

O ajuste em `tests/mobile-fixes-regression.mjs` usa essa correlação somente no cenário de navegação forçada. Nenhuma alteração de produção, CORS, Origin, cookies, CSRF, AbortController ou política de sessão foi necessária. Os testes unitários do observador incluem controles negativos para impedir que uma correspondência de texto seja suficiente.

Os controles de segurança usam contas fictícias: API normal autenticada; Origin autorizado refletido; preflight de origem indevida recusado pelo FastAPI; POST de origem indevida recusado; fetch de uma página em origem distinta bloqueado pelo navegador; falha de rede ativa retornando status 0 sem ser classificada como cancelamento esperado; sessão preservada após os testes negativos; e 401 após logout. A primeira tentativa apontava o OPTIONS para o preview Vite, que responde 204 por conta própria: foi corrigido o alvo do controle para o FastAPI em loopback, sem mudar servidor algum. O resultado inicial permanece em `controls-attempt-1.json`.

Evidências: [diagnóstico sem mudança da aplicação](../tests/artifacts/etapa06-2/diagnostic.json), [regressão antes de ajustar a classificação](../tests/artifacts/etapa06-2/pre-fix-run.log), [controles](../tests/artifacts/etapa06-2/controls.json), [repetição dos controles](../tests/artifacts/etapa06-2/controls-recheck.log).

### Carta do Saci e esperas funcionais

O diagnóstico inicial passou em 16 aberturas/reloads: oito por motor, incluindo imagem carregada, tempos DOMContentLoaded/load e requests pendentes. A aplicação e a associação do Saci como carta extra de exposição não foram alteradas.

A matriz agora aguarda o commit HTTP nessa URL e exige explicitamente o diálogo de ampliação aberto e a imagem `/casa/img/cartas/saci.jpg` completa, com naturalWidth positivo, tanto na entrada quanto no reload. Mantém a verificação do parâmetro e os limites anteriores; não remove a validação de carregamento da imagem nem aumenta timeout. Outros caminhos conservam suas esperas anteriores.

`tests/stabilization-controls.mjs` compara DOMContentLoaded, commit, reload com cache e contextos novos, além de uma fonte binária externa mantida pendente. Uma fonte que atrasa load não deve ser usada como substituta da condição de abertura da carta. O cenário de fontes pendentes continua exigindo carta aberta e imagem carregada. Os eventos de imagem, fontes, erros, navegação e tempos ficam no JSON.

O timeout histórico de DOMContentLoaded não possuía rastreio suficiente para identificar qual recurso o bloqueou. Não se afirma que uma fonte específica foi sua causa comprovada. A mudança torna o teste dependente do comportamento solicitado, e as repetições e a matriz avaliam se ainda existe defeito de abertura. As duas execuções de controles ocorreram com a matriz em atividade, permitindo observar também a concorrência de navegadores no computador; não foi feita certificação de desempenho móvel.

### Sequência das assombrações

A fonte ativa é `SEQUENCIA_APRESENTACAO` em `src/experience/hauntings/EventCatalog.ts`, consumida por criarCatalogo/World3D. O mesmo código já está no commit local `cf40df8`: `espelho-loira`, `lobo-stumpp`, `saci-redemoinho`, `alta-colunas`, `boitata-cinzas`. Ele contém uma decisão explícita, comentada, de remover os olhos isolados por não comunicarem uma lenda reconhecível. Portanto a ordem efetiva é **espelho → lobisomem → Saci → figura alta → Boitatá**.

O texto antigo de `docs/assombracoes.md` e os dois testes ainda descreviam a apresentação anterior com olhos. O critério adotado foi preservar a decisão explícita já versionada e a experiência ativa, conforme a diretriz atual de preservação; não restaurar uma experiência removida para satisfazer a expectativa antiga. Foram alterados somente os arrays esperados em `tests/hauntings.test.mjs` e `tests/hauntings-presentation-browser.mjs`. A comparação continua literal e verifica a ordem, sem derivar automaticamente a resposta esperada da constante. Nenhuma asserção, evento, probabilidade, índice, efeito ou duração foi removido ou modificado. O teste de apresentação em navegador recebeu a expectativa correta; sua execução integral só será indicada como aprovada se efetivamente realizada.

### Resultados e aceite desta estabilização

| Verificação | Resultado final 06.2 |
| --- | --- |
| Node completo | **49 aprovados, zero falhas**, incluindo dois novos testes do classificador; os 47 testes anteriores passam |
| Python/PostgreSQL | **40 aprovados**, 39 casos SQLite desmarcados e um aviso preexistente do TestClient |
| TypeScript / Vite | **Aprovados**; aviso preexistente de bundle grande |
| Navegação Chromium / WebKit | **10/10 grupos aprovados**, incluindo teclado, links diretos/Saci, retornos e 72 combinações de superfície/dimensão; 48 capturas atuais |
| Autenticação | **Aprovada nos dois motores**: cadastro, login/logout, sessão revogada, reload, sincronização, troca A/B e resposta antiga descartada |
| Regressão funcional | **14/14 grupos aprovados**, sete por motor: recompensa, histórico, contador, coleção, galeria/virada/rotação, RA, GLB, animações e cenários de catálogo |
| Navegação forçada | **Aprovada** nos dois motores, também na repetição serial; zero erros brutos de página e zero mensagens excluídas pelo classificador nas últimas execuções |
| Segurança | **Aprovada nos dois motores**: normal 200, Origin autorizado, preflight indevido 400, POST indevido 403, bloqueio CORS pelo navegador, erro de rede ativo status 0, mesma identidade preservada e 401 após logout |
| Saci | **16 aberturas/reloads no diagnóstico, 24 no primeiro controle válido e 24 na repetição final aprovados**, além da entrada/reload na matriz; imagem real completa, sem erros JS nos controles finais |
| Fontes pendentes | Quatro requests retidos por motor: carta aberta e imagem carregada; load ainda zero no Chromium e já emitido no WebKit (165 ms). O evento global não tem comportamento uniforme entre motores |
| Menus HTML | **24 combinações consolidadas aprovadas**: 12 WebKit na matriz e 12 Chromium na repetição; três destinos e Perfil continuam alcançáveis |
| Preservação | Hashes de **104 arquivos de aplicação idênticos**, incluindo código, catálogo, ilustrações e GLB; nenhuma alteração de produto nesta estabilização |

Houve dois resultados iniciais reprovados preservados: controle OPTIONS apontando para o preview Vite, corrigido para o FastAPI, e timeout isolado de 15 s aguardando o menu da casa em Chromium/320 px. Os outros 23 casos HTML passaram. O grupo Chromium foi repetido serialmente, sem mudança da aplicação, das condições de visibilidade/hit testing ou do limite: **12/12 passaram com HTTP 200**, incluindo o caso inicial. Foram adicionados HTTP e estado do DOM ao diagnóstico de uma eventual nova falha. A causa pontual daquele timeout não foi recuperada do log inicial; não se atribui uma causa inventada.

O runner completo inicial conserva exit 1 por esses resultados. As repetições corrigidas de controles/regressão funcional e HTML terminaram com exit 0; os resultados anteriores não foram reescritos como aprovação. A consolidação utiliza a última verificação de cada cenário, com proveniência explícita. Foram executados 26 retornos forçados por motor ao somar diagnóstico, reprodução anterior ao ajuste, matriz funcional e repetição final.

Evidências finais: [consolidação verificável](../tests/artifacts/etapa06-2/summary.json), [Node](../tests/artifacts/etapa06-2/node.log), [Python](../tests/artifacts/etapa06-2/python.log), [TypeScript/build](../tests/artifacts/etapa06-2/build.log), [matriz de navegação](../tests/artifacts/etapa06-2/report.json), [runner completo](../tests/artifacts/etapa06-2/regression-run.log), [repetição serial de controles e regressões](../tests/artifacts/etapa06-2/final-recheck.log), [menus HTML originais](../tests/artifacts/etapa06-2/html-controls.json), [repetição Chromium](../tests/artifacts/etapa06-2/html-controls-recheck.json), [runner HTML](../tests/artifacts/etapa06-2/html-recheck-run.log). As capturas novas estão em `tests/artifacts/etapa06-2/`, com nomes motor–dimensão–tela. As evidências antigas permanecem nas pastas anteriores.

### Arquivos desta estabilização

Modificados:

- `tests/hauntings.test.mjs` e `tests/hauntings-presentation-browser.mjs`: somente as expectativas literais da sequência.
- `tests/mobile-fixes-regression.mjs`: observação/correlação estrita de cancelamentos, preservando os erros brutos e as falhas ativas.
- `tests/navigation-final.mjs`: espera funcional do Saci, imagem verificada após abertura/reload e pasta de evidências parametrizada.
- `tests/navigation-html-controls.mjs`: pasta de evidências parametrizada, confirmação HTTP e diagnóstico de DOM em falhas; verificações de controles mantidas.
- Este relatório: nova seção 06.2 e cabeçalho atualizado, sem apagar resultados históricos.

Criados:

- `tests/navigation-errors.mjs`: classificador/observador restrito à navegação confirmada.
- `tests/navigation-errors.test.mjs`: controles positivos e negativos do classificador.
- `tests/stabilization-diagnostic.mjs`: reprodução anterior à mudança de classificação e rastreio.
- `tests/stabilization-controls.mjs`: CORS, Origin, rede ativa, identidade, logout e repetições do Saci.
- `backend/tests/run_stabilization.py`: serviços próprios, PostgreSQL isolado existente e execução dos testes selecionados, com encerramento em finally.

### Pendências e estado final de aceite

**Aceite técnico automatizado da Etapa 06: aprovado nesta estabilização.** Não persistiram falhas essenciais nas últimas verificações dos cenários solicitados. Não foi comprovado defeito de CORS ou mistura de sessões; a única ocorrência access control reproduzida com stack/lifecycle nessa investigação era um fetch capturado durante a saída. A mensagem pessoal específica dos logs antigos não reapareceu e sua causa individual não é afirmada como retroativamente comprovada. O classificador permanece conservador: uma ocorrência futura sem correlação suficiente reprova.

A causa pontual do timeout histórico do Saci não é recuperável dos logs antigos. As repetições com cache/contextos novos, execução concorrente e serial, imagens e fontes pendentes passaram. Isso valida o comportamento atual e a nova espera funcional, sem prometer ausência de qualquer timeout futuro nem atribuir uma correção ao produto que não ocorreu.

Continuam **não executados nesta etapa** os ensaios físicos Safari/Android/câmera e o adaptador sintético WebKit anteriormente bloqueado. O roteiro legado `hauntings-presentation-browser.mjs` recebeu a expectativa correta, mas sua execução visual integral não foi realizada: ainda aponta por padrão para Chrome Windows e para o antigo percurso React, cujo botão hoje leva à casa HTML. O contrato da sequência foi validado pela suíte Node; o roteiro legado não é apresentado como teste de navegador aprovado. Não foi reintroduzido o corredor anterior para acomodá-lo.

Não se declara homologação integral em smartphones físicos. As limitações acima permanecem documentadas; não há nova implementação pendente da navegação nem falha ativa reproduzida dos três itens de estabilização que impeça seu aceite automatizado. A Etapa 07 não foi iniciada.

Todos os serviços próprios de teste foram encerrados; as contas e fixtures são fictícias e restritas ao `bau_test` existente. Não houve mudança de schema, migration, seed de catálogo, banco de produção, dependência, CSS, componente visual, regra de recompensa, marcador, rastreamento, modelo ou animação. Identidade visual e todas as alterações locais anteriores foram preservadas. Nenhuma operação Git de escrita, branch, commit, push ou envio ao GitHub foi executado.

