# Main Rules

- Concise interactions/commits in Portuguese
- Never add features user didn't specify
- Feature-based organization, not table-based
- Convex mutations for writes, queries for reads
- shadcn/ui mandatory for all UI
- Always check permissions before showing UI elements
- Audit all entity changes via createFieldAuditLogs

## Workflows obrigatorios

- **Nova demanda** → executar `workflow-analysis.md` (PRD primeiro, codigo depois)
- **Nova worktree** → seguir `worktree-create.md`
- **Features simultaneas** → seguir `worktree-parallel.md`
- **Integrar feature** → seguir `worktree-rebase.md`

## PRD Lifecycle

| Pasta | Estado |
|-------|--------|
| `docs/implementations/not-started/` | Planejado, aguardando implementacao |
| `docs/implementations/wip/` | Em execucao |
| `docs/implementations/ready/` | Concluido |
