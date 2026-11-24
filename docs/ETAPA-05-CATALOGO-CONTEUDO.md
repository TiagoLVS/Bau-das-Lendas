# Etapa 05 — Catálogo e conteúdo cultural

Data: 20/11/2026, America/Sao_Paulo. Implementação de dados, sem novo Flip, publicação ou escrita no Git. Consultados os relatórios 02/03/04/04.1, auditoria, compatibilidade, diretrizes e os três PDFs acadêmicos. PDFs e decisões anteriores foram preservados; jsQR e as 60 posições atuais prevalecem sobre menções antigas a MindAR/dez demonstrações.

## 1. Estado anterior

Fonte oficial `public/lendas-ra.json`; `src/data/lendas.ts` é derivado pelo sincronizador. Oito JPG oficiais e Saci em exposição, sem conquista. Havia 59 categorias vazias, quatro subtítulos vazios, 52 imagens ausentes e três histórias provisórias idênticas. Os 60 IDs/números/nomes/origens/histórias/imagens anteriores foram preservados sem alteração.

## 2. Quantidade de lendas

60 posições, 60 IDs únicos, 60 nomes únicos. Saci permanece extra sem posição/sorteio; nenhuma personagem foi adicionada para completar ilustrações.

## 3. Estrutura e caminhos confirmados

`public/card-art.js` mantém associações explícitas e alias Kayako; `public/legend-images.js` e `public/lendas/manifest.json` são manifestos de imagem, não outro catálogo cultural. O arquivo clássico `public/casa/js/lendas.js` possui 60 entradas decorativas, apenas nove com ID canônico/alias correspondente; o código ativo substitui os dados narrativos por `houseCatalog` usando a fonte oficial, conservando decoração. Nenhum desses adaptadores foi reescrito.

Backend: `backend/app/models/__init__.py` já possui Legend.attributes JSON; schemas estão em `backend/app/schemas/__init__.py` (não existe schemas/game.py); seed em services/catalog.py; endpoints em routers/game.py. Não foi criado catálogo paralelo.

## 4. Alterações realizadas

Adicionado objeto opcional `cultura` à fonte oficial e ao tipo gerado. Endpoint existente `/api/legends` documentado/validado por LegendOut, permitindo os atributos antigos. Seed valida os campos culturais antes de escrever e preenche defaults quando um objeto cultural parcial é importado. Não foi criado endpoint redundante.

## 5. Arquivos criados

- `scripts/auditar-catalogo.py`: inventário somente leitura das imagens, gerando documentação.
- `tests/cultural-catalog.test.mjs`, `tests/cultural-browser.mjs`.
- `backend/tests/test_cultural_catalog.py`, `backend/tests/run_cultural_catalog.py`.
- Este relatório, `FONTES-CULTURAIS.md` e `INVENTARIO-ILUSTRACOES.md`.
- Evidências/manifestos temporários em `tests/artifacts/etapa05/`, ignorados pelo Git.

## 6. Arquivos modificados

`public/lendas-ra.json`, `src/data/lendas.ts`, `scripts/sincronizar-catalogo.mjs`, `backend/app/schemas/__init__.py`, `backend/app/services/catalog.py`, `backend/app/routers/game.py`. Alterações anteriores em outros arquivos foram preservadas, não atribuídas a esta etapa. Nenhum componente visual, CSS, imagem ou arquivo de migração foi modificado.

## 7. Campos educativos

`cultura.pais`, `codigoPais`, `regiao`, `tradicao`, `tipoNarrativa`, `resumoEducativo`, `contextoCultural`, `curiosidades`, `revisao.estado` e `revisao.resumo`. Identificação, nome, história e imagem reutilizam os campos antigos, sem duplicação de fonte. `regiao` conserva o primeiro segmento da origem existente, não uma geografia normalizada. País/código são derivados dos rótulos explícitos; regiões ambíguas e origens multinacionais exigem revisão antes de escolher bandeira. Campos nulos/lista vazia significam pendência, não informação inventada.

