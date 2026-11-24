# Etapa 11 — Casa virtual e assombrações

Implementação iniciada em 22/11/2026; implementação e execuções desta entrega encerradas em 23/11/2026. Aceite integral pendente das limitações descritas abaixo.

Objetivo: melhorar concretamente a composição da casa, integrar as cinco apresentações sobrenaturais ao ambiente explorável e reduzir trabalho desnecessário, preservando os sistemas das etapas anteriores. **Aceite integral pendente:** o WebKit Linux reproduz um defeito relevante de profundidade da cena, também observado na linha de base. Aprovação funcional e captura produzida não significam aprovação visual.

## Diagnóstico e arquitetura

A aplicação não utiliza um único motor para toda a experiência. O fundo da entrada React é `src/experience/World3D.tsx`, com Three.js, atmosfera e diretor de eventos. O botão de entrada encaminha para a **casa oficial**, `/casa/index.html`. Esta monta jardim/fachada e corredor com **CSS 3D**, SVG procedurais, planos HTML e texturas canvas; não usa WebGL nem o renderer da RA. O movimento transforma o mundo, com recorte por distância das superfícies. Dossiê, minimapa, som e easter eggs são módulos próprios.

Foram consultados auditoria técnica, diretrizes, relatórios 06–10, documentos acadêmicos One Page/XRD/Plano de Projeto, `docs/assombracoes.md`, `docs/atmosfera.md`, código ativo e representações culturais já existentes. O texto histórico de assombrações descreve a cena Three.js; a correção da Etapa 06.2 confirma a sequência atual **espelho → lobisomem → Saci → figura alta → Boitatá**, que prevalece sobre o relato antigo com olhos. A casa CSS possui manifestações ambientais e easter eggs próprios, mas não consome o diretor Three.js. Essa diferença precisa ser considerada na integração, sem afirmar que os cinco eventos já rodavam nesse documento HTML.

Áudio existente: Web Audio sintetizado, com ruído, osciladores e filtros; não há trilha MP3 a licenciar. Som é ativado após gesto, com controle de silenciamento. Texturas e SVG são autorais procedurais. As ilustrações oficiais das cartas são recursos protegidos e não são fonte para repintura cenográfica.

Antes de alterações na casa, foram registrados hashes das fontes/recursos/documentos e cópias dos módulos em `tests/artifacts/etapa11/source-before`. O build da linha de base está isolado em `tests/artifacts/etapa11/dist-before`; `dist` contém o build atualizado. A coleta usa os mesmos pontos de câmera e dimensões antes/depois, com semente de teste fixa apenas na automação. Olhar livre, movimento dos personagens e instante de captura podem variar; não se trata de comparação pixel a pixel.

## Direção artística

**Uma casa desenhada como memória incompleta.** Preservar a gravura, o papel, a tipografia editorial e a arquitetura já reconhecível. Substituir a sensação de linhas uniformemente iluminadas por planos de sombra e luz localizada, com madeira escurecida, bronze envelhecido, musgo discreto e luz fria nas bordas. O âmbar indica passagens; as áreas vazias preservam expectativa.

- Jardim: separar silhuetas e profundidades com névoa baixa e manchas de luz, mantendo caminho legível e vegetação existente.
- Entrada: valorizar arco, folhas articuladas, soleira e luz interior, sem criar uma fachada que feche o recorte atravessável.
- Corredor: ritmo arquitetônico, sombras entre vãos e poucos objetos antigos; evitar acumular decoração a cada carta.
- Assombrações: presença progressiva, silhuetas reconhecíveis e saída gradual; sem flashes repetitivos, gore novo ou gritos.
- Áudio: reutilizar a síntese existente, sem arquivos externos, com volume controlado e suspensão ao ocultar a página.

Blender é autorizado, mas não é necessário para adicionar um pequeno adereço à casa CSS. SVG, planos e gradientes mantêm a perspectiva real da arquitetura existente, dispensando um segundo renderer ou modelos desconectados. O baú GLB e os seus arquivos originais permanecem fora do escopo.

## Linha de base e método

A primeira amostra Chromium registrou 6.927 elementos DOM, dos quais 6.509 na cena, com 1.930 `rect`, 952 `path` e 785 `circle`. Muitos detalhes pertencem às 61 peças de corredor (60 registros e exposição), mesmo quando estão muito distantes. O recorte antigo ocultava a pintura, mas não retirava esses descendentes do DOM. A medição headless apresentou tarefas longas e poucos quadros; esses números não representam um smartphone físico.

O primeiro percurso automatizado tentou clicar em Entrar depois de já avançar pelo jardim, quando o limiar corretamente estava inert. O procedimento foi corrigido para voltar ao portão antes desse clique. A reprovação e a interrupção de teste foram preservadas; uma tentativa de iniciar outro runner recusou as portas ocupadas e não iniciou serviços concorrentes. Não se alterou a interação da aplicação para acomodar esse erro do percurso.

Capturas pausam RAF e animações CSS **somente durante a fotografia**, retomando-os em seguida. Medições e interações mantêm animações normais. A pausa é registrada no JSON; as imagens não comprovam estabilidade temporal, FPS ou desempenho físico.

## Implementação integrada

O jardim mantém árvores, caminho, casa desenhada em linhas e personagens existentes. Recebe duas camadas discretas de bruma baixa, manchas de luz no percurso e paleta verde acinzentada com âmbar envelhecido. A bruma final é **estática em seu plano**, deslocando-se apenas com a perspectiva durante a caminhada: a deriva contínua da primeira implementação foi retirada após a análise de custo. Animações do jardim são pausadas enquanto o usuário está no corredor. A entrada mantém o arco original e as folhas articuladas; o brilho quente indica a passagem. Não foi adicionada uma fachada opaca que bloqueasse a travessia. A arquitetura de gravura continua deliberadamente incompleta.

