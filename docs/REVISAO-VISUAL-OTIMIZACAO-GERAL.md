# Revisão visual e otimização geral — rodada 1

Data: 23/11/2026. Esta é uma **primeira rodada incremental**, não a revisão completa planejada. Aqui está registrado o que foi implementado e medido, e o que ficou pendente.

## 1. Objetivo
Elevar a qualidade visual e técnica preservando funcionalidades, identidade (ukiyo-e, washi, seigaiha, horror psicológico) e regras de negócio. Quizzes continuam fora do escopo (ver `DECISAO-ESCOPO-SEM-QUIZZES.md`). Nenhum foi criado.

## 2. Estado inicial (linha de base executada nesta tarefa)
- Testes Node: 82/82 aprovados.
- Backend pytest: 53 aprovados e 51 ignorados (os casos PostgreSQL exigem `TEST_DATABASE_URL`; não executados).
- Build: entrada principal `index-*.js` com **922,90 kB / 256,54 kB gzip** (`tests/artifacts/revisao-visual/antes/build.txt`).
- Dist de referência: `tests/artifacts/revisao-visual/dist-antes`, com hashes idênticos ao build da linha de base.
- Causa do bundle grande: `src/App.tsx` importava `World3D` estaticamente, levando todo o Three.js ao carregamento inicial, mesmo sendo apenas o fundo do Início.

## 3. Verificação do Blender
- Blender 5.3.0 com addon MCP 2.0 (protocolo 16, atualizado). A cena aberta era a padrão (Cube/Light/Camera), não um modelo oficial.
- Bibliotecas externas e geradores 3D: **todos desligados e não usados**.
- O trabalho foi feito numa cena separada, `Arandela`. A cena padrão do usuário não foi alterada. O `.blend` foi salvo como cópia (`save_as_mainfile(copy=True)`).

## 4. Direção artística adotada
"A casa iluminada por quem ainda está nela": fontes de luz visíveis e quentes (velas), contra o frio do luar e da bruma. A luz deixa de ser abstrata e passa a ter origem, o que sugere presença sem mostrar ninguém. Nada de gore, flashes ou jumpscares novos.

## 5. Problemas visuais identificados
1. Início: o vestíbulo 3D tinha iluminação sem fonte aparente; as paredes eram planas e escuras.
2. Casa, jardim: céu chapado e metade esquerda vazia, sem profundidade atmosférica.
3. Casa em retrato (390×844): título e links sobre o traço da casa, com leitura prejudicada. **Já existia antes desta rodada.**
4. Casa em paisagem baixa (844×390, 568×320): o bloco centralizado transbordava; ações ficavam sob o rodapé, em contêiner `overflow:hidden`, inalcançáveis por toque. **Já existia antes desta rodada.**

## 6. Problemas técnicos identificados
- Three.js no bundle inicial (item 2).
- A cena `World3D` do Início só é vista a partir do vestíbulo. Rolar leva direto a `/casa`, então detalhes profundos do corredor `World3D` quase não aparecem.
- O defeito de profundidade CSS 3D no WebKit Linux (Etapa 11.1) segue existindo. Esta rodada **não** o corrigiu.

## 7. Início
- `World3D` agora é carregado com `lazy()`. Enquanto carrega, aparece um fundo em gradientes ("limiar respirando", que respeita movimento reduzido).
- Duas arandelas originais (Blender) ladeiam o portal na altura do subtítulo, sem cobrir o título. Têm chama emissiva com tremor procedural (desligado em movimento reduzido), halo aditivo e, apenas fora de mobile/toque, uma `PointLight` quente cada.

## 8. Casa virtual
- `#luar`: lavagem fria de luar vinda do lado da lua, com tom próprio na lua cheia e oculta dentro do corredor.
- `#bruma`: neblina rasteira estática, com opacidade reduzida dentro do corredor.
- As duas camadas são fixas e **fora de `#palco`**: não entram na composição CSS 3D e, portanto, não agravam o defeito do WebKit.
- A bruma começou animada. A medição mostrou queda de cerca de 35% dos quadros no WebKit Linux, e a animação foi **removida**. A camada ficou estática (ver §17).
- Véu vertical do limiar em retrato (≤760 px) e regras de paisagem baixa: o texto começa abaixo do topo, o título fica menor, o sobretítulo some e o bloco rola entre topo e rodapé.

