# Etapa 10 — Responsividade geral e controles por toque

Data: 22/11/2026. Etapa tecnicamente concluída no ambiente automatizado; homologação física pendente. Revisão da experiência mobile com alterações pontuais de layout, toque e foco. A Etapa 11 não foi iniciada.

## Auditoria anterior às alterações da aplicação

Consultados auditoria técnica, diretrizes e relatórios 04.1, 05, 06, 07, 08, 09, compatibilidade mobile e checklist físico de RA. Código ativo: App/Conta/Portais/Album e CSS React; casa/galeria HTML com módulos próprios; RA independente. Mantidos os frameworks, três destinos principais e Perfil separado.

A linha de base foi executada sobre o build anterior às correções, com hashes de fontes, backend, assets, dependências e PDFs registrados em `tests/artifacts/etapa10/before.json`. A matriz usa doze dimensões por motor, contas fictícias e PostgreSQL isolado. O primeiro relatório está em `baseline/report.json`: WebKit completou 180 inspeções, incluindo recompensa real com QR sintético. Chromium executou 109 inspeções e encontrou timeout ao capturar a casa; o erro foi preservado, e a complementação não foi tratada como aprovação da primeira rodada.

Problemas reproduzidos antes de modificar a aplicação:

| Área | Evidência |
| --- | --- |
| Início em 320×568 e 568×320 | Título começa em y≈9/30 sob o menu; “Lendas e dossiês” está dentro da viewport, mas o hit test encontra o conteúdo da entrada sobre ele |
| Painéis React | Shift+Tab a partir de Fechar sai para controles cobertos; reproduzido nos dois motores |
| Inspeção do Álbum em paisagem 568×320 | Virar aparece em y≈623, fora da viewport; fechar encolhe para cerca de 32 px |
| Galeria em paisagem | A área reservada à carta não considera toda a legenda e botão de virar; há conteúdo rolável além do espaço da carta, apesar do fechamento protegido pela Etapa 04.1 |
| Casa em 320 px | Navegação precisa rolar para alcançar Álbum; atalhos de entrada têm altura de cerca de 22 px e Som, 32 px |
| Casa em 568×320 | Botão Seguir as pegadas termina fora da tela; os atalhos de entrada podem ser cobertos pelo rodapé |
| Interface RA | Voltar ao Início tem cerca de 17 px de altura; na recompensa em 568×320, retornar ao baú e a mensagem inferior ultrapassam a altura disponível |

Inspeção do código também identifica caminhada global por touchend/wheel ao arrastar controles ou texto da entrada da casa, além de controles da entrada/corredor transparentes ainda potencialmente focáveis. Esses fluxos receberam testes de interação dirigidos.

## Correções pontuais implementadas

