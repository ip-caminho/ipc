# Central do Site Público — PRD executável

> Documento de execução. Detalhado para implementação com mínima intervenção:
> assinaturas exatas, snippets para copiar, padrões reais do projeto, comandos e
> critérios de aceite testáveis por fase. Toda `arquivo:linha` foi verificada
> contra o código em 30/06/2026 (pode deslocar com edições — reconfirme antes).

## 1. Escopo

Painel único no chrMS (`/admin/site-publico`) onde uma equipe dedicada mantém
**tudo que alimenta o site público** — Informações da igreja, Agenda
(cultos + eventos), Avisos do culto e Inscrições — sem ser dev nem saber de qual
tabela cada bloco vem. Cria o que falta (editor de Informações, curadoria de
avisos, agenda consolidada) e dá uma casa comum ao que já existe.

**Princípio: agregar, não duplicar.** Cada seção lê o que está no ar, edita na
fonte certa (ou no painel quando a fonte é confusa) e oferece "ver no site".

## 2. Decisões fechadas

1. Painel **completo**: F0 → F3.
2. **Papel novo `comunicacao`** para a equipe do site.
3. Avisos do site **seguem vindo do culto (IA)**; a curadoria existe só para
   corrigir erro de transcrição (e ajustar título/descrição/quando/onde).
4. `comunicacao` **só cria/edita evento de calendário**; cultos no painel são
   leitura + atalho ao módulo de escalas (papel **sem** `escalas:*`).
5. Permissões de `comunicacao`: `site_publico:manage` + `calendario:read/create/
   update/delete` + `gravacoes:read`.
6. **F3 incluída**: textos curtos (`site.*`) editáveis; editorial denso continua MDX.
7. `/avisos` (tabela manual) **mantém-se** como pauta interna; não alimenta o site.

## 3. Modelos afetados

**NENHUMA alteração em `convex/schema.ts`.** `role`/`permissions` em `membros` são
`v.string()`/`v.array(v.string())`; `preferencias` é key-value `{chave, valor}`.

| Tabela | Uso | Mudança |
|--------|-----|---------|
| `preferencias` (`igreja.*`, novas `site.*`) | fonte única de Informações + textos | leitura/escrita, sem schema |
| `rolePermissions` | grava papel `comunicacao` | dado (via sync), sem schema |
| `gravacoes` (`iaAvisos`) | curadoria dos avisos do site | edição de campo, sem schema |
| `cultos` | agenda — leitura/atalho | nenhuma |
| `calendarioEventos` | agenda — criar/editar evento | nenhuma (campo `tipo` já existe) |
| `inscricoesEvento` | já no painel | nenhuma |
| `auditLogs` | trilha das mudanças | inserts (via helper) |

## 4. Convenções obrigatórias (padrões reais do projeto)

O executor DEVE seguir estes padrões — confirmados no código, divergem de defaults:

- **Forms:** o projeto **não usa** `<Form>/<FormField>/<FormItem>` do shadcn (não
  existe `shared/components/ui/form.tsx`). Padrão real: schema Zod em
  `lib/validations.ts` (`import { z } from "zod/v4"`) → `useForm({ resolver:
  zodResolver(schema) })` → `<Label htmlFor>` + `<Input {...form.register("x")}>`
  + erro manual `{form.formState.errors.x && <p className="text-xs
  text-destructive">…</p>}`. `Select` via `form.watch`/`form.setValue`. Listas
  (ex.: horários) via `useFieldArray`.
- **Página admin:** `"use client"`; envolver o default export em
  `<PermissionGate permission="site_publico:manage" fallback={…}>`; conteúdo dentro
  de `<HeaderLayout>` + `<PageHeader title="…" />`.
- **Imports canônicos:**
  ```ts
  import { useQuery, useMutation } from "convex/react";
  import { api } from "@/convex/_generated/api";
  import type { Id } from "@/convex/_generated/dataModel";
  import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
  import { PageHeader } from "@shared/components/layout/PageHeader";
  import { PermissionGate } from "@shared/components/auth/PermissionGate";
  import { toast } from "sonner";
  ```
- **TS2589:** prefixar chamadas `useQuery`/`useMutation`/`fetchQuery` de Convex com
  `// @ts-ignore Convex TS2589` (padrão do projeto conforme `api.d.ts` cresce).