## 9. Assombrações
Nenhuma alteração. Gatilhos, eventos e relações com as lendas foram preservados. A `PointLight` de cada segmento continua respondendo ao evento `lampada`.

## 10–13. Álbum, galeria, Perfil, RA
**Não alterados nesta rodada.** Ilustrações, proporção 2:3, IDs, progresso, Flip, jsQR, rastreador e recompensas estão intactos.

## 14–15. Recursos 3D / modelos Blender
| Arquivo | Conteúdo | Tamanho |
|---|---|---|
| `assets/blender/arandela-corredor.blend` | Fonte: placa oval, braço em voluta, pires, vela, chama e chaminé de vidro | 125 kB |
| `public/models/arandela-corredor.glb` | Exportação sem Draco e sem texturas, 7 malhas e 5 materiais PBR | 37,7 kB |

- 1.404 triângulos. O pivô fica no ponto de contato com a parede e a peça projeta-se para +Z (glTF).
- A malha `Chama` tem nome próprio para ser animada no navegador.
- Materiais: ferro, bronze envelhecido, cera, chama emissiva e vidro (alpha 0,18).
- Descarte: geometrias e materiais entram em `guardar()` e são liberados no unmount. O carregamento é cancelado se o componente desmontar antes.
- Se o GLB falhar, o portal permanece como antes.
- **GLB oficial do baú: inalterado** (`bau-das-lendas.glb`, 358.744 bytes, 18/11).

## 16. Otimizações realizadas
| Item | Antes | Depois |
|---|---|---|
| JS da entrada principal | 922,90 kB / 256,54 kB gz | **358,40 kB / 106,55 kB gz (−58% gz)** |
| Chunk `World3D` (diferido) | — | 635,26 kB / 169,49 kB gz (inclui GLTFLoader, +18,9 kB gz) |
| JS total transferido no Início | 901,3 kB | 970,4 kB (+69 kB: GLTFLoader, arandela e divisão em chunks) |

O ganho está no **JS que bloqueia a primeira pintura**. O total transferido subiu um pouco, e isso fica registrado aqui, não omitido.

## 17. Desempenho antes/depois
Condições: headless, 1366×768, 3 amostras, `tests/revisao-visual-browser.mjs`, API respondida localmente com 401 (visitante). Chromium usa SwiftShader (GL por software). Estes números **não representam smartphones físicos**.

| Métrica | Chromium antes | Chromium depois | WebKit antes | WebKit depois |
|---|---|---|---|---|
| Início: UI visível (ms) | 2913 / 1004 / 838 | 453 / 579 / 395 | 215 / 217 / 212 | 167 / 171 / 169 |
| Início: DCL (ms) | 303 / 537 / 357 | 386 / 525 / 352 | 89 / 91 / 90 | 70 / 71 / 70 |
| Início: canvas 3D presente (ms) | 2956 / 2892 / 867 | 776 / 920 / 761 | 231 / 232 / 227 | 713 / 643 / 640 (diferido de propósito) |
| Início: quadros/s estimados | 10,2 / 9,9 / 1,9 | 9,8 / 9,0 / 8,4 | 16,3 / 17,1 / 15,0 | 20,7 / 11,3 / 20,3 |
| Casa: DOM total | 3099 / 3099 / 3042 | 3084 / 3103 / 3122 | 3175 / 3156 / 3099 | 3160 / 3103 / 3160 |
| Casa: quadros/s estimados | 7,2 / 2,6 / 2,6 | 2,6 / 2,3 / 8,4 | 15,8 / 15,0 / 14,6 | 13,7 / 12,9 / 12,8 |
| Casa: P95 do intervalo (ms) | 1116 / 1700 / 2167 | 2500 / 1400 / 417 | 92 / 127 / 124 | 197 / 203 / 105 |

