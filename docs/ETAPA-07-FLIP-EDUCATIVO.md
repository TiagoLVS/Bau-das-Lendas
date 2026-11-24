# Etapa 07 — Flip educativo das cartas

Implementação e testes: 21/11/2026. Revisão final: 22/11/2026. Estado: implementação concluída e aceite técnico automatizado aprovado. Homologação física permanece pendente. Esta etapa não inicia a Etapa 08.

## Auditoria e componentes reaproveitados

Foram consultadas as diretrizes, auditoria técnica, relatórios das etapas 02–06.2, inventário de ilustrações, fontes culturais e os três PDFs acadêmicos disponíveis. Nenhum documento acadêmico foi alterado. As decisões atuais de navegação, recompensa diária e preservação do catálogo prevalecem sobre descrições históricas.

O caminho ativo era `public/casa/js/card-view.js`, já utilizado por `src/IllustratedCard.tsx`, pela galeria e por componentes da casa. Sua rotação CSS 3D, arte frontal, fallback, som e controles foram reaproveitados. A galeria oferece prévias públicas sem conceder propriedade; o Álbum usa as posições conquistadas da API e mantém lacradas as outras. O livro de páginas existente permanece intacto.

Havia duas camadas adicionais: a inspeção React alternava ilustração/atributos, história completa e uma terceira face decorativa; a RA possuía rotor próprio com três faces. A inspeção agora utiliza a mesma carta compartilhada, inclusive sem imagem. A RA mantém seu rotor e fluxo de recompensa, com duas faces. Não foi criado outro motor nem instalada biblioteca de Flip.

## Dados e verso

`public/educational-card.js` centraliza a adaptação e a construção segura do verso. A ordem é nome, país/região, tradição, resumo, contexto e curiosidades. O conteúdo vem de `cultura` no catálogo oficial/API. Não há uma nova base de narrativas nem textos copiados manualmente em componentes.

São usados `pais` (ou `regiao`, ou a origem textual legada), `tradicao`, `resumoEducativo`, `contextoCultural` e `curiosidades`. `codigoPais` não produz uma nova bandeira sobre a arte. `tipoNarrativa` não é convertido em classificação inventada. Campos `revisao` não são renderizados. Informações ausentes não são inferidas.

Resumo ausente apresenta “Conteúdo educativo em preparação.”; contexto/tradição/curiosidades ausentes são omitidos. Não se utiliza `historia` como substituta. A carta do Saci continua sendo exposição fora das 60 posições, com conteúdo em preparação se não houver dados oficiais. As oito artes e as 52 posições sem imagem permanecem associadas aos mesmos IDs; estas usam o fallback identificado e continuam permitindo leitura quando conquistadas ou em prévia pública.

O enriquecimento de snapshots antigos procura o mesmo ID no catálogo. No Álbum, utiliza o catálogo sincronizado já disponível no React; na RA, a consulta pública existente `/api/legends` é usada quando a recompensa confirmada não possui cultura. Falha nessa consulta mantém a recompensa confirmada, com conteúdo pendente; nunca gera outra recompensa. O guard de versão da conta também é verificado após essa consulta, inclusive quando ela falha.

Referências, URLs e notas editoriais não são obtidas da história completa para montar as faces. A ficha pública que antes imprimia história/atributos também passou a usar o verso educativo. Os dados legados não foram apagados ou reescritos. Referências continuam exclusivamente na documentação interna, incluindo `FONTES-CULTURAIS.md`. Nomes próprios da narrativa não foram filtrados como se fossem bibliografia.

## Frente e aparência

As imagens, molduras impressas, nomes, bandeiras, cores, resoluções e associações permanecem intactos. A frente compartilhada mantém imagem original em proporção 2:3, sem sobrepor nome ou bandeira à ilustração. O verso é HTML com papel envelhecido, tons existentes, serifas e rolagem interna, sem estatísticas, raridade ou XP.

Na RA, a composição antiga que acrescentava atributos foi substituída pela arte integral da carta, sem duplicar texto impresso; o quadro da revelação agora usa 2:3. Isso altera somente a apresentação HTML da recompensa. A carta emergente, câmera, jsQR, marcadores, Three.js, GLB e animações de baú não foram substituídos.

## Interação e acessibilidade

A rotação compartilhada e o rotor RA usam transição de aproximadamente 550 ms. Na carta compartilhada, o usuário pode tocar/clicar na frente ou usar “Virar carta” / “Voltar à frente”. Na RA, usa o controle de virada existente. O botão nativo aceita Enter/Espaço, expõe aria-pressed e tem foco visível. O contêiner conserva o percurso de teclado legado; não há botão dentro de botão. As faces inativas ficam aria-hidden e inert; a região de leitura recebe foco apenas no verso ativo. Toque/rolagem no texto não aciona Flip.

