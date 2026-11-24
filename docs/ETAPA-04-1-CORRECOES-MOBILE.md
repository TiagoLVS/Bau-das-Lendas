# Etapa 04.1 — Correções de compatibilidade mobile

Data: 20/11/2026, America/Sao_Paulo. Alterações locais pontuais, sem publicação ou integração no Git. Referências: auditoria técnica, etapas 02/03/04, TESTES-COMPATIBILIDADE-MOBILE, DIRETRIZES-DO-PROJETO, código e testes existentes. Os relatórios anteriores foram preservados como histórico.

## 1. Problemas identificados

A ampliação da galeria expandia a largura de layout além da viewport; o botão podia sair da altura disponível ou ter o toque interceptado após a virada. O problema era especialmente visível em paisagem. Controles da galeria tinham textos de 9–10 px e áreas de toque pequenas. A auditoria também registrou uma exceção de catálogo ao voltar rapidamente da casa no WebKit e um bloqueio no adaptador de câmera sintética.

## 2. Causas confirmadas

Duas fontes independentes de expansão foram reproduzidas:

1. O modal em grid tinha dimensionamento mínimo intrínseco, e a legenda flexível continha texto sem quebra. Em 320 px, mediu-se largura interna de 365 px; em 390 px, 494 px. A altura do conteúdo não reservava espaço estável para o fechamento. Na rotação, a largura excessiva e o conteúdo fora da área visível acompanhavam interceptações de toque.
2. A navegação da galeria só recebia limite/rolagem na regra até 640 px. Na paisagem 667×375, a primeira correção do modal ainda deixou innerWidth=745. Conter o flex da navegação também acima desse breakpoint resolveu essa segunda expansão.

Elevar somente o z-index do botão foi testado por injeção temporária no navegador, antes de alterar o código, e **não resolveu** o fechamento no Chromium. Portanto, não se atribuiu toda a falha a uma incompatibilidade genérica de CSS 3D. Dimensionamento, contenção e camadas foram corrigidos conjuntamente; as transformações da virada permaneceram intactas.

A investigação posterior também reproduziu a exceção de catálogo em **6/6 retornos rápidos no WebKit**, com requisição pendente/cancelada. O carregador tentava fallback e atualizava a interface de um documento em saída. A mensagem de falha real era colocada em `#dica`, que fica oculto no mobile. Esses dois estados exigiram tratamento diferente, descrito na seção 12.

## 3. Correções implementadas

Modal limitado à viewport dinâmica, com linhas independentes para título, carta, instrução e fechamento. A área da carta utiliza o espaço restante e admite rolagem controlada; o botão fica fora dela, numa camada própria. A arte é redimensionada proporcionalmente, com máximo de 340 px e limite pela largura/altura disponível. Legendas podem quebrar sem expandir o documento.

A navegação horizontal continua com os mesmos links, agora limitada ao espaço do seu contêiner também em larguras intermediárias. Não foi adicionado overflow-x:hidden ao body. O foco inicial da carta usa preventScroll para não deslocar a área modal durante a animação de entrada.

## 4. Arquivos modificados

- `public/casa/css/cartas.css` — regras locais de dimensionamento, camadas, legenda, navegação e alvos de toque.
- `public/casa/js/cartas-flip.js` — somente a opção preventScroll no foco inicial do modal.
- `public/casa/js/main.js` — ciclo de vida da carga do catálogo e mensagem de erro ativo visível na entrada, sem alterar controles/efeitos da casa.

Demais alterações que já existiam no repositório não foram descartadas nem atribuídas a esta etapa. A conferência final de hashes lista exatamente os arquivos da aplicação alterados nesta etapa.

## 5. Arquivos criados

- `tests/mobile-fixes-browser.mjs` — reprodução antes, matriz depois, toque/mouse/teclado/rotação/DPR.
- `tests/mobile-fixes-regression.mjs` — regressão de recompensa, histórico, contador, álbum, RA/modelo e investigação de catálogo.
- `backend/tests/run_mobile_fixes.py` — serviços locais próprios, banco isolado existente e regressões Python/Playwright.
- Este relatório. Evidências e logs em `tests/artifacts/mobile-fixes/`, ignorados pelo Git.

Não foram criadas dependências, migrações ou bibliotecas de interface.

## 6. Alterações de CSS

- Coluna/linha do modal em minmax(0,1fr), min-width/min-height zero e altura 100dvh, evitando tamanho mínimo intrínseco excessivo.
- Grid interno com linha flexível para a carta e linha independente para o botão.
- Contêiner de tamanho da carta (`container-type:size`); cqh permite calcular a arte a partir da altura realmente disponível, sem estimar a altura inteira do conteúdo por vh.
- Proporção 2:3 e object-fit:contain preservados; legendas não truncadas, com quebra de linha.
- Camada isolada para a carta e botão acima dela; legenda decorativa não recebe eventos diretamente, enquanto o article continua interativo.
- Padding considera safe-area-inset; em telas baixas o espaçamento diminui, sem esconder o botão.
- Navegação flex com min-width zero e rolagem horizontal local, sem cortar a página inteira.