`revisao.estado` é parcial nas oito ilustradas e pendente nas demais; não existe certificação automática de revisão concluída. Classificações são propostas editoriais, não atribuições étnicas definitivas. Curiosidades/contextos adicionais são texto simples; URLs/fontes não foram adicionadas ao payload cultural.

## 8. Resumos preparados

57 resumos: dez adaptações editoriais (oito ilustradas, The Crying Boy e María de Ávila) e 47 extrativos do material existente. Comprimento observado: 38–108 palavras, sem alongar histórias curtas artificialmente. As posições 58–60 permanecem sem resumo porque contêm apenas placeholders. Resumos extrativos podem coincidir com histórias já breves; não se afirma pesquisa externa para essas entradas. O resumo é adicional, nunca substitui `historia`.

## 9. Contextos revisados

Oito contextos iniciais, com distinção entre lenda escolar, ficção cinematográfica, tradição ligada a templo, lenda de lugar e circulação digital. Pesquisa documental parcial em instituições de turismo/cultura, museu e distribuidora; não sustenta todos os pormenores/datas dos textos antigos. A fonte turística de Kuldhara não prova a causa histórica do abandono. Os outros 52 contextos permanecem nulos em vez de generalizações artificiais.

## 10. Curiosidades

Duas informações adicionais verificadas: cerimônia de Dōjōji relacionada à narrativa (Governo de Wakayama) e fonte termal no entorno da Sesshō-seki (Japan Tourism Agency). Não foram produzidas três curiosidades por lenda artificialmente. Listas vazias devem ser omitidas pelo futuro renderer. Referências e limites estão em [FONTES-CULTURAIS.md](FONTES-CULTURAIS.md).

## 11. Revisão das 60 entradas

Tabela de pendências, não lista de correções históricas executadas. Nenhuma origem/nome foi alterado por memória ou hipótese.

