# Otimização de desempenho preservando a identidade

Data: 24/11/2026. Objetivo: a mesma casa, funcionando melhor. **Nenhum elemento visual, ambiente, personagem, gatilho ou intervalo narrativo foi removido ou alterado.** Os relatórios anteriores foram preservados.

## 1. Problemas encontrados
1. **Casa:** a câmera reescrevia `transform`, `--cam` e `--holo` a cada quadro, mesmo parada. Como `--cam` ficava no `#cena` e variáveis CSS são herdadas, cada escrita invalidava a árvore inteira (~4.500 elementos).
2. **Casa, jardim:** enquanto o visitante está no jardim, o corredor fica oculto (`visibility:hidden`), mas suas animações CSS continuavam rodando. Eram cerca de 70 velas, 26 pálpebras, 9 pêndulos e outras, recalculando estilo a cada quadro sem ninguém ver.
3. **Casa, jardim (JS):** a varanda tinha a visibilidade regravada a cada quadro. A Chapeuzinho e o lobo recebiam `opacity` e `transform` a cada quadro, mesmo invisíveis entre as travessias.
4. **Minimapa:** regravava a cor de 60 retângulos, a das portas e três textos a cada quadro, sempre com os mesmos valores.
5. **Início (Three.js):**
   - 11 luzes pontuais do corredor entravam no cálculo de todo pixel, embora no limiar só cerca de 1 tenha intensidade maior que zero;
   - o renderizador pedia `powerPreference: 'high-performance'`;
   - a cena, com câmera fixa, era redesenhada a ~60 quadros/s.

## 2. Causas reais da lentidão
O peso vinha do **trabalho repetido por quadro sem mudança visual**: recálculo de estilo e layout na casa, iluminação no Início. Não vinha de excesso de conteúdo.

Fora do aplicativo, no momento do diagnóstico:
- Blender aberto: ~550 MB;
- VS Code: ~1,2 GB somando os processos;
- Firefox: ~2,5 GB no total, ~940 MB só na aba do projeto;
- Vite dev: ~275 MB;
- dois processos do conector `mcp-for-blender`.

A memória ficou estável numa observação de 30 s (947 → 938 MB na aba), sem indício de vazamento contínuo. Os "picos" correspondem a abrir ou voltar à aba. Com GPU integrada, a memória gráfica sai da RAM, então a recriação das texturas aparece como subida de memória do sistema.

Não foi possível medir a GPU diretamente: não há ferramenta sem `sudo` neste ambiente, e o Firefox do usuário não foi instrumentado. As medições automatizadas usam o Chromium headless com SwiftShader (GPU por software). Elas comparam **trabalho de CPU do navegador**, não o desempenho do notebook.

## 3. Desenvolvimento × produção local
Mesma ferramenta (`tests/desempenho-leve.mjs`), mesmo percurso, uma amostra, antes das otimizações.

| Cena | Produção (build) | Desenvolvimento (Vite) |
|---|---|---|
| Início em repouso, tarefas | 153 ms/s | 183 ms/s |
| Jardim em repouso, tarefas | 185 ms/s | 152 ms/s |
| Corredor em repouso, tarefas | 84 ms/s | 82 ms/s |
| Corredor caminhando, tarefas | 288 ms/s | 243 ms/s |
| Heap JS no Início | 10,1 MB | 24,5 MB |
| UI visível / 3D pronto | 618 / 901 ms | 496 / 864 ms |

O custo por quadro é equivalente nos dois ambientes; o modo de desenvolvimento só usa 2–3× mais memória JS. **Hospedar não reduz o aquecimento**, porque o gargalo está no aparelho do visitante. Para medir, foi usado um Vite temporário na porta 5179, encerrado em seguida.

## 4. Consumo inicial
Ver §12 (coluna "antes"). Arquivos: `tests/artifacts/otimizacao/antes-*.json` e `final/antes-*.json`. O build de referência está preservado em `tests/artifacts/otimizacao/dist-antes`.

## 5. Otimizações realizadas
Todas são internas, sem mudança visual pretendida:

