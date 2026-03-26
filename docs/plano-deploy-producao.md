# Plano: Deploy para Producao

## Contexto

Sistema IPC feature-complete. Precisa ir para producao com Vercel + Convex Cloud.
- **B2 + CDN**: ja configurados (cdn.yhc.com.br funciona)
- **WuzAPI**: ja roda na VPS do Andre (outro projeto). Vai criar novo user/sessao com chip pre-pago dedicado ao IPC
- **Contas a criar**: Convex prod deployment, projeto Vercel

---

## O que Andre precisa fazer (manual)

### 1. Chip pre-pago para WhatsApp OTP
1. Comprar chip pre-pago (~R$15)
2. Ativar WhatsApp no numero
3. No WuzAPI, criar novo user para o IPC (separado do outro projeto)
4. Parear via QR code
5. Anotar: `WUZAPI_URL` e `WUZAPI_TOKEN` do novo user

### 2. Convex producao
1. [dashboard.convex.dev](https://dashboard.convex.dev) → criar deployment de producao
2. Em Environment Variables do deployment de producao, adicionar:
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `BACKBLAZE_ENDPOINT`, `BACKBLAZE_BUCKET_NAME` (mesmos valores do dev)
   - `WUZAPI_URL`, `WUZAPI_TOKEN` (do novo user IPC)
   - `DEEPGRAM_API_KEY` (opcional, so pra gravacoes)
   - `ANTHROPIC_API_KEY` ou `GOOGLE_API_KEY` (opcional, so pra gravacoes)
3. Anotar: `CONVEX_DEPLOY_KEY` e `NEXT_PUBLIC_CONVEX_URL`

### 3. Vercel
1. [vercel.com](https://vercel.com) → conectar repo `devandrechoi/ipc`
2. Environment Variables:
   - `CONVEX_DEPLOY_KEY`
   - `NEXT_PUBLIC_CONVEX_URL`
3. Dominio custom (ex: `app.ipc.org.br`)

---

## O que Claude vai implementar

### 1. Provider WuzAPI
**`convex/messaging/wuzapiProvider.ts`** (novo):
- Implementar `IMessagingProvider` usando WuzAPI REST API
- `POST {WUZAPI_URL}/chat/send/text` com `Authorization: Bearer {WUZAPI_TOKEN}`

**`convex/messaging/service.ts`** (editar):
- Auto-detectar: se `WUZAPI_URL` presente → WuzAPI, senao → bypass

### 2. Script de seed
**`scripts/seed-prod.sh`** (novo):
```bash
npx convex run --prod preferencias/rbac:seedRolePermissions
npx convex run --prod modulos/mutations:seedModulos
npx convex run --prod preferencias/mutations:seedIgrejaInfo
```

---

## Deploy (depois que Andre configurou tudo acima)

```bash
# 1. Backend
npx convex deploy

# 2. Frontend (automatico via push para main, ou manual)
vercel --prod

# 3. Seeds
bash scripts/seed-prod.sh

# 4. Acessar site → bootstrap → criar admin
```

---

## Verificacao

1. Landing page (`/`) mostra info da igreja
2. Login com OTP real via WhatsApp funciona
3. Dashboard carrega
4. Upload de foto funciona (B2 + CDN)
5. Admin liga modulos em `/admin/modulos`