| Nº | Lenda / ID | Tipo proposto | Revisão necessária |
| --- | --- | --- | --- |
| 1 | Loira do Banheiro (`loira-do-banheiro`) | lenda_urbana | Biografia/datas/incêndio sem conferência integral; texto termina com menção incompleta a reportagem. |
| 2 | A Maldição de Kayako Saeki (`a-maldicao-de-kayako-saeki`) | ficcao_cinematografica | Ficção de Ju-On/O Grito, não folclore tradicional; frase final com lacuna editorial e versões diferentes dos filmes. |
| 3 | Kiyohime (`kiyohime`) | folclore_tradicional | Comparar variantes do templo e das artes; não uniformizar detalhes. |
| 4 | Tamamo-no-Mae (`tamamo-no-mae`) | folclore_tradicional | Distinguir narrativa da raposa, lugar real e atividade termal; grafias na arte incluem Sesshō-seki. |
| 5 | Kisaragi Station (`kisaragi-station`) | folclore_digital | Postagem inicial/data exata pendentes; narrativa digital, não relato comprovado. |
| 6 | Hachishakusama (`hachishakusama`) | folclore_digital | Data de 2008 e postagem original pendentes; narrativa digital, não tradição antiga atestada. |
| 7 | Meng Jiangnü (`meng-jiangnu`) | pendente | Registro nacional chinês não é automaticamente inscrição individual UNESCO; preservar variantes. |
| 8 | Kuldhara (`kuldhara`) | pendente | Causas históricas do abandono não demonstradas pela narrativa turística; revisar paisagem da ilustração. |
| 9 | Bakunawa (`bakunawa`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 10 | O Flautista de Hamelin (`o-flautista-de-hamelin`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 11 | A Dama Pé-de-Cabra (`a-dama-pe-de-cabra`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 12 | Peter Stumpp (`peter-stumpp`) | relato_lendario | Acusação/julgamento histórico não comprova transformação ou todos os crimes atribuídos. |
| 13 | Licaão (`licaao`) | mitologia | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 14 | O Holandês Voador (`o-holandes-voador`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 15 | Barba Azul (`barba-azul`) | narrativa_literaria | Conto literário; versão termina antes do desfecho tradicional, não inventar conclusão. |
| 16 | Negrinho do Pastoreio (`negrinho-do-pastoreio`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 17 | Ana Jansen (`ana-jansen`) | relato_lendario | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 18 | El Hombre Caimán (`el-hombre-caiman`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 19 | A Ilha das Bonecas (`a-ilha-das-bonecas`) | lenda_urbana | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 20 | Mary-san (`mary-san`) | lenda_urbana | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 21 | Ningen (`ningen`) | folclore_digital | Separar origem japonesa e cenário antártico; metadado termina com separador vazio. |
| 22 | O Jogo do Elevador (`o-jogo-do-elevador`) | folclore_digital | Tradição digital multinacional e data de origem pendentes; separador vazio. |
| 23 | O Fusca Amarelo da Rodovia Karak (`o-fusca-amarelo-da-rodovia-karak`) | lenda_urbana | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 24 | The Crying Boy (`the-crying-boy`) | lenda_urbana | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 25 | Black Volga (`black-volga`) | lenda_urbana | Variantes da Europa Oriental; não reduzir diversidade à bandeira de um país. Referência a estudo ainda sem identificação verificada. |
| 26 | This Man (`this-man`) | folclore_digital | O próprio catálogo identifica fabricação digital; não apresentar como fenômeno comprovado. |
| 27 | Bush Baby (`bush-baby`) | lenda_urbana | Distinguir entidade escolar da espécie animal chamada bushbaby. |
| 28 | Mamlambo (`mamlambo`) | relato_lendario | Rumores/reportagens e falecimentos reais não comprovam criatura. |
| 29 | A Mulher do Túnel de Mount Victoria (`a-mulher-do-tunel-de-mount-victoria`) | relato_lendario | Conferir documentação do crime e separar homenagem/tradição de aparição. |
| 30 | A Boneca da Xuxa (`a-boneca-da-xuxa`) | lenda_urbana | Rumores sobre brinquedos/pânico moral não são prova contra pessoa ou religião. |
| 31 | A Faca do Fofão (`a-faca-do-fofao`) | lenda_urbana | Peça de fabricação do brinquedo e alegações sobrenaturais não são equivalentes. |
| 32 | A Gangue dos Palhaços (`a-gangue-dos-palhacos`) | lenda_urbana | Texto curto; não afirmar sequestros como fatos verificados. |
| 33 | O ET de Varginha (`o-et-de-varginha`) | relato_lendario | Alegações ufológicas, não comprovação de extraterrestres. |
| 34 | A Bruxa de Guadalupe (`a-bruxa-de-guadalupe`) | relato_lendario | Depoimento alegado não comprova bruxa; conferir pessoa/data na imprensa. |
| 35 | A Freira do Hospital de Torreón (`a-freira-do-hospital-de-torreon`) | lenda_urbana | Coletânea e data citadas na origem sem referência completa. |
| 36 | María de Ávila (`maria-de-avila`) | relato_lendario | Correspondência entre personagem lendária e religiosa histórica requer fonte e grafia verificadas. |
| 37 | Slender Man (`slender-man`) | narrativa_literaria | Ficção contemporânea colaborativa, não entidade ancestral; autoria/postagem pendentes. |
| 38 | Polybius (`polybius`) | folclore_digital | Distinguir ambientação em 1981 e circulação online posterior. |
| 39 | The Hands Resist Him (`the-hands-resist-him`) | relato_lendario | Obra material e rumor de leilão não comprovam maldição; autoria/data pendentes. |
| 40 | As Escadas no Meio da Floresta (`as-escadas-no-meio-da-floresta`) | narrativa_literaria | País Canadá e atribuição autoral não documentados; classificar como ficção da internet, não relatório profissional. |
| 41 | Romãozinho (`romaozinho`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 42 | A Procissão das Almas (`a-procissao-das-almas`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 43 | Bárbara dos Prazeres (`barbara-dos-prazeres`) | folclore_tradicional | Acusações de crimes/sangue precisam de fonte; não tratar tradição como sentença histórica. |
| 44 | Almamula (`almamula`) | folclore_tradicional | País não explícito; normas religiosas/morais têm variantes e requerem contextualização. |
| 45 | Morgan's Corner (`morgan-s-corner`) | lenda_urbana | Oʻahu exige revisão de região/país e variantes do enredo. |
| 46 | Alyoshenka (`alyoshenka`) | relato_lendario | Identidade dos restos e alegações alienígenas não comprovadas. |
| 47 | O Pássaro Negro de Chernobyl (`o-passaro-negro-de-chernobyl`) | folclore_digital | Local do desastre, data de circulação digital e fonte precisam de conferência; não afirmar presságio histórico. |
| 48 | Silverpilen (`silverpilen`) | lenda_urbana | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 49 | Sereias (`sereias`) | folclore_tradicional | Nome genérico Sereias representa versão de Zennor; não confundir com as sereias gregas da posição 53. |
| 50 | Homem do Saco (`homem-do-saco`) | folclore_tradicional | Narrativa multinacional, sem bandeira única automática; texto breve. |
| 51 | Leprechaun (`leprechaun`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 52 | Selkie (`selkie`) | folclore_tradicional | Escócia/Órcades exigem distinção entre região e código de país; não apagar variantes. |
| 53 | As Sereias de Odisseu (`as-sereias-de-odisseu`) | mitologia | Mitologia clássica, distinta da sereia de Zennor; formas iconográficas não devem ser confundidas. |
| 54 | Baba Yaga (`baba-yaga`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 55 | Boitatá (`boitata`) | folclore_tradicional | Conferir registro de 1560 e variantes sem generalizar tradições indígenas. |
| 56 | Annabelle (`annabelle`) | relato_lendario | Distinguir boneca Raggedy Ann, alegações dos Warren e adaptações cinematográficas. |
| 57 | Umibōzu (`umibozu`) | folclore_tradicional | Conferir fonte primária, variantes, contexto e classificação; texto-base não equivale a revisão cultural concluída. |
| 58 | Kappa (`kappa`) | folclore_tradicional | Placeholder provisório; história idêntica às posições 59–60, sem resumo nem contexto final. |
| 59 | Kasa-obake (`kasa-obake`) | folclore_tradicional | Placeholder provisório; história idêntica às posições 58/60, sem resumo nem contexto final. |
| 60 | La Ursa (`la-ursa`) | manifestacao_popular | Manifestação carnavalesca, não automaticamente criatura sobrenatural; placeholder idêntico às posições 58–59. |

## 12. Inventário de ilustrações

[INVENTARIO-ILUSTRACOES.md](INVENTARIO-ILUSTRACOES.md) lista 19 recursos visuais (17 rasters e dois SVG), dimensões, formatos, proporções, hashes/duplicação e todas as 60 posições. Pastas cartas/assets/public e árvore de fontes foram conferidas; build, browsers e screenshots não contam como artes. A inspeção visual utilizou uma prancha derivada, sem editar originais. PNG da Loira e WebP antigos não são personagens adicionais; o WebP legado de Kuldhara é 4:5, não substitui a carta 2:3.

## 13. Artes oficiais

Loira do Banheiro, Kayako, Kiyohime, Tamamo-no-Mae, Kisaragi Station, Hachishakusama, Meng Jiangnu e Kuldhara: oito associações preservadas. Seus JPG são 768×1152, 2:3, exibidos inteiros. Saci é a nona arte somente em exposição. Não são dez cartas completas, e oito artes integradas não significam oito revisões culturais finais.

## 14. Artes ausentes

52 posições sem imagem, listadas individualmente no inventário. Nenhuma arte nova inequívoca foi encontrada. Para iniciar a meta de dez, sugerem-se artes próprias de Bakunawa (`bakunawa.jpg`) e O Flautista de Hamelin (`o-flautista-de-hamelin.jpg`), sem criar IDs. É possível escolher outras duas dentre as 52; a associação só deve ocorrer após revisão. Não usar verso de Boitatá, Saci ou imagem genérica como preenchimento.

## 15. Associações e problemas visuais

Alias `kayako-saeki` continua apontando ao ID oficial `a-maldicao-de-kayako-saeki`. A grafia e os títulos impressos nas imagens foram preservados. A paisagem de `kuldhara.jpg` aparenta elementos do leste asiático em contraste com o Rajastão; registrar revisão artística, não mover a imagem para Meng Jiangnu por semelhança. A adaptação em estilo ukiyo-e não certifica fidelidade arquitetônica. Nenhuma associação foi alterada por hipótese.

## 16. API e schemas

`/api/legends` continua público, ordenado e com 60 entradas; campos antigos e extras são conservados. `LegendOut.cultura` é opcional e aceita legado sem metadados. Os novos textos são validados como texto simples, rejeitando marcação HTML no import. Isso não substitui renderização segura: o futuro componente deve usar nós de texto/React ou textContent, nunca innerHTML com o catálogo. Nenhum dado privado foi incluído. Álbum mantém legend=null nas posições bloqueadas; cartas desbloqueadas, história e identidade continuam iguais. O adaptador da casa preserva cultura por spread dos dados canônicos.

## 17. PostgreSQL e seed

Nenhuma tabela, coluna ou migração nova: reutilizado Legend.attributes JSON. Atualização aplicada duas vezes somente em bau_test isolado, com contagem de contas/conquistas/histórico preservada. Não foi aplicado seed em banco real. No ambiente real, os novos dados só chegam após atualização explícita do catálogo pelo responsável; o servidor não faz seed automático na inicialização. Fixtures Python usam schemas temporários próprios e migrações existentes.

## 18. Recompensas e compatibilidade

Não houve alteração de probabilidade, elegibilidade, uma concessão/dia, timezone, repetição após 60, concorrência ou idempotência. Testes simulam catálogo legado sem cultura, concedem carta, atualizam duas vezes e verificam conquista/histórico e replay exato do snapshot antigo. Metadata cultural novo não deve reescrever resultados idempotentes antigos. O frontend aceita ausência de cultura em snapshots legados.

## 19. Preparação do Flip, sem implementação

Frente atual: IllustratedCard.tsx/mountCard em public/casa/js/card-view.js, cx-frente e ilustração original com nome/bandeira já impressos. Verso atual: cx-verso usa SVG; Album.tsx tem a face de relato; RA usa makeFace em ra.js; galeria usa cartas-flip.js. Nenhum foi modificado. O futuro Flip deve reutilizar esse fluxo e consumir cultura.resumoEducativo/contextoCultural, tratando cultura ausente, nulls e curiosidades vazias. Não acessar informações privadas de carta bloqueada; preview público não desbloqueia coleção. Sem nova biblioteca ou animação.

## 20. Validação

| Verificação | Resultado |
| --- | --- |
| Python completo, SQLite efêmero/PostgreSQL isolado | 101 aprovados, 3 pulados; um aviso preexistente do TestClient |
| Seed e legado | Duas atualizações sem mudar contas/conquistas/histórico; replay antigo exato; opcionais/Unicode/HTML testados |
| Node final | 46 aprovados, 1 falha conhecida da sequência das assombrações; teste/seq. não alterados |
| TypeScript e Vite | Aprovados; build final em `build-final.log` |
| API/JSON canônico | Igualdade completa das 60 entradas confirmada em Chromium e WebKit, após seed somente em bau_test |
| Mobile novo | 390×844, galeria/virada/fechamento e privacidade de álbum não autenticado aprovados nos dois motores |
| Autenticação existente | Cadastro, login/logout, sessões/reload, revogação/troca e descarte de resposta atrasada aprovados nos dois motores |
| Regressão Chromium | Sete cenários aprovados: recompensa/histórico/contador, álbum, galeria autenticada, GLB/animações e ciclo de catálogo |
| Regressão WebKit | Seis de sete aprovados; navegação forçada reprovada com duas mensagens de access control em requisições pessoais canceladas |

A repetição manteve essa ocorrência WebKit em `/api/auth/me` e `/api/album` durante saída forçada. Não houve `Catálogo oficial indisponível.` indevido, nem falha do novo payload; não foi estabelecida causalidade com a organização cultural. O teste original foi preservado, sem enfraquecer a asserção. Não se declarou toda a suíte de navegadores verde, e não se alterou autenticação/CORS para mascarar a ocorrência. Recompensas, catálogo, restauração e falhas ativas passaram. Isso permanece uma pendência técnica de navegação/cancelamento; câmera sintética WebKit já era bloqueada e não foi modificada.

A primeira execução Node no sandbox bloqueou o subprocesso de sincronização com EPERM; a execução autorizada fora desse sandbox passou nesse teste. A falha restante é exclusivamente a sequência conhecida das assombrações, conforme o relatório final Node.

Evidências: [Node](../tests/artifacts/etapa05/node-final.log), [Python](../tests/artifacts/etapa05/python.log), [HTTP/mobile](../tests/artifacts/etapa05/browser.json), [Chromium](../tests/artifacts/etapa05/chromium-galeria.png), [WebKit](../tests/artifacts/etapa05/webkit-galeria.png), [integridade](../tests/artifacts/etapa05/integrity.json), [regressão repetida](../tests/artifacts/mobile-fixes/2026-11-21T02-14-34-853Z-regression/report.json).

O manifesto confirma todos os campos originais intactos e nenhum hash visual/modelo modificado. Não foram feitos testes físicos de smartphone.

JSON comprimido estimado: de 15.448 para cerca de 19.700 bytes (medição local), acréscimo de aproximadamente 4,3 kB gzip. Bundle principal mantém aviso preexistente >500 kB. Nenhuma dependência nova instalada. Proporção/dimensões e hashes dos arquivos originais foram conferidos. Emulação não substitui testes físicos.

## 21. Pendências culturais e referências

As 60 histórias e campos antigos foram preservados literalmente. Isso inclui menções editoriais/bibliográficas antigas em `historia` (Folha, estudo atribuído a Czubala, Secretaria de Cultura etc.), cuja revisão não foi apresentada como concluída. Os novos resumos/contextos não acrescentam bibliografia nem links; o futuro Flip deve usar esses campos. **Não foi certificada ausência de menções bibliográficas nas faces legadas que ainda exibem historia integral**: conciliar sua retirada com a preservação textual exige revisão dirigida dos trechos editoriais. Não se ocultou essa limitação alterando os componentes nesta etapa de dados.

Preservadas referências/documentos antigos; links sem leitura confirmada não foram transformados em fontes verificadas. Pesquisar as 52 entradas ainda sem bibliografia externa suficiente, completar as três provisórias e conferir pormenores/datas das oito ilustradas. Não usar datas de ficção digital como prova de tradição ancestral.

## 22. Materiais necessários do responsável

Pelo menos duas ilustrações originais adicionais para personagens já oficiais (prioridades sugeridas na seção 14), validação visual/cultural de Kuldhara e fontes verificáveis para histórias pendentes, especialmente Kappa, Kasa-obake e La Ursa. Precisam de revisão humana as atribuições autorais, origens ambíguas, casos históricos/criminais e variantes. Nenhuma das dez cartas foi declarada completa por simples preenchimento de campos.

## 23. Próxima etapa e reprodução

Concluir pesquisa/revisão humana e receber artes antes de iniciar o Flip visual. Documentos acadêmicos não foram alterados; nenhuma Etapa 06 foi iniciada. Nenhum commit/push/branch ou comando de alteração do Git, publicação, sudo ou instalação global.

Com o ambiente isolado já preparado, reproduzir a validação via `backend/.venv/bin/python backend/tests/run_cultural_catalog.py`. O runner recusa destinos diferentes de APP_ENV=test/127.0.0.1:55439/bau_test e exige o cluster próprio marcado. Não usar contra dados reais. Para gerar derivados tipados: `node scripts/sincronizar-catalogo.mjs`; para inventário: `python3 scripts/auditar-catalogo.py`. Esses scripts não regeneram nem recortam ilustrações.
