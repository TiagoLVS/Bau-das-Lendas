# Etapa 09 — RA, câmera e rastreamento

Data: 22/11/2026. Estado: revisão implementada; resultados e aceite abaixo. Não inicia a Etapa 10.

## Auditoria anterior às correções

Consultados auditoria, diretrizes, relatórios 02–08, compatibilidade mobile, PDFs acadêmicos e os módulos ativos. A referência atual é Three.js/jsQR, não as menções históricas a MindAR.

O QR 01 codifica a raiz da URL pública e abre Início. O QR 02 codifica `/ra.html` e abre o ritual; a mesma URL é o marcador visual aceito pelo rastreador. Os valores são gerados em Portais a partir de VITE_PUBLIC_URL ou da origem, sem vínculo por conta. isRitualQr compara hrefs completos normalizados pelo parser URL com `/ra.html` da origem corrente: query, fragmento, outro caminho ou outra origem não são aceitos. VITE_PUBLIC_URL precisa corresponder à origem em que a câmera é usada. Esses valores foram preservados.

A câmera é solicitada por gesto, sem áudio, com traseira ideal e 1280×720 ideal. Vídeo muted/autoplay/playsinline, quadro reduzido proporcionalmente a no máximo 720 px no maior lado, análise nominal a cada 100 ms. jsQR retorna um único código e seus quatro cantos; o código decide se ele é válido, não o backend. Dois acertos habilitam o grupo e callbacks; ausência inválida por mais de 350 ms o oculta. A recompensa exige gesto e confirmação autenticada separada da API.

A pose vem de homografia de um quadrado unitário, câmera pinhole com FOV vertical presumido de 60°, decomposição e ortogonalização dos eixos, com conversão de Y da imagem para Y do Three e Z negativo à frente. A largura física do QR e calibração da lente são desconhecidas; distância/escala são relativas. A câmera virtual ajusta focal/proporção ao object-fit:cover centralizado do vídeo. Há orientação derivada do QR, mas não SLAM, plano de chão, mapa do ambiente, IMU ou âncora persistente após perder o código.

Problemas comprovados no código: video.play podia permanecer pendente sem prazo; vídeo sem quadros não tinha diagnóstico; ended dos tracks não era observado; a interface mantinha started=true depois de falha durante uso; readyState baixo ou imagem congelada impediam atualizar/expirar a detecção. A projeção observava resize da janela, mas não mudança posterior das dimensões intrínsecas do vídeo. A suavização fixa de 0,55 por detecção dependia da frequência de análise. O estimador não validava dimensões/FOV finitos, limites do quadro ou convexidade dos cantos antes da homografia.

Foram mantidas as proteções da Etapa 08: tentativa de câmera única, geração para permissão tardia, abort de GLB, dispose idempotente, fechamento sincronizado, guardas de sessão e idempotência. Nenhum motivo foi encontrado para editar GLB, animações, cartas, backend ou os valores dos QR.

## Correções implementadas e justificativa

| Evidência / causa | Correção pontual | Verificação |
| --- | --- | --- |
| `video.play()` sem prazo e estado de vídeo insuficiente | Após obter stream, aguardar play e readyState ≥ 2 com dimensões positivas; prazo de 15 s; cancelar listeners/timer no stop | Inicialização, vídeo sem quadros, retry e saída com play pendente |
| Track interrompido não notificava a interface | Observar ended/error, parar tracks/scan/render e oferecer tentativa por gesto | Track sintético interrompido, retry e descarte nos dois motores |
| Vídeo congelado mantinha marcador e repetia trabalho | Verificar progresso de currentTime; ocultar após 350 ms sem avanço; parar com mensagem após 2 s; não decodificar o mesmo tempo duas vezes | Sequência temporal controlada, contador de análises e confirmação de estado |
| Dimensões intrínsecas podiam mudar sem resize da janela | Observar também resize do vídeo e remover listener no dispose | Duas orientações de vídeo × nove viewports em teste de projeção |
| Coeficiente fixo dependia do intervalo de análise | Lerp/slerp com `alpha = 1 − 0,45^(dt/100)` | Mesma pose após 400 ms com passos de 100 e 200 ms; pose parada estável |
| Homografia recebia dimensões inválidas / cantos cruzados ou externos | Rejeitar dimensões/FOV não finitos e quadriláteros fora do quadro, degenerados ou não convexos | Caso antes falhava produzindo NaNs; agora retorna null; reprojeções preservadas |
| Falha da câmera durante uso deixava started/loop ativos | Notificar RA, bloquear abertura até reinício, retornar Idle se interromper opening/closing e ocultar carta emergente | Interrupção durante pedido, abertura, revelação e tentativa posterior |
| Refresh do contador sobrescrevia aviso de câmera parada | Preservar mensagem de câmera até reinício bem-sucedido | Teste de confirmação tardia após falha durante POST |