Leitura:
- O tempo até a UI visível caiu nos dois motores.
- Na casa, o Chromium headless/SwiftShader tem dispersão grande demais para conclusões.
- No WebKit, a casa segue cerca de 1,5–2 quadros/s abaixo. O experimento de isolamento mostrou alta variabilidade: só a bruma oculta deu 15 / 13,7 / 13,8; ambas as camadas ocultas, 12,6 / 16,5 / 14,2. A diferença residual está dentro do ruído, mas **não é declarada como nula**. Remover `#bruma` é a reversão óbvia, caso a avaliação física confirme custo.
- As métricas de heap, layout e recálculo de estilos via CDP **não foram coletadas nesta rodada**. A Etapa 11.1 já as registrou e continua sendo a referência.

## 18. Comparações visuais
Em `tests/artifacts/revisao-visual/`:
- `antes/` e `depois/`: Início e portão da casa em 1366×768, 390×844 e 844×390 (Chromium e WebKit).
- `cmp-antes/` e `cmp-depois/`: portão com 7 s de estabilização. Capturas de 2,5 s pegam a casa ainda sendo desenhada.
- `depois-inicio-v2…v5`: iterações das arandelas.
- `antes/paisagem-*` e `depois/paisagem-*`: limiar em paisagem baixa e retrato.

As capturas são automatizadas e **não constituem aprovação artística**.

## 19. Arquivos criados
- `assets/blender/arandela-corredor.blend`
- `public/models/arandela-corredor.glb`
- `tests/revisao-visual-browser.mjs`
- `tests/revisao-visual-inicio.mjs`
- `tests/revisao-visual-corredor.mjs`
- `tests/revisao-visual-paisagem.mjs`
- `tests/artifacts/revisao-visual/**` (evidências, `dist-antes`, `backup-src` com as versões anteriores dos arquivos editados)
- Este documento

## 20. Arquivos modificados
`src/App.tsx`, `src/style.css`, `src/experience/World3D.tsx`, `public/casa/index.html` e `public/casa/css/estilo.css`. Os dois últimos já tinham alterações locais não commitadas, que foram preservadas; as edições foram apenas acréscimos.

## 21. Resultados dos testes
| Teste | Estado |
|---|---|
| Node `tests/*.test.mjs` (82) | APROVADO, antes e depois |
| Build `tsc && vite build` | APROVADO |
| Backend pytest SQLite (53) | APROVADO |
| Backend pytest PostgreSQL (51) | NÃO EXECUTADO (sem `TEST_DATABASE_URL`; nenhum banco foi tocado) |
| Captura/métricas Chromium e WebKit (revisao-visual-browser) | APROVADO, sem erros de página |
| Alcance das ações do limiar (revisao-visual-paisagem), 4 viewports × 2 motores | APROVADO, **mas o teste não discrimina**: `scrollIntoView` rola contêineres `overflow:hidden`, então ele também passou no build antigo. A correção foi validada pelas capturas. |
| Suítes de integração existentes (`*-browser.mjs` com backend em :5175 / `bau_test`) | NÃO EXECUTADO: backend de teste não estava ativo |
| Firefox | NÃO EXECUTADO: navegador não instalado no runtime local |

## 22. Problemas ainda conhecidos
1. Profundidade CSS 3D incorreta no WebKit Linux (Etapa 11.1): **não resolvida**.
2. Desempenho baixo do corredor da casa no WebKit Linux: **não resolvido**.
3. Bloqueio do percurso de recompensa com câmera simulada no WebKit: não reavaliado.
4. Em 568×320, as ações do limiar exigem rolar o bloco de texto.
5. A diferença de quadros/s na casa (WebKit) após `#luar`/`#bruma` é inconclusiva (§17).

## 23. Limitações de testes físicos
Nenhum aparelho físico foi testado. Nada aqui comprova desempenho em Android ou iPhone. O comportamento do Safari físico não foi verificado.

