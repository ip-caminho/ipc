# Impersonação por Usuário (admin entra como outro usuário)

Issue: ip-caminho/ipc#246

## Escopo
Admin entra no sistema como um usuário específico (não como papel), sem
conhecer a senha, para testar fluxos em **produção** com dados reais.
Substituto seguro do `NEXT_PUBLIC_AUTH_BYPASS_MODE` (que só serve em dev e
cria usuário sem papel).

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `auditLogs` | Sem mudança de schema. Nova `action`: `IMPERSONACAO_INICIO` |
| `authSessions` | Sem mudança — Convex Auth cria uma sessão real do alvo |
| `membros` / `rolePermissions` | Sem mudança. **Não** cria permissão RBAC |

## Permissões
- **Quem usa**: somente `membro.role === "admin"` (gate hard-coded no backend,
  igual a `requireAdmin` em `convex/preferencias/rbac.ts:284`).
- **Por que não uma permissão `auth:impersonate`**: admin já tem `["*"]`
  (`convex/_shared/requirePermission.ts`), e qualquer item de
  `ALL_PERMISSIONS` aparece em `/admin/permissoes` e pode ser concedido a
  outros papéis. Impersonar não pode ser concedível.
- **Quem vê a UI**: admin (sidebar/menu admin).
- **Flag de ambiente**: `ALLOW_IMPERSONATION=true` no **Convex** (não
  `NEXT_PUBLIC_*`) — sem ela o backend recusa, independente da UI.

## Como funciona (decisão arquitetural)

### Por que "flag na sessão" NÃO funciona
Convex Auth identifica o usuário pelo JWT (`subject = "userId|sessionId"`).
`getAuthUserId(ctx)` só lê o token. Um campo `impersonatedBy` em
`authSessions` não mudaria quem os 128 usos de `getAuthUserId` (60 arquivos)
enxergam. Um wrapper `getEffectiveUserId()` exigiria trocar todos esses call
sites — descartado.

### Decisão: sessão real do alvo via provider `ConvexCredentials`
1. Novo provider `ConvexCredentials({ id: "impersonate" })` em
   `convex/auth/auth.ts`.
2. `authorize(params, ctx)` (roda na action `signIn`, que **já carrega a
   identidade do admin chamador** via `ctx.auth`):
   - `process.env.ALLOW_IMPERSONATION === "true"`, senão lança.
   - Chamador é admin (`ctx.runQuery(internal...)` que checa
     `membro.role === "admin"`), senão lança.
   - Alvo existe em `users` e tem `membros.userId` (conta ativada).
   - Grava `IMPERSONACAO_INICIO` via `ctx.runMutation` (actions não têm
     `ctx.db`): `userId = adminId`, `referenciaTabela = "users"`,
     `referenciaId = targetUserId`, `to = { targetUserId }`.
   - Retorna `{ userId: targetUserId }`. Convex Auth emite tokens do alvo.
3. Cliente: `signIn("impersonate", { targetUserId })` do `useAuthActions`.
   A partir daí o app **é** o alvo — nenhuma mudança nas queries/mutations.
4. Cliente grava marcador em `sessionStorage`
   (`{ impersonando: true, adminNome, alvoNome }`) para exibir o banner.

### Saída da impersonação
`signOut()` + login normal do admin. **Não** restaura a sessão anterior
(exigiria guardar refresh token do admin no browser — frágil/sensível).
Botão "Sair da impersonação" no banner limpa o `sessionStorage` e chama
`signOut`.

### Auditoria durante a impersonação
Escritas feitas enquanto impersonado são atribuídas ao **alvo** pelos
helpers existentes (`createFieldAuditLogs` usa `getAuthUserId`). Isso é
aceito na v1; a rastreabilidade vem do `IMPERSONACAO_INICIO`, que registra
admin → alvo com timestamp. Registrar o `sessionId` do alvo fica como
melhoria (o `authorize` não tem acesso a ele antes de a sessão existir).

### Alvos bloqueados no login
Membros TRANSFERIDO/DESLIGADO/INATIVO são barrados no login normal. A
impersonação **permite** (é justamente o que se quer inspecionar), com aviso
na UI. Membros sem `userId` (conta nunca ativada) não são impersonáveis.

