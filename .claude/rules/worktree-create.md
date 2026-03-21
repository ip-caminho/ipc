# Workflow: Criacao de Worktree

## Passos

```bash
# 1. Garantir que main esta atualizado
cd /Users/andre/projects/ipc
git checkout main
git pull

# 2. Criar worktree com nova branch
git worktree add ../ipc-<nome-feature> -b feature/<nome-feature>

# 3. Copiar variaveis de ambiente
cp .env.local ../ipc-<nome-feature>/

# 4. Instalar dependencias
cd ../ipc-<nome-feature>
npm install

# 5. Verificar que tudo funciona
npm run lint
```

## Convencoes de nomenclatura
- Worktree: `../ipc-<nome-feature>` (adjacente ao projeto principal)
- Branch: `feature/<nome-feature>` (kebab-case)

## Verificacao obrigatoria
Antes de comecar a implementar, confirmar que:
- [ ] `npm install` completou sem erros
- [ ] `npm run lint` passa
- [ ] `.env.local` foi copiado corretamente

## Apos terminar
Ver `worktree-rebase.md` para integracao.