## 24. Melhorias futuras recomendadas
1. **Álbum, galeria, RA e Perfil**: não tocados; próximos candidatos.
2. Casa: substituir decorações provisórias por peças Blender (espelho, porta). Como a casa é CSS 3D, isso exigiria sprites pré-renderizados no Blender (PNG/WebP), não GLB. Isso é viável e não depende de migrar o renderer.
3. Coletar métricas CDP (heap, layout, recálculo de estilos) com o mesmo harness.
4. Migração da casa para Three.js: **não proposta** sem comparação técnica e artística; continua dependendo de aprovação.
5. Baú: nenhuma remodelagem proposta nesta rodada.

## 25. Estado final da revisão
Rodada 1 **parcial**. O que foi entregue está implementado e validado: o carregamento diferido do Three.js, a arandela original do Blender integrada ao Início, o luar e a bruma na casa, e as correções de leitura em retrato e paisagem baixa. Os itens 10–13 e as pendências do WebKit seguem abertos. Aprovação artística depende do responsável. Nenhuma operação Git de escrita foi executada.

---

# Rodada 2 — Continuação da reformulação visual e otimização

Data: 24/11/2026. A rodada 1 acima foi preservada sem edição. As correções a ela estão registradas na errata (§R2.0).

## R2.0 Errata da rodada 1
A rodada 1 (§5.4 e §8) afirmou que, em paisagem baixa, as ações do limiar ficavam "em contêiner `overflow:hidden`, inalcançáveis por toque". **Isso estava errado.**

O build anterior à rodada 1 já tinha `#limiar-texto { overflow-y:auto }` sob `@media (max-width:900px), (max-height:600px)`. O novo teste de gestos reais (§R2.12) mostrou que um arrasto de toque rola esse bloco e alcança as três ações.

O defeito real era menor:
- nenhuma ação aparecia sem rolar;
- o rodapé cobria parte do texto.

A correção da rodada 1 reduziu os gestos necessários; não desbloqueou um controle inacessível.

## R2.1 Estado inicial
- Base: build final da rodada 1, preservado em `tests/artifacts/revisao-visual/r2/dist-antes`.
- Testes Node: 82/82. Backend SQLite: 53 aprovados. Entrada JS: 358,40 kB / 106,55 kB gz.
- Capturas "antes": `r2/antes/`. Foram feitas com a API simulada **somente no navegador de teste** (`tests/revisao-visual-superficies.mjs` e `tests/revisao-visual-ra.mjs`): usuário fictício, 11 cartas desbloqueadas.

## R2.2 Álbum
Problemas encontrados nas capturas:
1. Na folha aberta, a linha de progresso ("11/60 — REGISTROS DESCOBERTOS") ficava sobre o cabeçalho da página esquerda.
2. O link "Galeria pública" ficava desalinhado da coluna do título (x=30 contra x=183).
3. O livro fechado ficava descentralizado: a capa ocupava só a metade direita do espaço do livro aberto.
4. Os textos secundários tinham contraste baixo (`#4b565d` sobre `#08090a`).
5. No verso educativo, o nome da lenda ficava quase invisível. `.inspecao-face h3` (cor clara do painel escuro) atingia o `<h3>` do verso, que é papel claro.

Implementado:
- O link da galeria foi para a mesma faixa do progresso (`.grimorio-faixa`): contador à esquerda, link à direita. Isso eliminou a sobreposição sem reduzir o livro.
- A primeira tentativa reduzia a altura disponível do livro (`100dvh − 320px`). Ela causou um laço de redimensionamento entre o `minWidth` do flipbook e o `ResizeObserver` da mesa. A captura nunca estabilizava (reproduzível 3/3, ausente 3/3 no build anterior). Foi **revertida** e trocada pela solução acima. A investigação está registrada aqui porque, num aparelho, isso seria um relayout contínuo.
- Na capa e na contracapa, o livro desloca-se ±25% e fica centrado. Os botões de folha compensam o deslocamento. Transição de 0,7 s, desligada em movimento reduzido.
- O contraste do sobretítulo e da indicação passou para `#7a858b` / `#848d92`.
- O título do verso passou para `#2a1f19`, em Cormorant.