`prefers-reduced-motion` remove a transição intensa. A preferência persistida `bau-das-lendas-movimento-reduzido` é respeitada também nas páginas estáticas, sem modificar autenticação ou armazenamento de cartas. Se storage não estiver disponível, a preferência do sistema continua funcionando.

A inspeção do Álbum devolve foco ao controle de origem após fechar. Na galeria foi confirmado um problema de ciclo de vida: refresh da coleção fechava o modal público, removendo o botão durante o toque. A visualização pública agora permanece aberta, enquanto propriedade e instrução são atualizadas para a sessão vigente. Não mantém uma carta privada de outro usuário: esse modal usa dados do catálogo público. A grade também preserva o foco no controle equivalente quando é reconstruída. O fechamento busca especificamente o botão AMPLIAR (`button.filtro`), distinguindo-o do novo controle de Flip; a inspeção privada do Álbum continua sendo removida na mudança de sessão.

## Integrações

- **Álbum:** a API continua decidindo as posições desbloqueadas. Só uma carta conquistada pode abrir a inspeção privada. Progresso, livro e navegação permanecem; logout/alteração de sessão limpam seleção e dados anteriores.
- **Galeria:** 60 registros públicos e Saci extra; filtros, pesquisa, ampliação e links existentes preservados. Visualização/virada não alteram progresso. As correções de contenção e fechamento da Etapa 04.1 foram mantidas.
- **RA:** o Flip só aparece depois da resposta válida de `/api/rewards/open` e da animação existente. Rede indisponível, 401 ou conflito diário não criam carta. Idempotência, uma recompensa por dia, fuso e seleção continuam no servidor. Recompensas repetidas usam o mesmo renderer, com os dados da resposta confirmada.

## Arquivos

Criados: `public/educational-card.js`, `tests/educational-card.test.mjs`, `tests/educational-browser.mjs`, `tests/educational-integration.mjs`, `tests/educational-navigation.mjs`, `backend/tests/run_educational.py` e este relatório.

Modificados: `src/Album.tsx`, `public/casa/js/card-view.js`, `public/casa/js/cartas-flip.js`, `public/casa/css/card-view.css`, `public/ra.js`, `public/ra.html`, `tests/api-ra.test.mjs`. `IllustratedCard.tsx`, o motor do livro, cliente HTTP, backend da aplicação e catálogo foram reutilizados sem reescrita.

Nos testes RA, o DOM simulado foi adaptado para replaceChildren/nós de texto e o renderer educativo real é carregado na VM. As asserções de confirmação, idempotência, erro, sessão e recompensa repetida permanecem; as expectativas de três faces foram atualizadas para duas. Nenhuma dependência adicionada.

## Testes e evidências

Os testes usam somente `bau_test`, cluster já existente e contas fictícias. Não houve schema/migration/seed em produção. O runner verifica versão e 60 entradas e encerra seus próprios serviços em finally. Os artefatos ficam na pasta ignorada `tests/artifacts/etapa07/`.

| Verificação | Resultado |
| --- | --- |
| Node completo | **52 aprovados; zero falhas**. Os 49 anteriores permanecem aprovados, inclusive assombrações |
| Python/PostgreSQL | **40 aprovados**, 39 casos SQLite desmarcados; um aviso preexistente do TestClient |
| TypeScript | Aprovado, `tsc --noEmit` |
| Vite | Build de produção aprovado; aviso preexistente de bundle grande |
| Flip Chromium / WebKit | Aprovado em **nove dimensões por motor**, sete retratos e duas paisagens: 320×568, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 568×320, 844×390 |
| Interação | Toque, mouse, Enter/Espaço, frente/verso, rolagem sem Flip, foco após refresh e fechamento, preferência de movimento reduzido |
| Segurança e dados | Catálogo real via HTTP; conteúdo dinâmico correspondente à API, ausência de interpretação HTML; carta lacrada sem conteúdo educativo; campos opcionais e snapshots antigos |
| Álbum | Abertura de carta conquistada, verso e troca A/B, com progresso real da conta B igual a zero e inspeção anterior removida, nos dois motores |
| Recompensa RA | **API real e QR sintético aprovados em Chromium e WebKit**, com verso ligado ao resumo oficial da carta recebida, estado do botão e proporção 2:3 verificados |
| Regressão funcional | **14/14 grupos aprovados**, sete por motor: recompensa/histórico/contador/álbum, galeria e rotação, GLB/animações, cancelamento e restauração/fallback/falha ativa do catálogo |
| Autenticação/sessões | Cadastro, login/logout, revogação, reload, sincronização, troca A/B e descarte de resposta atrasada aprovados nos dois motores na primeira rodada |
| Navegação principal | **Aprovada em Chromium/WebKit**: três destinos, Perfil independente, Explorar/QR, Álbum → galeria → Início |

