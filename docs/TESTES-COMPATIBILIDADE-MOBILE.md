# Testes de compatibilidade móvel — Baú das Lendas

Data: 20/11/2026, America/Sao_Paulo. Auditoria local complementar; nenhuma correção da aplicação implementada.

Referências consultadas: `AUDITORIA-TECNICA.md`, `ETAPA-02-BACKEND-POSTGRESQL.md`, `ETAPA-03-AUTENTICACAO-SEGURANCA.md`, `ETAPA-04-RECOMPENSAS-HISTORICO.md`, `DIRETRIZES-DO-PROJETO.md` e código atual. Resultados antigos são contexto, não testes desta auditoria.

## 1. Ambiente utilizado

Ubuntu 26.04.1 LTS, Node 24.18.0, Python 3.14.4 no `backend/.venv` existente, PostgreSQL 18. API Uvicorn em 127.0.0.1:8000 com `--no-proxy-headers`; frontend compilado por TypeScript/Vite e servido por preview em localhost:5175. Nenhuma publicação ou acesso a banco real.

Inicialmente foi reutilizado o cluster temporário isolado da etapa 04, `bau_test`, loopback:55439, configuração `backend/.env.test`. Revisão 0002 e catálogo de 60 lendas conferidos sem migration/seed. Entre retomadas, os arquivos de `/tmp` deixaram de estar disponíveis, incluindo navegadores, build e cluster. As evidências no projeto permaneceram preservadas.

A última retomada criou **outro cluster próprio e novo**, em `tests/artifacts/compat-mobile/runtime/pgdata`, com marca de propriedade, PostgreSQL 18, autenticação SCRAM e o mesmo alvo exclusivamente de testes. Migration e seed foram executados somente nesse banco novo e vazio; nenhum banco existente de desenvolvimento/produção foi alterado. A fixture manipula apenas contas fictícias novas, adicionando uma carta para testar o álbum e expirando suas sessões. Dados fictícios do novo cluster foram preservados.

TypeScript e Vite build passaram novamente, diretamente pelos binários locais, sem hooks de regeneração de assets. Build final em `tests/artifacts/compat-mobile/runtime/dist`. Diretório runtime e evidências são ignorados pelo Git. O runner encerra API, preview e PostgreSQL próprios ao finalizar.

## 2. Bibliotecas verificadas

- **APROVADO:** `libmanette-0.2-0`, dpkg `install ok installed`, versão 0.2.13-1; a biblioteca instalada manualmente permite executar o WebKit.
- **APROVADO:** Playwright 1.64.1, Chromium 156.0.8078.4, WebKit 27.2 e dependências Python existentes; `pip check` sem dependências quebradas.
- Binários Playwright inicialmente em `/tmp/bau-etapa04-browsers`; após a perda dos temporários, foram baixadas novamente **as mesmas versões** para `tests/artifacts/compat-mobile/runtime/browsers`.
- Nenhum sudo, pacote administrativo, nova dependência npm/pip ou atualização de lockfile. Não há biblioteca adicional cuja instalação administrativa seja solicitada.

## 3. Estado do WebKit

**APROVADO com isolamento do ambiente de teste:** inicialização, HTTP local, páginas e API. O ambiente bruto do terminal Snap inicia o navegador, mas a navegação HTTP falha. O diagnóstico encontrou conflito com `libpthread` de `/snap/core20` e símbolo `__libc_pthread_init`/GLIBC_PRIVATE.

O runner remove somente do subprocesso do navegador, quando contêm `/snap/`, `GTK_PATH`, `GTK_EXE_PREFIX`, `GIO_MODULE_DIR`, `GIO_EXTRA_MODULES` e `GI_TYPELIB_PATH`, conforme a etapa 03. Nesta execução estavam presentes três dessas variáveis. Nenhuma configuração do sistema/Snap foi alterada.

WebKit Linux automatizado não equivale ao Safari instalado em iPhone. A matriz não certifica um aparelho físico.

## 4. Estado do Chromium

**APROVADO:** inicialização, HTTP local e WebGL com ANGLE/SwiftShader no ambiente de testes. Não exigiu a normalização GTK/GIO usada pelo WebKit. A renderização por software afeta fluidez e tempos; não representa GPU móvel. Houve problemas de toque/fechamento da galeria descritos adiante.

## 5. Dispositivos emulados

