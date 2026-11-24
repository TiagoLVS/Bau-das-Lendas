# Decisão de produto — escopo educativo sem quizzes

Revisão definitiva: **23/11/2026**, America/Sao_Paulo. Autoridade: responsável pelo projeto. Não se afirma aprovação pela professora ou pela instituição.

## Decisão vigente

O Baú das Lendas não terá perguntas, quizzes, questionários, múltipla escolha, verdadeiro/falso, testes de conhecimento ou atividades que exijam respostas/acertos. A exclusão inclui mecanismos opcionais, obrigatórios e equivalentes com outros nomes, pontuação por respostas, medalhas por acertos, rankings, temporizadores e desbloqueios condicionados a avaliação. Não há substituto avaliativo planejado nem implementação futura autorizada desses mecanismos.

A aprendizagem permanece por descoberta e coleção de cartas, leitura livre do Flip, histórias, origens, tradições, contextos, curiosidades, dossiês, exploração da casa e elementos narrativos. Preservam-se as duas faces educativas sem bibliografia nas faces, ilustrações, assombrações, easter eggs, áudio, navegação, autenticação, coleção e recompensas. Resgatar cartas nunca depende de responder ou permanecer um tempo mínimo na aplicação.

## Justificativa e impacto no planejamento

Decisão definitiva de escopo do responsável: concentrar a experiência educativa em leitura e exploração cultural, sem avaliação do conhecimento. O objetivo acadêmico de descoberta cultural permanece; não se mede aprendizagem por acertos. Revisão de fontes e textos pode ser objeto de uma etapa futura explicitamente autorizada, sem exercícios avaliativos. Nenhuma etapa nova foi iniciada.

| Requisito histórico | Estado vigente | Tratamento |
| --- | --- | --- |
| **T19 — Criar desafio cultural curto** | **CANCELADA POR DECISÃO DE ESCOPO** | Não implementada como entrega; caráter educativo atendido por cartas, Flip, histórias, dossiês e exploração cultural |
| Antiga Etapa 12 — Desafios Educativos | **CANCELADA POR DECISÃO DE ESCOPO** | Prompt anterior sem validade; não executar ou reintroduzir componentes, dados, rotas ou testes avaliativos |
| Demonstração de 5–15 minutos | Referência de apresentação, não obrigação do visitante | Leitura e exploração livres, sem exercício, cronômetro ou permanência mínima |

O CSV do backlog e um quadro editável de tarefas/marcos não foram encontrados nesta cópia. O Plano remete a um CSV anexo e ainda contém placeholder de URL do Trello. Portanto, a T19 é cancelada formalmente neste registro local; não se afirma que um quadro externo foi atualizado. O responsável deve refletir esse estado no backlog externo quando o revisar. Não há necessidade de criar uma cópia fictícia de todo o backlog.

## Errata identificada dos documentos acadêmicos

Os três PDFs originais foram consultados por extração de texto e permanecem **inalterados**, com hashes registrados em `tests/artifacts/escopo-sem-quizzes/before.json`. Não foram localizadas fontes editáveis oficiais desses PDFs. Esta errata acompanha as versões históricas; não é uma reedição silenciosa nem substitui eventual revisão acadêmica formal.

| Documento histórico | Referência localizada | Leitura vigente / errata |
| --- | --- | --- |
| `One Page - Baú das Lendas.pdf`, p. 1 | Componente de desafio educativo previsto para depois; demonstração de 5–10 minutos | Componente retirado do planejamento. Aprendizagem por cartas, Flip e exploração livre; duração de apresentação não imposta ao visitante |
| `XRD - Baú das Lendas.pdf`, p. 3, fluxo 9, passo 8 | Desafio cultural curto após ler a carta | Fluxo vigente termina em consulta livre à carta, exploração complementar e acesso ao Álbum; nenhuma avaliação substituta |
| `Plano de Projeto - Baú das Lendas.pdf`, p. 1, seção 4.3 | Experiência de 5–15 minutos com atividade cultural curta | Experiência educativa explorável com leitura, contexto e descoberta; sem perguntas/respostas ou obrigação de permanecer |
| Mesmo Plano, p. 4, “Estado atual da implementação” | Ausência de desafio descrita como estado do protótipo | Registro histórico, não pendência de implementação; componente cancelado |
| Plano, p. 2–3, marcos/Trello/controle de mudanças | Referência a CSV anexo e atualização por marcos | Registrar T19 cancelada no planejamento vigente; preservar IDs/estado histórico dos demais cartões sem inventar dados ausentes |

