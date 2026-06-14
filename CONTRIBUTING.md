# Contribuindo

Guia rápido de padrões. Detalhes de stack e arquitetura em [CLAUDE.md](./CLAUDE.md).

## Fluxo

1. Toda mudança começa com uma **issue** (o quê/porquê) e entra via **PR** vinculado a ela.
2. **Sempre rebase, nunca merge** (exceto fast-forward). Ver [.claude/rules/worktree-rebase.md](./.claude/rules/worktree-rebase.md).
3. Antes de abrir PR: `npm run lint`, `npm run typecheck` e `npm test` verdes.
4. Commits atômicos, em português, no imperativo (ex: "adiciona validação de CPF").

Um hook de pre-commit (husky + lint-staged) roda `eslint --fix` nos arquivos
alterados automaticamente.

## Organização

- **Feature-based**, não table-based: código de domínio em `features/<feature>/`
  (`components/`, e `lib/`/`hooks/` quando houver lógica reutilizável).
- Backend em `convex/` (queries para leitura, mutations para escrita).
- Componentes de Uo só com **shadcn/ui** (`shared/components/ui/`) — sem HTML cru, toasts via Sonner.
- Path aliases: `@/`, `@features/`, `@shared/`, `@convex/`.

## Padrões de código

- **TypeScript**: evitar `any`. Há dívida legada (warnings no lint) sendo paga
  incrementalmente — não adicionar mais. Tipar dados vindos do Convex.
- **Estado** (nesta ordem): URL via **nuqs** (filtros/paginação) → **React Hook
  Form** + Zod (formulários) → **useState** (UI local). Dados sempre via
  `useQuery`/`useMutation` (sem `fetch` manual, salvo presigned URLs).
- **Server vs Client**: `page.tsx` deve ser Server Component quando possível;
  empurrar `"use client"` para os componentes filhos que realmente precisam.
- **Convex**: usar `.withIndex()` em vez de `.collect()` + `.filter()` em
  tabelas que crescem; paginar listas grandes; checar permissão com
  `requirePermission`/`checkPermission` (não `role === "admin"` inline).
- **Zod 4**: `import { z } from "zod/v4"`.

## Banco / arquivos sensíveis

`convex/schema.ts`, `convex/preferencias/rbac*.ts`, `shared/files/`,
`shared/components/layout/` afetam vários módulos — coordenar antes de editar em
paralelo (ver [.claude/rules/worktree-parallel.md](./.claude/rules/worktree-parallel.md)).

## Segurança

- Nunca commitar `.env.local`, credenciais ou chaves. Segredos de backend vão
  nas env vars do Convex.
- Validar nas bordas (input do usuário, APIs externas).