O corredor recebe arcos espaçados a cada 1.600 unidades, luz tênue no piso, sombra inclinada de janela, teto com vigamento escuro, lambri sombreado e um console com espelho envelhecido. Todos compartilham as superfícies e câmera originais. A decoração usa `pointer-events:none` e recorte por distância. Não há nova navegação nem objetos obrigatórios para desbloquear conteúdo.

Velas e luzes variam suavemente. O antigo apagão com três flashes rápidos foi substituído por um escurecimento único e moderado, preservando sua duração e marcas narrativas. Movimento reduzido impede o disparo desse escurecimento, remove giro do Saci, balanço de caminhada, oscilação decorativa e transições; a exploração e as presenças estáticas continuam disponíveis. O botão de 44×44 no topo usa a mesma preferência persistida do projeto e respeita `prefers-reduced-motion`.

### Assombrações

Foram desenhadas cinco representações SVG autorais, independentes das ilustrações oficiais: moldura com reflexo da Loira, lobo de perfil, Saci com uma perna e corrente de ar, figura alta associada a Hachishakusama e serpente luminosa do Boitatá. Referências culturais consultadas: catálogo ativo e fontes já documentadas pelo projeto; nenhum texto de lenda foi reescrito. O Saci preserva sua situação de exposição fora do catálogo oficial de 60, sem concessão de recompensa.

As aparições surgem e desaparecem por opacidade em um plano da cena, posicionado à frente da câmera no início do evento. Não são sobreposições clicáveis da interface. Há no máximo uma nova manifestação ativa e um intervalo de silêncio entre eventos. Abrir dossiê ou ocultar a aba pausa seu relógio; voltar ao jardim cancela a presença; sair da página limpa o elemento. Quadros lentos consomem tempo real, evitando alongar artificialmente a aparição.

| Apresentação | Duração | Exploração normal |
| --- | ---: | --- |
| Espelho / Loira do Banheiro | 5,8 s | Próximo à Loira |
| Lobisomem / Peter Stumpp | 4,4 s | Próximo a Peter Stumpp |
| Saci / redemoinho | 5,1 s | Posição cenográfica existente, sem desbloqueio |
| Figura alta / Hachishakusama | 4,5 s | Próximo a Hachishakusama |
| Boitatá | 5,4 s | Próximo ao Boitatá |

Na exploração, a visita decide a ordem espacial e cada evento é exibido uma vez por sessão. Para avaliar a **sequência de apresentação aprovada**, abrir `/casa/index.html?apresentacao=1&demonstracao=1` e tocar em **Entrar direto na casa**: espelho → lobo → Saci → figura alta → Boitatá. A legenda identifica o evento atual e a ficha de outra lenda fica oculta somente nessa demonstração. A cena React e seu diretor original não foram alterados; agora a casa CSS também pode apresentar a sequência. O teste compara os identificadores com `SEQUENCIA_APRESENTACAO` do catálogo de eventos original.

### Easter eggs, áudio e ciclo de vida

Preservados os gatilhos existentes: menina e lobo no jardim, lua cheia, Curupira, figura alta após inatividade, Loira após digitação, chapéu/giro do Saci, hora 3, Kisaragi, UFO/vaca, marcas ambientais e atalhos de apresentação. Probabilidades e intervalos desses sistemas não foram reordenados. A seleção ambiental aleatória é adiada enquanto uma nova manifestação está ativa, para evitar efeitos concorrentes e ruído narrativo; seus gatilhos manuais continuam disponíveis.

O áudio continua original e sintetizado com Web Audio. O volume mestre passou de 0,9 para 0,55 e ganhou compressor moderado. Entrada e controle de som exigem gesto; silenciamento salvo é respeitado ao entrar e após recarga. Não há início automático ao simplesmente atravessar uma coordenada. Ocultar a página suspende o contexto; saída definitiva encerra contexto e fontes ambientais. Não foram incorporados arquivos de terceiros. A percepção de volume precisa ser conferida em aparelhos físicos.

`ciclo.js` centraliza timers e listeners de janela/documento dos módulos alterados. Aba oculta conserva os atrasos restantes sem acumular intervalos; RAF para e retoma sem salto temporal. O dossiê suspende a atualização da cena. `pagehide` com BFCache pausa; saída definitiva descarta timers/listeners e manifestações; `pageshow` pode retomar a sessão preservada. Listeners locais pertencem aos elementos da própria página. Os contratos são testados sem afirmar que uma sequência sintética certifica BFCache físico.

## Desempenho e recursos

Os 60 contêineres de cartas e a peça extra permanecem no corredor, com os mesmos IDs, cliques e conteúdo. Somente o conteúdo interno das cartas próximas é montado; ao sair da distância visível, seus descendentes são removidos. A montagem seguinte consulta a coleção atual, preservando cartas adquiridas. Não houve redução de resolução das ilustrações oficiais nem remoção de eventos para baixar a contagem.

As oito texturas JPEG antes sintetizadas a cada visita agora são servidas em cache local: assoalho 1.440×2.048, lambri 960×290 e seis estampas 480×900. O gerador reutiliza as funções originais, dimensões e codificação JPEG. O grão em tela inteira foi substituído por um tile PNG 128×128 gerado do SVG original. Isso dispensa gerar o ruído SVG em tempo de execução; como o navegador também pode cachear o filtro antigo, não se presume ganho de FPS dessa troca. Os nove bitmaps somam **1.248.704 bytes**; tamanhos e SHA-256 estão em `tests/artifacts/etapa11/textures-generated.json`. `scripts/gerar-texturas-casa.mjs` reproduz a geração usando o Playwright já instalado, sem novas dependências.

Uma amostra curta de RAF de 2,5 segundos estima atualização; não mede desempenho de smartphone nem substitui vídeo. DOM, DCL, primeira disponibilidade dos módulos, tarefas longas e métricas CDP de heap/layout são registrados nos JSON. `performance.memory` pode ser arredondado; para Chromium, o heap CDP é a referência mais específica. WebKit não oferece essas métricas CDP e ausência de `longtask` não significa ausência de tarefas longas. Contagens CDP de nós incluem estruturas não equivalentes ao DOM vivo e não devem ser comparadas diretamente a `querySelectorAll('*')`.

