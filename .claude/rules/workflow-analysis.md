# Workflow: Analise Pre-Implementacao

Executar **antes de qualquer codigo** ao receber uma nova demanda.

## Passos

### 1. Analisar escopo
- Listar todas as tabelas do Convex tocadas
- Listar todos os arquivos frontend afetados
- Identificar se e nova feature ou modificacao
- Verificar permissoes envolvidas (auth + papel do usuario)

### 2. Verificar impacto em arquivos sensiveis
Arquivos que exigem coordenacao especial em IPC:

| Arquivo | Risco |
|---------|-------|
| `convex/schema.ts` | TODOS os modulos — nunca editar em paralelo |
| `convex/auth.ts` / `convex/auth/*` | Toda a aplicacao |
| `shared/files/components/FileUpload.tsx` | Gravacoes, Membros, Multimidia, Biblioteca |
| `shared/files/hooks/useAudioCompressor.ts` | Gravacoes |
| `convex/files/helpers.ts` | Toda feature com upload |
| `convex/_shared/auditHelpers.ts` (se existir) | Toda feature auditavel |
| `shared/components/layout/DevContext.tsx` | Toda pagina nova |

### 3. Gerar PRD
Criar `docs/implementations/not-started/<nome-feature>.md` com a estrutura:

```markdown
# <Nome da Feature>

## Escopo
<1-2 frases descrevendo o que sera feito>

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|

## Permissoes
- Quem pode usar (papeis)
- Quem pode ver (UI)

## Impacto em Shared
- [ ] Toca arquivos sensiveis? Quais?
- [ ] Risco de regressao em quais features?

## Riscos
<listar riscos e dependencias>

## Arquivos a Criar/Modificar
| Arquivo | Acao | Descricao |

## Ordem de Implementacao
1. ...
```

### 4. Sugerir worktrees
Apos PRD gerado e aprovado, aplicar `worktree-create.md` e/ou `worktree-parallel.md`.

## PRD Lifecycle

```
Planejamento  → docs/implementations/not-started/<feature>.md
Em execucao   → mover para docs/implementations/wip/<feature>.md
Concluido     → mover para docs/implementations/ready/<feature>.md
                (ou remover se virou docs em docs/features/)
```