- **Toast:** `toast.success("…")`; em catch `toast.error(e instanceof Error ?
  e.message : "…")`.
- **Backend writes:** `requirePermission(ctx, "perm")` (de
  `../_shared/requirePermission`) no topo do handler; auditar com
  `createFieldAuditLogs(ctx, old, new, tabela, recordId?)` (UPDATE) ou
  `createActionAuditLog(ctx, "CREATE"|"DELETE", tabela, id)` (de
  `../_shared/auditHelpers`).
- **Convex bandwidth:** sempre `.withIndex(...)`, nunca `.filter()`; `.unique()`/
  `.first()` para 1 registro.
- **Sidebar:** itens vêm de `shared/constants/navigation.ts` (`NavItem` com campo
  `permission`); **não** se mexe em `AppSidebar.tsx`.

## 5. Permissões — papel `comunicacao`

`role` é `v.string()` → **não toca schema**. Mudanças (todas verificadas):

**5.1 `types/auth.ts:1-8`** — adicionar `"comunicacao"` ao union `Role`:
```ts
export type Role = "admin" | "pastor" | "presbitero" | "obreiro" | "secretaria" | "secretario_executivo" | "membro" | "comunicacao";
```
`site_publico:manage` **já existe** no union `Permission` (`types/auth.ts:56`) — nada a fazer.

**5.2 `convex/preferencias/rbacHelpers.ts`** — inserir antes do `};` (linha 143):
```ts
  // Equipe de comunicacao / manutencao do site publico.
  comunicacao: [
    "site_publico:manage",
    "calendario:read", "calendario:create", "calendario:update", "calendario:delete",
    "gravacoes:read",
  ],
```

**5.3 `convex/preferencias/rbac.ts:237`** — `VISIBLE_ROLES`:
```ts
const VISIBLE_ROLES = ["membro", "obreiro", "secretaria", "presbitero", "pastor", "comunicacao"];
```

**5.4 `features/preferencias/components/PermissionMatrix.tsx:41-57`** — adicionar a
`ROLE_LABELS`, `ROLE_COLORS` e `VISIBLE_ROLES`:
```ts
// ROLE_LABELS
comunicacao: "Comunicação",
// ROLE_COLORS
comunicacao: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
// VISIBLE_ROLES → acrescentar "comunicacao"
```

**5.5 `app/(ready)/admin/permissoes/page.tsx:35-53`** — `AVAILABLE_ROLES` (antes de
`"admin"`), `ROLE_LABELS`, `ROLE_COLORS` (mesmos valores de 5.4).

**5.6 Pós-deploy (dev e prod):** gravar na tabela `rolePermissions`:
```bash
npx convex run preferencias/rbac:syncRolePermissionsFromCode '{}'          # dev
npx convex run preferencias/rbac:syncRolePermissionsFromCode '{}' --prod    # prod
```
(`internalMutation`, args `{}`; faz patch das existentes + insert das novas.)

### 5.7 Ajustes de enforcement (backend)
- **Informações:** `upsertPreferencia` usa `requireAdmin` hardcoded
  (`mutations.ts:5-18,20-48`). Criar `updateIgrejaInfo` que exige
  `requirePermission(ctx, "site_publico:manage")` (admin tem `"*"`, segue podendo).
- **Avisos:** `gravacoes.mutations.update` (`mutations.ts:42-67`) **não** exige
  permissão e aceita `data: v.any()`. Criar `corrigirAvisosCulto` escopada só a
  `iaAvisos` + `site_publico:manage`.

## 6. Especificação por fase

> Cada fase = 1 branch/PR (`feature/central-site-f0` … `-f3`). Feature toca RBAC
> (danger zone) → **roda sozinha, sem paralelismo**. Fluxo por PR: branch →
> `npm run lint` + `npx tsc --noEmit` + `npm test` → push (preview) → revisão →
> `merge --ff-only`. Convex prod só com OK explícito do André.

### F0 — Fundação (papel + casa)

**Backend/RBAC:** itens 5.1–5.6.

**Sidebar — `shared/constants/navigation.ts`** (seção "Administração", ~linha 219):
```ts
{
  label: "Site público",
  href: "/admin/site-publico",
  icon: Globe, // importar de lucide-react
  description: "Manutenção do site: informações, agenda, avisos, inscrições",
  permission: "site_publico:manage",
},
```