| Arquivo | Mudança |
|---|---|
| `public/casa/js/corredor.js` | Câmera, `--holo` e neblinas só escrevem quando o valor muda. A câmera do jardim vai direto nos `.j-palco` (únicos consumidores), em vez de `--cam` herdada pelo `#cena`. |
| `public/casa/js/jardim.js` | Varanda só muda ao cruzar o limite. Chapeuzinho e lobo: mesma animação, sem regravar valores idênticos nem mover a figura invisível. Corredor oculto recebe `.animacoes-pausadas`. |
| `public/casa/css/estilo.css` | `.animacoes-pausadas` pausa as animações decorativas (`animation-play-state`). Ao reaparecer, elas retomam de onde estavam. |
| `public/casa/js/planta.js` | O minimapa só toca o DOM quando algo muda. |
| `src/experience/World3D.tsx` | Luzes com intensidade 0 ficam fora do cálculo (`visible=false`); `powerPreference: 'default'`; no limiar (câmera fixa), 30 quadros/s. O quadro é pulado antes de ler o relógio, então chama, névoa e partículas mantêm a mesma velocidade. |

## 6. Página inicial
Portal, arandelas, luzes quentes e frias, névoa, partículas e transições foram mantidos. As arandelas **não** foram removidas nem tiveram a luz desligada. Ver §5 e §19.

## 7. Casa
Arquitetura, jardim, entrada, corredor, decorações, dossiês, cartas, minimapa, easter eggs e áudio foram mantidos. Só o código de atualização por quadro mudou (§5). A montagem dinâmica das cartas próximas foi preservada.

## 8. Assombrações
**Nenhuma alteração** em `manifestacoes.js`, `aparicoes.js`, `EventCatalog.ts`, `EventDirector.ts` ou `HauntingWorld.ts`.

A luz de efeito do `HauntingWorld` (intensidade 0 em repouso) foi deliberadamente mantida: alterná-la durante uma aparição recompilaria shaders no meio do evento e causaria engasgo.

## 9. Garantias de preservação dos gatilhos
- **Novo `tests/manifestacoes-casa.test.mjs`** (9 testes, eventos reais do catálogo, sem forçar disparos):
  - nada fora da casa;
  - cada evento só no registro da sua lenda;
  - exige proximidade;
  - respeita a permanência;
  - pausa real (dossiê ou aba oculta);
  - uma manifestação por vez;
  - silêncio de 8 s;
  - uma vez por visita;
  - limpeza ao sair;
  - modo normal separado da demonstração.

  **Aprovados 9/9.**
- **Novo `tests/manifestacoes-entrada-browser.mjs`:** exploração normal, só observa. O resultado é **idêntico antes e depois** das otimizações (§16).

### Fontes vigentes e divergências encontradas
1. **Duas implementações de assombração coexistem.**
   - `docs/assombracoes.md` descreve o sistema do `World3D` (19 eventos, gatilhos de olhar, aproximação, revisita, probabilidade e cooldown de 65 s).
   - No fluxo atual esse corredor **não é percorrido**: rolar no Início leva a `/casa`, e a fase `travessia` nunca é ativada. As assombrações do `World3D` não disparam para o visitante.
   - O sistema vigente na exploração é o da casa: `public/casa/js/manifestacoes.js`, com 5 manifestações (Loira, Peter Stumpp, Saci, Hachishakusama e Boitatá).
2. **Gatilho da Loira do Banheiro.**
   - Documentação: "Olhar + permanência de 1,1 s".
   - Casa: apenas "perto do registro 1 + 1,1 s", sem verificar o olhar.
   - Como a casa começa no registro 1, **a Loira aparece de 0,3 a 1,5 s depois de entrar**, pelos dois caminhos (entrar direto ou atravessar o jardim). Isso já ocorria antes desta revisão.
   - Isso contraria a regra "não aparecer imediatamente ao entrar". Corrigir exige alterar o gatilho, o que **não foi feito sem autorização** (§22).