- Início: a altura real do menu é observada com ResizeObserver; o texto ocupa a área livre entre cabeçalho e acessos inferiores. Quando necessário, essa área admite rolagem local. O gesto sobre texto rolável ou botão não dispara a entrada acidental na casa. A roda continua podendo atravessar ao alcançar o fim do texto.
- Painéis: utilitário pequeno de foco compartilhado, sem biblioteca nova. Ele isola o fundo com inert, mantém Tab/Shift+Tab no diálogo, ignora faces/elementos inativos e restaura o estado anterior ao fechar. Diálogos aninhados isolam apenas o conteúdo do diálogo externo. As rotinas anteriores de retorno de foco continuam presentes.
- Álbum: componentes, capas, páginas estáveis, ResizeObserver e motor do livro mantidos. A inspeção fica ancorada à viewport; o espaço da arte é separado dos controles. Em paisagem, arte e controles ficam lado a lado. A animação externa usa o mesmo tempo/curva, mas libera o fill ao terminar, para não manter um containing block que deslocava a inspeção fixa em −35 px após rolar/girar o livro. A verificação posterior obteve y=0 nas quatro rotações dirigidas. Fechar e setas possuem área mínima de referência; os links de galeria/Saci continuam acessíveis, inclusive dentro da indicação que antes desabilitava eventos.
- Galeria: preservadas a contenção, camadas e proporção 2:3 corrigidas na Etapa 04.1. Arte, legenda e virar têm linhas próprias; em paisagem os controles usam a coluna lateral. A contenção antiga de foco foi substituída pelo utilitário, que desconsidera elementos inert e faces ocultas. Pesquisa, filtros, prévia pública e Saci não alteram propriedade da coleção.
- Perfil: a lógica de autenticação não foi modificada. Os links estilizados como botão passam a usar caixa inline-flex, para que a altura mínima já definida realmente tenha efeito. Campos mantêm fonte legível e labels existentes; não se desativa zoom.
- Explorar: portais, instruções e os dois QR foram inspecionados em retrato/paisagem, com DPR 2/3 complementar. O componente já se adaptava aos tamanhos avaliados e não precisou de alteração própria; recebe apenas os ajustes compartilhados do painel/menu. URLs, valores, funções e início explícito da câmera foram mantidos.
- Casa: cabeçalho compacto com os mesmos três destinos e Perfil, texto de entrada e ficha com rolagem local quando necessário, controles de áudio/retorno com áreas acessíveis. Movimentação global ignora arrastos/rodas sobre controles e texto rolável. Estados transparentes de entrada/corredor ficam inert conforme a cena; dossiê contém foco e mantém retorno; em telas compactas, Fechar fica fixo na viewport, pois antes começava em y≈800 abaixo da arte. O minimapa aceita Espaço além de Enter e tem altura limitada com rolagem local em telas baixas; antes podia encobrir Perfil em 932×430. A luz de fundo do dossiê também foi limitada à largura disponível, sem esconder overflow de conteúdo. Não se alteraram corredor 3D, eventos, sequências, probabilidades ou easter eggs.
- RA: exclusivamente UI. Retorno com área útil de toque, margens locais para safe areas, recompensa em duas colunas em paisagem e diálogo com foco contido. Câmera, pose, suavização, limiares, GLB, animações e confirmação da API foram preservados.

Paleta, famílias tipográficas, molduras, imagens e conteúdo cultural não foram substituídos. Ajustes de tamanho foram limitados a controles/títulos que precisavam caber em telas estreitas ou baixas. A referência de 44×44 px não é aplicada a todo link textual nem constitui certificação normativa.

## Método de testes e evidências

Matriz principal: 320×568, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 568×320, 667×375, 844×390, 932×430 e 1366×768, nos dois motores, com toque disponível. Verificações complementares usam modo móvel e DPR 2/3, além de desktop com mouse/teclado.

São medidos largura de layout/visualViewport, caixas, tamanho de alvo, limites, proporção da arte e hit testing real. Elementos em conteúdo rolável são alcançados por rolagem nativa antes de testar o centro. Um probe confirmou que scrollIntoViewIfNeeded pode manter um botão sob o cabeçalho sticky, embora ele seja alcançável rolando para o centro; isso foi corrigido no procedimento de teste, sem remover a verificação do elemento atingido nem mudar a aplicação para mascarar o caso. A ferramenta aguarda brevemente a estabilização do hit testing após resize, mantendo falha se um bloqueio persistir. Não há force:true.

As interações funcionais mantêm animações normais. Capturas comuns estabilizam animações CSS pela opção screenshot do Playwright. A casa é capturada com animações permitidas; se essa captura exceder o prazo, o teste pode pausar temporariamente RAF/CSS somente para registrar a imagem e retomar imediatamente depois. O JSON identifica esse procedimento e preserva a falha inicial. Essas imagens não certificam o comportamento temporal ou FPS da cena.

A sequência suplementar de arrasto usa entrada touch nativa por CDP no Chromium. No WebKit, as ativações usam tap nativo, e a sequência de swipe adicional injeta eventos DOM com coordenadas, identificados no relatório. O construtor Touch não está disponível nesse WebKit; não se apresenta essa sequência como gesto nativo. Redimensionar a altura do formulário exercita rolagem; não representa o teclado físico do Safari. Nenhuma captura contém credenciais ou imagens de câmera pessoal.

O arrasto específico das folhas do livro usa touch nativo por CDP no Chromium e mouse nativo no WebKit, além das setas acionadas por tap em ambos. A primeira trajetória de teste soltava a folha antes de cruzar a dobra e o motor cancelava corretamente a virada. A trajetória foi corrigida para cruzá-la, mantendo a asserção de mudança do indicador e de folhas visíveis. As coordenadas e os Pointer Events constam no relatório; não foi necessário alterar o motor ou a aplicação para esse caso. Arrastar com o dedo no Safari real continua na lista de homologação física.

## Teclado, semântica e retorno de foco