**Hub — `app/(ready)/admin/site-publico/page.tsx` (novo):** `"use client"`,
`PermissionGate permission="site_publico:manage"`, `HeaderLayout` + `PageHeader
title="Site público"`. Grid de `Card`s-link (shadcn `Card` + `next/link`):
- **Informações** → `/admin/site-publico/informacoes`
- **Agenda** → `/admin/site-publico/agenda`
- **Avisos** → `/admin/site-publico/avisos`
- **Inscrições** → `/admin/site-publico/inscricoes` (já existe)
- **Ver o site** → `/` (`target="_blank"`)

**Inscrições:** nenhuma mudança de código — a página já é protegida por
`site_publico:manage`. O card do hub aponta para ela.

**DevContext:** `shared/components/layout/DevContext.tsx` — entradas das páginas
novas.

**Aceite F0:**
- [ ] Usuário com role `comunicacao` vê "Site público" na sidebar e abre o hub.
- [ ] Usuário sem `site_publico:manage` não vê o item nem acessa (fallback).
- [ ] Matriz de permissões (`/admin/permissoes`) lista "Comunicação".
- [ ] `npx convex run …:syncRolePermissionsFromCode` executou em dev e prod.
- [ ] Papéis existentes intactos (testar `can()` de secretaria/membro).
- [ ] `lint` + `tsc` + `test` limpos.

### F1 — Informações (+ religar leitura ao banco)

**Backend — `convex/preferencias/mutations.ts`:** criar `updateIgrejaInfo`:
```ts
// imports a adicionar no arquivo:
// import { requirePermission } from "../_shared/requirePermission";
// import { createFieldAuditLogs } from "../_shared/auditHelpers";

const IGREJA_KEYS = ["nome","descricao","endereco","googleMapsEmbed","horarios",
  "whatsapp","telefone","email","banco","agencia","conta","pix"] as const;

async function lerIgrejaInfo(ctx: any) {
  const prefs = await ctx.db.query("preferencias").collect();
  const out: Record<string, unknown> = {};
  for (const p of prefs) if (p.chave.startsWith("igreja.")) out[p.chave.replace("igreja.","")] = p.valor;
  return out;
}

export const updateIgrejaInfo = mutation({
  args: {
    nome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    endereco: v.optional(v.string()),
    googleMapsEmbed: v.optional(v.string()),
    horarios: v.optional(v.array(v.object({ dia: v.string(), horario: v.string(), tipo: v.string() }))),
    whatsapp: v.optional(v.string()),
    telefone: v.optional(v.string()),
    email: v.optional(v.string()),
    banco: v.optional(v.string()),
    agencia: v.optional(v.string()),
    conta: v.optional(v.string()),
    pix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "site_publico:manage");
    const antes = await lerIgrejaInfo(ctx);
    for (const [k, valor] of Object.entries(args)) {
      if (valor === undefined) continue;
      const chave = `igreja.${k}`;
      const existing = await ctx.db.query("preferencias").withIndex("by_chave", (q) => q.eq("chave", chave)).unique();
      if (existing) await ctx.db.patch(existing._id, { valor, atualizadoPor: membro._id, atualizadoEm: Date.now() });
      else await ctx.db.insert("preferencias", { chave, valor, atualizadoPor: membro._id, atualizadoEm: Date.now() });
    }
    const depois = await lerIgrejaInfo(ctx);
    await createFieldAuditLogs(ctx, antes, depois, "preferencias", "igreja");
  },
});
```

**Frontend:**
- `features/site-publico/lib/validations.ts` (novo) — `igrejaInfoSchema` (zod/v4)
  com os campos acima; `horarios: z.array(z.object({dia,horario,tipo})).optional()`.
- `features/site-publico/components/InformacoesSiteForm.tsx` (novo) — client; RHF
  `register` + `Label`/`Input`/`Textarea`; seções **Identidade / Contato & local /
  Horários (useFieldArray) / Financeiro**; `defaultValues` = `getIgrejaInfo`;
  submit → `useMutation(api.preferencias.mutations.updateIgrejaInfo)` + toast.
- `app/(ready)/admin/site-publico/informacoes/page.tsx` (novo) — padrão da §4;
  `// @ts-ignore` + `useQuery(api.preferencias.queries.getIgrejaInfo)`; passa ao form.

