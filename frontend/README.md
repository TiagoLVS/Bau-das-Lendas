# Frontend

Escopo educativo vigente: leitura e exploração cultural, sem quizzes ou interfaces de respostas. Preservar o verso educativo, o Álbum, a galeria e os dossiês. A antiga Etapa 12/T19 está cancelada, sem atividade avaliativa substituta; veja a [decisão definitiva](../docs/DECISAO-ESCOPO-SEM-QUIZZES.md).

O frontend real fica em `src/` (React/TypeScript) e `public/` (RA e casa/galeria).
Esta pasta contém orientações, não outra aplicação.

Na raiz, com as dependências existentes:

```sh
npm run dev
# ou build seguido de preview local:
npm start
```

Abra http://localhost:5175. A API precisa estar ativa separadamente na porta 8000;
Vite e preview encaminham `/api` para ela. Para reutilizar o build: `npm run preview`.
Ctrl+C encerra o servidor. `npm run build` verifica TypeScript e gera `dist`.

O navegador usa URLs relativas para a API. Em produção, servir `dist` por HTTPS
com reverse proxy `/api` na mesma origem; não usar Vite como hospedagem definitiva.
Câmera no celular requer HTTPS e permissão. Viewport móvel não comprova aparelho físico.
Não há aplicativo nativo nem dependência de Blender no navegador.

Veja [Etapa 02](../docs/ETAPA-02-BACKEND-POSTGRESQL.md) para testes e infraestrutura.