Preservado: flipbook, posições, IDs, cartas seladas e reveladas, progresso, inspeção, Flip e conteúdo cultural.

## R2.3 Galeria (`public/casa/cartas.html`)
Medido: as molduras das cartas tinham praticamente a mesma largura (244–250 px). A diferença vinha de:
- rótulos longos ("AMPLIAR A Maldição de Kayako Saeki") que alargavam a coluna (284 px);
- a linha de metadados, que quebrava em uma ou duas linhas e deixava os botões desalinhados.

Algumas ilustrações oficiais não são exatamente 2:3 e aparecem com margem por `object-fit: contain`. **Arte não alterada.**

Implementado:
- cada registro tem a largura exata da carta;
- rótulos quebram linha; botões ocupam a largura toda;
- metadados sempre empilhados;
- realce dourado discreto no hover e no foco.

**WebKit — correção de verso espelhado.** No WebKit Linux, todas as cartas da galeria apareciam **pelo verso, espelhado**, antes de qualquer interação. Isso já acontecia no build anterior. Causa: o `backface-visibility: hidden` não era respeitado.

Hipótese nova e verificável: esconder a face oposta por `visibility`, a partir do `data-face` já existente, trocando na metade do giro (0,27 s, quando a carta está de perfil). Resultado: frente correta e verso legível no WebKit. O componente `card-view` é compartilhado, então a correção vale também para Álbum, dossiês e RA. Não se afirma que o Safari físico tinha o defeito.

## R2.4 Perfil
- O painel passou a ter fundo totalmente opaco. Antes, 3% do título do Início vazava por trás (medido nos pixels: 14–17 contra 9 de fundo).
- A recompensa diária virou um bloco destacado, logo após a saudação. Mesmo componente e mesma lógica.
- Os quatro atalhos, que usavam três estilos diferentes de link, viraram uma lista uniforme com seta, hover e foco visível. "Sair da conta" ficou separado.
- O histórico ganhou um marcador ▸ que gira ao abrir. O `display:flex` do `summary` tinha removido o marcador nativo.
- Formulário: campos com caixa visível; "Entrar" / "Criar conta" como botão primário preenchido.
- Textos testados ("Abrir meu grimório", "Sair da conta", "Criar uma conta") preservados. Autenticação, sessão, histórico e contador não foram alterados.

## R2.5 Explorar
Recebeu apenas o fundo opaco do painel (§R2.4). Os QR Codes e o texto não foram alterados.

## R2.6 Realidade aumentada
- **Antes da câmera:** havia um vazio de cerca de 500 px. Entrou uma guia de enquadramento: cantos de mira em torno de "QR 02" e três passos numerados. Em paisagem baixa aparece só a mira. A guia some quando a câmera está ativa.
- **Erros de câmera** (permissão negada, ausente, ocupada, interrompida) agora aparecem como alerta, com filete e fundo vermelhos. Antes eram idênticos ao status normal.
- Mudança no JS: só `marcarCamera('ativa'|'erro')`, chamado nos três pontos onde o estado da câmera já mudava. É inerte quando não há `document.body`. A primeira versão acessava `document.body` diretamente e quebrou 14 testes unitários, que usam um documento simulado. Foi corrigida antes de seguir.
- jsQR, rastreador, QR Codes, idempotência, recompensa e confirmação pela API: **inalterados**. Nenhuma imagem da câmera é enviada.

## R2.7 Baú
**Não alterado.** O GLB oficial continua igual (358.744 bytes). Nesta rodada não houve proposta de remodelagem.

## R2.8 Casa
Nesta rodada, a única mudança na casa foi a correção do verso espelhado nos dossiês (§R2.3). Os sprites do Blender pré-renderizados para a casa continuam como recomendação (§R2.23).