Oito configurações por motor: SE 320, SE equivalente 375, iPhone 12, iPhone 13, iPhone 15, iPhone 15 Pro Max, Android pequeno e Google Pixel. Nomes identificam configurações representativas, não execução nesses aparelhos. Chromium usa presets Pixel com dimensões solicitadas; WebKit usa presets iPhone ou equivalente iPhone 13 quando o nome não existe no Playwright.

Diagnósticos iniciais usaram DPR nativo dos presets (Chromium 2,75; WebKit 3). A matriz retomada usa **DPR 1** para limitar rasterização, mantendo viewport móvel e toque. O JSON registra DPR efetivo/original. Isso não certifica qualidade/desempenho em DPR nativo. Cada perfil usa um navegador independente.

## 6. Resoluções e matriz de resultados

Sete tamanhos: 320×568, 375×667, 390×844, 393×852, 430×932, 360×800 e 412×915; iPhone 12/13 compartilham 390×844. A galeria também foi testada com largura/altura invertidas. Portais recebeu redução de 150 px de altura como aproximação de mudança da área disponível, sem reproduzir barras/teclado reais.

A tabela consolida **12 grupos de cenários por configuração**, substituindo somente os cenários repetidos por seus resultados posteriores. Não é uma única sessão end-to-end, nem contagem de cada assert. JSONs originais preservam falhas e interrupções. Câmera/QR e erros JavaScript têm observações adicionais e não ficam aprovados implicitamente pelos totais.

| Motor | Perfil | Viewport | APROVADO | REPROVADO | BLOQUEADO |
| --- | --- | --- | ---: | ---: | ---: |
| Chromium | iPhone SE | 320×568 | 10 | 1 | 1 |
| Chromium | iPhone SE equivalente | 375×667 | 11 | 0 | 1 |
| Chromium | iPhone 12 | 390×844 | 10 | 1 | 1 |
| Chromium | iPhone 13 | 390×844 | 10 | 1 | 1 |
| Chromium | iPhone 15 | 393×852 | 10 | 1 | 1 |
| Chromium | iPhone 15 Pro Max | 430×932 | 10 | 1 | 1 |
| Chromium | Android pequeno | 360×800 | 10 | 1 | 1 |
| Chromium | Google Pixel | 412×915 | 10 | 1 | 1 |
| WebKit | iPhone SE | 320×568 | 10 | 1 | 1 |
| WebKit | iPhone SE equivalente | 375×667 | 11 | 0 | 1 |
| WebKit | iPhone 12 | 390×844 | 11 | 0 | 1 |
| WebKit | iPhone 13 | 390×844 | 11 | 0 | 1 |
| WebKit | iPhone 15 | 393×852 | 11 | 0 | 1 |
| WebKit | iPhone 15 Pro Max | 430×932 | 11 | 0 | 1 |
| WebKit | Android pequeno | 360×800 | 11 | 0 | 1 |
| WebKit | Google Pixel | 412×915 | 11 | 0 | 1 |

O BLOQUEADO comum às 16 linhas é a repetição do cenário pesado da casa, separada após timeouts. Seu diagnóstico detalhado está nas seções 9 e 15. Não significa ausência da página nem aprovação da casa inteira.

## 7. Funcionalidades aprovadas

**APROVADO nos dois motores, dentro do escopo automatizado:**

- Cadastro, login correto/incorreto, logout concluído, sessão após reload, sessão expirada no servidor, troca de contas e mensagem de falha de rede no login. Cookies verificados por nome/atributos, sem registrar valores: HttpOnly, SameSite=Lax, path `/api`. A configuração HTTP local não certifica cookie Secure de produção.
- Entrada, abertura da casa e retorno pelo histórico, perfil, álbum, galeria, Portais e RA; limitações específicas de interação estão separadas abaixo.
- Álbum com 60 posições, bloqueadas/desbloqueadas, imagem da Loira do Banheiro, detalhe e verso existente, persistência após recarregar e isolamento entre contas.
- Recompensa real via API, progresso de 1 para 2 cartas, álbum atualizado, histórico, contador diário e rejeição de nova concessão no mesmo dia por `/api/draws` com 409. No WebKit, a API pode ser verificada independentemente do QR simulado.
- Disponibilidade de mediaDevices/getUserMedia, inicialização Three.js/WebGL/GLTFLoader, GLB e execução dos clipes pelo AnimationMixer.
- Mensagens e nova tentativa para NotAllowedError, NotFoundError e NotReadableError, **injetados pelo teste**, sem solicitar câmera pessoal.
- CSS.supports confirmou dvh, svh, perspective e backface-visibility; Pointer Events/toque disponíveis. Safe-area insets emulados foram zero, sem certificar notch.

