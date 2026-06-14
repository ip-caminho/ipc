# IPC — Sistema de Gestão de Igreja

Sistema de gestão da Igreja Presbiteriana do Caminho (membros, gravações de
sermões, escalas, calendário, etc.).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Convex (backend real-time) · Convex Auth (OTP WhatsApp) ·
Backblaze B2 + Cloudflare (arquivos/áudio) · Vercel (deploy).

## Setup

```bash
# 1. Instalar dependências (npm é o gerenciador do projeto)
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# preencher os valores (pedir ao time os reais; CONVEX_DEPLOYMENT vem do convex dev)

# 3. Rodar frontend + backend Convex juntos
npm run dev
```

App em http://localhost:3000.

> Segredos de backend (B2, Deepgram, chaves de LLM, VAPID privado) **não** ficam
> no `.env.local` — moram nas env vars do Convex (dashboard ou `npx convex env`).

## Comandos

```bash
npm run dev            # frontend (Next) + backend (Convex) em paralelo
npm run dev:frontend   # só Next.js
npm run dev:backend    # só Convex
npm run build          # build de produção
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Vitest
```

## Documentação

- [CLAUDE.md](./CLAUDE.md) — stack, decisões arquiteturais, pipeline de áudio, convenções
- [CONTRIBUTING.md](./CONTRIBUTING.md) — padrões de código e fluxo de contribuição
- [docs/architecture/](./docs/architecture/) — modular monolith, merge strategy
- [docs/modules/](./docs/modules/) — documentação por módulo
- [.claude/rules/](./.claude/rules/) — workflows (worktree, rebase, análise pré-implementação)

## Deploy

- **Frontend:** Vercel (automático no push para `main`)
- **Backend:** Convex Cloud — `npx convex deploy` (não roda no build do Vercel)
