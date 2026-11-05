# Consulta publica do acervo (issue #304)

## Escopo
Rota `/acervo`, sem login e so leitura: fileiras em 3D por categoria, busca, lista e ficha do livro.

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| livros, livroCategorias | carga da classificacao via `aplicarCategorias` (CLI) |

## Permissoes
Publica. Mostra capa, titulo, autor, ano, editora, sinopse, categoria, codigo e disponibilidade. Nao mostra dono do exemplar, doador, observacoes nem quem esta com o livro.

## Impacto em Shared
- [x] `middleware.ts` (rota publica)
- [x] `shared/components/layout/DevContext.tsx`
- [ ] Nao toca `schema.ts`

## Decisoes
- Catalogo em `unstable_cache` de 1h: o Convex le o acervo no maximo 1x/hora, seja qual for o numero de visitantes. Disponibilidade na fileira pode atrasar ate 1h; a ficha aberta mostra a situacao atual.
- Pagina montada a cada visita (`connection()`), para uma falha do backend nao ficar presa em pagina estatica. Falha nao entra no cache.
- Sinopse fora do catalogo: `getPublicByCodigo`, so com a ficha aberta.
- Capas como textura passam por `/_next/image`: o CDN nao libera CORS, e o WebGL recusa imagem de outra origem.
- Three.js carregado sob demanda. Sem WebGL, a tela cai na lista.
- Classificacao: uma categoria por livro, em 15 categorias; `CATEGORIAS_PADRAO` passa a usar as mesmas, para o cadastro nao criar nomes paralelos.

## Riscos
`catalogo` e publica e le as duas tabelas inteiras (~380 KB por chamada direta). Sem dado sensivel; se houver abuso, trocar por paginas ou proteger o acesso.