Abertura por QR sintético, overlay da recompensa e descarte de recursos passaram no Chromium. O resultado específico do WebKit está na seção 13.

## 8. Reprovações e ocorrências reavaliadas

**REPROVADO:** contenção/fechamento por toque da ampliação da galeria em paisagem. A matriz mostra quais configurações reproduziram o problema; 375×667 passou nos dois motores.

**Automação corrigida, aplicação intacta:** a primeira matriz consultava `/api/album` imediatamente depois de disparar logout, sem aguardar sua conclusão. Recebeu 200 no Chromium/iPhone 15 e nos dois SE do WebKit. As repetições aguardaram a tela de login e passaram com 401, sessão expirada, troca de conta e tratamento de rede. Não foi comprovado vazamento entre contas.

**Ocorrências pontuais a acompanhar:** no primeiro Chromium/430×932, o fechamento do álbum foi interceptado pela inspeção ainda aberta, e Portais excedeu timeout aguardando o segundo SVG. A repetição dirigida, com espera explícita pelo fechamento da inspeção, passou álbum e Portais. Não se declarou regressão permanente, mas lentidão/intermitência merece verificação física.

**Erro JavaScript observado:** no WebKit/iPhone 13, ao voltar rapidamente da casa, ocorreu `Catálogo oficial indisponível.` junto de cancelamentos de `/api/legends`. A navegação retornou e o restante funcionou. A relação com cancelamento de navegação é uma inferência apoiada no log e no throw de `public/casa/js/main.js`, não uma causa definitivamente isolada. Investigar tratamento de cancelamento sem ocultar falhas reais do catálogo.

## 9. Testes bloqueados e não executados

- **BLOQUEADO:** WebKit HTTP com ambiente Snap original; contornado somente no subprocesso de teste.
- **BLOQUEADO:** cenário completo da casa no WebKit, que excedeu 45 s. Na rodada interrompida, passos seguintes falharam por página/contexto fechado; são bloqueios em cascata, não regressões independentes nem prova de crash do site.
- **NÃO EXECUTADO integralmente:** percurso completo do jardim, todos os easter eggs por descoberta natural, sequência completa das assombrações, leitura humana de todas as cartas, auditoria detalhada de requisições redundantes e estresse prolongado de memória/GPU.
- **DEPENDENTE DE DISPOSITIVO FÍSICO:** câmera traseira, marcador impresso, movimento/iluminação, permissões do sistema, giroscópio, notch/indicador inferior, teclado, barras Safari e alternância real de aplicativos.

## 10. Problemas específicos do WebKit

O isolamento GTK/GIO é necessário neste computador. O cenário SE 320 reproduziu o botão de fechar fora da paisagem; os demais sete perfis concluíram o cenário de galeria. Houve o erro de catálogo durante retorno rápido descrito acima e dificuldade no adaptador de câmera sintética. Não atribuir automaticamente esses últimos resultados à câmera real do iPhone.

O teste de áudio da casa não concluiu no WebKit. Reprodução de áudio após gesto nesse motor permanece BLOQUEADA nesta auditoria; autoplay/vídeo/permissões reais exigem Safari físico.

## 11. Problemas específicos do Chromium

A galeria falhou em sete dos oito perfis. Em 390×844 e tamanhos maiores/Android, o log registra `span.cx-face` da carta interceptando eventos destinados a `#revelar-fechar` depois da rotação. A imagem pode mostrar o botão, apesar de seu toque ser interceptado. Não foi usado force tap para esconder a falha. O resultado sugere investigar sobreposição/hit-testing CSS 3D, sem afirmar causa única.

Em 320×568, o fechamento ficou abaixo do limite de paisagem, também reproduzido no WebKit. Tempos locais de algumas navegações Portais foram bem maiores no Chromium; a seção 15 separa isso de desempenho móvel.

## 12. Responsividade e particularidades do Safari

**REPROVADO — menor tela:** na paisagem Chromium 568×320, fechar estava em y=287,48 com 48 px de altura, terminando em 335,48. Screenshot confirma corte inferior. Na vertical solicitada de 320 px, a galeria mediu innerWidth=364 e visualViewport.width=320; em 375 px, também houve expansão do layout. Ausência de overflow na raiz não certifica ajuste quando innerWidth já aumentou.

**Revisão de usabilidade:** rótulos de 9–11 px e alvos de toque com 13–32 px de altura foram medidos em casa/galeria. Limiares de 44×44 e texto de 12 px são triagem, não certificação normativa. Navegação horizontal rolável inicia com links fora da vista; isso não prova que sejam inacessíveis, mas exige revisão da descoberta/rolagem por toque.