3. **`aparicoes.js`** (frase, pegadas, passos no teto, mãos, apagão, olhos) dispara por temporizador: 6 s após o início e depois a cada 7–12 s, enquanto o visitante está dentro, com o dossiê fechado, a aba visível e sem manifestação ativa.
   - Está documentado no `public/casa/LEIA-ME.md` e é o comportamento vigente; foi mantido.
   - São microefeitos, não personagens. Ainda assim, contrastam com a orientação de não usar temporizador global, e isso fica registrado.
4. **Modo demonstração** (`?apresentacao=1&demonstracao=1`): só é ativado com os dois parâmetros. O teste confirma que o modo normal não percorre a sequência de demonstração. As teclas de atalho (`1`–`5`, `h`) continuam ativas na casa, como documentado no `LEIA-ME`.

## 10. Álbum, Galeria e Perfil
Não alterados nesta revisão: não houve gargalo medido nessas telas. As melhorias visuais da rodada 2 foram preservadas.

## 11. RA
Não alterada. O GLB oficial do baú está intacto.

## 12. Comparações antes/depois
Chromium headless (SwiftShader), 1366×768, **3 amostras por build**. Mediana, com mínimo–máximo de tarefas.

| Cena | Tarefas antes | Tarefas depois | Estilo antes → depois | Layout antes → depois | Script antes → depois |
|---|---|---|---|---|---|
| Início em repouso | 248 (228–269) | **157 (89–172)** | 1,2 → 2,6 | 0 → 0 | 242 → **146** |
| Jardim em repouso | 92 (90–123) | 86 (47–113) | 25,6 → **18,2** | 8,6 → **1,4** | 4,6 → 4,4 |
| Corredor em repouso | 115 (49–120) | **75 (56–75)** | 22,0 → **11,8** | 9,8 → 6,4 | 3,8 → 2,2 |
| Corredor caminhando | 286 (262–292) | **245 (230–253)** | 129 → 119 | 11,4 → 10,0 | 10,6 → 8,4 |

Valores em ms de trabalho do navegador por segundo de cena.

Leitura:
- **Início:** −37% de trabalho.
- **Corredor parado:** −35%.
- **Caminhando:** −14%.
- **Jardim parado:** as faixas de tarefas se sobrepõem, então o ganho total é inconclusivo. O layout caiu 84% e o estilo 29%.
- A mudança de `--cam` para os palcos do jardim, isolada, não mostrou ganho mensurável. Foi mantida por não ter efeito visual.

Tempos até a UI e até o 3D ficaram dentro da variação: UI 485–491 contra 422–607 ms; 3D 784–804 contra 737–934 ms.

## 13. CPU e memória
- Heap JS no Início: 10,1–11,0 MB antes, 9,7–11,0 MB depois. Sem mudança.
- DOM da casa: 4.514–4.962 elementos. Varia com a montagem dinâmica; sem mudança estrutural.
- O CPU por processo no notebook real não foi medido de forma controlada.

## 14. Métricas gráficas
- **Luzes pontuais no cálculo de cada pixel no limiar** (contagem pelo código): eram 3 de ambiente, 11 do corredor, 2 das arandelas e 1 de efeito; agora são 3 + **1** + 2 + 1 (a de efeito com intensidade 0). Ou seja, **17 → 7**.
- **Quadros desenhados no limiar:** ~60 → 30 por segundo.
- **GPU:** sem medição direta (ver §2 e §20).

## 15. Testes executados
| Teste | Estado |
|---|---|
| Node `tests/*.test.mjs` (91, incluindo os 9 novos) | APROVADO |
| `tsc` + build Vite | APROVADO |
| Backend pytest SQLite (53) | APROVADO |
| Backend PostgreSQL (51) | BLOQUEADO (sem infraestrutura isolada; ver rodada 2) |
| Gestos reais no limiar, Chromium + WebKit, 6 viewports (36) | APROVADO |
| Entrada normal na casa, observação de manifestações (WebKit) | Executado; resultado idêntico antes e depois (§9.2) |
| Conferência visual, Chromium | Executada: Início e jardim iguais ao anterior |
| Conferência visual, WebKit | Inconclusiva: hoje o WebKit headless deste ambiente renderiza Início e casa com defeito **nos dois builds**, iguais entre si |
| Firefox | NÃO EXECUTADO (ausente no runtime de testes) |
| Suítes com backend (:5175 / `bau_test`) | BLOQUEADO |