Cores, famílias tipográficas, ilustrações, molduras, transições da virada e conteúdos não foram substituídos. O CSS compartilhado `card-view.css` e o JavaScript da virada `card-view.js` foram preservados.

## 7. Alterações de JavaScript

Na galeria, uma linha no controlador existente: `mounted.focus({ preventScroll: true })`. Escape, Tab, ativação nativa do botão e devolução de foco ao elemento que abriu a carta continuam utilizando o código existente. Não foi introduzido outro sistema de Flip, outra navegação ou bloqueio artificial de toque.

Na casa, beforeunload marca antecipadamente a saída durante a carga, e pagehide confirma o ciclo de saída. O listener de beforeunload é removido assim que a inicialização termina, evitando mantê-lo desnecessariamente nas páginas prontas. Depois dela não se inicia fallback nem se atualizam DOM/efeitos por causa de uma carga interrompida. Se o histórico restaurar uma página cujo catálogo não terminou de inicializar, pageshow/persisted reinicia a carga por reload; páginas já inicializadas conservam o comportamento anterior. Falhas enquanto a página está ativa continuam lançando o erro, agora com alerta visível no parágrafo existente da entrada e botão de exploração indisponível até recarregar.

## 8. Galeria antes e depois

Antes: a captura de paisagem do Chromium mostrava o fechamento inacessível e a automação registrava interceptação por legenda, instrução ou palco. Mesmo com z-index elevado na experiência diagnóstica, o toque falhava com o layout expandido.

Depois: as validações verificam largura interna/documento, botão inteiro na viewport, hit-testing, imagem 2:3 e toque/clique efetivo. Cada orientação inclui fechamento durante uma virada, no verso, após voltar à frente, por Escape e por Tab+Enter, com reabertura repetida. Não há force:true nos testes.

## 9. Orientação horizontal

568×320, 667×375, 800×360, 844×390, 852×393, 915×412 e 932×430 são exercitadas. O botão reserva sua própria linha e permanece acessível; a carta é reduzida proporcionalmente. O teste de regressão também gira a viewport com a carta desbloqueada aberta e em virada, depois fecha por toque.

Em 568×320 após a correção, o botão fica em y=260, com altura 48 e fundo em 308: 12 px dentro do limite inferior de 320 px. A emulação não certifica safe areas físicas.

## 10. Telas pequenas

A matriz cobre 320, 360, 375, 390, 393, 412 e 430 px. A largura do documento e innerWidth são comparados à viewport solicitada, evitando a falsa aprovação por comparar scrollWidth com um innerWidth já expandido. A correção não redimensiona globalmente o frontend.

## 11. Interação por toque

Links da navegação da galeria têm altura/largura mínima de 44 px; filtros já tinham 44 px de altura, e os summaries da ficha receberam esse mínimo. Legendas/ações que tinham 9–10 px foram revistas localmente para 11 px; o rótulo de busca usa 12 px. Famílias, cores e contraste existentes foram mantidos.

A rolagem horizontal dos links continua necessária em telas estreitas, sem alteração da quantidade ou destinos das abas. A reorganização geral da navegação permanece fora desta etapa.

## 12. Erro de catálogo no WebKit

**Causa reproduzida:** antes da correção, as seis navegações canceladas no WebKit produziram `Catálogo oficial indisponível.`; Chromium não registrou a exceção nas mesmas seis tentativas. O tratamento anterior não distinguia cancelamento por saída de falha ativa.

A primeira tentativa usando apenas pagehide foi insuficiente: o WebKit ainda registrou as seis exceções. A marcação antecipada por beforeunload resolveu a rodada dirigida; a validação final é executada sem os listeners de diagnóstico. Não se ignora indiscriminadamente AbortError/ApiError: a decisão depende da saída do documento.

A correção é local ao carregador da casa, sem mudar `api.js`, o catálogo ou a autenticação. API indisponível com arquivo oficial íntegro continua carregando as 60 lendas. Quando ambas as fontes falham com a página ativa, a mensagem permanece visível e o erro continua registrado; não se substituem os dados por lendas fictícias. O alerta usa o parágrafo existente da entrada porque o aviso de rodapé era oculto no mobile.

A regressão final, sem listeners de diagnóstico, registrou zero exceções indevidas em seis retornos por motor e também verificou a restauração pelo histórico. A falha real das duas fontes permanece visível e gera a exceção esperada. Resultados completos estão na seção 16.

## 13. Câmera sintética e RA