A amostra inicial antes é headless; a coleta intermediária `after-final` usa janela local. Comparar diretamente FPS ou latência entre esses modos seria incorreto. A redução de DOM vivo no portão, independente dessa diferença, é de **6.927 para 3.080 (55,5%)**; no jardim, **6.927 para 3.708 (46,5%)**. Continua existindo custo alto na composição CSS 3D e no bundle React preexistente.

A primeira comparação em janela local mostrou regressão na atualização do jardim/corredor. O diagnóstico controlado de atmosfera (`atmosphere-cost-native.json`) alternou estilos temporários sem modificar a aplicação. A amostra do jardim passou de 18,7 para 25,5 quadros estimados/s ao parar a deriva da bruma; no corredor, de 16,5 para 21,0. Isso motivou simplificar esse efeito e pausar animações do jardim oculto, preservando os planos, textura, luz e assombrações. São observações curtas, sujeitas a aquecimento e carga local; os ensaios headless tiveram poucos quadros e não sustentam uma conclusão causal precisa para cada camada. Não se removeu grão nem molduras a partir desses ensaios inconclusivos.

A comparação final usa `BAU_HOUSE_STABLE_SAMPLE=1`: espera apenas a transição CSS finita do palco terminar antes de coletar RAF; a cena continua animando normalmente durante a amostra. O protocolo é aplicado tanto ao build original quanto ao final em janela local. As medições intermediárias que incluem a transição permanecem preservadas, assim como a queda e o timeout observados no Chromium headless. Tempos de primeira interação usam um clique real após nova navegação em contexto com cache aquecido, registrados separadamente da estimativa de disponibilidade dos módulos.

Outro custo foi tratado no fim da validação: o seletor relacional `body:has(#dossie:not([hidden])) #palco *` foi substituído pela classe explícita `body.dossie-aberto`, atualizada ao abrir/fechar dossiês oficiais e a exposição. O comportamento de pausa permanece, com asserções de abertura/fechamento na suíte. Na amostra Chromium do jardim, `RecalcStyleDuration` passou de 1.245 ms antes dessa correção para 166 ms depois; a estimativa de atualização passou de 18,7 para 37,7 quadros/s. Os ensaios anteriores permanecem em `after-final-metrics`; a medição da entrega está em **`after-selector-metrics`**.

O comparativo alternado do grão (`grain-cost.json`) não confirmou benefício consistente ao restaurar o SVG original: depois de aquecido, o corredor registrou aproximadamente 20,1–20,2 quadros/s com SVG e 20,8 com bitmap no mesmo ensaio. A troca de grão foi mantida; o primeiro resultado lento não foi usado isoladamente como prova causal. Não foram feitas mudanças experimentais adicionais no renderer.

### Comparação final registrada

Dados de `before-final-metrics/report.json` e `after-selector-metrics/report.json`, ambos com janela local, sem fotografias durante a coleta e com o mesmo protocolo. Cada estimativa vem de amostra curta de RAF; carga do computador, aquecimento e eventos ambientais variam. O corredor final inclui a nova apresentação sobrenatural normal, ausente na casa CSS anterior. As contagens abaixo são instantâneas, não limites máximos de sessão.

| Chromium / 1366×768 | DOM antes → final | Quadros/s estimados antes → final | P95 do intervalo entre quadros antes → final |
| --- | ---: | ---: | ---: |
| Portão | 6.927 → 3.080 | 36,7 → 45,1 | 50,0 → 16,8 ms |
| Jardim | 6.927 → 3.708 | 42,3 → 37,7 | 33,4 → 50,1 ms |
| Corredor | 6.927 → 4.184 | 27,2 → 27,9 | 50,1 → 66,6 ms |

Não há ganho uniforme: o jardim ficou cerca de 10,9% abaixo da linha de base nessa amostra, e o P95 do corredor aumentou. A regressão muito maior da versão intermediária foi tratada, mas estabilidade temporal e custo das novas composições ainda requerem acompanhamento em hardware físico. Não se declara desempenho integralmente homologado com base nesses três números.

| Tempos observados | Chromium antes → final | WebKit antes → final |
| --- | ---: | ---: |
| DOMContentLoaded | 442 → 513 ms | 571 → 1.063 ms |
| Disponibilidade dos módulos (proxy de prontidão, não garantia de texturas pintadas) | 2.253 → 930 ms | 3.408 → 2.582 ms |
| Resposta à primeira entrada, desde a nova navegação com cache aquecido | 2.790 → 1.517 ms | 7.570 → 3.390 ms |
| Chegada ao interior no mesmo percurso inicial | 3.598 → 2.049 ms | 8.789 → 4.459 ms |
| Clique Entrar → cruzar o limiar, percurso medido separadamente | 1.467 → 867 ms | 4.037 → 2.427 ms |
| Clique Entrar → câmera assentada | 2.758 → 1.921 ms | 8.374 → 3.491 ms |

No Chromium, o heap JS CDP observado no corredor foi de 4,19 para 4,13 MB; isso não mede memória nativa/GPU. `LayoutDuration` da amostra foi de 81,0 para 92,0 ms; `RecalcStyleDuration`, de 674,9 para 707,2 ms. No portão, o recálculo de estilos caiu de 842,3 para 194,6 ms. Long tasks acumuladas desde a navegação até a amostra do corredor: 10 / 3.210 ms antes e 13 / 2.085 ms no final; contagem e duração não são uma taxa independente por cena. Valores completos de heap, layout, tarefas, nós CDP e percentis estão nos JSON.

