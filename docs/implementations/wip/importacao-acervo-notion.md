# Importacao do acervo do Notion (issue #297)

## Escopo
Levar o acervo da biblioteca (base publica do Notion, ~345 livros) para o modulo Biblioteca, com proprietario por exemplar e emprestimos em aberto.

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| exemplares | + `proprietarioNome?`, `proprietarioMembroId?` (ausente = acervo da igreja) |
| livros, exemplares, emprestimos, livroEventos | carga via importacao |

## Permissoes
- Importacao: so via CLI (`internalAction`), sem endpoint publico.
- UI: detalhe do livro mostra o proprietario para quem tem `biblioteca:read`. Ficha publica nao mostra.

## Impacto em Shared
- [x] `convex/schema.ts` (campos opcionais, sem migracao)
- [x] `shared/components/layout/DevContext.tsx`

## Decisoes (04/11/2026)
- Proprietario = campo novo; "IPC" no Notion = acervo da igreja (campo vazio).
- Codigo: numero do Notion vira `BIB-NNNN`. Numeros repetidos (7) e o sem numero ganham codigo a partir do maior + 1 — reetiquetar so esses.
- Mesmo titulo + mesmo autor = um livro com varios exemplares.
- "Em posse de" + data vira emprestimo ATIVO (prazo 14 dias) quando o nome casa com exatamente um membro; senao fica em `observacoes` do exemplar.
- Capas existentes (29) sao baixadas e reenviadas ao B2 (`biblioteca-capas/`).
- Enriquecimento (editora/ISBN/capa) so depois de revisao manual da planilha (coluna `usar_sugestao`). Fonte: Google Books com `GOOGLE_BOOKS_API_KEY` (cota anonima da API e zero); sem chave, Open Library (`lang=pt`, edicao em portugues).

## Fluxo
```bash
node scripts/importar-acervo-notion.mjs preparar          # Notion (+ Google Books/Open Library) -> .local-data/biblioteca/
# revisar .local-data/biblioteca/acervo-revisao.csv (coluna usar_sugestao)
# .local-data/biblioteca/ajustes.json: exemplares a juntar na mesma obra e correcoes de titulo/autor/idioma
node scripts/importar-acervo-notion.mjs conferir          # grava payload.json, nao toca no Convex
node scripts/importar-acervo-notion.mjs importar --dry-run --prod
node scripts/importar-acervo-notion.mjs importar --prod
```
Idempotente pelo codigo do exemplar: rodar de novo pula o que ja entrou.

## Arquivos
| Arquivo | Acao |
|---------|------|
| `convex/schema.ts` | campos de proprietario |
| `convex/biblioteca/importacao.ts` | query/mutation/action de importacao |
| `convex/__tests__/bibliotecaImportacao.integration.test.ts` | testes |
| `app/(ready)/biblioteca/[id]/page.tsx` | mostra proprietario/observacoes |
| `scripts/importar-acervo-notion.mjs` | preparar + importar em lotes |