Não foi encontrado erro reproduzível na fórmula existente de projeção cover. Ela foi preservada. Se `s=max(viewportW/videoW,viewportH/videoH)`, a focal virtual é `videoH/(2*tan(30°))*s`; o FOV passa a `2*atan(viewportH/(2*focal))`. Testes reprojetam os quatro cantos para as posições esperadas do vídeo com corte centralizado, sem alongar o modelo. O grupo permanece com escala unitária; a escala do baú segue a Etapa 08.

A constante temporal corresponde a aproximadamente 125 ms, preservando a resposta anterior a 10 análises/s. Não foram adicionados filtro de Kalman, previsão de movimento, calibração automática, limiar arbitrário de deslocamento nem outro motor de RA. Movimentos rápidos ainda produzem atraso transitório do filtro e podem perder leitura. A distância aparente muda com o tamanho do QR no quadro, não com medição física em metros.

## Câmera, estados e privacidade

A abertura continua somente pelo botão INICIAR CÂMERA. Explorar, carregamento do GLB e simples navegação não solicitam permissão. FacingMode é ideal, não obrigatório; um dispositivo sem câmera traseira pode fornecer outra câmera. Não há espelhamento CSS aplicado ao vídeo. A resolução usada nos cálculos é a recebida em videoWidth/videoHeight, não a resolução ideal solicitada.

Contexto inseguro, API ausente, negação, câmera ausente, câmera ocupada e vídeo sem quadros têm mensagens próprias; falha genérica orienta verificar HTTPS, suporte e permissão. API ausente/contexto inseguro são rejeitados antes de solicitar mídia. O navegador continua responsável pela permissão. Não existe retry automático infinito nem segundo stream concorrente. A espera de 15 s começa após concessão da mídia; não fecha nem contorna o diálogo de permissão pendente.

Dois acertos consecutivos ativam o marcador. QR inválido/ausente zera a contagem; a pose anterior só fica durante a tolerância existente de 350 ms. Perda prolongada esconde o grupo e desabilita nova interação. Reaparecimento exige dois acertos novos. O retorno não conserva uma âncora no ambiente. Se o QR retorna durante fechamento, permanecem as proteções de closing/freshScanRequired da Etapa 08.

Aba oculta perde imediatamente o marcador, pausa o vídeo e suspende análise e render/mixer. O stream não é necessariamente liberado enquanto a página só está oculta; essa política anterior foi preservada e deve ser conferida no aparelho. Ao voltar, tenta retomar o vídeo, descarta reconhecimento antigo e revalida conta. Falha ao retomar oferece novo gesto. Pagehide encerra definitivamente a instância: aborta GLB, invalida operações, cancela espera de vídeo/RAF/render, encerra tracks, limpa a carta e descarta recursos. Stream que chega depois da saída é parado pela geração da Etapa 08. Pageshow com BFCache mantém recarga segura. Contexto WebGL perdido continua exigindo RECARREGAR e novo início explícito.

A análise continua inteiramente local. Não há upload de quadros, gravação, áudio, imagens pessoais, reconhecimento facial ou telemetria. Evidências usam QR desenhado em canvas e contas fictícias. O servidor recebe somente as requisições funcionais já existentes, nunca a imagem da câmera.

## Recompensa e Flip preservados

Marcador válido só habilita interação com a conta elegível. Nenhum QR concede prêmio diretamente. A API autenticada continua responsável por sessão, CSRF, idempotência, regra diária, horário America/Sao_Paulo, histórico, seleção e isolamento por usuário.

