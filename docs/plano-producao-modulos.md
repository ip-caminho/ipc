# Plano: Deploy para Produção + Controle de Módulos

## Objetivo

Subir o IPC para produção o mais rápido possível, com uma tela de administração para habilitar/desabilitar módulos. Assim, funcionalidades podem ser liberadas gradualmente para os usuários sem precisar de novo deploy.

---

## Módulos do Sistema

Cada item do sidebar é um módulo que pode ser ligado/desligado:

| Módulo | Rota | Permissão Atual | Prioridade |
|--------|------|------------------|------------|
| Membros | `/membros` | `membros:read` | Alta — essencial |
| Diretório | `/diretorio` | `diretorio:read` | Alta — essencial |
| Entidades | `/entidades` | `entidades:read` | Alta — essencial |
| Cultos (Escalas) | `/escalas` | `escalas:read` | Alta — essencial |
| Boletim | `/boletim` | `escalas:read` | Alta — essencial |
| Gravações | `/gravacoes` | `gravacoes:read` | Média |
| Pequenos Grupos | `/pequenos-grupos` | `pequenos_grupos:read` | Média |
| Pedidos de Oração | `/pedidos-oracao` | `pedidos_oracao:create` | Média |
| Pastoreio | `/pastoreio` | `pastoreio:read` | Baixa |
| Admin Gravações | `/admin/gravacoes` | admin-only | Interna |
| Admin Permissões | `/admin/permissoes` | admin-only | Interna |

> Módulos admin e Meu Perfil são **sempre visíveis** (não entram no toggle).

---

## Fase 1 — Infraestrutura de Módulos

### 1.1 Schema: tabela `modulos`

```typescript
// convex/schema.ts
modulos: defineTable({
  slug: v.string(),          // "membros", "diretorio", "gravacoes", etc.
  label: v.string(),         // "Membros", "Diretório", etc.
  descricao: v.string(),     // Descrição curta para o admin
  ativo: v.boolean(),        // Ligado ou desligado
  ordem: v.number(),         // Ordem de exibição
})
  .index("by_slug", ["slug"]),
```

### 1.2 Backend: `convex/modulos/`

**`convex/modulos/queries.ts`**
- `listModulos()` — retorna todos os módulos (admin). Requer role admin
- `listModulosAtivos()` — retorna apenas módulos ativos (sidebar, qualquer membro autenticado). Usada pelo frontend para esconder items

**`convex/modulos/mutations.ts`**
- `toggleModulo({ slug })` — liga/desliga módulo. Requer role admin
- `seedModulos()` — popula a tabela com todos os módulos na primeira execução (idempotente, roda via `npx convex run`)

### 1.3 Seed dos módulos

Script que roda via `npx convex run modulos.mutations:seedModulos` para criar os registros iniciais. Idempotente — se o slug já existe, não recria.

Módulos iniciais (todos `ativo: false` exceto membros/diretório/entidades que são core):

```typescript
const MODULOS_INICIAIS = [
  { slug: "membros", label: "Membros", descricao: "Cadastro e gestão de membros", ativo: true, ordem: 1 },
  { slug: "diretorio", label: "Diretório", descricao: "Diretório de contatos", ativo: true, ordem: 2 },
  { slug: "entidades", label: "Entidades", descricao: "Gestão de entidades (PF/PJ)", ativo: true, ordem: 3 },
  { slug: "escalas", label: "Cultos", descricao: "Escalas e liturgia dos cultos", ativo: false, ordem: 4 },
  { slug: "boletim", label: "Boletim", descricao: "Boletim dominical", ativo: false, ordem: 5 },
  { slug: "gravacoes", label: "Gravações", descricao: "Gravações de sermões e estudos", ativo: false, ordem: 6 },
  { slug: "pequenos-grupos", label: "Pequenos Grupos", descricao: "Gestão de pequenos grupos", ativo: false, ordem: 7 },
  { slug: "pedidos-oracao", label: "Pedidos de Oração", descricao: "Pedidos de oração da comunidade", ativo: false, ordem: 8 },
  { slug: "pastoreio", label: "Pastoreio", descricao: "Acompanhamento pastoral", ativo: false, ordem: 9 },
];
```

### 1.4 Frontend: integrar módulos no sidebar

**`shared/components/layout/AppSidebar.tsx`**

- Cada item do menu ganha um campo `modulo?: string` (o slug)
- Sidebar faz query `listModulosAtivos` e filtra: só mostra items cujo `modulo` está na lista ativa (ou que não tem `modulo`, como admin/perfil)
- Itens admin e "Meu Perfil" não têm `modulo` — sempre visíveis

```typescript
// Exemplo de item com modulo
{ label: "Gravações", href: "/gravacoes", icon: Mic, permission: "gravacoes:read", modulo: "gravacoes" },
```

### 1.5 Frontend: guard nas páginas

**`shared/components/auth/ModuloGuard.tsx`** (NOVO)

Wrapper que protege cada página de módulo. Se o módulo estiver desativado, mostra mensagem "Este módulo ainda não está disponível" e redireciona para home.

```tsx
// Uso na página:
export default function GravacoesPage() {
  return (
    <ModuloGuard modulo="gravacoes">
      {/* conteúdo da página */}
    </ModuloGuard>
  );
}
```

Isso impede acesso direto via URL mesmo que o item não apareça no sidebar.