Protocolo: iterações com um motor, uma amostra e `nice -n 19`; validação final com 3 amostras.

## 16. Resultados dos testes
Ver §15. Na entrada normal, a primeira manifestação foi a Loira nos dois builds:

| Caminho | Antes | Depois |
|---|---|---|
| Entrar direto | 1,3 s | 1,3 s (1,5 s em outra rodada) |
| Atravessando o jardim | 0,3 s | 1,1–1,2 s |

Nunca houve mais de uma manifestação simultânea, e nenhuma ocorreu antes de entrar.

## 17. Arquivos modificados
- `public/casa/js/corredor.js`, `public/casa/js/jardim.js`, `public/casa/js/planta.js`
- `public/casa/css/estilo.css` (regra `.animacoes-pausadas` acrescentada)
- `src/experience/World3D.tsx`

Criados:
- `tests/desempenho-leve.mjs`
- `tests/manifestacoes-casa.test.mjs`
- `tests/manifestacoes-entrada-browser.mjs`
- este documento
- `tests/artifacts/otimizacao/**`, incluindo `backup-src/` com as versões anteriores e `dist-antes/`

## 18. Possíveis regressões
- **30 quadros/s no limiar:** a chama e as partículas podem parecer um pouco menos fluidas em telas de alta taxa de atualização.
- **Animações pausadas no corredor oculto:** retomam do ponto em que pararam. Uma vela pode "continuar" a oscilação de onde estava, imperceptível em animações cíclicas.
- **Luzes alternando visibilidade:** se a fase `travessia` voltar a ser usada no futuro, mudar o número de luzes recompila shaders e pode causar um engasgo pontual.

## 19. Diferenças visuais observadas
Nenhuma nas capturas Chromium do Início e do jardim. Não há avaliação artística humana nem teste em aparelho.

## 20. Limitações conhecidas
- Sem medição direta de GPU nem de temperatura do notebook durante o uso real do Firefox.
- Medidas em GPU por software: ganhos de iluminação (luzes 17 → 7) tendem a aparecer **mais** numa GPU integrada real do que aqui, mas isso **não foi medido**.
- O WebKit headless renderiza a casa e o Início com defeito hoje, nos dois builds, então a conferência visual foi feita no Chromium.
- PostgreSQL e suítes com backend continuam bloqueados.

## 21. Recomendações para hospedagem
- Servir o **build** (`npm run build`), nunca o Vite dev: menos memória JS (10 contra 24 MB), código minificado.
- Ativar compressão (gzip/brotli) e cache longo para `assets/*` (nomes com hash), modelos `.glb` e imagens `.webp`.
- A hospedagem **não** reduz o custo de renderização no aparelho do visitante (§3).

## 22. Melhorias que exigiriam aprovação
1. **Gatilho da Loira na casa** (divergência §9.2). Opções:
   - (a) exigir olhar, como na documentação, usando a direção da câmera da casa;
   - (b) exigir que o visitante tenha estado no corredor por um tempo mínimo antes da primeira manifestação;
   - (c) manter como está.

   Sua decisão define a versão vigente.
2. **`aparicoes.js`:** substituir o temporizador global por gatilhos por região. Isso altera o ritmo narrativo.
3. **Modo "Economia de recursos"** opcional: pausar o grão e partes da névoa e reduzir velas animadas fora do registro atual, para notebooks com GPU integrada. Só se as otimizações acima forem insuficientes no seu notebook.
4. **Retirar as 2 luzes pontuais das arandelas no Início**, mantendo chama e halo: reduz mais 2 luzes por pixel, mas as paredes ficam menos quentes.