Mantidos três links no nav Principal e Perfil independente. Menu usa aria-expanded, destinos usam aria-current e os botões conservam rótulos. Painéis e inspeções mantêm roles de diálogo e aria-modal. Faces ocultas continuam aria-hidden/inert e ficam fora da ordem de foco. Não se criaram botões aninhados ou outro motor de Flip.

Os percursos exercitam Tab, Shift+Tab, Enter, Espaço e Escape; verificam foco visível, permanência no diálogo ativo, retorno ao controle da carta/livro/menu e continuidade do uso. A inspeção é fechada primeiro, sem fechar junto o Álbum. A navegação pelas âncoras mantém histórico, acesso direto e reload sem biblioteca de roteamento.

O teste dirigido de nome longo usa Hachishakusama do catálogo real, sem alterar texto. Testes com conteúdo extenso usam somente uma carta sintética chamada Texto de teste em memória; verificam rolagem, largura, virada e movimento reduzido. Dados de teste não foram incorporados ao catálogo.

O WebKit móvel automatizado não oferece mouse.wheel nem uma API pública de pan no Touchscreen do Playwright. Sua rolagem longa é verificada por scrollBy no DOM real e por wheel nativo em contexto desktop separado. Tab/Shift+Tab/Enter/Espaço/Escape e ativações tap são entradas reais da automação nos contextos correspondentes. Não se declara que End/PageDown ou scrollBy certifiquem um gesto físico no Safari; esse limite fica explícito no JSON e na homologação pendente.

## Viewport dinâmica, orientação e limites físicos

Preservados viewport-fit=cover e zoom do navegador. Não se adicionou user-scalable=no nem limite de escala. A interface usa as unidades dinâmicas já existentes, aplica safe-area-inset somente aos contêineres relevantes e calcula a área do texto a partir da altura real do cabeçalho. Não houve troca global indiscriminada de vh nem inclusão de overflow-x:hidden para ocultar conteúdo excedente.

A orientação horizontal recebe layout local para a inspeção/virada e a carta revelada da RA. A proporção 2:3 é verificada por dimensão real nas duas orientações. Redimensionar com a inspeção aberta e fechar novamente não deixa o livro expandido ou o foco perdido. O minimapa preserva o conteúdo e pode rolar sem movimentar o corredor.

Barras móveis do Safari, notch, indicador de gestos, visualViewport com teclado físico/virtual e zoom real não são reproduzidos por safe areas zero da emulação. Homologação física permanece pendente; não se promete equivalência entre WebKit Linux e Safari iPhone.

## Privacidade e regras preservadas

Câmera continua somente após INICIAR CÂMERA. Nenhuma nova solicitação automática foi criada. Os dois QR mantêm URLs e funções: raiz para navegação; `/ra.html` da mesma origem para ritual/marcador. Não há QR por conta.

GLB, pivôs, materiais, escala, Idle/OpenChest/CloseChest, controlador, pose, limiares e suavização permanecem idênticos à Etapa 09. O único ajuste em ra.js é o gerenciamento de foco do diálogo e sua liberação ao fechar, atualizar conta ou descartar a experiência.

Sessões, cookies, CSRF, proteção contra respostas antigas, isolamento entre contas, calendário America/Sao_Paulo, idempotência, histórico e contador não foram modificados. Recompensa continua confirmada exclusivamente pela API; a interface não inventa carta. Modelo, imagens, molduras e conteúdo educativo original permanecem intactos.

Todos os testes usam o PostgreSQL isolado preexistente bau_test/0002/60 lendas, com verificação de destino e cluster próprio. Fixtures existentes criam apenas usuários e conquistas fictícios para repetição segura dos cenários; não houve alteração do schema, migração, seed de catálogo ou conexão com banco real. Os runners iniciam e encerram somente seus próprios serviços.

## Avaliação preliminar de desempenho

A avaliação é local em Linux headless, sem equivalência com CPU/GPU, FPS ou bateria de smartphone. A matriz registra contagem de nós, recursos transferidos e DOMContentLoaded por superfície. TransferSize zero pode ser cache; DOMContentLoaded não mede prontidão da casa, estabilidade visual nem tempo até interação. As capturas estabilizadas não são benchmark de animação.