**Religar leitura (fonte única, com fallback) — `features/site-publico/lib/igreja.ts` (novo):**
```ts
import { IGREJA_SEO } from "./seo";
export const IGREJA_DEFAULTS = {
  endereco: "Rua Pedra Azul, 674A — Vila Mariana, São Paulo, SP",
  horario: "Domingos · 10h",
  email: IGREJA_SEO.email,
  // … demais defaults atuais
};
```
- `SiteFooter.tsx` — tornar server async: `const i = await getIgrejaInfoPublic()`;
  usar `i.endereco ?? IGREJA_DEFAULTS.endereco`, `i.email ?? …` etc.
- `app/(public)/(site)/visite/page.tsx` — `i.endereco ?? IGREJA_DEFAULTS.endereco`;
  horários de `i.horarios` (formatado) com fallback ao texto fixo.
- `features/site-publico/lib/seo.ts` — `churchJsonLd(info?: IgrejaInfo)` usa
  `info?.endereco`/`info?.horarios` quando presentes, senão `IGREJA_SEO`; o layout
  `(public)` passa `getIgrejaInfoPublic()`.

**Aceite F1:**
- [ ] Editar Informações no painel persiste (`getIgrejaInfo` reflete) e audita.
- [ ] `/visite`, rodapé e JSON-LD refletem o banco após `revalidate` (≤15 min) ou
      rebuild; com banco vazio, mostram o fallback (sem crash).
- [ ] Não-autorizado é barrado na mutation (`requirePermission`).
- [ ] `lint` + `tsc` + `test` limpos.

### F2 — Avisos do site + Agenda

**Backend — avisos (`convex/gravacoes/mutations.ts`):** criar `corrigirAvisosCulto`
(escopada a `iaAvisos`; **preserva** campos não editados — contato/dataEvento):
```ts
// + import { requirePermission } from "../_shared/requirePermission";
export const corrigirAvisosCulto = mutation({
  args: {
    gravacaoId: v.id("gravacoes"),
    avisos: v.array(v.object({
      titulo: v.string(),
      descricao: v.string(),
      quando: v.optional(v.union(v.string(), v.null())),
      onde: v.optional(v.union(v.string(), v.null())),
      dataEvento: v.optional(v.union(v.string(), v.null())),
      contatoNome: v.optional(v.union(v.string(), v.null())),
      contatoWhatsapp: v.optional(v.union(v.string(), v.null())),
    })),
  },
  handler: async (ctx, { gravacaoId, avisos }) => {
    await requirePermission(ctx, "site_publico:manage");
    const old = await ctx.db.get(gravacaoId);
    if (!old) throw new Error("Gravacao nao encontrada");
    await ctx.db.patch(gravacaoId, { iaAvisos: avisos });
    const novo = await ctx.db.get(gravacaoId);
    await createFieldAuditLogs(ctx, old, novo, "gravacoes", gravacaoId);
  },
});
```
> Nota: a tela carrega `iaAvisos` completo (com contato/dataEvento) e reenvia esses
> campos no save mesmo sem editá-los, para não apagá-los. Contato/WhatsApp seguem
> **não** expostos no site (`public/avisos.ts` já omite).

**Backend — query da curadoria (`convex/site/queries.ts`, novo):**
`getGravacaoDoSite` — exige `site_publico:manage`; replica a varredura de
`public/avisos.ts:listUltimoCulto` (índice `by_data` desc, teto 40, 1ª
PUBLICADO+SERMAO com `iaAvisos`), mas retorna `{ gravacaoId, data, titulo, avisos
}` com `iaAvisos` **completo** (admin pode ver contato).

**Frontend — avisos:**
- `features/site-publico/components/AvisosCuradoria.tsx` (novo) — baseado no
  `AvisosEditor` inline (`gravacoes/[id]/admin/page.tsx:168-260`), **ampliado** com
  campos `quando`/`onde`; salva via `corrigirAvisosCulto`.
