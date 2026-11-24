# Etapa 08 — Baú 3D, animações e desempenho

Data: 22/11/2026. Estado: revisão concluída e aceite técnico automatizado aprovado. Homologação física permanece pendente. Não inicia a Etapa 09.

## Auditoria anterior às correções

Consultados os relatórios 02–07, auditoria técnica, compatibilidade mobile, diretrizes e os PDFs acadêmicos. Foram inspecionados `public/chest-model.js`, `public/ra.js`, `public/qr-tracker.js`, GLTFLoader e o GLB oficial. As decisões atuais de jsQR, recompensa diária e Flip educativo prevalecem sobre textos históricos.

Arquivo oficial: `public/models/bau-das-lendas.glb`, 358.744 bytes, SHA-256 `eff4fa4098a4016d51ad722f022fc39f2f1b6e542fd4390833b0e97622ef5a46`. Cabeçalho GLB 2 íntegro, tamanho declarado igual ao real. Duas malhas, 6.572 triângulos, oito materiais PBR, sem imagens/texturas ou esqueleto. Hierarquia BauDasLendas → Base/Tampa; pivô da Tampa em (0; 0,775; −0,463) no espaço glTF. Os três clipes animam rotação e têm duração de 2 s. Dados completos em `tests/artifacts/etapa08/glb.json`. Nenhum byte será modificado.

Problemas comprovados no código antes de editar:

1. O carregador anexava a cena antes de validar clipes; a falha deixava modelo anexado. Não havia dispose/uncache do mixer.
2. A promessa GLTF não era invalidada ao sair. Uma carga tardia podia anexar recursos depois do dispose da cena pelo tracker.
3. refreshAccount limpava a recompensa e voltava a idle, mas não restaurava Idle no mixer: tampa podia permanecer aberta sem operação vigente.
4. Voltar ao baú iniciava CloseChest e imediatamente liberava ready; a nova leitura do marcador podia habilitar interação antes do fim do fechamento.
5. stopAllAction restaura a pose original; sem update(0) após play, CloseChest podia mostrar um quadro fechado antes de aplicar seu quadro inicial aberto.
6. O início assíncrono da câmera não invalidava getUserMedia pendente após stop/dispose, permitindo stream tardio e loop depois da saída. Esse é um problema de ciclo de vida; a matemática do reconhecimento não precisa mudar.
7. Não havia tratamento da perda de contexto WebGL pela experiência, nem guarda contra cliques de início simultâneos antes da resolução da câmera.

A regra de recompensa está correta: POST confirmado antecede OpenChest; há chave idempotente, verificação de versão da conta, conflito diário e proteção contra respostas antigas. O Flip é independente do controlador 3D e será preservado. Não há justificativa para alterar backend, GLB, materiais ou rastreamento geométrico.

Outro problema confirmado na auditoria: erro de conta tinha precedência sobre erro do modelo na mensagem de prontidão, ocultando o motivo do GLB indisponível para visitante desconectado. A prioridade foi corrigida sem modificar permissões de câmera ou de recompensa.

## Correções e controle de estados

`createChestController` valida os três clipes antes de anexar a cena. Mantém a escala original 0,52 e deslocamento Y −0,23, um único mixer, Idle em LoopRepeat e OpenChest/CloseChest em LoopOnce com clampWhenFinished. Não há duas ações concorrentes. Repetir play do clipe atual não reinicia o movimento. Após trocar de ação, update(0) aplica imediatamente o primeiro quadro válido; no fluxo normal CloseChest começa exatamente na posição aberta deixada por OpenChest.

Idle continua estático. Abertura percorre aproximadamente 105° e mantém o extremo; fechamento retorna a zero. Os testes avançam o mixer real em intervalos de 0,1 s e também usam quadros longos: não se limitam a verificar nomes de clipes. A RA preserva a duração e a revelação após confirmação, com 2,4 s de apresentação antes do Flip, compatíveis com o clipe de 2 s.