Não foram reduzidas ilustrações, resolução do baú, qualidade de material ou geometria. ResizeObserver acompanha apenas o cabeçalho, sem atualização React contínua para medir scroll. O utilitário de foco consulta elementos quando necessário, sem loop de renderização próprio.

Permanecem para análise profunda da Etapa 11: custo da cena CSS 3D e de seus muitos elementos/efeitos, reconstrução das cartas da galeria em refresh da coleção, possíveis recálculos e consumo sustentado, além do bundle principal acima de 500 kB. Não foram alteradas probabilidades, timers ou renderização narrativa para acelerar a automação. A captura da casa apresentou timeouts específicos no Chromium; as tentativas e eventual estabilização de captura são registradas separadamente do comportamento funcional.

## Homologação física pendente

Executar em Safari/iPhone e Chrome/Android, por HTTPS e mesma origem já autorizados, sem publicação ou túnel automático:

1. Barras do navegador expandidas/recolhidas, notch e indicador de gestos; verificar menu, retorno e controles inferiores.
2. Cadastro/login com teclado virtual aberto, rolagem até envio, mensagens e zoom; não usar credenciais pessoais nas evidências.
3. Abrir/fechar menu e painéis, navegar pelas três abas e Perfil, usar Voltar/Avançar e acesso direto.
4. Entrar e caminhar na casa; arrastar texto/minimapa sem caminhar acidentalmente, usar anterior/próximo, dossiê e áudio após gesto.
5. Arrastar páginas do Álbum, inspecionar carta, girar o aparelho com a inspeção aberta, fechar e continuar no livro.
6. Pesquisar/filtrar galeria, ampliar, virar rapidamente, rolar verso longo e fechar em retrato/paisagem; testar Saci por link direto.
7. RA com QR real, permissão negada/concedida, abertura, revelação, Flip e retorno ao baú em paisagem. Reutilizar o checklist físico da Etapa 09.
8. Leitores de tela reais, foco com teclado externo quando disponível, movimento reduzido e legibilidade humana.
9. Troca de app, bloqueio/desbloqueio, rede móvel e uso prolongado; observar aquecimento, memória, áudio e encerramento da câmera.

Todos esses itens permanecem **pendentes**, sem dispositivo físico disponível. Os testes automatizados não constituem certificação integral de acessibilidade.

## Correção da largura do livro após várias rotações

A matriz ampliada reproduziu 697 px de scrollWidth numa viewport de 320 px ao virar uma carta depois de passar por retrato, paisagem e desktop. A inspeção isolada mostrou folhas do livro que o motor já marcava como invisíveis, mas que conservavam largura/posição de uma tela maior. Visibility hidden ainda contribuía para o overflow rolável.

A correção local retira do layout somente `.stf__item` sem a marca `--shown` do próprio motor. As folhas continuam montadas e memoizadas; `draw` e `simpleDraw` recolocam `--shown` antes de desenhar cada folha, incluindo a dobra. Não se cortam páginas visíveis nem se esconde o overflow de todo o Álbum. Na reprodução, a largura voltou a 320 px e o botão Próxima continuou mudando de Folhas 1 para Folhas 2. Há também teste de arrasto do livro, além das setas. Não se editaram dependências ou o motor.

O probe preserva os resultados das tentativas que não resolveram a origem (contain no modal não alterou 697 px). No build corrigido ele pode reproduzir a política anterior de layout das folhas invisíveis somente no contexto de diagnóstico; a matriz de aceite usa o código da aplicação sem injeção de correção.

## Arquivos modificados e criados

Aplicação modificada nesta etapa:

- `src/App.tsx`: medição do cabeçalho, foco dos painéis e proteção do gesto sobre controles/texto rolável.
- `src/Album.tsx`: integração de foco dos diálogos, preservando folhas/capas e callbacks do livro.
- `src/style.css`: áreas da entrada, menu compacto, alvos de Perfil/movimento e espaçamento consistente com safe areas.
- `src/album.css`: dimensionamento da inspeção, controles, contexto da animação e folhas invisíveis fora do layout.
- `public/casa/index.html`: estado inert inicial da ficha ainda não apresentada.
- `public/casa/css/estilo.css`: cabeçalho/entrada/ficha/minimapa em telas compactas, luz limitada e Fechar acessível.
- `public/casa/css/cartas.css`: divisão da carta ampliada em arte/legenda/controle, com coluna lateral em paisagem.
- `public/casa/js/main.js`: isolamento de foco e exclusão de gestos sobre a UI da caminhada global.
- `public/casa/js/planta.js`: Espaço no controle já existente do minimapa.
- `public/casa/js/cartas-flip.js`: utilitário de foco no diálogo, mantendo montagem/virada e coleção.
- `public/ra.html`: layout e áreas de interação da RA.
- `public/ra.js`: somente foco/fechamento do diálogo, sem alterações de câmera ou rastreador.