No WebKit, as estimativas finais foram 32,2 / 15,2 / 2,1 quadros/s (portão/jardim/corredor), contra 2,9 / 6,4 / 4,6 antes. **A cena está visualmente incorreta nesse motor**: essas taxas não homologam a experiência nem permitem tratar a imagem incompleta como otimização. Não há medição CDP de heap/layout equivalente. O modo headless continua sendo um limite importante dos ensaios (Chromium configurado com ANGLE/SwiftShader; WebKit usando o compositor do ambiente de teste); seus resultados são registrados separadamente e não substituem teste físico.

## Compatibilidade e problema visual conhecido

Chromium 156.0.8078.4 e WebKit 27.2 foram exercitados no Linux. No WebKit, há planos desenhados em ordem de profundidade incorreta e trechos internos escuros, inclusive no build anterior preservado. Botões, foco e eventos em JavaScript podem passar enquanto a imagem permanece incorreta. Por isso, o resultado visual é reprovado e o aceite integral continua pendente.

Um exemplo mínimo independente de CSS `preserve-3d` reproduziu diferença de ordenação entre os motores. Também foram feitos diagnósticos de filtros, origem de perspectiva, subdivisão dos planos, projeção e compositor nativo. As alternativas não preservaram a geometria com confiabilidade e foram retiradas da aplicação; câmera e superfícies originais foram mantidas. Protótipos e imagens estão em `tests/artifacts/etapa11/diagnostic-sources` e demais artefatos de diagnóstico, separados das evidências finais.

