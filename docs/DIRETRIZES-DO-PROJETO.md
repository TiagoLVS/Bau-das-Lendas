# Diretrizes permanentes — Baú das Lendas

Decisões fornecidas pelo responsável em 20/11/2026. Este documento registra requisitos; não autoriza antecipar etapas.

## Escopo educativo definitivo — revisão de 23/11/2026

Por decisão do responsável, não haverá quizzes, questionários, testes de conhecimento ou desafios que exijam selecionar/responder alternativas, acertar ou errar. Também ficam excluídos pontuação por respostas, medalhas por acertos, rankings de conhecimento, temporizadores e desbloqueios condicionados a perguntas, inclusive versões opcionais ou equivalentes com outro nome.

A aprendizagem permanece na descoberta, coleção, leitura, origens, tradições, contextos, curiosidades, dossiês e exploração narrativa. O Flip educativo permanece livre para consulta, sem bibliografia nas faces e sem botões avaliativos. A antiga Etapa 12 e a T19 estão **CANCELADAS POR DECISÃO DE ESCOPO**; não são trabalho pendente nem funcionalidades entregues. Nenhuma avaliação substituta está planejada. A [decisão e errata dos documentos acadêmicos](DECISAO-ESCOPO-SEM-QUIZZES.md) prevalece sobre referências anteriores incompatíveis. Não se atribui aprovação à professora.

## Plataforma e público

Aplicação exclusivamente web, acessível pelo navegador sem instalação. Prioridade: smartphones, Chrome no Android e Safari no iOS. Não produzir APK, executável, instalador, aplicação desktop ou versão nativa por sistema operacional. O ambiente do desenvolvedor não determina a plataforma do usuário. Blender/MCP são ferramentas de desenvolvimento, nunca dependências do visitante.

## Preservação

Reaproveitar React, TypeScript, HTML/CSS, Vite, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Psycopg, Three.js e recursos existentes. SQLite permanece restrito aos testes isolados. Preservar identidade visual, cores, tipografia, fantasia/terror folclórico, casa, galeria, assombrações, easter eggs, animações, catálogo de 60 lendas e ilustrações originais. Não substituir tecnologias sem necessidade comprovada e autorização aplicável.

Preservar o GLB do baú, Idle/OpenChest/CloseChest, materiais, aparência e rastreamento jsQR. A etapa 02 não troca para MindAR, não altera marcadores nem regras de sorteio. Não implica aprovação das divergências registradas na auditoria; recompensas serão decididas em etapa própria.

## Navegação futura

Analisar rotas/componentes e reaproveitá-los antes de reduzir abas. Não eliminar funcionalidades.

- **Início:** casa virtual, apresentação, exploração temática, assombrações e easter eggs.
- **Explorar:** câmera, marcador, RA, abertura do baú e revelação da carta.
- **Álbum:** coleção individual, galeria, cartas desbloqueadas/bloqueadas, progresso e detalhes.
- **Perfil:** ícone independente com cadastro, login, conta, histórico de recompensas e logout.

Essa reorganização não pertence à etapa 02.

## Flip futuro e conteúdo educativo

Reaproveitar recursos de virada existentes antes de adicionar biblioteca. Duas faces, giro horizontal suave em CSS 3D ou mecanismo equivalente; toque, clique e teclado, com retorno à frente e respeito a movimento reduzido. Disponível na revelação e no álbum para cartas desbloqueadas; conteúdo dinâmico, sem editar as imagens.

Frente: ilustração original vertical 2:3, ukiyo-e, moldura washi, padrão seigaiha, nome e bandeira. Verso: nome, país/região, tradição cultural, resumo, contexto e curiosidades quando documentadas. Legibilidade em smartphone é requisito.

Não exibir bibliografia na frente nem no verso: manter fontes somente na documentação interna. Não adicionar estatísticas de combate, raridade, ameaça, XP ou habilidades especiais. Conteúdo atual divergente será tratado em etapa futura; não o remover silenciosamente nesta etapa.

## Operação e colaboração

Produção exige PostgreSQL, HTTPS e cookies Secure, API na mesma origem pública do frontend. Usuário acessa dados exclusivamente pela API. Testes usam dados fictícios e bancos isolados; não se presume que viewport móvel valide aparelho físico. Preservar alterações de integrantes e bancos preexistentes. O responsável realiza as operações de integração/envio ao GitHub. Nenhuma publicação ou próxima etapa automática.


## Regra de recompensas aprovada na etapa 04

Uma recompensa por usuário e dia de calendário America/Sao_Paulo, exclusivamente
no servidor; sem acumular dias ausentes. Priorizar cartas não adquiridas e permitir
repetidas após 60/60, sem duplicar o álbum. Preservar sorteios antigos e idempotência,
inclusive após meia-noite. Histórico individual e contador são integrações pontuais
no perfil/RA, sem nova aba, novo Flip ou alteração dos modelos/ilustrações.