A RA usa dvh e safe areas; o vídeo tem muted, autoplay e playsinline. A galeria usa CSS 3D/perspective/backface-visibility. Viewport redimensionada e evento focus são aproximações: não certificam barras Safari, teclado virtual, screen.orientation/sensor ou retorno entre apps. Safe areas zero em emulação não validam entalhes reais.

## 13. Realidade aumentada, modelo e câmera

GLB preservado: **358.744 bytes, 6.572 triângulos, oito materiais**. CloseChest/Idle/OpenChest têm dois segundos; abertura/fechamento percorrem aproximadamente 105°, Idle permanece imóvel. A sonda executou os clipes, não apenas consultou os nomes. OpenChest foi também exercitado no fluxo de recompensa do Chromium; o ciclo visual completo de fechamento em câmera física não foi certificado.

Materiais e loader funcionaram nos dois motores. Aparência/oclusão/rastreamento em câmera real continuam pendentes. A aplicação conserva Three.js/jsQR; não foi trocada por MindAR.

**APROVADO — Chromium:** QR 01 não ofereceu abertura; QR 02 habilitou o baú, chamou a API, mostrou a recompensa e persistiu o álbum. Tracks foram encerradas e o contêiner ficou sem canvas após pagehide.

**BLOQUEADO — QR sintético no WebKit:** nas repetições, o botão de abertura não apareceu. O último diagnóstico (`2026-11-21T01-16-25-084Z`) confirmou adaptador instalado antes do toque, mas não mais instalado durante a chamada; a função sintética não chegou a registrar estágio, nenhum stream foi criado, e o vídeo permaneceu em readyState=0/0×0, com mensagem de permissão negada. A causa da perda do hook não foi isolada. O canvas vazio funciona no probe independente, portanto não se declara captureStream indisponível em geral.

O JSON bruto registra timeout/REPROVADO do cenário sintético; a consolidação classifica **BLOQUEADO por falha do adaptador da automação**, preservando observedStatus e proveniência. Esse resultado não reprova o reconhecimento físico no Safari/iPhone. API, histórico e persistência foram verificados por chamada direta quando o QR sintético falhou. Descarte integrado de câmera WebKit e reconhecimento físico permanecem não certificados.

A câmera sintética usa canvas.captureStream e os QR públicos gerados em Portais. Um probe separado de canvas vazio produziu vídeo 640×480 nos dois motores (`runtime/media-probe.json`), mas isso sozinho não certifica o adaptador completo. Não se acessou câmera pessoal.

O descarte no fluxo sintético do Chromium confirmou tracks encerradas e zero canvases no contêiner após pagehide. A sonda GLB também descarta seus próprios recursos. Isso não comprova ausência de vazamentos após visitas prolongadas. O GLB é carregado uma segunda vez pela sonda de auditoria; não contabilizar essa requisição extra como redundância da aplicação.

## 14. Cartas

A Loira foi carregada em 768×1152, proporção 2:3 e object-fit contain. Virada existente por toque em ambas as direções, ampliação e verso foram exercitados; não foi implementado novo Flip. Os cenários de galeria reprovados não invalidam automaticamente o carregamento/virada que aconteceu antes do problema de fechamento.

O álbum distingue desbloqueadas/bloqueadas, mostra detalhe e persiste após reload. Isso não certifica ilustrações/legibilidade humana do catálogo inteiro. A carência de arte oficial em parte das 60 lendas já é registrada na auditoria anterior; nenhuma imagem foi substituída ou reduzida.

## 15. Desempenho e erros

Medições locais, sem throttling celular; não equivalem a smartphone. Intervalos abaixo são dos cenários consolidados. DOMContentLoaded não mede tempo até interação ou estabilidade visual.

| Motor / página | DOMContentLoaded | Recursos transferidos observados | GLB da aplicação |
| --- | --- | --- | --- |
| Chromium / início | 336–612 ms | cerca de 256,5 kB | — |
| Chromium / Portais | 577–11.296 ms | 600 B nesta navegação, demais recursos em cache | — |
| Chromium / RA | 466–974 ms | cerca de 724,3 kB | 7,4–16,3 ms |
| WebKit / início | 208–253 ms | cerca de 255,6 kB | — |
| WebKit / Portais | 67–109 ms | 600 B nesta navegação, demais recursos em cache | — |
| WebKit / RA | 416–692 ms | cerca de 723,6 kB | 3–9 ms |

