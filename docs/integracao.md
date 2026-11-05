# Integração com a Giovanna

API local: `http://127.0.0.1:8000`, porta `8000`, prefixo `/api`.

| Método | Endereço | Resposta |
| --- | --- | --- |
| GET | `/api/health` | HTTP 200, JSON `{"status":"ok","project":"Baú das Lendas"}` |

Iniciar o backend pela raiz, com o ambiente virtual ativado:

```sh
python -m uvicorn main:app --app-dir backend --reload
```

Documentação automática: `http://127.0.0.1:8000/docs`.
HTML, CSS e JavaScript ficam em `frontend/`; imagens, texturas e modelos 3D em
`assets/`. O backend ainda não serve essas pastas.

## Alinhamentos pendentes

- [ ] Conferir os arquivos produzidos na mesma data por Tiago e Giovanna.
- [ ] Trocar os componentes necessários, preservando os originais da equipe.
- [ ] Verificar quais recursos de RA existentes já podem ser reutilizados.
- [ ] Combinar os próximos passos de integração.
- [ ] Definir biblioteca de RA, formatos e caminhos do baú 3D e das cartas.
- [ ] Definir como servir o frontend e acessar a câmera (HTTPS e dispositivos).
- [ ] Combinar origens e portas do frontend para configurar CORS quando necessário.
- [ ] Combinar os contratos futuros de autenticação, catálogo e coleção.

Nenhum arquivo da Giovanna ou componente de RA foi encontrado nesta cópia inicial.
Esses alinhamentos não foram realizados ou confirmados durante esta implementação.
O álbum não terá limite diário; essa funcionalidade pertence a uma próxima tarefa.
