# Lista paginada da biblioteca (issue #302)

## Escopo
Fazer `/biblioteca` ler so a pagina exibida, em vez do acervo inteiro a cada abertura.

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| livroCategorias | nova: uma linha por par categoria + livro (`by_categoria`, `by_livro`) |

Nenhum livro em producao tem categoria, entao nao ha carga inicial.

## Permissoes
Sem mudanca: `biblioteca:read` nas queries; botao de atrasados so com `biblioteca:emprestar`.

## Impacto em Shared
- [x] `convex/schema.ts` (tabela nova, sem migracao)
- [x] `shared/components/layout/DevContext.tsx`

## Decisoes
- `livros.categorias` continua sendo a fonte exibida; `livroCategorias` serve so de indice. Toda escrita passa por `sincronizarCategorias`.
- `list` passa a exigir `paginationOpts` e devolve so os campos do card.
- Busca + categoria filtra a pagina ja lida: pode vir curta, e "Carregar mais" continua pelo cursor.
- Atrasados: `contarAtrasados` le so os emprestimos ativos; `listAtrasados` fica para a tela de atrasados.

## Publicacao
Assinatura de `list` muda: backend e frontend precisam subir juntos. O preview aponta para o backend de producao e nao abre a lista antes do deploy do Convex.

## Ordem de Implementacao
1. Tabela, helper e chamadas nas escritas
2. Queries
3. Pagina e DevContext