A máquina de estados existente foi mantida: idle/ready, requesting, opening, reward e as condições de disponibilidade. Acrescentados apenas closing e disposed para representar fechamento em andamento e experiência encerrada. Durante closing não se oferece abertura; a liberação depende do término real da ação. A perda/retorno do marcador é registrada sem interromper ou duplicar a confirmação. Refresh da conta restaura Idle e brilho zero; resposta antiga ou resposta após saída não altera a interface.

A confirmação permanece exclusivamente no backend. Chave idempotente, histórico, fuso, seleção e regra diária não foram alterados. Duplo toque durante requesting não produz outro POST. Erros, conflito diário e sessão expirada não animam OpenChest nem inventam carta. Uma confirmação válida pode terminar depois de perder o marcador; ela continua válida, sem depender da presença visual do baú. O Flip e a apresentação educativa foram reutilizados sem edição.

## Carregamento e descarte

O carregamento usa fetch do mesmo GLB oficial e parseAsync do GLTFLoader existente. Há limite explícito de 30 s e AbortController da experiência; não foi criado cache global ou segunda cópia do modelo na aplicação. HTTP não bem-sucedido não é enviado ao parser. Cena sem clipe obrigatório é descartada antes de anexar; resposta/parse tardio após cancelamento libera recursos e não anexa nada. A interface mostra erro e orienta recarga, também quando a conta está indisponível. O teste de recuperação executa novo carregamento real depois de 503.

O controlador tem dispose idempotente: stopAllAction, uncacheRoot, remoção da cena e descarte das geometrias, materiais e texturas exclusivamente daquele modelo, com conjuntos para evitar chamadas duplicadas. A cena do baú é removida antes de o tracker descartar os demais recursos; assim o mesmo recurso não é descartado novamente pela travessia da experiência.

No pagehide, a RA invalida operações, oculta e limpa a recompensa, bloqueia controles, aborta a carga, encerra mixer/tracker e remove listeners de conta/relógio. Tracks, vídeo, scan RAF e animation loop são encerrados. Uma permissão getUserMedia pendente é invalidada por geração; stream que chega depois é parado sem reativar vídeo ou loop. Inícios simultâneos compartilham a mesma tentativa de câmera.

Em aba oculta, o vídeo é pausado pelo comportamento existente; a RA não chama render nem avança o mixer. Não foi alterada a política de hardware da câmera em background. Retorno visível mantém revalidação de conta e recuperação idempotente. pageshow com BFCache conserva a recarga segura existente. Perda de contexto WebGL encerra a experiência e oferece RECARREGAR; não tenta reutilizar objetos de um contexto descartado nem concede recompensa. Uma recarga recria o contexto e exige o início de câmera pelo usuário.

Essas são correções de ciclo de vida. `scanFrame`, estimativa de pose, validação do QR 02, resize/focal e suavização não foram alterados. O reconhecimento aprofundado permanece para a Etapa 09.

## Desempenho observado

O JSON contém duas malhas com múltiplas primitivas, que o GLTFLoader materializa em **14 Meshes/geometrias**, oito materiais e **14 draw calls** na sonda isolada; são 6.572 triângulos. Não é discrepância no número de polígonos. A carta emergente e as luzes da experiência são recursos adicionais já existentes. Não houve redução de polígonos, resolução, detalhes ou qualidade dos materiais.

Na última sonda, carregamento/parse do modelo foi de aproximadamente **12,3 ms no Chromium e 18 ms no WebKit**, no computador de teste e com arquivos locais; esses tempos não são benchmark de rede móvel ou GPU de smartphone. renderer.info.memory registrou 14 geometrias e zero texturas do baú; após dispose e render da cena vazia, zero geometrias e zero texturas nos dois motores. Isso mede contadores de recursos, não bytes de VRAM nem toda a memória do processo. Heap, temperatura, bateria e FPS de aparelhos reais não foram certificados.