- `app/(ready)/admin/site-publico/avisos/page.tsx` (novo) — carrega
  `getGravacaoDoSite`; cabeçalho "Estes avisos do culto de DD/MM aparecem no site";
  `AvisosCuradoria`; nota explicativa ("site = avisos do culto/IA; `/avisos` é pauta
  interna"); atalho "abrir gravação" (`/gravacoes/[id]/admin`).

**Frontend — agenda:**
- `app/(ready)/admin/site-publico/agenda/page.tsx` (novo) — lista consolidada via
  `// @ts-ignore useQuery(api.public.agenda.list, {})`: **eventos** editáveis,
  **cultos** só leitura (badge "culto") + atalho a `/cultos`. Botão "Novo evento"
  reusa `features/calendario/components/EventoForm` →
  `api.calendario.mutations.create` (papel tem `calendario:create`).

**Aceite F2:**
- [ ] Corrigir título/descrição/quando/onde de um aviso no painel reflete no site
      (revalidate ≤5 min); contato/dataEvento preservados; site não expõe contato.
- [ ] Criar evento no painel aparece em `/agenda` com o `tipo` certo.
- [ ] Cultos aparecem só leitura; sem `escalas:*` o papel não publica culto.
- [ ] Não-autorizado barrado em `corrigirAvisosCulto`/`getGravacaoDoSite`.
- [ ] `lint` + `tsc` + `test` limpos.

### F3 — Textos das páginas

- **Backend:** chaves `site.*` em `preferencias` (`site.heroTitulo`,
  `site.heroSub`, `site.visiteOQueEsperar`). Generalizar uma mutation
  `updateTextosSite` (mesmo padrão de `updateIgrejaInfo`, `site_publico:manage`).
  Query pública `getTextosSite` + helper cacheado `getTextosSitePublic`.
- **Frontend:** seção "Textos" no painel de Informações (ou
  `/admin/site-publico/textos`). Home (`app/(public)/(site)/page.tsx`) e `/visite`
  leem os textos com **fallback** aos valores atuais. Editorial denso
  (`/quem-somos`, MDX) **não** entra.

**Aceite F3:**
- [ ] Editar hero/textos no painel reflete na home/visite (fallback se vazio).
- [ ] `/quem-somos` segue em MDX.

## 7. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Religar leitura ao banco e o banco esvaziar | `IGREJA_DEFAULTS` como fallback (`?? default`) em footer/visite/seo. |
| RBAC é danger zone | Feature sozinha; rodar `sync` em dev+prod; testar `can()`/Gates dos papéis existentes. |
| `corrigirAvisosCulto` apagar contato/dataEvento | Mutation aceita todos os campos; tela recarrega e reenvia os não editados. |
| `gravacoes.mutations.update` aberto | Não reusar no painel; usar `corrigirAvisosCulto` escopada + permissão. |
| Equipe confunde `/avisos` manual com o site | Nota explícita na tela de Avisos do painel. |
| Permissão amplas no papel | Só `site_publico:manage` + `calendario:*` + `gravacoes:read` (sem `escalas:*`). |
| TS2589 em chamadas Convex | `// @ts-ignore Convex TS2589` no padrão do projeto. |

## 8. Ordem e validação final

1. F0 → F1 → F2 → F3, sequencial (RBAC). Branch + PR por fase.
2. Por PR: `npm run lint`, `npx tsc --noEmit`, `npm test`; push → preview;
   `merge --ff-only`.
3. Convex prod (`npx convex deploy`) e o `sync` da F0 **só com OK explícito**.
4. Validação prod por fase: editar no painel e conferir reflexo em
   `ipc-pi-ten.vercel.app` (`/`, `/visite`, `/agenda`).

## 9. Inventário de arquivos

**Criar:** `app/(ready)/admin/site-publico/page.tsx`, `…/informacoes/page.tsx`,
`…/agenda/page.tsx`, `…/avisos/page.tsx`; `features/site-publico/components/{
InformacoesSiteForm,AvisosCuradoria}.tsx`; `features/site-publico/lib/{validations,
igreja}.ts`; `convex/site/queries.ts`.

**Modificar:** `types/auth.ts`; `convex/preferencias/{rbacHelpers,rbac,mutations}.ts`;
`convex/gravacoes/mutations.ts`; `features/preferencias/components/PermissionMatrix.tsx`;
`app/(ready)/admin/permissoes/page.tsx`; `shared/constants/navigation.ts`;
`shared/components/layout/DevContext.tsx`; `features/site-publico/lib/{seo,data}.ts`;
`features/site-publico/components/SiteFooter.tsx`; `app/(public)/(site)/visite/page.tsx`;
(F3) `app/(public)/(site)/page.tsx`.

**Sem mudança:** `convex/schema.ts`; página/Builder de Inscrições.