O GLB transferiu aproximadamente 359.044 bytes incluindo overhead, com corpo 358.744 bytes. Cache/transferSize zero não significam ausência de recurso; loadMs=0 pode indicar coleta antes do evento load. O build alertou para bundle principal de 879,73 kB minificado (251,29 kB gzip), acima do limiar de 500 kB. Não houve alteração de qualidade/asset ou divisão automática.

Na casa Chromium/iPhone 13 com DPR nativo, o atalho existente “Explorar”, que pula o jardim, levou cerca de 15,25 s até o interior. O cenário com instrumentação/capturas levou 51,5 s. Áudio ficou running após gesto; próxima/anterior, dossiê, eventos sintéticos de swipe e aparição forçada existentes funcionaram. Lua cheia foi ativada pelo parâmetro existente, e a função de Saci foi invocada; isso não valida descoberta natural de todos os easter eggs. A sequência das assombrações foi preservada.

Não foram registrados erros WebGL nas execuções selecionadas. HTTP 401 de sessão/login inválido, 409 diário e aborto de rede induzido são esperados. No WebKit houve cancelamentos de fontes/API durante navegação rápida, além da exceção de catálogo descrita na seção 8. Não foi identificado 404 persistente de ilustração nas execuções selecionadas. Não se realizou profiling de heap/GPU/FPS prolongado.

## 16. Evidências, arquivos e reprodução

Criados nesta auditoria:

- `tests/compat-mobile-browser.mjs`: matriz e repetições dirigidas.
- `backend/tests/browser_compat_fixture.py`: apenas contas fictícias em APP_ENV=test/127.0.0.1:55439/bau_test.
- `backend/tests/run_browser_compat.py`: retomada isolada, valida cluster próprio, prepara somente banco novo e encerra serviços.
- Este relatório; JSONs/screenshots/diagnósticos ignorados em `tests/artifacts/compat-mobile/`.

`consolidated.json` registra cenário, classificação e relatório de origem; o inventário lista somente PNGs existentes. As primeiras tentativas de captura com timeout podem ter caminho no JSON bruto sem PNG correspondente. Campos de e-mail/senha são mascarados; valores de cookie, senhas e tokens não são registrados. Todas as contas são fictícias.

| Página | Chromium | WebKit |
| --- | --- | --- |
| Início | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-inicio.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-inicio.png) |
| Cadastro | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-cadastro.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-cadastro.png) |
| Login | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-login.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-login.png) |
| Perfil | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-perfil.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-perfil.png) |
| Álbum | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-album.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-album.png) |
| Galeria ampliada | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-galeria-ampliada.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-galeria-ampliada.png) |
| Carta / verso | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-carta-album.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-carta-album.png) |
| RA | [PNG](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-ra.png) | [PNG](../tests/artifacts/compat-mobile/2026-11-21T01-09-58-070Z/webkit-iphone13-ra.png) |

Outras evidências: [Galeria cortada em paisagem](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-se-320-paisagem.png), [Toque interceptado na galeria](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-iphone12-falha-3.png), [Recompensa via QR Chromium](../tests/artifacts/compat-mobile/2026-11-20T22-31-01-974Z/chromium-iphone13-recompensa.png), [Casa/dossiê Chromium](../tests/artifacts/compat-mobile/2026-11-20T21-52-15-568Z/chromium-iphone13-casa-dossie.png), [Casa WebKit](../tests/artifacts/compat-mobile/2026-11-20T21-52-15-568Z/webkit-iphone13-casa.png), [Resultados consolidados](../tests/artifacts/compat-mobile/consolidated.json).

Principais execuções (nomes em UTC; as de 21/11 UTC ainda ocorreram em 20/11 em São Paulo):

- `2026-11-20T21-44-21-390Z` e `21-52-15-568Z`: diagnóstico DPR nativo, casa, ajustes de seletores e QR Chromium; interrupções separadas de regressões.
- `2026-11-20T22-31-01-974Z`: oito perfis Chromium e primeiros WebKit, antes da perda dos temporários.
- `2026-11-20T22-39-37-676Z`: logout Chromium/iPhone 15 revalidado.
- `2026-11-21T01-09-58-070Z`: cinco perfis WebKit restantes.
- `2026-11-21T01-13-00-218Z`: logout SE 320/375 WebKit revalidado.
- `2026-11-21T01-13-24-227Z`: álbum/Portais Chromium 430 revalidados.
- Repetições finais do adaptador de câmera têm proveniência em `consolidated.json`.