O adaptador WebKit permaneceu com a classificação BLOQUEADO da auditoria anterior: a perda do hook durante o cenário não teve causa claramente isolada nesta etapa. Não se modificou a aplicação para acomodar esse comportamento artificial nem se declarou defeito na câmera física do Safari.

Nenhuma alteração em câmera, marcadores, jsQR, rastreamento, GLB, animações, abertura do baú ou regras de recompensas. A regressão carrega o GLB e executa os três clipes por AnimationMixer. Reconhecimento físico e retomada da câmera no iPhone continuam pendentes.

## 14. Resultados Chromium

**APROVADO:** dez configurações, 19 grupos de orientação/interação e 95 ciclos de abertura/fechamento: sete larguras móveis, desktop 1300×900 com mouse e dois perfis com DPR 2,75. Toque durante a virada, verso, retorno à frente, Escape, Tab+Enter, botão contido e largura do documento passaram. Nenhum clique forçado.

## 15. Resultados WebKit

**APROVADO:** dez configurações, 19 grupos de orientação/interação e 95 ciclos de abertura/fechamento, incluindo desktop com mouse e dois perfis com DPR 3. As mesmas verificações de geometria, imagem, fechamento e teclado passaram. Safe areas reais e Safari físico continuam pendentes.

Os dois motores são aproximações técnicas no computador; WebKit automatizado não equivale a executar Safari em iPhone. Chromium usa ANGLE/SwiftShader; o runner WebKit normaliza somente variáveis GTK/GIO herdadas do Snap.

## 16. Resultados de regressão

| Verificação | Resultado |
| --- | --- |
| Galeria Chromium | 10 configurações / 19 grupos APROVADOS |
| Galeria WebKit | 10 configurações / 19 grupos APROVADOS |
| Regressão dirigida final | 7 cenários por motor / 14 APROVADOS, sem listeners extras de diagnóstico |
| Cancelamento do catálogo | 12 retornos controlados, nenhuma exceção indevida; antes, 6/6 no WebKit |
| Retorno pelo histórico | APROVADO nos dois motores, catálogo oficial de 60 registros |
| API indisponível + arquivo oficial íntegro | APROVADO: fallback oficial, sem dados inventados |
| Ambas as fontes indisponíveis em página ativa | APROVADO: alerta visível, exploração desabilitada e erro real registrado em cada motor |
| Autenticação existente | APROVADO nos dois motores: cadastro, login/logout, reload, revogação, sincronização entre abas, troca A/B e descarte de resposta atrasada |
| Álbum existente | APROVADO nos dois motores: recompensa, reload sem duplicação e troca de conta sem carta anterior |
| Recompensa/histórico/contador | APROVADO nos dois motores; concessão real de teste, histórico individual, contador e 409 para segunda concessão no dia |
| RA/GLB | APROVADO nos dois motores para carregamento, 6.572 triângulos, oito materiais e três clipes executados (Idle 0°, Open/Close cerca de 105°) |
| Python relevante | 40 APROVADOS, 39 casos SQLite desmarcados; um aviso preexistente de depreciação do TestClient |
| Node | 43 APROVADOS / 1 falha conhecida, sequência das assombrações |
| TypeScript | APROVADO (`tsc --noEmit`) |
| Build Vite | APROVADO, com alerta preexistente de bundle grande |

A falha Node esperava `olhos, espelho, saci, lobo, boitata`; o catálogo atual contém `espelho, lobo, saci, alta, boitata`. Nem a sequência nem o teste foram alterados para fazê-lo passar.

A primeira preparação do teste de foco abriu a carta por `?carta=...` e exigiu foco num botão que não havia aberto o modal. A repetição usa o botão AMPLIAR e mantém a asserção de retorno de foco; não removeu a verificação nem forçou eventos. O primeiro relatório ficou preservado como diagnóstico, não como resultado final.

[Regressão final](../tests/artifacts/mobile-fixes/2026-11-21T01-53-01-541Z-regression/report.json) · [Resumo verificável](../tests/artifacts/mobile-fixes/summary.json) · [Python](../tests/artifacts/mobile-fixes/python.log) · [Node final](../tests/artifacts/mobile-fixes/node-final.log).

Integridade: dos 107 arquivos monitorados da aplicação, somente os três listados na seção 4 mudaram; 104 permaneceram idênticos e nenhum arquivo de aplicação foi adicionado. O build contém exatamente as mesmas versões dos três arquivos modificados ([manifesto](../tests/artifacts/mobile-fixes/integrity-final.json)).

O plano `focused` executa os sete cenários novos; `BAU_MOBILE_CHECKS` permite repetir uma lista de cenários separados por vírgula, marcando os demais NÃO EXECUTADO. `BAU_MOBILE_TRACE=1` habilita apenas o registro de eventos de diagnóstico, desativado na aceitação final.