A conferência de [integridade](../tests/artifacts/etapa07/integrity.json) comprovou 98 arquivos da aplicação idênticos ao snapshot inicial; somente os seis arquivos de interface previstos diferem, além do novo módulo educativo. Arte, catálogo, manifestos, backend, cliente HTTP, GLB e animações permaneceram idênticos. O [percurso de navegação](../tests/artifacts/etapa07/navigation.json) passou nos dois motores e seus [serviços foram encerrados](../tests/artifacts/etapa07/navigation-run.log). A primeira tentativa desse teste consultava links enquanto o menu móvel ainda estava fechado; foi corrigido para abrir o menu antes de ler seus links acessíveis, mantendo as verificações.

A última rodada completa dos testes de Flip/integração/regressão terminou com exit 0 em todos os scripts, seguida do encerramento dos serviços. As tentativas anteriores reprovadas estão preservadas nos logs; não foram convertidas em aprovações. O teste específico do texto longo usa 320×568, confirma rolagem interna e mantém tipografia legível. As referências de país e tradição são as do catálogo; os testes não fabricam dados culturais para preencher a produção.

Evidências: [Node](../tests/artifacts/etapa07/node.log), [Python](../tests/artifacts/etapa07/python.log), [build](../tests/artifacts/etapa07/build.log), [matriz do Flip](../tests/artifacts/etapa07/browser.json), [integração Álbum/RA](../tests/artifacts/etapa07/integration.json), [rodada de aceite](../tests/artifacts/etapa07/reviewed-run.log), [autenticação](../tests/artifacts/etapa07/run.log). As dimensões são viewports com toque da automação; não são certificação dos aparelhos correspondentes.

| Motor | Frente | Verso | Texto longo | Álbum | Recompensa |
| --- | --- | --- | --- | --- | --- |
| Chromium | [PNG](../tests/artifacts/etapa07/Chromium-front.png) | [PNG](../tests/artifacts/etapa07/Chromium-back.png) | [PNG](../tests/artifacts/etapa07/Chromium-long.png) | [PNG](../tests/artifacts/etapa07/Chromium-album.png) | [PNG](../tests/artifacts/etapa07/Chromium-reward.png) |
| WebKit | [PNG](../tests/artifacts/etapa07/WebKit-front.png) | [PNG](../tests/artifacts/etapa07/WebKit-back.png) | [PNG](../tests/artifacts/etapa07/WebKit-long.png) | [PNG](../tests/artifacts/etapa07/WebKit-album.png) | [PNG](../tests/artifacts/etapa07/WebKit-reward.png) |


Foram mantidos nos logs os problemas de teste anteriores: fixture recusada por nome incompatível, seletor de fechamento incorreto e timeouts intermitentes durante ensaios concorrentes. A inspeção do DOM distinguiu isso do fechamento real do modal por refresh, corrigido no código. Não se utilizou force:true nem aumento de timeout para obter aprovação. As capturas de verso aguardam o término da transição; uma captura inicial durante o movimento não foi tratada como evidência de verso estável.

## Pendências e limites

Persistem as pendências culturais da Etapa 05: três resumos provisórios/ausentes, 52 contextos sem preparação e pesquisa editorial parcial; as duas curiosidades preparadas são exibidas apenas onde existem. Faltam 52 ilustrações oficiais. Não foram inventados conteúdo, personagens, nacionalidades ou imagens.

Os cenários de recompensa repetida/60 posições completas e erros são verificados pela VM Node e pelas regras reais Python/PostgreSQL. Não se afirma que toda combinação de carta/conta foi percorrida por QR em navegador. QR sintético não equivale a câmera física; smartphones/Safari/Android reais, safe areas, teclado virtual e desempenho de GPU ainda exigem homologação física. O catálogo tem 60 posições; somente os oito arquivos de arte oficiais e Saci extra possuem a apresentação artística existente.

**Aceite final:** requisitos essenciais da implementação comprovados nos testes automatizados descritos. Não há reprovação remanescente na última verificação de cada cenário. Isso não certifica aparelhos físicos, leitores de tela reais nem revisão cultural integral das 60 narrativas. Todos os serviços próprios foram encerrados.

A próxima ação recomendada é homologação física e revisão cultural/fornecimento de artes, sem iniciar automaticamente outra etapa. Nenhum Blender MCP, publicação, operação Git de escrita, branch, commit ou envio ao GitHub foi utilizado. A Etapa 08 não foi iniciada.