### Aninhamento
Não há como "aninhar": ao impersonar, a sessão do admin é substituída pela
do alvo, que não é admin. Se o alvo for outro admin, o marcador em
`sessionStorage` bloqueia a UI de impersonar de novo.

## UI
- Entrada no menu admin (sidebar/MoreSheet): "Entrar como usuário".
- Abre `Drawer` (mobile) / `Sheet` (desktop) com busca por nome/telefone,
  listando só membros com `userId`. Reaproveitar a listagem de
  `/admin/acesso`.
- Confirmação antes de trocar ("Você sairá da sua sessão de admin").
- Banner fixo no topo em todas as telas enquanto `sessionStorage` marcar
  impersonação: "Você está como **Fulano** — Sair da impersonação".

## Impacto em Shared
- [x] `convex/auth/auth.ts` — novo provider. Toda a aplicação depende; testar
  login normal (telefone+senha) e ativação por convite após a mudança.
- [x] `shared/components/layout/DevContext.tsx` — registrar componentes e
  mutations.
- [x] `shared/components/layout/MoreSheet.tsx` / sidebar — nova entrada admin.
- [ ] `convex/schema.ts` — não toca.
- [ ] `rbac.ts` / `rbacHelpers.ts` / `types/auth.ts` — não toca.

## Riscos
1. **Escalada de privilégio**: o gate é `role === "admin"` no backend, dentro
   do `authorize`. Nunca confiar em flag do cliente. Testar que não-admin
   recebe erro.
2. **Auditoria**: escritas ficam em nome do alvo (ver acima). Aceito na v1.
3. **Repo público**: não documentar nome de rota/params em issue além do
   necessário; nenhum exploit em PR.
4. **Regressão no login**: mudança em `auth.ts` afeta todos. Rodar fluxo de
   signin, ativação (`/ativar/[token]`) e quiosque após alterar.
5. **Deploy**: backend Convex precisa de `npx convex deploy` + env
   `ALLOW_IMPERSONATION` setada em prod (default ausente = desligado).

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/auth/auth.ts` | Modificar | Adicionar provider `impersonate` |
| `convex/auth/impersonate.ts` | Criar | `internalQuery` (chamador é admin + alvo válido) e `internalMutation` (log `IMPERSONACAO_INICIO`) |
| `shared/components/auth/ImpersonarDrawer.tsx` | Criar | Busca + confirmação + `signIn("impersonate")` |
| `shared/components/auth/ImpersonacaoBanner.tsx` | Criar | Banner fixo + "Sair da impersonação" |
| `shared/components/layout/MoreSheet.tsx` (e/ou sidebar) | Modificar | Entrada admin |
| `app/(ready)/layout.tsx` | Modificar | Montar o banner |
| `shared/components/layout/DevContext.tsx` | Modificar | Registrar |

## Ordem de Implementação
1. `convex/auth/impersonate.ts` — internalQuery de autorização + internalMutation de log.
2. `convex/auth/auth.ts` — provider `ConvexCredentials`; validar login normal.
3. `ImpersonarDrawer` + entrada no menu admin.
4. `ImpersonacaoBanner` + `sessionStorage` + montagem no layout.
5. DevContext.
6. Testes: admin impersona; não-admin falha; flag ausente falha; alvo sem
   `userId` falha; login normal e ativação continuam funcionando.
7. Deploy: `npx convex deploy` + env em prod.

## Questões em Aberto
- Registrar `sessionId` do alvo no log (via `afterUserCreatedOrUpdated`/
  callback de sessão) — v2.
- Auto-expiração da impersonação (ex.: 30 min) — v2; hoje a sessão segue as
  regras normais (12h inativa / 30 dias).
- Aposentar `NEXT_PUBLIC_AUTH_BYPASS_MODE` depois que isto estiver em prod?

## Referências
- `convex/auth/auth.ts` — `convexAuth({ providers: [Password] })`
- `convex/_shared/requirePermission.ts` — `loadAuthAndPerms` (admin = `["*"]`)
- `convex/preferencias/rbac.ts:284` — `requireAdmin`
- `convex/audit/mutations.ts` — formato do `LOGIN` em `auditLogs`
- `app/(auth)/signin/page.tsx` — uso de `useAuthActions().signIn`