A perda visual durante uma solicitação não cancela uma confirmação legítima nem duplica POST. Falha total da câmera durante o pedido mantém a chave pendente; se o servidor confirmar sem câmera ativa, não inicia animação invisível. Ao reiniciar e reenquadrar, RECUPERAR ABERTURA consulta a mesma chave. Interrupção durante opening retorna Idle e também permite recuperar a confirmação. O resultado já revelado mantém o Flip utilizável sem câmera. Resposta após saída ou troca de conta continua sendo descartada.

O fluxo válido continua: confirmação real da API → OpenChest → carta → verso educativo → coleção/histórico do mesmo usuário. Recompensa indisponível, conflito diário, sessão expirada, QR errado ou erro de câmera não inventam carta. `public/chest-model.js` e `public/educational-card.js` não foram editados. Não foi criado outro mixer na aplicação.

## Reconhecimento real e limites observados

`tests/tracking-browser.mjs` obtém os SVGs oficiais de Portais e os rasteriza sem alterar o conteúdo. Usa o jsQR de produção, a homografia e o grupo Three reais, não um decoder que sempre devolve sucesso. O corpus de 640×480 tem os resultados abaixo na última rodada. Falhar em uma degradação extrema é um limite registrado, não uma autorização para aceitar outros códigos.

| Entrada sintética | Chromium | WebKit |
| --- | --- | --- |
| QR 02 central, perto da borda, grande, girado e com perspectiva | Reconhecidos | Reconhecidos |
| QR de 40 px | Não reconhecido | Não reconhecido |
| Parcialmente fora da imagem | Não reconhecido | Não reconhecido |
| Blur de 4 px | Não reconhecido | Reconhecido nesta rodada |
| Escurecimento uniforme | Reconhecido | Reconhecido |
| Contraste baixo | Não reconhecido | Não reconhecido |
| QR 01 (Início) | Decodificado, rejeitado como marcador | Decodificado, rejeitado como marcador |
| Sem QR | Sem detecção | Sem detecção |
| Dois códigos simultâneos | Sem detecção nesta composição | Sem detecção nesta composição |

Escurecimento uniforme não simula todos os ruídos, reflexos e tempos de exposição de uma câmera real. Blur depende da rasterização do motor; o resultado não garante leitura física. jsQR devolve no máximo um resultado por análise; múltiplos códigos não têm seleção ou rastreamento independente garantidos. Recomenda-se apresentar apenas o QR 02 inteiro, com margem e boa luz.

A sequência determinística mede: primeiro acerto invisível, aquisição, pose imóvel, movimento gradual, salto com rotação, aproximação, perda breve, perda prolongada, retorno em dois acertos e substituição pelo QR 01. Grava posições/quaternions/escala e callbacks. Existem testes separados da captura nativa de vídeo com canvas.captureStream a 15 quadros/s, pintado continuamente a cada 66 ms, nos dois motores. A entrada controlada do teste de pose é explicitamente separada do teste de stream; nenhuma delas equivale a uma câmera física.

## Responsividade e inspeção

Foram exercitados 320×568, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 568×320 e 844×390 em Chromium e WebKit. Há verificações de proporção, projeção, bbox dos controles e tamanho do canvas após resize. O teste matemático também alterna vídeo 1280×720 e 720×1280. As animações reais do GLB foram reproduzidas novamente nos nove tamanhos, com ângulos e limpeza de recursos verificados.

O vídeo preenche a tela por cover e pode cortar partes do quadro original. A análise usa todo o quadro recebido; assim um marcador reconhecível no vídeo completo pode estar parcialmente cortado na tela, e um marcador próximo pode deixar o baú maior que a área visível. Não foi alterada a escala original para esconder esse efeito. Não há certificação de notch/safe area física, foco/exposição automática ou comportamento de todas as câmeras ao girar o telefone.

Capturas são inspeção sintética: [Chromium / marcador](../tests/artifacts/etapa09/Chromium-marker.png), [WebKit / marcador](../tests/artifacts/etapa09/WebKit-marker.png), [Chromium / perdido](../tests/artifacts/etapa09/Chromium-lost.png), [WebKit / perdido](../tests/artifacts/etapa09/WebKit-lost.png), [Chromium / paisagem](../tests/artifacts/etapa09/Chromium-landscape.png), [WebKit / paisagem](../tests/artifacts/etapa09/WebKit-landscape.png). Não são fotografias de RA física.

## Desempenho medido

