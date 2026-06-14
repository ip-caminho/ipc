# Workflow: Rebase e Integracao de Worktree

## Ordem de integracao
Antes de integrar, consultar `docs/architecture/modular-monolith.md` → **"Merge Strategy"**:
1. Integrar features com shared files **primeiro**
2. Rebase das worktrees restantes apos shared estar estavel no main

## Passos

```bash
# 1. Na branch da feature
cd ../ipc-<nome-feature>

# 2. Buscar atualizacoes do main
git fetch origin main

# 3. Rebase (resolver conflitos commit por commit se houver)
git rebase origin/main
# Se conflito: resolver → git add . → git rebase --continue

# 4. Verificar lint
npm run lint

# 5. Rodar testes
npm test

# 6. Voltar ao main e integrar (a partir da raiz do repo)
cd "$(git rev-parse --show-toplevel)"
git checkout main
git merge --ff-only feature/<nome-feature>
# Se nao for fast-forward: git rebase feature/<nome-feature> no main
git push

# 7. Limpar worktree e branch
git worktree remove ../ipc-<nome-feature>
git branch -d feature/<nome-feature>
```

## Verificacao de regressao em shared
Apos rebase, verificar commits que tocaram shared files:

```bash
git log --oneline origin/main..HEAD -- convex/schema.ts convex/preferencias/rbac.ts convex/preferencias/rbacHelpers.ts types/auth.ts
```

Se houver commits nesses arquivos, revisar modulos dependentes antes de integrar.

## Regras
- **Nunca usar merge** — sempre rebase
- **Nunca usar `--force-push` em main**
- Testes devem passar apos rebase antes de integrar
