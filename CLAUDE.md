# CLAUDE.md — IPC (Igreja Presbiteriana - Church Management System)

Regras e contexto para o projeto. Rules em `.claude/rules/` sao carregadas automaticamente.

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **UI**: shadcn/ui (New York) + Sonner (obrigatorio, sem HTML cru)
- **Backend**: Convex (real-time serverless)
- **Auth**: Convex Auth + WhatsApp OTP (bypass em dev via NODE_ENV !== 'production')
- **State**: nuqs (URL) → React Hook Form (forms) → useState (local)
- **Forms**: React Hook Form + Zod 4
- **Tables**: TanStack Table v8
- **Testes**: Vitest
- **Arquivos**: Backblaze B2 via presigned URL (upload direto do browser)
- **Deploy**: Vercel (web) + Convex Cloud (backend)

## Path Aliases

```
@/*          # root
@features/*  # features/
@shared/*    # shared/
@convex/*    # convex/
```

## Estrutura

```
app/
  (auth)/         # Rotas publicas (signin, convite)
  (ready)/        # Rotas autenticadas com sidebar
features/         # Modulos de dominio (membros/, gravacoes/)
shared/           # Componentes, providers, hooks, utils
convex/           # Backend (schema, queries, mutations, auth)
types/            # TypeScript types
```

## Decisoes Arquiteturais

- **Entidades**: Tabela polimorfica base (PF/PJ com papeis). Membros e extensao com auth + RBAC
- **Criacao atomica**: Entidade + Membro criados na mesma mutation
- **RBAC**: 3 roles iniciais (admin, secretaria, membro). Sem heranca — permissoes explicitas
- **Bypass mode**: Hardcoded `NODE_ENV !== 'production'` — nunca configuravel por env var
- **Audit**: Campos CPF/RG mascarados nos logs (ex: ***.456.789-**)
- **Self-service**: Ownership check no backend (membro.userId === ctx.auth.userId)
- **Status check**: Membros TRANSFERIDO/DESLIGADO/INATIVO bloqueados no login
- **Upload de arquivos**: Sempre usar o modulo `shared/files/` (componente `FileUpload` + hook `useFileUpload`). Upload via presigned URL direto para B2 — nunca via base64/Convex action (limite de 10MB). Backend em `convex/files/`

## Comandos

```bash
npm run dev              # Frontend + Convex
npm run dev:frontend     # Apenas Next.js
npm run dev:backend      # Apenas Convex
npm run build            # Build de producao
npm run lint             # ESLint
npm test                 # Vitest
```

## Convencoes

- Commits concisos em portugues
- Zod 4: usar `import { z } from "zod/v4"`
- shadcn/ui obrigatorio para todos os componentes de UI
- Feature-based organization, nao table-based
- Convex mutations para writes, queries para reads