Há um relato primário semelhante no [WebKit, issue 324944](https://bugs.webkit.org/show_bug.cgi?id=324944), sobre ordenação de camadas `preserve-3d` em GTK/WPE. A associação com este caso é uma hipótese técnica, não comprovação de que o binário instalado contém exatamente o mesmo defeito. Não se conclui, a partir do WebKit Linux, que Safari no iPhone tem comportamento idêntico. Não foram instalados outro browser, renderer ou dependências para contornar o resultado.

## Arquivos e preservação

Arquivos existentes alterados nesta etapa: `public/casa/index.html` e `public/casa/js/{main,decor,aparicoes,jardim,texturas,easter-eggs,som,corredor}.js`. Novos recursos integrados: `public/casa/css/arte.css`, `public/casa/js/{arte,ciclo,manifestacoes}.js`, `public/casa/img/cenario/grao.svg` e os nove bitmaps em `img/cenario/texturas/`.

Ferramentas e evidências: `scripts/gerar-texturas-casa.mjs`, `tests/house-art.test.mjs`, `tests/house-art-browser.mjs`, `backend/tests/run_house_art.py` e este relatório. Os seis runners modificados foram `tests/{responsive-browser,touch-controls-browser,tracking-browser,tracking-camera-browser,educational-integration,educational-navigation}.mjs`: receberam apenas opção de diretório de saída para preservar evidências antigas. Nenhuma asserção funcional anterior foi removida. Protótipos de diagnóstico não estão importados pela aplicação.

`tests/artifacts/etapa11/delivery-integrity.json` compara os **139 hashes** anteriores: 130 iguais, nove fontes da casa modificadas, nenhum arquivo ausente. Também confirma os hashes dos **23 arquivos públicos entregues** contra o build efetivamente testado. Permaneceram intactos `src`, backend da aplicação, catálogo, cartas oficiais, QR/tracker, GLB e animações do baú, dependências e lockfile. O banco usado nos testes é exclusivamente `bau_test`, em cluster local de testes previamente preparado; nenhuma migration ou alteração de esquema/catálogo foi executada. Contas e recompensas de fixtures pertencem a esse banco isolado.

## Validação e aceite

Resultados das etapas anteriores são referência, não evidência desta execução. A homologação física e a aprovação artística do responsável são distintas do resultado automatizado.

| Verificação nova desta etapa | Resultado | Evidência em `tests/artifacts/etapa11/` |
| --- | --- | --- |
| Node completo | **82 aprovados**, zero falhas/skip | `delivery-node.log` |
| Python / PostgreSQL isolado | **40 aprovados**, 39 não selecionados pela seleção de escopo | `python.log` |
| TypeScript | Aprovado, exit 0 | `delivery-typescript.log` |
| Vite de produção | Aprovado | `delivery-build.log` |
| Responsividade da casa | **38 verificações por motor**; 36 layouts por motor, 12 dimensões × entrada/corredor/dossiê | `responsive/report.json` |
| Toque, foco, mouse, teclado, gestos e DPR 2/3 | **11 cenários por motor**, todos aprovados | `interactions/report.json` |
| Rastreamento QR | Aprovado em Chromium e WebKit | `regressions/browser.json` |
| Câmera/recuperação/saída, com mídia simulada | Aprovado nos dois motores | `regressions/camera-browser.json` |
| GLB e animações do baú | Aprovado nos dois motores; abrir/fechar/Idle, falha de carga, context loss e descarte | `chest-browser.json` |
| Álbum, troca de conta e recompensa | Aprovado nos dois motores | `regressions/integration.json` |
| Cadastro, login, revogação, resposta atrasada e falha de conexão | Aprovado nos dois motores | `regressions/auth.json` e `regressions-run.log` |
| Recompensas, histórico, contador, galeria, catálogo e falhas/fallbacks legítimos | Sete cenários por motor, todos aprovados | `regressions/mobile-fixes.json` |
| Três abas, Perfil independente e percurso até galeria | Aprovado nos dois motores | `regressions/navigation.json` |
| Casa no build final, incluindo as cinco manifestações | **11 cenários por motor**, todos aprovados; 40 capturas obtidas | `after-delivery/report.json` |
| Preferências e ciclo de vida no build final | Silêncio salvo, movimento reduzido, botão nas 12 dimensões e contratos de pausa/descarte aprovados nos dois motores | `after-delivery/report.json` |
| Repetição final headless | Cinco cenários por motor aprovados, sem fotografias; atualização headless continua baixa | `after-headless-delivery/report.json` |

Os nove testes novos de Node cobrem ordem, pausa, proximidade, descarte, movimento reduzido, tempo real em quadros lentos, relógios/listeners e convivência com os eventos ambientais. No último caso, o sorteio aguarda a manifestação ativa, o atalho manual continua funcionando e o agendamento original retoma. Os 73 testes anteriores continuam incluídos na execução completa.

A suíte responsiva terminou com exit 1 por **duas capturas Chromium headless que excederam 15 segundos** (entrada 320×568 e 390×844), apesar das 76 verificações funcionais aprovadas. O erro bruto foi preservado; as capturas foram refeitas com sucesso em janela local em `after-desktop-review` e novamente no build final em `after-delivery`. A primeira coleta artística também registrou um timeout de espera no percurso Chromium corredor/dossiê; o mesmo percurso passou nas repetições focadas e na validação final, sem remover a asserção. A coleta intermediária `after-headless-metrics` registrou timeout de clique na primeira entrada Chromium, apesar de o elemento estar visível e estável; os testes de preferências/ciclo passaram. Esses resultados não são apresentados como uma execução integralmente verde nem apagados pela repetição aprovada.

A matriz de 76 verificações e as regressões externas à casa foram executadas antes da última simplificação da animação da bruma. A repetição `after-delivery`, no build final, cobre os comportamentos afetados e as capturas da casa nos dois motores. Nenhuma nova mudança foi feita em autenticação, recompensas, RA ou baú após suas regressões aprovadas. O sucesso de `captures` no JSON significa arquivo produzido; o julgamento visual fica separado em `visual-review.json` e neste relatório.

O Vite mantém o aviso preexistente de chunk acima de 500 kB: principal 922,90 kB, 256,54 kB gzip. A divisão desse bundle está fora da mudança artística local. Python emitiu um aviso de depreciação da combinação Starlette/httpx; não foram instaladas dependências para ocultá-lo. Os serviços próprios de cada runner são encerrados em `finally`.

As dimensões efetivamente exercitadas foram 320×568, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 568×320, 667×375, 844×390, 932×430 e 1366×768. A matriz verifica geometria, ausência de expansão horizontal, alvo de toque mínimo e hit testing real dos controles. A suíte de interação complementa com toque nativo quando disponível, teclado/mouse, foco contido e restaurado, minimapa, som, marcas existentes, Saci e lua cheia. O swipe suplementar WebKit é sintético; gesto físico e leitor de tela real continuam pendentes. Nenhuma certificação de contraste ou acessibilidade integral é inferida das capturas.

Na repetição headless final, Chromium registrou aproximadamente 0,35 / 5,15 / 1,22 quadros estimados/s e WebKit 1,95 / 1,96 / 0,49 (portão/jardim/corredor). Os dez cenários funcionais passaram; isso não torna essas taxas aceitáveis para homologação de fluidez. Não há comparação percentual com a primeira amostra headless, que usava outro procedimento de captura/estabilização. O desempenho headless e o P95 permanecem documentados como limites reais do ambiente de testes.

Comandos centrais de reprodução, usando somente as dependências e o banco de testes existentes:

```bash
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build --outDir tests/artifacts/etapa11/dist
BAU_HOUSE_HEADED=1 BAU_HOUSE_PHASE=after-recheck backend/.venv/bin/python backend/tests/run_house_art.py
```

O runner recusa outro banco, cluster sem marcador ou portas já ocupadas. Para repetir regressões, `BAU_HOUSE_SCRIPTS` seleciona os scripts listados em `regressions-run.log`; `BAU_HOUSE_REGRESSION=1` executa a seleção Python. `BAU_RESPONSIVE_ONLY=casa` restringe a matriz às três superfícies da casa, enquanto as demais regressões continuam em seus scripts. Os caminhos antigos de saída seguem sendo o padrão quando as variáveis novas não são fornecidas.

Pendências conhecidas: corrigir ou delimitar a incompatibilidade de composição CSS 3D no WebKit, conferir Safari/iPhone e Chrome/Android reais, desempenho sustentado, orientação/notch/teclado e volume físico. Recomendações: investigação focada do compositor e da versão real do browser, perfil de custo dos planos CSS, e divisão do bundle principal em trabalho separado. Não há alegação de 60 FPS mobile, certificação Safari ou perfeição artística.

Não houve instalação de dependências, alteração do baú no Blender, publicação, túnel externo, operações destrutivas ou comandos Git de escrita. As mudanças locais preexistentes foram preservadas. A Etapa 12 não foi iniciada.

## Evidências visuais para revisão

Capturas usam dimensões e profundidades de câmera correspondentes quando disponíveis. A linha de base foi coletada antes da implementação. Variações de olhar livre, personagem e momento permanecem possíveis; as imagens não são um teste de igualdade de pixels. No dossiê desktop, a captura começa no topo; a matriz responsiva também registra estados rolados para verificar os botões inferiores. Não existiam esses cinco SVG de apresentação na casa CSS anterior, portanto não há um falso par “antes” para cada figura nova.

| Ambiente / motor | Antes | Build final |
| --- | --- | --- |
| Portão / Chromium / 1366×768 | [antes](../tests/artifacts/etapa11/before/Chromium-1366x768-portao.png) | [depois](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-portao.png) |
| Jardim / Chromium / 1366×768 | [antes](../tests/artifacts/etapa11/before/Chromium-1366x768-jardim.png) | [depois](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-jardim.png) |
| Entrada / Chromium / 1366×768 | [antes](../tests/artifacts/etapa11/before/Chromium-1366x768-entrada.png) | [depois](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-entrada.png) |
| Corredor / Chromium / 1366×768 | [antes](../tests/artifacts/etapa11/before/Chromium-1366x768-corredor.png) | [depois](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-corredor.png) |
| Dossiê / Chromium / 1366×768 | [antes](../tests/artifacts/etapa11/before/Chromium-1366x768-dossie.png) | [depois](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-dossie.png) |
| Corredor / Chromium / 320×568 | [antes](../tests/artifacts/etapa11/before/Chromium-320x568-corredor.png) | [depois](../tests/artifacts/etapa11/after-delivery/Chromium-320x568-corredor.png) |
| Corredor / WebKit / 320×568 — defeito visual | [antes](../tests/artifacts/etapa11/before/WebKit-320x568-corredor.png) | [depois](../tests/artifacts/etapa11/after-delivery/WebKit-320x568-corredor.png) |

As cinco manifestações finais em Chromium: [espelho](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-aparicao-espelho.png), [lobo](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-aparicao-lobo.png), [Saci](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-aparicao-saci.png), [figura alta](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-aparicao-alta.png) e [Boitatá](../tests/artifacts/etapa11/after-delivery/Chromium-1366x768-aparicao-boitata.png). O mesmo diretório contém os pares WebKit, incluindo a composição incorreta do cenário; não são evidências de aprovação visual desse motor.

Os dois motores têm capturas finais de portão/corredor em **320×568, 390×844, 430×932, 568×320 e 844×390**, além das cinco imagens de evento e dos ambientes desktop. As 36 posições de layout de cada motor estão em `responsive/report.json`; nesse diretório também há dossiês mobile e paisagem. Os artefatos ficam ignorados pelo Git conforme a configuração anterior do projeto e não foram publicados externamente.

## Estado final da entrega

Implementação artística integrada, otimizações locais aplicadas, regressões executadas e documentação/evidências entregues. Os cenários funcionais finais passaram em janela local e headless nos dois motores. As falhas de tentativas anteriores permanecem preservadas. `summary.json` reúne os resultados sem converter captura bem-sucedida em aprovação visual.

**Aceite técnico integral pendente:** composição visual incorreta no WebKit Linux. Há também limites de desempenho no ambiente headless, variação de FPS/P95 e necessidade de homologação física. A aparência final precisa da avaliação artística do responsável. Recomenda-se resolver/delimitar o caso WebKit com reprodução mínima e versão real dos aparelhos, acompanhar o custo do jardim em hardware físico e tratar o bundle em trabalho separado. Nenhuma dessas pendências foi ocultada por remoção de eventos, redução das cartas, instalação de outro renderer ou alteração de testes para obter aprovação.

## Estabilização visual — Etapa 11.1

Investigação iniciada em 23/11/2026. Estado inicial preservado em `tests/artifacts/etapa11-1/source-before`, build em `dist-before`, hashes em `baseline-hashes.json` e sistema/sessão gráfica em `environment.json`. As evidências da Etapa 11 permanecem intactas.

A reprodução controlada da casa atual foi iniciada em Chromium/WebKit, primeiro em janela local e depois headless, com portão, jardim, entrada e corredor/dossiê em posições correspondentes. Logs em `baseline-1.log` e `baseline-0.log`; cada resultado registra a versão real do motor. Não se atribui a falha ao Safari físico. A configuração Chromium headless mantém ANGLE/SwiftShader; janela local mantém a configuração padrão do browser.

Até este registro, não foi feita alteração visual na aplicação nem declarada correção do compositor. Os dois runners receberam somente um diretório de saída configurável (`BAU_HOUSE_OUT`) para preservar os resultados anteriores. A investigação está em andamento: causa, correção, medições repetidas com dispersão, caso mínimo atualizado, regressões e avaliação visual final ainda não estão concluídos. Nenhum resultado antigo está sendo apresentado como aprovação nova da Etapa 11.1. Aceite visual integral permanece pendente.

### Continuação e conclusão do diagnóstico

O parágrafo anterior preserva o registro inicial. Na continuação de 23/11/2026, a reprodução e os experimentos foram concluídos. **A incompatibilidade permanece; nenhuma correção visual ou otimização adicional foi incorporada à aplicação sem demonstração confiável.** Isso encerra a investigação delimitada desta etapa, sem conceder aceite visual integral. A arquitetura e a direção “uma casa desenhada como memória incompleta” permanecem intactas.

Ambiente registrado: Linux 7.0.0-44, x86_64, glibc 2.43, sessão Wayland com DISPLAY :0; Chromium **156.0.8078.4**, WebKit **27.2**. Headless Chromium usa `--use-gl=angle --use-angle=swiftshader`; headed usa os padrões gráficos do browser. Não foi certificado driver/GPU físico nem há aparelho iPhone/Android conectado. Fonte: `environment.json` e relatórios individuais, em `tests/artifacts/etapa11-1/`.

**Sintoma reproduzido:** no corredor WebKit, paredes/piso/teto e profundidade não são compostos como no Chromium; planos escuros sobrepõem partes que deveriam estar visíveis. O caso mínimo independente contém apenas perspectiva de 760 px, mundo `preserve-3d` transformado, planos próximos/distantes e um plano escuro distante. A diferença persiste sem catálogo, cartas, áudio ou diretor de manifestações. Isso restringe a hipótese à interação de projeção/ordenação/composição; não comprova por si só qual implementação viola a especificação, nem identifica um commit responsável do motor.

Foram registrados estilos computados: `#mundo` preserva 3D, tem origem Z de 760 px e `will-change:transform`; `#cena` estabelece perspectiva e origem 50%/44%; `#palco` possui filtro e overflow hidden fora desse contexto; as lâminas de névoa são planos transparentes separados. Pela [especificação CSS Transforms 2](https://www.w3.org/TR/css-transforms-2/#grouping-property-values), certos filtros, opacidade e recortes exigem agrupamento/achatamento. Isso orientou testes, mas retirar um fator isolado não corrigiu esta cena. Não se conclui que qualquer `filter` ancestral seja a causa única.

| Hipótese isolada | Resultado observado / decisão |
| --- | --- |
| Retirar filtro do palco | WebKit continua sem composição correta; não aplicar perda de iluminação sem benefício |
| Overflow visível no palco | Não recupera os planos; não aplicar mudança de recorte |
| Origem Z do mundo igual a zero | Não corrige WebKit e muda enquadramento no Chromium; rejeitada |
| Superfícies intermediárias com transform-style flat | Não recupera o corredor WebKit; pode alterar o espaço dos descendentes; rejeitada |
| Z-index no mínimo | Não restabelece uma ordenação 3D equivalente; rejeitada como solução genérica |
| Projeção por matrizes / homografia no mínimo | Não validada como equivalente à geometria da casa; não integrada como fallback |

Fontes reproduzíveis: `diagnostics/minimum.mjs`, `diagnostics/layers.mjs`, `diagnostics/minimal-probe.json` e `layers/report.json`. Cada alteração temporária foi removida antes da seguinte, sem editar as fontes da aplicação. As capturas ficam nas mesmas pastas. As tentativas da Etapa 11 também foram preservadas. Não houve detecção por user-agent, remoção de paredes ou substituição por WebGL. A hipótese de limitação do compositor Linux é sustentada pelo sintoma independente, mas sua causa interna continua não comprovada; o relato WebKit já citado é somente referência semelhante.

### Desempenho reavaliado sem alteração do cenário

Três execuções seriais em janela local, mesmas versões, viewport 1366×768, semente, coordenadas, controles, animações normais, cache novo por contexto e navegação aquecida no percurso. Antes das amostras, aguarda-se somente a transição finita do palco. Cada coleta RAF dura aproximadamente 2,5 s. Nenhuma captura é feita nessas execuções. A fase narrativa natural continua ativa; o tempo dos eventos ambientais e a carga do computador ainda introduzem variação. Não se confunde essa repetição com benchmark de celular ou ensaio sustentado.

| Motor / ambiente | Mediana FPS estimados | Mínimo–máximo (3 execuções) |
| --- | ---: | ---: |
| Chromium / portão | 46,60 | 40,57–56,05 |
| Chromium / jardim | 53,85 | 53,03–53,89 |
| Chromium / corredor | 41,02 | 40,20–42,55 |
| WebKit / portão | 48,32 | 46,54–51,83 |
| WebKit / jardim | 21,93 | 21,83–21,96 |
| WebKit / corredor | 5,42 | 5,15–5,83 |

Os valores únicos anteriores da Etapa 11 (45,1 / 37,7 / 27,9 Chromium) não são um controle antes/depois de uma correção nova. **O código é o mesmo:** os números maiores desta rodada não são ganhos atribuíveis a uma implementação. A dispersão e a diferença entre rodadas impedem concluir regressão persistente do jardim apenas pela amostra antiga. WebKit com planos ausentes não pode ser considerado otimizado, mesmo quando seu contador é alto.

`measure-{0,1,2}/report.json` contém DOM, DCL, prontidão aproximada, entrada real por toque, heap CDP quando disponível, recálculo de estilos, layout, long tasks, intervalos e P95. `performance-summary.json` consolida FPS individuais, mediana, extremos, desvio padrão, P95 e DOM. Ausência de API longtask/heap no WebKit não significa custo zero. A névoa estática, iluminação, sombras, montagem dinâmica próxima das cartas e suspensão fora de vista da Etapa 11 foram mantidas; nenhum efeito foi removido para melhorar as medidas. O histórico de otimizações comprovadas da Etapa 11 permanece acima.

### Avaliação visual e evidências desta continuação

Chromium: paredes, piso, teto, arcos e cartas presentes, percurso legível, luz/névoa preservadas e aparições dentro do cenário. WebKit: controles e dossiês funcionais, mas composição 3D reprovada; regiões escuras e profundidade divergente continuam evidentes. Não são apenas diferenças de decisão artística. Aprovação artística humana continua pendente em ambos.

Capturas finais em `after-final/`, com desktop, 320×568, 390×844, 430×932, 568×320 e 844×390, nos dois motores. Capturas pausam RAF/CSS apenas durante a fotografia, retomando-os depois; testes e medições usam animação normal. A primeira reprodução em `before-headed/` e `before-headless/` permanece disponível. Como não houve alteração do produto, antes/final representam repetições da mesma versão, não uma correção fictícia.

[Prancha comparativa PNG](../tests/artifacts/etapa11-1/avaliacao-visual/prancha.png): jardim, corredor e espelho, Chromium à esquerda e WebKit à direita. Pixels das capturas foram colados integralmente, sem recorte, retoque ou máscara, com faixas de identificação adicionadas fora das imagens. `avaliacao-visual/` reúne 20 PNG originais: portão, jardim, entrada, corredor, dossiê e as cinco aparições por motor. `provenance.json` registra a origem da prancha. Não são imagens geradas por IA.

### Preservação, Safari físico e aceite

`integrity-final.json` compara os hashes atuais com `baseline-hashes.json`: nenhum arquivo da aplicação alterado, incluindo cartas, catálogo, conteúdo cultural, RA, QR, baú/animações, autenticação e backend. Modificações permanentes desta investigação limitadas ao relatório e ao parâmetro de saída dos dois runners. Novos arquivos de diagnóstico, medições e evidências ficam em `tests/artifacts/etapa11-1/`. Nenhuma dependência instalada, banco/schema/catalogo migrado, operação Git de escrita ou publicação. Fixtures usam somente o banco de testes existente.

No iPhone real: registrar modelo, iOS e versão Safari; abrir a mesma revisão em origem HTTPS já autorizada; conferir jardim/entrada/corredor nas mesmas posições, rotacionar retrato/paisagem, verificar paredes/piso/teto e oclusão das cinco manifestações; testar movimento normal/reduzido, dossiê/foco/minimapa, áudio após gesto e silêncio salvo; alternar app e retornar; registrar vídeo e capturas sem filtros de retoque. Não se presume que o Safari físico apresente o defeito do WebKit Linux. Nenhum túnel foi criado para simular esse ensaio.

**Conclusão técnica:** investigação delimitada concluída com incompatibilidade WebKit Linux reproduzida e pendência explícita. Não foi encontrada uma correção/fallback confiável que preserve a composição nos dois motores dentro desta arquitetura. Alterações mais extensas de projeção/renderização seriam arriscadas e não foram executadas. Aceite visual integral não concedido. A Etapa 12 não foi iniciada. Resultados novos das regressões são consolidados a seguir após o término dos executores, sem reutilizar os números antigos como aprovação atual.

### Consolidação final das execuções 11.1

Todas as execuções abaixo são novas desta continuação. Não houve mudança da aplicação entre a reprodução inicial e as verificações finais.

| Verificação | Resultado desta rodada | Evidência em `tests/artifacts/etapa11-1/` |
| --- | --- | --- |
| Node completo | **82 aprovados**, zero falhas/skip | `node.log` |
| Python/PostgreSQL relevante | **40 aprovados**, 39 casos não selecionados; aviso preexistente Starlette/httpx | `python.log` |
| TypeScript / Vite | Aprovados; aviso preexistente de bundle acima de 500 kB | `typescript.log`, `build.log` |
| Reprodução headed e headless | Três percursos aprovados por motor/modo; julgamento visual separado | `before-headed/report.json`, `before-headless/report.json` |
| Casa final e cinco manifestações | **11 cenários por motor**, 40 capturas obtidas, zero erros JS | `after-final/report.json` |
| Responsividade | **38 verificações por motor**, 36 layouts por motor, capturas aprovadas nesta execução | `responsive/report.json` |
| Toque/mouse/teclado/DPR/foco/áudio/efeitos | **11 cenários por motor**, aprovados | `interactions/report.json` |
| Rastreamento e ciclo de câmera | Aprovados nos dois motores, com mídia simulada | `regressions/browser.json`, `regressions/camera-browser.json` |
| Modelo GLB e animações | Aprovados nos dois motores | `chest-browser.json` |
| Autenticação e sessões | Aprovadas nos dois motores | `regressions.log` |
| Histórico/contador/recompensas/álbum/galeria/catálogo | Sete cenários de regressão por motor aprovados | `regressions.log` e novo diretório timestamp indicado nesse log |
| Álbum e troca de conta, integração educativa | Aprovados nos dois motores | `regressions/integration.json` |
| Recompensa pela integração educativa | Chromium aprovado; **WebKit bloqueado nas duas tentativas** por falha de permissão da câmera simulada, antes de abrir o baú | `regressions/integration.json`, `recheck/regressions/integration.json` |
| Navegação | Aprovada nos dois motores | `regressions/navigation.json` |

O executor da integração educativa retorna exit 0 mesmo quando seu JSON contém `BLOQUEADO`. A consolidação considera o JSON: **esse cenário WebKit não está aprovado**. As demais verificações de câmera e recompensa passaram em seus próprios contextos, mas não substituem esse percurso bloqueado. A repetição foi serial, com saída separada e sem alterar permissões, RA ou asserções para obter aprovação. Não se infere a causa interna da falha de permissão nem defeito equivalente em câmera física.

Controle adicional do mínimo: foram exportados `diagnostics/minimal.html` (mesmo documento sem DOCTYPE do primeiro ensaio) e `minimal-standards.html` (controle com DOCTYPE). O primeiro mínimo em quirks reproduz uma diferença, mas **não comprova sozinho violação normativa em standards**. O controle adicional gerou quatro capturas Chromium, mas bloqueou ao criar a primeira página WebKit; foi interrompido somente o processo próprio do ensaio. `standards-run.log` conserva o erro de encerramento, não uma causa comprovada do bloqueio. O JSON de conclusão desse controle não foi gerado. Portanto, a comparação mínima standards/WebKit ficou **inconclusiva/não executada**, enquanto a reprodução na aplicação real com DOCTYPE foi concluída em ambos os modos. Não será repetida indefinidamente nesta etapa. `diagnostics/standards.mjs` preserva o ensaio tentado; uma repetição futura precisa de prazo também para criação de página. O mínimo usa configuração gráfica padrão dos browsers, separada das flags SwiftShader da reprodução headless da casa.

Custos atuais Chromium, medianas das três amostras comparáveis:

| Ambiente | DOM | P95 entre quadros | Layout CDP | Recalcular estilos CDP | Heap JS CDP |
| --- | ---: | ---: | ---: | ---: | ---: |
| Portão | 3.080 | 33,4 ms | 40,7 ms | 345,2 ms | 4,01 MB |
| Jardim | 3.708 | 33,4 ms | 112,1 ms | 222,9 ms | 4,32 MB |
| Corredor | 4.184 | 33,4 ms | 96,2 ms | 739,3 ms | 4,03 MB |

Layout/estilos são trabalho acumulado na janela de observação CDP, não duração individual de cada quadro. Heap JS não mede VRAM nem memória nativa. Os JSON também conservam DCL, prontidão aproximada, tempo de entrada real e long tasks cumulativas. Não foi executado teste físico de desempenho, áudio, gesto Safari, leitor de tela ou câmera real. Não há ganho de desempenho reivindicado nesta etapa, pois nenhuma otimização nova foi demonstrada e incorporada.

**Estado final:** investigação técnica encerrada com pendências explícitas de composição WebKit e de um percurso de recompensa com câmera sintética, além do controle mínimo standards inconclusivo. Preservadas as correções seguras da Etapa 11, a exploração, as 60 posições, montagem próxima, identidades/durações/ordem das cinco manifestações, pausas, silêncio, movimento reduzido, áudio e easter eggs. Não houve mudança visual ou de produção nesta continuação. As evidências permitem avaliação artística humana, que continua pendente; **não há aceite visual integral**. Nenhuma operação Git de escrita foi executada e a Etapa 12 não foi iniciada.