Os serviços utilizam somente APP_ENV=test/127.0.0.1:55439/bau_test, cluster próprio já preparado e contas fictícias. O runner de serviços não executa migrations/seed. Os testes Python reutilizam fixtures existentes com schemas temporários próprios no PostgreSQL; nenhum schema real de desenvolvimento/produção foi alterado. Nenhum arquivo de migração foi criado/modificado.

TypeScript e build executados diretamente pelos binários locais, evitando hooks que regeneram assets. O alerta preexistente de bundle acima de 500 kB permanece registrado; não foi feita otimização ampla nesta etapa.

## 17. Screenshots e reprodução

| Evidência | Antes | Depois |
| --- | --- | --- |
| Chromium 320 retrato | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-29-18-126Z-before/chromium-320-1-retrato.png) | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-35-24-756Z-after/chromium-320-1-retrato.png) |
| Chromium 568×320 | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-29-18-126Z-before/chromium-320-1-paisagem.png) | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-35-24-756Z-after/chromium-320-1-paisagem.png) |
| Chromium 844×390 | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-29-18-126Z-before/chromium-390-1-paisagem.png) | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-35-24-756Z-after/chromium-390-1-paisagem.png) |
| WebKit 320 retrato | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-29-18-126Z-before/webkit-320-1-retrato.png) | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-35-24-756Z-after/webkit-320-1-retrato.png) |
| WebKit 568×320 | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-29-18-126Z-before/webkit-320-1-paisagem.png) | [PNG](../tests/artifacts/mobile-fixes/2026-11-21T01-35-24-756Z-after/webkit-320-1-paisagem.png) |

[Diagnóstico antes](../tests/artifacts/mobile-fixes/2026-11-21T01-29-18-126Z-before/report.json) · [Matriz final](../tests/artifacts/mobile-fixes/2026-11-21T01-35-24-756Z-after/report.json) · [Node detalhado](../tests/artifacts/mobile-fixes/node-detailed.log). A rodada intermediária `2026-11-21T01-32-55-683Z-after` foi interrompida após identificar a causa adicional de largura na navegação; não é usada como resultado final.

Evidências são capturadas com animações habilitadas, para não avançar artificialmente a virada durante o teste. Não há credenciais, tokens ou dados pessoais nas imagens; a matriz visual usa a galeria pública, e a regressão usa contas fictícias sem guardar senhas.

Com `.env.test`, cluster marcado e binários Playwright existentes, executar da raiz:

```sh
node_modules/.bin/tsc --noEmit
node_modules/.bin/vite build --outDir tests/artifacts/compat-mobile/runtime/dist
backend/.venv/bin/python backend/tests/run_mobile_fixes.py after
backend/.venv/bin/python backend/tests/run_mobile_fixes.py regression
# Para repetir somente os cenários novos:
backend/.venv/bin/python backend/tests/run_mobile_fixes.py focused
node --test --test-isolation=none --test-reporter=tap tests/*.test.mjs
```

A fase `before` é destinada à reprodução do estado anterior; após a correção não recria automaticamente o código antigo. Screenshots antes foram capturados antes de editar o CSS. Relatórios parciais/interrompidos foram preservados separadamente da rodada final.

## 18. Pendências

Nenhuma falha de fechamento/expansão permaneceu na matriz final de galeria. Permanecem: validação física de safe areas/barras/teclado; diagnóstico separado da câmera sintética WebKit; desempenho da casa e bundle principal; revisão global de textos/abas fora da galeria. Essas pendências não foram mascaradas por alterações na câmera, nos assets ou na navegação.

A falha conhecida da sequência das assombrações continua separada e intocada. A futura reorganização das abas e o Flip educativo definitivo não foram antecipados.

## 19. Smartphones físicos

Ainda é necessário validar Safari e Chrome Android reais: barras dinâmicas, notch/indicador inferior, teclado, toque/rolagem, rotação com modal aberto, legibilidade e desempenho em DPR nativo. Para RA: HTTPS, câmera traseira/permissões, QR físico em diferentes distâncias/iluminação e retorno entre aplicativos. Não se certificou esse comportamento físico pela emulação.

## 20. Próxima etapa recomendada e preservação

Executar primeiro a validação física da galeria e da RA, usando o checklist e as evidências desta etapa. Investigar separadamente desempenho da casa/câmera sintética antes de qualquer mudança ampla. Reorganização da navegação e Flip educativo exigem etapa própria.

A identidade visual, conteúdos, navegação/destinos, regras diárias, histórico/contador, assombrações, easter eggs, catálogo, ilustrações, GLB e animações foram preservados. Nenhuma dependência global/sudo, publicação, branch ou operação de escrita no Git foi executada. Nenhuma alteração enviada ao GitHub. Não foi iniciada outra etapa.