## 23. Atalhos e easter eggs após a otimização
Verificados com `tests/atalhos-easter-eggs-browser.mjs`: teclas, cliques, mouse, rolagem e espera reais, sem chamar funções internas. WebKit: **18/18 aprovados**. Relatório: `tests/artifacts/otimizacao/atalhos-webkit.json`.

| Acionamento | Efeito | Resultado |
|---|---|---|
| 1 | Frase na parede (`.escrevendo`) | APROVADO |
| 2 | Pegadas vindo até o visitante | APROVADO |
| 3 | Passos pelo teto | APROVADO |
| 4 | Mãos surgindo | APROVADO |
| 5 | Apagão (classe `apagao`) | APROVADO |
| 6 | Olhos na fresta | APROVADO |
| 7 | Mão escorregando | APROVADO |
| 8 | Rachaduras | APROVADO |
| 9 | Arranhões | APROVADO |
| 0 | Gosma escura | APROVADO |
| H | Risada (a chamada do som foi verificada; o áudio não é audível no teste) | APROVADO |
| "loira" 3× | Rosto no espelho | APROVADO |
| Clique no gorro | Saci: redemoinho, vento, "O SACI PASSOU POR AQUI." | APROVADO |
| ~30 s parado | Hachishakusama: po-po-po e pegadas enormes; nada antes de 25 s | APROVADO |
| Mouse na ala brasileira | Curupira: pegadas | APROVADO |
| Além da última lenda | Kisaragi: placa e trem | APROVADO |

Observações (comportamento vigente; nada foi alterado):
1. **Os atalhos só funcionam dentro do corredor.** No jardim são ignorados (`aparicoes.forcar` exige `dentro`), confirmado no teste.
2. **Há um segundo conjunto de teclas, não listado nos atalhos do apresentador:** `a s d f g j k l ç` disparam os efeitos 1 a 9 (`main.js`). Por isso, digitar **"loira"** dispara também `l` (rachaduras) e `a` (frase na parede) a cada vez, antes do rosto no espelho. Separar as duas coisas exigiria mudar atalhos, então não foi feito sem autorização.
3. **O gorro do Saci** fica na parede direita da ala brasileira, perto da entrada: o visitante precisa **virar a cabeça para a direita** (mouse perto da borda) nos registros 1 a 3 para vê-lo e clicar. Em registros adiante, ele fica pequeno e encoberto. Isso é igual antes e depois da otimização.
4. Com `?lua=cheia`, o primeiro clique dentro da casa também toca o uivo (easter egg da lua cheia). Isso é esperado.

## 24. Celulares de entrada (25/11/2026)
Base: `testes-implementacao` (`adaed84`), comparada à `main` (`89485a0`), que não avançou desde a criação da branch. As melhorias da branch foram mantidas, porque a `main` tem um teste falhando, bundle inicial de 249 kB gzip e não tem recompensa diária, limite de tentativas nem as correções de WebKit e responsividade. Nada foi reescrito; as mudanças são pontuais.