## R2.9 Novos recursos Blender
**Nenhum.** A arandela da rodada 1 (`assets/blender/arandela-corredor.blend`, `public/models/arandela-corredor.glb`) foi preservada.

## R2.10 Otimizações
- Não houve mudança de bundle nesta rodada; a entrada continua em 358,50 kB / 106,60 kB gz (+0,05 kB gz). O chunk do Álbum passou de 26,75 para 26,78 kB gz. O CSS do Álbum passou de 4,36 para 4,87 kB gz, e o CSS de entrada de 6,39 para 6,89 kB gz.
- Desempenho: foi evitado o laço de redimensionamento do flipbook (§R2.2).
- O fundo do painel ficou opaco, sem `backdrop-filter`.

## R2.11 Métricas antes/depois
| Item | Antes (R1 final) | Depois (R2) |
|---|---|---|
| JS de entrada | 358,40 kB / 106,55 kB gz | 358,50 kB / 106,60 kB gz |
| Chunk Álbum JS | 91,55 kB / 26,75 kB gz | 91,66 kB / 26,78 kB gz |
| Chunk World3D | 635,27 kB / 169,49 kB gz | 635,26 kB / 169,49 kB gz |
| Gestos para alcançar as 3 ações do limiar (6 viewports × 2 motores) | 25 | 17 |
| Captura do verso do Álbum, 1366×768 | concluída | concluída (a 1ª tentativa de correção travava; revertida) |

Nesta rodada não houve nova medição de quadros por segundo. As mudanças não tocam os laços de renderização da casa nem do Início.

## R2.12 Testes de responsividade
`tests/revisao-visual-paisagem.mjs` foi reescrito:
- **Sem `scrollIntoView` e sem cliques forçados.**
- **Gestos:** arrasto real de toque no Chromium (`Input.dispatchTouchEvent`); roda do mouse no WebKit e no desktop. O Playwright WebKit não simula arrasto de toque.
- **Alcance:** o controle precisa estar inteiro na viewport e ser o elemento sob o ponto central (`elementFromPoint`). O limiar precisa continuar exibido: a roda faz atravessar o jardim, o que antes gerava falso aprovado no WebKit.
- **Efeito:** precisa surgir depois do clique (`body.dentro`, `body.abrindo` ou navegação para `/ra.html`).
- **Container:** é registrado qual elemento rolou.
- `Input.synthesizeScrollGesture` foi descartado: não rola nem um contêiner simples de controle neste Chromium headless.
- Viewports: 390×844, 360×800, 320×568, 844×390, 568×320, 1366×768.

Resultados:

| Build | Aprovados | Gestos totais |
|---|---|---|
| Anterior à rodada 1 | 36/36 | 25 |
| Atual | 36/36 | 17 |

O rolamento ocorreu sempre em `#limiar-texto`; o documento ficou em `scrollY` 0. Relatórios em `r2/paisagem/*-report.json`.

## R2.13 Testes de integração
| Teste | Estado |
|---|---|
| Node `tests/*.test.mjs` (82) | APROVADO |
| Build `tsc && vite build` | APROVADO |
| Backend pytest SQLite (53) | APROVADO |
| Superfícies com API simulada no navegador (12 combinações) | APROVADO, sem erros de página |
| RA, início e câmera negada (6 combinações) | APROVADO, sem erros de página |
| Gestos reais no limiar (36) | APROVADO |
| Suítes `*-browser.mjs` com backend em :5175 / `bau_test` | **BLOQUEADO** (§R2.14) |
| Recompensa com câmera simulada no WebKit (pendência da Etapa 11.1) | **BLOQUEADO** (depende do backend) |
| Firefox | **NÃO EXECUTADO** (navegador ausente no runtime local) |