Ambiente: computador Linux, Playwright já instalado, Chromium 156.0.8078.4 e WebKit 27.2 headless. Chromium usa SwiftShader nos testes. Não são Safari em iPhone nem métricas de GPU de smartphone.

Sonda do decoder real, quadro sintético 720×405, mesmo QR original, uma amostra de aquecimento descartada e 20 amostras registradas:

| Métrica | Chromium | WebKit |
| --- | --- | --- |
| Mediana jsQR | 16 ms | 25 ms |
| p95 por nearest rank (19ª de 20) | 20 ms | 29 ms |
| Mínimo / máximo | 15,5 / 34,1 ms | 18 / 36 ms |
| Buffer RGBA por quadro | 1.166.400 bytes | 1.166.400 bytes |

Tempos individuais do corpus, inclusive primeiro uso, estão no JSON. Eles variam por composição/rasterização e carga do computador. O benchmark mede jsQR sobre pixels prontos, sem incluir aquisição, drawImage, getImageData, render ou rede. Não é medida de FPS final, consumo de memória total, bateria ou temperatura.

A análise nominal de 100 ms e teto de 720 px foram mantidos. A auditoria identificou repetição da mesma imagem quando currentTime não avançava; o teste controlado agora comprova uma análise para três ticks de 100/200/300 ms com o mesmo tempo de vídeo, seguida de nova análise quando ele avança. Antes, a condição só verificava readyState/cadência e permitiria três análises. Essa comparação é do trabalho redundante identificado, não um benchmark anterior completo da aplicação nem uma alegação de ganho em aparelho real. Nenhuma otimização ampla de resolução, geometria ou buffers foi aplicada.

Continuam existindo as alocações temporárias de getImageData/jsQR e vetores da pose. Não foram introduzidos pools/caches sem evidência de necessidade. Render e AnimationMixer continuam no loop existente com delta monotônico; análise de QR e render têm cadências distintas. Nenhum frame é processado quando a aba está oculta.

## Resultados e cobertura de regressão

| Suíte executada | Resultado final |
| --- | --- |
| Node completa | **73 aprovados, zero falhas**, contra 60 na Etapa 08 |
| Python / PostgreSQL isolado | **40 aprovados**, 39 casos SQLite desmarcados e um aviso preexistente de TestClient/httpx |
| TypeScript | `tsc --noEmit` aprovado |
| Vite | Build aprovado; permanece aviso preexistente de chunk acima de 500 kB |
| Corpus / sequência de pose | Chromium e WebKit aprovados, com limites de leitura registrados acima |
| Câmera / UI | Seis condições simuladas distintas (HTTPS, API, permissão, ausência, ocupação e falha genérica), ausência de solicitação automática, QR 01 rejeitado, QR 02 adquirido/perdido/retornado, track interrompido e retry aprovados nos dois motores |
| Viewports | Nove tamanhos por motor; canvas, vídeo cover e controles; projeção também testada em duas orientações intrínsecas |
| Modelo / animações | GLB real, Idle/OpenChest/CloseChest, ângulos, transições e limpeza nos nove tamanhos, nos dois motores |
| Ciclo WebGL | Erro de carga 503, recuperação, encerramento de vídeo/tracks e contexto perdido aprovados nos dois motores |
| Integração HTTP / educativa | Cadastro e API reais, QR sintético em vídeo, recompensa confirmada, Flip, Álbum e troca A/B aprovados nos dois motores |
| Sessões | Cadastro/login/logout, revogação, reload, sincronização entre abas, resposta atrasada descartada e falha de conexão aprovados nos dois motores |
| Regressão funcional | Sete grupos por motor: recompensa/histórico/contador/álbum, galeria, RA/GLB, catálogo/navegação, restauração, fallback legítimo e falha explícita do catálogo |
| Navegação | Início/Explorar/Álbum, Perfil independente, Portais e retorno da galeria aprovados nos dois motores |
| Casa / assombrações | Regressões de navegação da casa e catálogo no navegador; suíte Node de efeitos, ciclo de vida e integridade das artes aprovada |
| Integridade | 105 arquivos da aplicação conferidos: 102 idênticos, somente os três módulos previstos alterados |