Também atualizado `tests/api-ra.test.mjs`: o fixture VM recebe o utilitário de foco usado pela UI; as verificações anteriores de API, estados e animações foram preservadas.

Criados: `public/dialog-focus.js`, `tests/responsive-browser.mjs`, `tests/touch-controls-browser.mjs`, `tests/responsive-overflow-probe.mjs`, `backend/tests/run_responsive.py` e este relatório. Não há dependência nova.

## Reprodução

Com o ambiente isolado, browsers e dependências já existentes:

```sh
node --test --test-isolation=none tests/*.test.mjs
node_modules/.bin/tsc --noEmit
node_modules/.bin/vite build --outDir tests/artifacts/etapa10/dist
BAU_RESPONSIVE_REGRESSION=1 backend/.venv/bin/python backend/tests/run_responsive.py
```

O runner confere portas livres, cluster marcado, destino bau_test, schema e catálogo. O build é direto, sem hooks de sincronização de imagens/catálogo. Variáveis opcionais permitem repetir cenários dirigidos sem transformar os não executados em aprovações; o modo baseline coleta observações e não constitui aceite. O modo verify falha em verificações ou capturas reprovadas.

Os artefatos ficam na pasta de testes ignorada pelo Git existente. Logs intermediários, erros do adaptador e interrupções permanecem disponíveis; o relatório final consolidado identifica a origem de cada cenário e as repetições que o revalidaram.

## Métricas locais observadas

Valores pontuais da matriz atual, sem throttling de smartphone e com cache variável. O número de nós é uma amostra; na casa ele muda com efeitos e decoração. O tempo abaixo é somente DOMContentLoaded, não tempo até interação.

| Superfície | Nós Chromium / WebKit | DCL Chromium / WebKit |
| --- | --- | --- |
| Início | 48 / 48 | 689 / 251 ms |
| Galeria | 2.048 / 2.048 | 627 / 104 ms |
| Entrada da casa | 6.977 / 6.958 | 184 / 315 ms |
| RA | 44 / 44 | 462 / 940 ms |

Na mesma rodada, Explorar variou de 103 ms no WebKit a cerca de 6,3 s no Chromium. Essa variação não foi atribuída a uma causa única nem apresentada como melhoria após correção. Recursos externos, cache e carga do computador impedem comparar esses números como benchmark entre aparelhos. O bundle principal ficou próximo de 923 kB minificado / 257 kB gzip, mantendo o aviso de tamanho. Os dados brutos de recursos e bytes estão no consolidado.

## Evidências da matriz concluída

A consolidação contém **180 inspeções de layout e 187 verificações aprovadas por motor**, nos doze tamanhos: **374 verificações** no total. Existem **75 capturas por motor**, abrangendo as cinco dimensões prioritárias e quinze estados/superfícies, totalizando 150 PNGs. Os testes adicionais de interação e regressão são registrados separadamente.

- [Consolidado com proveniência por cenário](../tests/artifacts/etapa10/consolidated.json).
- [Inventário de todas as capturas](../tests/artifacts/etapa10/evidence.json).
- [Integridade da aplicação, recursos e GLB](../tests/artifacts/etapa10/integrity.json).
- [Reprodução do overflow e virada preservada](../tests/artifacts/etapa10/overflow-probe.json).
- [Linha de base](../tests/artifacts/etapa10/baseline/report.json), [complemento Chromium](../tests/artifacts/etapa10/baseline-complement-2/report.json).
- [Primeira matriz completa e interrupção WebKit](../tests/artifacts/etapa10/final/report.json), [revalidação do livro](../tests/artifacts/etapa10/book-final/report.json), [retomada WebKit](../tests/artifacts/etapa10/webkit-final/report.json).

A primeira tentativa após as correções ainda encontrou alvos pequenos, problemas na verificação de scroll sticky e uma importação ausente no código novo de foco da RA. Esses problemas foram corrigidos e revalidados, sem reaproveitar reprovações como aprovação. A etapa final identificou o overflow das folhas invisíveis e recebeu a correção/revalidação dirigida descrita acima.

