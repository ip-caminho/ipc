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

## Pipeline de Audio (Gravacoes)

```
Selecao → Compressao (FFmpeg.wasm) → Validacao pos-compressao → Upload (B2) → IA (Deepgram + Claude)
```

1. **Selecao**: `FileUpload` com `accept="audio/*"` no `GravacaoForm`
2. **Sem limite de tamanho na entrada**: audio aceita qualquer tamanho (WAV de 600MB ok). Limite so se aplica apos compressao. Para outros tipos de arquivo (fotos, PDFs), o limite (maxSizeMB) vale antes do upload.
3. **Compressao client-side** (`useAudioCompressor`):
   - FFmpeg.wasm single-threaded (core do jsDelivr CDN)
   - Converte qualquer audio para **64kbps mono MP3** (`-vn -ac 1 -ab 64k -acodec libmp3lame`)
   - Pula compressao se ja for MP3 < 5MB
   - UI: "Comprimindo audio... X%" + toast com reducao de tamanho
4. **Validacao pos-compressao**: Rejeita se comprimido ainda > maxSizeMB (100MB no GravacaoForm)
5. **Upload**: Presigned URL (S3 SDK → B2), chave `gravacoes-audio/{entityId}_{timestamp}.mp3`
6. **CDN**: URL publica via `https://cdn.yhc.com.br/` (Cloudflare + B2 Bandwidth Alliance)
7. **Pipeline IA** (acionado por botao "Processar com IA"):
   - Backend baixa audio do CDN → buffer
   - **Deepgram** (nova-2, pt-BR, paragraphs:true) → transcricao com timestamps por paragrafo
   - **Claude Sonnet** → analise teologica, deteccao de inicio/fim do sermao e avisos
   - Salva: transcricao, resultado IA, `inicioSermao`/`fimSermao`, `inicioAvisos`/`fimAvisos`, `iaAvisos`
8. **Playback**: Media Fragment URI (`#t=inicio,fim`) restringe seek ao trecho do sermao/avisos

### Arquivos-chave

- `shared/files/hooks/useAudioCompressor.ts` — FFmpeg.wasm hook
- `shared/files/components/FileUpload.tsx` — componente de upload com compressao integrada
- `shared/files/components/SecureAudioPlayer.tsx` — player com restricao de trecho via Media Fragment
- `convex/gravacoes/aiAction.ts` — pipeline Deepgram + Claude (internalAction)
- `convex/gravacoes/ai.ts` — mutations para iniciar processamento e salvar resultados
- `convex/files/helpers.ts` — S3/B2 helpers, CDN URL, presigned upload
- `features/gravacoes/components/AvisosSection.tsx` — exibicao dos avisos com player

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

## DevContext

Ao criar ou modificar uma pagina, **sempre** atualizar o `CONTEXT_MAP` em `shared/components/layout/DevContext.tsx`:
- Nova pagina → adicionar entrada com nome, pagina, arquivos, queries, mutations, componentes, notas
- Pagina modificada (novos queries/mutations/componentes) → atualizar a entrada existente
- Rota dinamica → adicionar pattern no `resolveRoute()`
- O DevContext so e visivel para admins (double-click no canto inferior direito)