As verificações solicitadas de início concorrente, API ausente/contexto inseguro, saída durante getUserMedia/play pendente, deadline sem quadros, vídeo congelado, pausa/retorno da aba e cancelamento são determinísticas em Node. A sequência de QR/pose usa o decoder real no navegador. A integração HTTP utiliza o PostgreSQL de testes e a API real. Não se confundem esses níveis de evidência nem se apresenta erro simulado como teste de permissão/driver físico.

O teste de estado da RA cobre duplo toque, perda durante pedido, resposta após saída, recompensa repetida e indisponível, conflito diário e confirmação após falha de câmera. Os testes de sessões verificam expiração/revogação e isolamento entre contas. O controlador real do baú continua testado com clipes do binário oficial e avanço do mixer, não apenas pela presença dos nomes.

O banco usado é exclusivamente `bau_test`, em PostgreSQL 18 já preparado na porta local 55439, com marker de propriedade e verificação de schema 0002 / catálogo 60. Não houve migration, alteração de catálogo ou conexão com produção. As suítes criam apenas usuários, sessões e recompensas fictícias nesse banco isolado. Todos os serviços próprios de teste foram encerrados em finally.

### Ocorrências durante a validação

A primeira regressão funcional detectou um erro WebKit de access control em GET `/api/album` durante navegação rápida na casa virtual. A classificação estrita existente **não foi relaxada**. A repetição integral dos sete grupos passou nos dois motores, inclusive seis ciclos de navegação por motor. A falha inicial permanece no log e no relatório original; sua causa não foi confirmada e ela não deve ser apresentada como correção de RA. Os arquivos da casa/API envolvidos estão idênticos ao snapshot inicial. Resta uma intermitência de automação/navegação a observar, sem falha na última execução e sem atribuir automaticamente todo erro CORS a cancelamento.

Na sonda antiga de ciclo de vida, WebKit retornou NotAllowed e deixou o stream sintético criado pelo teste sem conexão ao vídeo. A interceptação do teste foi definida em `MediaDevices.prototype`, mantendo frames contínuos a cada 66 ms e gesto explícito. O teste passou nos dois motores sem alterar o tratamento de permissões da aplicação. A sequência de erros agora também aguarda o contador de chamadas, evitando confundir mensagem da tentativa anterior com uma tentativa nova. A verificação de viewport aguarda o resize real antes de medir o canvas. Não se aumentaram timeouts nem se usou `force:true`.

Uma tentativa de iniciar a última rodada expirou na revisão automática de permissão antes de executar. A repetição permitida foi autorizada e concluiu com sucesso, com serviços encerrados.

Os logs intermediários incluem falhas de desenvolvimento dos novos testes. As últimas verificações válidas são identificadas abaixo; não se reclassificaram falhas antigas como sucesso. A suíte legada educativa grava originalmente em etapa07, e a de regressão grava em mobile-fixes: os resultados desta execução foram copiados com proveniência para etapa09. A sonda do baú agora aceita destino de artefatos por variável de ambiente, preservando seu caminho padrão anterior.

### Evidências e reprodução

- [Node final](../tests/artifacts/etapa09/node.log), [Python/PostgreSQL](../tests/artifacts/etapa09/python.log), [build](../tests/artifacts/etapa09/build.log).
- [Corpus, desempenho e sequência da pose](../tests/artifacts/etapa09/browser.json), [câmera e viewports](../tests/artifacts/etapa09/camera-browser.json), [GLB/animações/recursos](../tests/artifacts/etapa09/chest-browser.json).
- [Recompensa/Flip real](../tests/artifacts/etapa09/integration.json), [navegação](../tests/artifacts/etapa09/navigation.json), [regressão dos sete grupos](../tests/artifacts/etapa09/regression.json), [proveniência das cópias](../tests/artifacts/etapa09/provenance.json).
- [Primeira rodada e Python](../tests/artifacts/etapa09/run.log), [repetição da regressão funcional](../tests/artifacts/etapa09/validation-run.log), [corpus e integração finais](../tests/artifacts/etapa09/final-run.log), [ciclo de vida final](../tests/artifacts/etapa09/camera-final-run.log), [resize/câmera finais](../tests/artifacts/etapa09/viewport-final-run.log), [mensagens de câmera e integração finais](../tests/artifacts/etapa09/messages-final-run-2.log).
- [Integridade da aplicação e GLB](../tests/artifacts/etapa09/integrity.json), [teste que reproduzia pose inválida antes da correção](../tests/artifacts/etapa09/before-pose.log).