### O que mudou e por quê
| Mudança | Arquivos | Motivo medido |
|---|---|---|
| Versões WebP 320/480/640 px das 9 cartas (2:3, sem recorte), mais `srcset` com o original de 768 px como maior opção | `scripts/gerar-miniaturas.mjs`, `public/card-art.js`, `public/casa/js/card-view.js`, `scripts/sincronizar-imagens.mjs` | A Galeria baixava 9 JPG de ~300 KB para cartas exibidas com ~175 px de largura no celular |
| `sizes` igual à largura real da carta (um `ResizeObserver` para todas) | `card-view.js` | `sizes="auto"` levava o navegador a escolher o original; agora a grade usa a versão pequena e a carta ampliada troca sozinha pela grande |
| RA usa o build **minificado oficial** do Three.js (mesma versão 0.160); a cópia não minificada gerada saiu de `public/vendor` | `scripts/preparar-leitor-qr.mjs`, `public/ra.html` | 1.273 → 670 KB (258 → 167 KB com gzip) |
| RA desenha a 30 quadros/s; o jsQR espaça as análises para até 250 ms quando cada leitura custa caro | `public/ra.js`, `public/qr-tracker.js` | A pose muda até 10×/s; a resolução analisada e o alcance do reconhecimento não mudam |
| O 3D do Início só é montado quando o Início fica visível, protegido por `Contencao`, com o fundo em CSS sempre por baixo | `src/App.tsx`, `src/style.css` | Link direto para Álbum/Perfil/Explorar baixava ~620 KB de 3D coberto. **Sem WebGL, o Início inteiro quebrava** (verificado no build anterior) |
| Modo econômico no Início: com `saveData` ou até 2 GB de memória informados pelo navegador, usa só o fundo em CSS | `src/App.tsx` | Só o fundo decorativo muda; conteúdo e navegação são iguais |
| RA sem WebGL: mensagem clara, botão desabilitado e link para o Grimório | `public/ra.js` | Antes: "Error creating WebGL context" com "Tentar novamente", que nunca funcionaria |
| Laço da Casa a 30 quadros/s em telas de toque ou econômicas | `public/casa/js/corredor.js` | Inofensivo, mas **sem ganho medido** na emulação, que ficou saturada em 4–5 quadros/s |

Avaliado e **descartado**: converter as texturas da casa para WebP economizaria só ~20% (1.157 → 911 KB) e exigiria arquivos duplicados e detecção de formato.

### Antes × depois
Chromium headless, 390×844, toque, DPR 2, **CPU 4× mais lenta**, GPU por software, sem limite de rede, build de produção, API simulada no navegador. Mediana de 2 amostras; tamanhos **sem compressão**. Arquivos: `tests/artifacts/mobile/final-*.json`.

| Tela | Transferido | JS | Imagens | Repouso (ms/s) | Heap JS |
|---|---|---|---|---|---|
| Início | 1.129 → 1.131 KB | 971 → 972 | — | 132 → 129 | 9,3 → 9,6 MB |
| Álbum (link direto) | 1.236 → **581 KB** | 1.060 → **442** | — | 122 → **12** | 8,9 → **2,8 MB** |
| Galeria | 2.832 → **1.235 KB** | 21 → 23 | 2.637 → **1.038** | 0 → 0 | 0,9 → 0,9 MB |
| RA, antes da câmera | 2.129 → **1.543 KB** | 1.687 → **1.101** | — | 6 → 5 | 3,4 → 3,4 MB |
| Casa | 1.730 → 1.732 KB | 207 → 209 | 1.219 → 1.219 | ~155 → ~164 (3 amostras alternadas; sem diferença) | 5,4 → 5,2 MB |

### Testes desta rodada
| Teste | Resultado |
|---|---|
| Node `tests/*.test.mjs` (91) | APROVADO. `images.test.mjs` passou a aceitar o próprio original no `srcSet` e a exigi-lo |
| `tsc` + build | APROVADO |
| Backend pytest SQLite (53) | APROVADO |
| PostgreSQL isolado (51) e suítes com backend | **BLOQUEADO**: Docker inativo; nenhum banco criado ou alterado |
| `tests/ra-fluxo-sem-backend.mjs`: câmera só após o toque, reconhecimento, perda e reencontro do QR, um único POST, carta revelada, Flip, câmera liberada ao sair | APROVADO 8/8 no Chromium e no WebKit |
| `tests/inicio-compatibilidade.mjs`: Álbum por link direto, 3D após fechar, sem WebGL (Início e RA) | APROVADO 4/4; o build anterior reprova 2 |
| Gestos reais no limiar (36) | APROVADO |
| Atalhos e easter eggs (18), WebKit | APROVADO |
| Celular físico, Firefox | NÃO EXECUTADO |

Cadastro, login, logout, separação de coleções e recompensa diária repetida dependem do PostgreSQL de testes e continuam cobertos apenas pelos testes SQLite (53 aprovados).