## R2.14 PostgreSQL
**BLOQUEADO.**
- O cluster temporário da Etapa 02 (`/tmp/bau-etapa02-pg-path`) não existe mais (`/tmp` foi limpo).
- O daemon Docker não está ativo, então `backend/compose.test.yaml` não pôde subir.
- O PostgreSQL de sistema em :5432 **não foi usado**, por não ser a infraestrutura de testes.
- Nenhum cluster ou banco novo foi criado, por instrução. Nenhuma configuração sensível foi alterada.

Para desbloquear, um dos dois:
1. iniciar o Docker e rodar `docker compose --env-file backend/.env.test -f backend/compose.test.yaml up -d`, seguido de `migrate` e `seed` (ver `ETAPA-02-BACKEND-POSTGRESQL.md`);
2. autorizar a recriação do cluster temporário.

Os 51 testes PostgreSQL continuam **não executados**.

## R2.15 Chromium
Chromium 156.0.8078.4, headless. Todas as capturas e todos os testes acima foram aprovados.

## R2.16 WebKit
WebKit 27.2, headless, Linux.
- Verso espelhado corrigido (§R2.3).
- Profundidade CSS 3D do corredor e desempenho da casa: **continuam pendentes** (Etapa 11.1).

## R2.17 Firefox
Não executado.

## R2.18 Screenshots
- `tests/artifacts/revisao-visual/r2/antes/` e `r2/depois/`: Álbum (capa, folha, inspeção frente e verso), Perfil (logado e visitante), Explorar, Galeria (topo, grade, carta virada) e RA (início, câmera negada), em 1366×768, 390×844 e 844×390, Chromium e WebKit.
- Iterações intermediárias em `r2/v1…v3`. Limiar por gestos em `r2/paisagem/`.

As capturas não constituem aprovação artística.

## R2.19 Arquivos criados
- `tests/revisao-visual-superficies.mjs`
- `tests/revisao-visual-ra.mjs`
- `tests/artifacts/revisao-visual/r2/**`, incluindo `backup-src/` com as versões anteriores dos arquivos editados

## R2.20 Arquivos modificados
- `src/Album.tsx`, `src/album.css`
- `src/Conta.tsx`, `src/style.css`
- `public/casa/css/card-view.css`, `public/casa/css/cartas.css`
- `public/ra.html`, `public/ra.js`
- `tests/revisao-visual-paisagem.mjs` (reescrito)
- Este documento (seção acrescentada)

## R2.21 Problemas conhecidos
1. Profundidade CSS 3D e desempenho do corredor no WebKit Linux (Etapa 11.1): **não resolvidos**.
2. PostgreSQL, suítes com backend e recompensa no WebKit: **bloqueados** (§R2.14).
3. Firefox: não testado.
4. Algumas ilustrações oficiais não são exatamente 2:3 e aparecem com margem na moldura. Depende de nova exportação da arte, que **não** foi feita.
5. A diferença de quadros/s na casa (WebKit) após `#luar`/`#bruma` (rodada 1) continua inconclusiva.

## R2.22 Limitações de testes físicos
Nenhum aparelho físico foi testado. O arrasto de toque é simulado via CDP; ele não substitui iOS Safari nem Android reais.

## R2.23 Melhorias recomendadas
1. Rodar as suítes com backend após desbloquear o PostgreSQL de testes.
2. Casa: pré-renderizar no Blender (PNG/WebP) peças como espelho, porta e castiçal para o CSS 3D, sem novo renderer.
3. Baú na RA: estudar materiais numa cópia do GLB, com comparação lado a lado, antes de qualquer proposta.
4. Instalar o Firefox no runtime local do Playwright, com autorização.
5. Avaliação artística humana das capturas e, sobretudo, em aparelho.

## R2.24 Estado final da rodada
Rodada 2 **parcial**:
- **Implementado e validado:** Álbum, Galeria (incluindo a correção do verso no WebKit), Perfil, Explorar, RA, teste de gestos reais e errata da rodada 1.
- **Não feito nesta rodada:** casa, Blender e baú.
- **Bloqueado:** PostgreSQL e integração.

Nenhuma operação Git de escrita foi executada. Aprovação artística depende do responsável.