Com as dependências, browsers, `.env.test` e cluster isolado **já existentes** neste ambiente, o procedimento reproduzível é:

```sh
node --test --test-isolation=none tests/*.test.mjs
node_modules/.bin/tsc --noEmit
node_modules/.bin/vite build --outDir tests/artifacts/compat-mobile/runtime/dist
BAU_STABILIZATION_REGRESSION=1 backend/.venv/bin/python backend/tests/run_tracking.py
```

O runner exige as portas locais 8000/5175/55439 livres, valida o destino de teste e não instala nem prepara banco de produção. O build foi executado diretamente para evitar hooks de sincronização de catálogo/imagens fora do escopo. Os logs e JSON estão em `tests/artifacts/etapa09`, pasta de evidências ignorada pelo Git existente; os scripts e documentos permanecem revisáveis no workspace.

## Arquivos e preservação

Modificados nesta etapa:

- `public/qr-tracker.js`: prontidão/erros de vídeo, interrupção, pausa, descarte, resize intrínseco, suavização temporal e descarte de quadros repetidos.
- `public/qr-pose.js`: validação geométrica e numérica antes da homografia.
- `public/ra.js`: recuperação de câmera e preservação de confirmação pendente, sem modificar as regras do servidor.
- `tests/qr-tracker.test.mjs`, `tests/qr-pose.test.mjs` e `tests/api-ra.test.mjs`: regressões de câmera, projeção/pose e confirmação.
- `tests/chest-browser.mjs`: destino opcional de evidências, gesto de toque e interceptação estável da câmera sintética, mantendo as verificações do GLB.

Criados: `tests/tracking-browser.mjs`, `tests/tracking-camera-browser.mjs`, `backend/tests/run_tracking.py`, este relatório e `docs/TESTES-RA-SMARTPHONES.md`.

Nenhuma dependência foi adicionada. Frontend React/TypeScript, backend, schema, catálogo de 60 lendas, ilustrações, textos culturais, regras diárias, QR originais e PDFs acadêmicos foram preservados. A identidade visual não foi alterada. As correções de carregamento, animação e descarte da Etapa 08 continuam presentes.

GLB oficial e cópia no build: **358.744 bytes**, SHA-256 `eff4fa4098a4016d51ad722f022fc39f2f1b6e542fd4390833b0e97622ef5a46`. Permanecem 6.572 triângulos, oito materiais, pivô original e Idle/OpenChest/CloseChest de 2 s. O binário, `public/chest-model.js`, Flip e navegação foram comparados ao snapshot inicial e estão idênticos. Nenhum Blender MCP foi utilizado.

Não houve deploy, hospedagem/túnel, branch, add, commit, push nem outra operação Git de escrita. Alterações locais de etapas anteriores foram mantidas.

## Aceite e pendências

**Aceite técnico automatizado da Etapa 09: aprovado nas últimas execuções. Homologação física: pendente.** O roteiro prático está em [TESTES-RA-SMARTPHONES.md](TESTES-RA-SMARTPHONES.md), com 22 verificações separadas para Safari/iPhone e Chrome/Android, todas ainda pendentes. Não há acesso a esses aparelhos neste ambiente. Não foi publicada a aplicação para simular essa homologação.

Limites ainda presentes: câmera pinhole sem calibração, distância/escala relativas, erro de pose sob ruído/perspectiva extrema, atraso de suavização, QR pequeno/oculto/blur/contraste baixo, leitura não garantida de múltiplos códigos, corte cover, políticas de mídia/retorno de apps e drivers WebGL específicos. CurrentTime é a indicação de progresso utilizada, não um sensor de conteúdo novo; não se certifica a detecção de toda falha de driver possível. O desempenho sustentado, aquecimento e bateria de smartphones não foram medidos.

Para a Etapa 10, recomenda-se considerar os resultados físicos e revisar responsividade geral/safe areas na etapa própria, além de acompanhar a intermitência de navegação WebKit registrada. Se houver requisito futuro de precisão métrica ou ancoragem sem QR visível, será necessária decisão específica sobre calibração ou outra arquitetura de RA. Não foi feita substituição automática por MindAR/AR.js/WebXR. **A Etapa 10 não foi iniciada.**