Os clipes são atualizados por delta monotônico real, sem limitar artificialmente o avanço a poucos milissegundos. A sonda carrega uma instância adicional exclusivamente para inspecionar/renderizar o ativo e coletar métricas; não é outro carregamento do fluxo da aplicação nem outro mixer sobre o baú de produção. Sem câmera iniciada, a aplicação não instala seu loop de renderização. Ao encerrar, não resta vídeo/canvas no contêiner e os tracks sintéticos estão ended.

## Testes e evidências

| Verificação | Resultado executado |
| --- | --- |
| Node completo | **60 aprovados, zero falhas**, contra os 52 de referência |
| Python/PostgreSQL | **40 aprovados**, 39 casos SQLite desmarcados, um aviso preexistente do TestClient |
| TypeScript / Vite | Aprovados; aviso preexistente de bundle maior que 500 kB |
| GLB / mixer real | Idle, extremos, progressão monotônica, transição sem salto, clipe ausente, duplo play e dispose idempotente aprovados |
| Carga | HTTP 503, cancelamento, deadline e resposta tardia sem anexação; recuperação com parse real aprovados |
| API / estado | Duplo toque em pedido pendente, marcador perdido, confirmação tardia, saída, conflito diário, sessão e repetida aprovados com relógio controlado |
| Câmera | Início duplo faz uma solicitação; stream tardio após dispose é encerrado; dispose repetido não duplica stop |
| Chromium e WebKit | Nove viewports por motor: 320×568, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 568×320 e 844×390 |
| Reprodução visual | Cinco estados renderizados por motor; ângulo inicial/final, meio do movimento e retorno ao fechado verificados |
| Erro/recuperação/ciclo | Erro do GLB visível, reload, câmera sintética ativa descartada, zero vídeos/canvases e perda de contexto tratada nos dois motores |
| Recompensa / Flip / Álbum | API real com QR sintético, verso educativo e troca A/B aprovados nos dois motores |
| Sessões | Cadastro, login/logout, revogação, reload, sincronização e resposta antiga descartada aprovados nos dois motores |
| Regressão funcional | Sete grupos por motor aprovados, incluindo recompensa/histórico/contador/galeria, GLB/animações e catálogo |
| Navegação | Início, Explorar, Álbum e Perfil independente, com retorno da galeria, aprovados nos dois motores |

Os testes usam exclusivamente o PostgreSQL isolado bau_test existente e contas fictícias; sem migration ou seed de catálogo. Os runners conferem destino/marker e encerram seus próprios serviços em finally. As fixtures só criam dados de teste. Nenhuma operação alcança produção.

A primeira tentativa do novo teste de câmera WebKit não fornecia quadros contínuos ao stream sintético: video.play não concluía. O adaptador do teste foi corrigido para pintar a cada 66 ms, como o adaptador já utilizado na regressão de QR; a repetição passou. Não se alterou o rastreador para acomodar vídeo sem quadros. Os testes VM receberam AbortController e o estado simulado de fechamento necessários ao novo contrato; as verificações anteriores foram preservadas. Os logs intermediários continuam na pasta de evidências.

Os scripts existentes de recompensa/Flip gravam sua saída padrão na pasta da Etapa 07. Foram executados novamente nesta etapa; os JSON e as capturas da recompensa resultantes foram copiados para etapa08 para registrar a proveniência desta rodada. Não se apresentam resultados antigos como se fossem novos.

Evidências técnicas: [inspeção binária](../tests/artifacts/etapa08/glb.json), [movimentos e recursos nos navegadores](../tests/artifacts/etapa08/browser.json), [Node](../tests/artifacts/etapa08/node.log), [Python](../tests/artifacts/etapa08/python.log), [build](../tests/artifacts/etapa08/build.log), [regressão completa](../tests/artifacts/etapa08/run.log), [revalidação](../tests/artifacts/etapa08/final-run.log), [câmera/contexto](../tests/artifacts/etapa08/lifecycle-run.log), [capturas finais](../tests/artifacts/etapa08/evidence-run.log), [recompensa/Flip](../tests/artifacts/etapa08/integration.json), [navegação](../tests/artifacts/etapa08/navigation.json), [integridade](../tests/artifacts/etapa08/integrity.json).