Para repetir sem hooks que geram assets:

```sh
node_modules/.bin/tsc --noEmit
node_modules/.bin/vite build --outDir tests/artifacts/compat-mobile/runtime/dist
backend/.venv/bin/python backend/tests/run_browser_compat.py
```

Exige `.env.test` local já preparado, PostgreSQL 18 e binários Playwright nas versões indicadas. O runner recusa portas ocupadas e cluster não marcado. Seu plano padrão repete os cenários pendentes desta auditoria; `BAU_COMPAT_ONLY_QR=1` limita à câmera sintética WebKit.

Para executar a matriz completa com API/preview isolados já iniciados nas portas documentadas:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/tests/artifacts/compat-mobile/runtime/browsers" BAU_TEST_ORIGIN=http://localhost:5175 BAU_TEST_DATABASE=bau_test BAU_COMPAT_DPR=1 BAU_COMPAT_SKIP_HOUSE=1 node tests/compat-mobile-browser.mjs
```

Filtros opcionais: `BAU_COMPAT_ENGINE=WebKit` ou Chromium; `BAU_COMPAT_CASE=iphone13` (aceita lista por vírgulas); `BAU_COMPAT_STEPS` lista nomes de cenários e marca os demais NÃO EXECUTADO. Sem DPR explícito, usa-se o preset; sem SKIP_HOUSE, tenta a casa completa. Código de saída diferente de zero inclui bloqueios/reprovações; ler o JSON para separar diagnóstico da aplicação e limitação da automação. Não usar contas/bancos reais.

## 17. Recomendações por prioridade

1. **P1:** corrigir contenção/fechamento da ampliação em paisagem, hit-testing/sobreposição CSS 3D e acesso ao botão, preservando arte, estilo e Flip existente. Começar por 568×320 e 844×390.
2. **P1:** investigar expansão da área de layout; conferir visualViewport, orientação e acesso aos controles, sem usar apenas scrollWidth versus innerWidth como aprovação.
3. **P1:** concluir QR/câmera/permissões/retorno de app no Safari físico via HTTPS antes de declarar suporte integral; separar falha do adaptador de teste de falha da câmera real.
4. **P2:** perfilar casa, navegações lentas e bundle principal em GPU real; medir antes de propor otimizações. Preservar sequência das assombrações.
5. **P2:** revisar áreas de toque, textos de 9–11 px e descoberta da rolagem das abas, preservando identidade.
6. **P2:** tratar cancelamentos da carga do catálogo ao sair da casa; revalidar a exceção observada no WebKit e a intermitência inicial em 430 px.
7. **P2:** manter runners isolados, artefatos persistentes, espera pelo término de operações assíncronas e resultados físicos separados da emulação.

Nenhuma recomendação foi implementada automaticamente na aplicação.

## 18. Validação física e preservação

**DEPENDENTE DE DISPOSITIVO FÍSICO:** Safari em iPhone pequeno e com notch; Chrome Android:

1. HTTPS e mesma origem; permissões concedidas, negadas e revogadas, câmera traseira, vídeo inline, áudio após gesto e ausência/ocupação de câmera. HTTP pelo IP do computador no telefone não equivale a localhost seguro do runner.
2. QR impresso/tela, alvo errado, distância, movimento e iluminação; abertura, recompensa, fechamento e recuperação do rastreamento.
3. Barras Safari expandindo/recolhendo, teclado no cadastro/login, rotação com modais e safe areas reais.
4. Alternar apps, bloquear/desbloquear, voltar e conferir vídeo/áudio/sessão/contador/câmera; retorno pelo histórico.
5. Casa por toque, giroscópio e easter eggs naturais. O código escuta deviceorientation, sem fluxo explícito requestPermission; verificar a experiência de permissão no iPhone antes de assumir funcionamento.
6. Legibilidade, alvos, rolagem e fechamento de todos os modais nas duas orientações.
7. FPS, rede móvel, memória/GPU, aquecimento e bateria, incluindo visitas repetidas à RA.

Comparações de hashes dos **107 arquivos da aplicação** não detectaram alterações; a retomada guarda snapshot/comparação em runtime e `consolidated.json`. Código, identidade, navegação, casa, assombrações, ilustrações, GLB, animações, recompensas e rastreador foram preservados. Somente testes/documentação/evidências foram criados/adaptados. Nenhum sudo, operação de escrita no Git, commit, push ou publicação. Correções aguardam nova instrução do responsável.