### 1.6 Tela de admin: `/admin/modulos`

**`app/(ready)/admin/modulos/page.tsx`** (NOVO)

Tela simples com:
- Lista de cards (um por módulo)
- Cada card mostra: ícone, label, descrição, switch on/off
- Reordable (opcional, pode ser fixo)
- Somente admin

Adicionar link no sidebar:
```typescript
{ label: "Módulos", href: "/admin/modulos", icon: LayoutGrid, adminOnly: true },
```

---

## Fase 2 — Preparação para Produção

### 2.1 Convex: criar deployment de produção

```bash
# Criar projeto de produção no Convex Cloud
npx convex deploy
# Ou via dashboard: dashboard.convex.dev → criar novo deployment "production"
```

Isso gera um novo `CONVEX_DEPLOYMENT` e `NEXT_PUBLIC_CONVEX_URL` para produção.

### 2.2 Vercel: configurar projeto

1. Conectar o repo no Vercel (se ainda não estiver)
2. Configurar environment variables de produção:

| Variável | Valor |
|----------|-------|
| `CONVEX_DEPLOY_KEY` | Key do deployment de produção (Convex dashboard) |
| `NEXT_PUBLIC_CONVEX_URL` | URL do deployment de produção |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Site URL do deployment de produção |

> **Não** definir `NEXT_PUBLIC_AUTH_BYPASS_MODE` em produção (o bypass é controlado por `NODE_ENV`, que o Vercel já seta como `production`).

### 2.3 WhatsApp OTP em produção

O bypass mode é hardcoded via `NODE_ENV !== 'production'`, então em produção o OTP real precisa funcionar. Opções:

**Opção A — Provider real (WhatsApp Business API / Twilio)**
- Configurar credenciais do provider no Convex environment variables
- O `messaging/` já tem abstração de provider pronta

**Opção B — SMS temporário (Twilio SMS)**
- Mais fácil de configurar que WhatsApp Business API
- Mudar o label de "WhatsApp" para "SMS" na tela de login

**Opção C — Manter bypass com whitelist**
- Criar env var `AUTH_BYPASS_PHONES` com lista de telefones permitidos
- Só esses telefones podem logar sem OTP real
- ⚠️ Menos seguro, mas permite testar em produção com grupo restrito

**Recomendação**: Opção A ou B. O provider já está abstraído — só precisa configurar credenciais.

### 2.4 Dados iniciais (seed)

Na primeira execução em produção, rodar:

```bash
# 1. Seed de permissões (RBAC)
npx convex run preferencias.rbac:seedRolePermissions

# 2. Seed de módulos
npx convex run modulos.mutations:seedModulos

# 3. Criar primeiro admin manualmente
# (via Convex dashboard ou script dedicado)
```

### 2.5 Domínio

- Configurar domínio custom no Vercel (ex: `app.ipc.org.br`, `ipc.yhc.com.br`)
- Atualizar `NEXT_PUBLIC_CONVEX_SITE_URL` se necessário

---

## Fase 3 — Deploy e Validação

### 3.1 Checklist pré-deploy

- [ ] `npm run build` passa sem erros
- [ ] `npm test` passa (164 testes)
- [ ] Tabela `modulos` no schema
- [ ] Seed de módulos funciona
- [ ] Toggle de módulos funciona (admin liga/desliga)
- [ ] Sidebar respeita módulos ativos
- [ ] ModuloGuard bloqueia acesso direto via URL
- [ ] Tela `/admin/modulos` funciona
- [ ] WhatsApp OTP / SMS provider configurado (ou bypass controlado)
- [ ] Variables de produção configuradas no Vercel

### 3.2 Processo de deploy

```bash
# 1. Deploy do backend (Convex)
npx convex deploy

# 2. Deploy do frontend (Vercel)
# Automático via push para main, ou:
vercel --prod

# 3. Seeds em produção
npx convex run --prod preferencias.rbac:seedRolePermissions
npx convex run --prod modulos.mutations:seedModulos
```

### 3.3 Plano de liberação gradual

1. **Semana 1**: Só admin — testar tudo em produção com dados reais
2. **Semana 2**: Ligar módulos core (Membros, Diretório, Entidades) — convidar secretaria
3. **Semana 3+**: Ligar módulos um por um conforme validar:
   - Cultos + Boletim (escalas prontas)
   - Gravações (precisa de pipeline IA funcionando)
   - Pequenos Grupos, Pedidos de Oração
   - Pastoreio

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `convex/schema.ts` | Adicionar tabela `modulos` |
| `convex/modulos/queries.ts` | NOVO — queries de módulos |
| `convex/modulos/mutations.ts` | NOVO — toggle + seed |
| `shared/components/auth/ModuloGuard.tsx` | NOVO — guard de página |
| `shared/components/layout/AppSidebar.tsx` | Integrar filtro por módulos ativos |
| `app/(ready)/admin/modulos/page.tsx` | NOVO — tela de toggle de módulos |

---

## Estimativa de esforço

| Fase | Itens |
|------|-------|
| **Fase 1** (módulos) | Schema, backend, sidebar, guard, tela admin |
| **Fase 2** (produção) | Convex deploy, Vercel config, WhatsApp provider, seed, domínio |
| **Fase 3** (go-live) | Validação, deploy, liberação gradual |

> Fase 1 é o que precisa ser **implementado**. Fases 2 e 3 são **configuração e operação**.