### Divergências entre documentos e código
- **MindAR (XRD/Plano) × jsQR (código):** mantido o jsQR. Ele roda sem arquivo `.mind`, reconhece o QR 02 e estima a pose. Limitações: precisa do QR inteiro, nítido e iluminado, e perde o alvo com inclinação forte. Não há decisão registrada que exija migrar.
- **"Desafio cultural" (XRD §9.8, One Page):** cancelado (`DECISAO-ESCOPO-SEM-QUIZZES.md`).
- **10 cartas (Plano/XRD) × 60 lendas:** mantido o catálogo de 60, conforme instrução.
- **Sessão de 5–15 min:** é a duração da apresentação, não uma permanência mínima; nada no código a exige.
- **Gatilho da Loira** (§9.2): continua pendente de decisão.

### Limites reais
- Requisitos: navegador atual; HTTPS e câmera para a RA; WebGL para o baú e para o 3D do Início.
- A Casa ficou em 4–5 quadros/s na emulação (CPU 4× e GPU por software). Isso não prova desempenho em aparelho real, mas indica risco. A meta de ~30 quadros/s **não foi validada**.
- `public/lendas/` ainda guarda WebP antigos (Loira e Kuldhara) que nenhuma tela carrega; foram mantidos.

## 25. Transição Início → casa
Antes, rolar no Início trocava de página sem transição. Agora:
- **Saída (0,7 s):** o texto do limiar sobe 14 px e some, e um véu escuro com centro avermelhado cobre a tela. Enquanto isso, o navegador já pré-carrega o HTML, o CSS e o `main.js` da casa (`src/App.tsx`, `src/style.css`).
- **Chegada:** quando o visitante vem do Início, a casa abre sob o mesmo véu, que se dissolve em 1,1 s sobre o jardim. Um script mínimo no `<head>` liga a classe `chegando` antes da primeira pintura, então não há piscada (`public/casa/index.html`, `public/casa/css/estilo.css`).
- **Custo:** só `opacity` e `transform`, sem desfoque nem JavaScript por quadro. O efeito antigo `cena-cruzando` (2,4 s, com `filter: blur`) não é usado.
- **Movimento reduzido:** troca imediata, sem véu de saída, e véu de chegada instantâneo. **Acesso direto à casa:** sem véu. **Voltar pelo navegador:** o Início reaparece aberto (`pageshow`).
- **Teste:** `tests/transicao-casa-browser.mjs` passou em 4/4 casos. A saída mediu 693–700 ms dentro da página. Quadros em `tests/artifacts/transicao/sequencia.png`.

## 26. Decisão: Loira do Banheiro só quando pedida (25/11/2026)
Resolve a divergência do §9.2 e a pendência do §22.1, por decisão do responsável.
- **Manifestação do espelho** (`public/casa/js/manifestacoes.js`): marcada como `somenteDemonstracao`. Na exploração normal ela não dispara mais; continua na sequência do modo de demonstração (`?apresentacao=1&demonstracao=1`). O diretor (gatilhos, silêncio de 8 s, uma por vez) não mudou.
- **Easter egg** "loira" ×3 (rosto no espelho): mantido.
- **Silhueta na janela do jardim:** mantida, por decisão do responsável.
- **Peter Stumpp, Hachishakusama, Boitatá e Saci:** sem alteração.

Verificação:
- `tests/manifestacoes-casa.test.mjs` (10 testes, 1 novo): só a Loira é exclusiva da demonstração.
- `tests/manifestacoes-entrada-browser.mjs`: na entrada normal, nenhuma manifestação em 14 s, tanto entrando direto quanto atravessando o jardim. Antes, a Loira aparecia em 1,2–1,5 s. No modo de demonstração, a Loira aparece em 1,4 s. Visitando o registro de cada uma, as outras quatro aparecem no modo normal.
- `tests/atalhos-easter-eggs-browser.mjs`: o teste da tecla 6 passou a contar inclusões, não o total, porque efeitos automáticos antigos podiam sumir na mesma janela de medição. Uma falha isolada do Saci (o clique pegou uma porta abrindo) não se repetiu em 3 novas execuções.
