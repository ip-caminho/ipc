# Workflow: Analise de Paralelismo

Executar quando houver duas ou mais features para desenvolver simultaneamente.

## Passos

### 1. Mapear o que cada feature toca
Para cada feature, listar:
- Tabelas do schema afetadas
- Shared files tocados (consultar `docs/architecture/modular-monolith.md` → "Module Dependency Matrix")

### 2. Verificar conflitos — Trabalho perigoso em paralelo

| Combinacao | Risco |
|------------|-------|
| Qualquer + `schema.ts` + Qualquer + `schema.ts` | ALTO — nunca em paralelo |
| Qualquer + `rbac.ts` + Qualquer + `rbac.ts` | ALTO |
| Qualquer + `rbacHelpers.ts` + Qualquer + `rbacHelpers.ts` | ALTO |
| Qualquer + `types/auth.ts` + Qualquer + `types/auth.ts` | ALTO |
| Qualquer + `FileUpload.tsx` + Qualquer + `FileUpload.tsx` | MEDIO |
| Qualquer + `AppSidebar.tsx` + Qualquer + `AppSidebar.tsx` | MEDIO |

### Shared files criticos (danger zones)
- `convex/schema.ts` — TODOS os modulos
- `convex/preferencias/rbac.ts` — TODOS os modulos
- `convex/preferencias/rbacHelpers.ts` — TODOS os modulos
- `types/auth.ts` — tipos de auth/RBAC
- `shared/components/layout/AppSidebar.tsx` — navegacao
- `shared/components/layout/DevContext.tsx` — contexto de dev
- `shared/files/components/FileUpload.tsx` — upload de arquivos

### 3. Definir ordem
- Features que tocam shared files: implementar **sequencialmente**, shared primeiro
- Features que tocam apenas owned files: podem rodar **em paralelo**

Exemplo:
```
Feature A (toca schema.ts)  → implementar PRIMEIRO, integrar ao main
Feature B (toca schema.ts)  → rebase apos A estar no main
Feature C (owned files only) → pode rodar em paralelo com A ou B
```

### 4. Criar worktrees na ordem correta
Para cada feature aprovada para worktree, aplicar `worktree-create.md` na ordem definida.