| Motor | Fechado | Abrindo | Aberto | Fechando | Fechado novamente | Erro de carga |
| --- | --- | --- | --- | --- | --- | --- |
| Chromium | [PNG](../tests/artifacts/etapa08/Chromium-closed.png) | [PNG](../tests/artifacts/etapa08/Chromium-opening.png) | [PNG](../tests/artifacts/etapa08/Chromium-open.png) | [PNG](../tests/artifacts/etapa08/Chromium-closing.png) | [PNG](../tests/artifacts/etapa08/Chromium-closed-again.png) | [PNG](../tests/artifacts/etapa08/Chromium-load-error.png) |
| WebKit | [PNG](../tests/artifacts/etapa08/WebKit-closed.png) | [PNG](../tests/artifacts/etapa08/WebKit-opening.png) | [PNG](../tests/artifacts/etapa08/WebKit-open.png) | [PNG](../tests/artifacts/etapa08/WebKit-closing.png) | [PNG](../tests/artifacts/etapa08/WebKit-closed-again.png) | [PNG](../tests/artifacts/etapa08/WebKit-load-error.png) |

As imagens do modelo são renderizações técnicas do GLB com câmera virtual de inspeção; não são prova de câmera física ou reconhecimento real. As capturas [Chromium](../tests/artifacts/etapa08/Chromium-reward.png) e [WebKit](../tests/artifacts/etapa08/WebKit-reward.png) mostram a recompensa/verso em fluxo de QR sintético. O enquadramento da sonda foi ajustado para mostrar o modelo inteiro; a câmera da aplicação não foi alterada.

## Arquivos e preservação

Modificados nesta etapa: `public/chest-model.js`, `public/ra.js`, `public/qr-tracker.js`, `tests/api-ra.test.mjs` e `tests/qr-tracker.test.mjs`.

Criados: `tests/chest-model.test.mjs`, `tests/chest-browser.mjs`, `backend/tests/run_chest.py` e este documento. Nenhuma dependência foi adicionada.

A comparação de hashes do snapshot desta etapa confirmou **102 arquivos da aplicação idênticos** e somente os três arquivos de controle/ciclo de vida previstos alterados. O GLB fonte e sua cópia no build são idênticos, com o SHA-256 registrado acima. Arte, conteúdo cultural, catálogo, Flip, navegação, backend, modelos de dados e documentos acadêmicos foram preservados. Não houve Blender MCP, alteração de esquema, publicação, branch, commit, push ou qualquer operação Git de escrita.

## Aceite, limitações e próxima revisão

**Aceite técnico automatizado da Etapa 08: aprovado.** Os problemas de controle e descarte encontrados foram corrigidos; não há pendência que exija editar o GLB. As suítes executadas passaram nas últimas verificações, e todos os serviços próprios foram encerrados. Os resultados das rodadas anteriores, inclusive o erro do adaptador sintético, não foram reclassificados como sucesso.

Não se declara homologação de câmera/QR físicos, desempenho de Android/iPhone, bateria, temperatura, safe areas ou recuperação de todos os drivers WebGL. Não foram medidos bytes reais de VRAM nem FPS sustentado em smartphone. O tratamento de contexto opta por reload seguro, não por reconstrução automática de um renderer descartado. Essas limitações não exigem modificar o GLB.

Para a Etapa 09, recomenda-se testar reconhecimento físico, iluminação/distância, perda/retorno do marcador e alternância de apps em aparelhos reais, observando vídeo inline, permissões e recuperação do contexto. Não foram implementados marcadores novos, QR por usuário, MindAR ou novas funções de câmera. A Etapa 09 não foi iniciada.