Se os documentos tiverem sido entregues/assinados, apresentar esta errata ao responsável acadêmico e identificar uma nova revisão antes de substituir qualquer versão oficial. A decisão é do responsável pelo projeto; homologação acadêmica não foi presumida.

## Verificação da implementação e documentos ativos

A implementação de desafios já havia sido desfeita a pedido do responsável antes desta revisão. Nesta tarefa não havia componente, banco de perguntas, rota, botão ou teste ativo de quiz a remover. Não foi criado código de remoção fictício nem reimplementada a antiga Etapa 12.

Para não falsificar o histórico: houve um protótipo anterior, posteriormente revertido; ele não é funcionalidade entregue nem trabalho planejado. Não se afirma que nunca houve prototipação. O cancelamento vale para qualquer implementação futura. Os arquivos removidos e a reversão não foram restaurados.

Busca em português/inglês cobriu fontes React/TS, HTML/JS, scripts, testes, documentação e PDFs, incluindo quiz/questionário/desafio cultural/testar conhecimento/resposta correta/multiple choice e sinônimos. Não foram localizadas fontes de backlog ou documentos de marcos separados além dos PDFs. README, guias frontend/backend e diretrizes agora apontam para esta decisão. A auditoria de 20/11 mantém seus achados históricos com aviso de prevalência desta errata; sua recomendação avaliativa foi cancelada, não tratada como débito técnico.

Referências legítimas preservadas: `perguntaTeste` em `World3D.tsx` é uma variável de parâmetro DEV para testar assombrações; não apresenta pergunta ao usuário. A pergunta narrativa “ela saiu?” em `public/casa/js/lendas.js` integra uma história e não solicita resposta avaliativa. Menções históricas a “sem desafios” em relatórios continuam como registro. Não foram alteradas histórias para eliminar palavras isoladas.

As referências anteriores incompatíveis ficam históricas/superadas. Nenhuma mecânica de perguntas permanece no planejamento vigente, inclusive sob o nome de atividade de descoberta. Documentos acadêmicos, catálogo, campos culturais e componentes educativos de leitura foram preservados.

## Validação desta revisão

- Testes Node: **82 aprovados, zero falhas e zero ignorados**. TypeScript aprovado. Build Vite aprovado, com aviso de bundle acima de 500 kB.
- Regressão de interface em Chromium e WebKit com janela visível: Álbum, leitura do verso/Flip, galeria/Saci, navegação da casa/dossiê e carregamento da página RA/GLB aprovados; controles de quiz ausentes nos fluxos verificados.
- A API foi simulada em memória, sem iniciar banco. Esses testes não homologam autenticação/recompensas integradas ao backend, câmera física, desempenho móvel ou profundidade visual no WebKit.
- A tentativa inicial sem janela teve timeout no toque da navegação da casa no Chromium; WebKit passou. A repetição com janela passou nos dois navegadores. Os registros dos dois modos foram preservados, sem tratar a repetição como medição de desempenho.
- Integridade: **123 arquivos conferidos por SHA-256, incluindo os três PDFs, sem alterações**. Código, catálogo, imagens, GLB e demais recursos protegidos nessa amostra permanecem idênticos ao início desta revisão.
- Evidências em `tests/artifacts/escopo-sem-quizzes/`: `node.log`, `typescript.log`, `build.log`, `browser.json`, `browser-headless.json` e `integrity.json`.

Não houve alteração de código da aplicação, banco, migração, instalação ou publicação. Os bloqueios já documentados da Etapa 11.1 permanecem independentes desta decisão. A ausência de uma implementação ativa de quiz foi verificada por inspeção das fontes; os testes de interface complementam essa inspeção sem pretender cobrir todas as combinações de estado.

Arquivos alterados: `README.md`, `frontend/README.md`, `backend/README.md`, `docs/DIRETRIZES-DO-PROJETO.md` e `docs/AUDITORIA-TECNICA.md`. Criado: este registro de decisão/errata. Nenhum PDF original foi modificado. Nenhuma operação Git de escrita foi executada.