A execução WebKit inicial da rodada final foi interrompida com encerramento do contexto, antes de terminar a matriz. A causa do encerramento não foi confirmada. Os casos completos já executados foram preservados; os cenários pendentes e os afetados pela correção do livro foram executados novamente em processos sequenciais. O consolidado aponta o JSON de origem de cada verificação e mantém as ocorrências substituídas pela revalidação. Não houve relaxamento da classificação de CORS.

### Amostra visual em 390×844

| Página / estado | Chromium | WebKit |
| --- | --- | --- |
| Início | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-inicio.png) | [PNG](../tests/artifacts/etapa10/final/WebKit-390x844-inicio.png) |
| Explorar | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-explorar.png) | [PNG](../tests/artifacts/etapa10/final/WebKit-390x844-explorar.png) |
| Álbum | [PNG](../tests/artifacts/etapa10/book-final/Chromium-390x844-album.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-album.png) |
| Perfil | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-perfil.png) | [PNG](../tests/artifacts/etapa10/final/WebKit-390x844-perfil.png) |
| Casa virtual | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-casa.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-casa.png) |
| Galeria | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-galeria.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-galeria.png) |
| Frente da carta | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-carta-frente.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-carta-frente.png) |
| Verso educativo | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-carta-verso.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-carta-verso.png) |
| RA | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-ra.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-ra.png) |
| Carta revelada | [PNG](../tests/artifacts/etapa10/final/Chromium-390x844-recompensa-frente.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-390x844-recompensa-frente.png) |

### Antes e depois

| Problema | Antes | Depois |
| --- | --- | --- |
| Entrada sob o menu / acesso coberto | [PNG](../tests/artifacts/etapa10/baseline/Chromium-320x568-inicio.png) | [PNG](../tests/artifacts/etapa10/final/Chromium-320x568-inicio.png) |
| Inspeção em paisagem | [PNG](../tests/artifacts/etapa10/baseline/Chromium-568x320-album-frente.png) | [PNG](../tests/artifacts/etapa10/book-final/Chromium-568x320-album-frente.png) |
| Fechamento do dossiê abaixo da arte | [PNG](../tests/artifacts/etapa10/baseline/WebKit-320x568-casa-dossie.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-320x568-casa-dossie.png) |
| Recompensa em paisagem | [PNG](../tests/artifacts/etapa10/baseline/WebKit-568x320-recompensa-verso.png) | [PNG](../tests/artifacts/etapa10/webkit-final/WebKit-568x320-recompensa-verso.png) |

A recompensa dos testes é sorteada pela API para contas fictícias; nomes/imagens podem variar entre capturas antes/depois. A comparação avalia layout e controles, sem substituir a arte.

## Resultados de regressão desta etapa

As execuções abaixo são novas, sobre o build da Etapa 10. Os resultados anteriores foram usados como referência de cobertura, sem substituir a execução atual.

| Verificação | Resultado atual | Evidência |
| --- | --- | --- |
| Matriz Chromium | 180 layouts, 187 verificações e 75 capturas aprovados | [Consolidado](../tests/artifacts/etapa10/consolidated.json) |
| Matriz WebKit | 180 layouts, 187 verificações e 75 capturas aprovados | [Consolidado](../tests/artifacts/etapa10/consolidated.json) |
| Interações Chromium | 11 cenários aprovados, incluindo toque, arrasto, teclado, mouse, DPR 2/3 e rotações | [JSON](../tests/artifacts/etapa10/interactions/report.json) |
| Interações WebKit | 11 cenários aprovados, com os limites de gesto móvel descritos neste relatório | [JSON](../tests/artifacts/etapa10/interactions/report.json) |
| Node | 73 aprovados, zero falhas, zero ignorados | [Log](../tests/artifacts/etapa10/node.log) |
| Python/PostgreSQL | 40 aprovados; 39 casos SQLite fora do recorte selecionado | [Log](../tests/artifacts/etapa10/python.log) |
| TypeScript | Aprovado, sem erro | [Log](../tests/artifacts/etapa10/typescript.log) |
| Vite | Build de produção aprovado, com aviso de chunk acima de 500 kB | [Log](../tests/artifacts/etapa10/build.log) |
| QR/jsQR e rastreador | Corpus e ciclo de reconhecimento aprovados nos dois motores | [JSON](../tests/artifacts/etapa10/regressions/tracking-browser.json) |
| Câmera simulada | Erros, início explícito e ciclo de vida aprovados nos dois motores | [JSON](../tests/artifacts/etapa10/regressions/camera-browser.json) |
| GLB e mixer reais | Idle, abertura gradual, fechamento, inversão e limpeza aprovados nos dois motores | [JSON](../tests/artifacts/etapa10/chest-browser.json) |
| Recompensa/Flip/Álbum e troca de conta | Aprovados nos dois motores, com API e stream sintético | [JSON](../tests/artifacts/etapa10/regressions/integration.json) |
| Autenticação e sessões | Cadastro, login/logout, revogação, sincronização e resposta antiga aprovados nos dois motores | [Log](../tests/artifacts/etapa10/regression-final-run.log) |
| Regressão funcional | Sete grupos aprovados por motor, incluindo histórico/contador, catálogo, fallback e falhas controladas | [JSON](../tests/artifacts/etapa10/regressions/functional.json) |
| Navegação HTML/React | Três abas, Perfil, Portais e retorno aprovados nos dois motores | [JSON](../tests/artifacts/etapa10/regressions/navigation.json) |

O aviso Python é a depreciação existente da integração Starlette/TestClient/httpx. Não se instalaram bibliotecas nem se mudou o backend para suprimi-lo. A rodada de regressão terminou e encerrou seus serviços próprios; seu log também conserva a primeira reprovação do gesto incompleto do livro, revalidado separadamente após corrigir a trajetória de entrada do teste. Os demais scripts dessa rodada encerraram com código zero. [Proveniência das cópias dos relatórios legados](../tests/artifacts/etapa10/regressions/provenance.json).

Na última regressão funcional, a intermitência de navegação/CORS anteriormente relatada no WebKit não reapareceu. O encerramento não explicado do contexto durante a matriz está registrado separadamente acima; não se atribui a ele uma causa não comprovada.

## Integridade e limites de escopo

A conferência final comparou os 110 arquivos da linha de base: 98 ficaram idênticos e 12 receberam as correções descritas neste relatório. Todos os arquivos públicos no build conferem com as fontes atuais. O GLB continua com 358.744 bytes e SHA-256 `eff4fa4098a4016d51ad722f022fc39f2f1b6e542fd4390833b0e97622ef5a46`: 6.572 triângulos, oito materiais, clipes Idle/OpenChest/CloseChest preservados, com abertura de 105°.

Backend, controlador do baú, pose/rastreador, textos culturais, catálogo, imagens, documentos acadêmicos e dependências da linha de base foram preservados. As modificações anteriores que já existiam no workspace não foram revertidas. Não houve instalação, alteração no Blender, publicação, túnel, nova funcionalidade de QR por conta ou operação Git de escrita; foram usados somente comandos Git de consulta. Recomendações de desempenho para a Etapa 11 permanecem como documentação, sem implementação automática.

## Estado final de aceite

**Aceite técnico automatizado aprovado.** Início, casa, Explorar, Perfil, Álbum, galeria, Flip e interface da RA foram exercitados nos dois motores. As três abas e o Perfil independente foram mantidos. As verificações finais não encontraram overflow horizontal indevido ou sobreposição impeditiva nos estados avaliados; controles importantes foram alcançados e acionados sem cliques forçados. O livro permanece utilizável após rotação, fechamento de inspeção e virada por seta/arrasto.

Os 22 cenários finais de interação foram concluídos sem falha nem cenário ignorado. [Log da revalidação final](../tests/artifacts/etapa10/touch-final-run.log). Os runners encerraram os serviços locais próprios, preservando o banco fictício. As falhas intermediárias e a interrupção anterior continuam nos artefatos, com a revalidação identificada; não se declara que toda tentativa foi aprovada.

**Homologação física pendente.** Não há aceite integral de Safari/iPhone ou Chrome/Android reais, câmera óptica, teclado virtual, barras/notch, pan físico ou leitores de tela. As limitações da automação e o checklist acima permanecem abertos. Os custos observados da casa e do bundle são recomendações para a Etapa 11, que não foi iniciada. A identidade visual, os conteúdos, as regras de negócio e os recursos protegidos foram preservados.
