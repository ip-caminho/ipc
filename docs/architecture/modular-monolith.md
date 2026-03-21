# Arquitetura Modular — IPC

Overview dos limites entre modulos e shared files para desenvolvimento seguro em worktrees paralelas.

## Quick Reference

| Modulo | Backend Files | Frontend Routes | Feature Dir | Tabelas |
|--------|---------------|-----------------|-------------|---------|
| Membros | `convex/membros/*` | `(ready)/membros`, `(ready)/entidades`, `(ready)/diretorio` | `features/membros/` | entidades, membros, membroConvites |
| Gravacoes | `convex/gravacoes/*` | `(ready)/gravacoes` | `features/gravacoes/` | gravacoes, serieGravacoes, comentariosGravacao, reacoesGravacao, escutasGravacao |
| Escalas | `convex/escalas/*` | `(ready)/escalas`, `(ready)/cultos` | `features/escalas/` | cultos, cultoEscalas, equipeMembros, indisponibilidades, funcoes |
| Avisos | `convex/avisos/*` | `(ready)/boletim` | `features/avisos/` | avisos |
| Pastoreio | `convex/pastoreio/*` | `(ready)/pastoreio` | `features/pastoreio/` | visitasPastorais, anotacoesPastorais |
| Pedidos Oracao | `convex/pedidosOracao/*` | `(ready)/pedidos-oracao` | `features/pedidosOracao/` | pedidosOracao, pedidoOracaoComentarios, pedidoOracaoIntercessores |
| Pequenos Grupos | `convex/pequenosGrupos/*` | `(ready)/pequenos-grupos` | `features/pequenosGrupos/` | pequenosGrupos, pgMembros |
| Preferencias | `convex/preferencias/*` | `(ready)/admin/modulos` | `features/preferencias/` | rolePermissions, preferencias, modulos |
| Auth | `convex/auth/*` | `(auth)/signin` | — | users (auth tables) |
| Audit | `convex/audit/*` | — | — | auditLogs |
| Files | `convex/files/*` | (integrado) | `shared/files/` | — |
| Messaging | `convex/messaging/*` | — | — | — |
| Notificacoes | — | — | — | sysNotifications, sysNotificationReads |

**Total tabelas:** 30+ aplicacao + auth tables (de `@convex-dev/auth`)

---

## SHARED FILES (DANGER ZONE)

Estes arquivos sao usados por multiplos modulos. **Evitar editar em worktrees paralelas.**

### Backend Shared Files

| Arquivo | Usado Por | Proposito |
|---------|-----------|-----------|
| `convex/schema.ts` | TODOS | Definicao de todas as tabelas |
| `convex/preferencias/rbac.ts` | TODOS | Permissoes por role, `hasPermission()` |
| `convex/preferencias/rbacHelpers.ts` | Pastoreio, todos que checam permissoes | `resolvePermissions()`, helpers de auth |
| `convex/_shared/auditHelpers.ts` | Membros, Gravacoes, Escalas, Pastoreio, Pequenos Grupos | `createFieldAuditLogs()`, `createActionAuditLog()` |
| `convex/_shared/llm/` | Gravacoes | `createLlmProvider()` (Anthropic, Gemini) |
| `convex/files/helpers.ts` | Gravacoes, Membros | S3/B2 helpers, CDN URL, presigned upload |
| `convex/files/signing.ts` | Gravacoes | `fetchB2File()` para pipeline IA |
| `types/auth.ts` | TODOS (frontend) | Tipos de auth/RBAC |

### Frontend Shared Files

| Arquivo | Usado Por | Proposito |
|---------|-----------|-----------|
| `shared/components/auth/PermissionGate.tsx` | TODOS (app pages) | Gating de permissoes em UI |
| `shared/components/auth/ModuloGuard.tsx` | Gravacoes, Escalas, Pastoreio, Pedidos Oracao, Pequenos Grupos | Toggle de modulos |
| `shared/components/auth/AuthGuard.tsx` | Layout (ready) | Protege rotas autenticadas |
| `shared/files/components/FileUpload.tsx` | Gravacoes | Upload com compressao de audio |
| `shared/files/components/PhotoUpload.tsx` | Membros | Upload de fotos |
| `shared/files/components/SecureAudioPlayer.tsx` | Gravacoes | Player com restricao de trecho |
| `shared/files/hooks/useFileUpload.ts` | Gravacoes, Membros | Hook de upload com presigned URL |
| `shared/files/hooks/useAudioCompressor.ts` | Gravacoes | FFmpeg.wasm, compressao 64kbps mono MP3 |
| `shared/components/MembroProfilePopover.tsx` | Gravacoes, Dashboard | Popover de perfil de membro |
| `shared/providers/PermissionsProvider.tsx` | TODOS | Hook `useAuth()`, RBAC no client |
| `shared/providers/ConvexClientProvider.tsx` | Root layout | Provider Convex |
| `shared/hooks/useDebounce.ts` | Membros, Gravacoes | Debounce de busca |
| `shared/hooks/use-mobile.ts` | Escalas, Dashboard | Deteccao mobile |
| `shared/lib/utils/` | TODOS | `cn()`, utilitarios |
| `shared/lib/validations/brazilian.ts` | Membros | Validacao CPF, CNPJ, telefone |

### Layout Shared Files

| Arquivo | Proposito |
|---------|-----------|
| `app/layout.tsx` | Root layout, providers |
| `app/(ready)/layout.tsx` | Layout autenticado, sidebar |
| `shared/components/layout/AppSidebar.tsx` | Navegacao — query modulos para montar menu |
| `shared/components/layout/DevContext.tsx` | Painel de dev (admin only) |
| `shared/components/layout/Header.tsx` | Barra superior |

---

## Detalhes por Modulo

### Membros

**Owned files (safe to edit):**
```
convex/membros/
  mutations.ts
  queries.ts

app/(ready)/membros/           # lista, novo, [id]
app/(ready)/entidades/
app/(ready)/diretorio/

features/membros/
  components/   (MembroForm, MembroTable)
  lib/          (validations.ts)
```

**Uses shared:**
- `schema.ts` (entidades, membros, membroConvites)
- `_shared/auditHelpers.ts` (field change tracking)
- `shared/files/` (PhotoUpload, useFileUpload)
- `shared/components/auth/*` (PermissionGate)
- `shared/lib/validations/brazilian.ts`
- `types/auth.ts`

---

### Gravacoes

**Owned files (safe to edit):**
```
convex/gravacoes/
  mutations.ts
  queries.ts
  aiAction.ts          # Pipeline Deepgram + Claude
  ai.ts                # Mutations para iniciar/salvar IA

app/(ready)/gravacoes/    # lista, nova, [id], admin

features/gravacoes/
  components/   (GravacaoForm, AvisosSection, FrasesCarrossel, ...)
  lib/          (validations.ts, constants.ts)
```

**Uses shared:**
- `schema.ts` (gravacoes, serieGravacoes, comentarios, reacoes, escutas)
- `_shared/auditHelpers.ts`
- `_shared/llm/` (createLlmProvider — Anthropic, Gemini)
- `convex/files/` (helpers.ts, signing.ts)
- `shared/files/` (FileUpload, SecureAudioPlayer, useAudioCompressor)
- `shared/components/MembroProfilePopover`
- `shared/components/auth/*`
- `types/auth.ts`

**Nota:** Modulo mais complexo — pipeline de audio + IA + interacoes sociais.

---

### Escalas

**Owned files (safe to edit):**
```
convex/escalas/
  mutations.ts
  queries.ts

app/(ready)/escalas/
app/(ready)/cultos/

features/escalas/
  components/   (tabs de escalas, cultos, equipes, funcoes)
  hooks/        (useFuncoes)
```

**Uses shared:**
- `schema.ts` (cultos, cultoEscalas, equipeMembros, indisponibilidades, funcoes)
- `_shared/auditHelpers.ts`
- `shared/components/auth/*` (ModuloGuard, PermissionGate)
- `shared/providers/PermissionsProvider`

---

### Avisos

**Owned files (safe to edit):**
```
convex/avisos/
  mutations.ts
  queries.ts

app/(ready)/boletim/

features/avisos/
  components/   (AvisoForm, AvisoList)
```

**Uses shared:**
- `schema.ts` (avisos)
- `shared/components/auth/*`
- `shared/providers/PermissionsProvider`

---

### Pastoreio

**Owned files (safe to edit):**
```
convex/pastoreio/
  mutations.ts
  queries.ts

app/(ready)/pastoreio/

features/pastoreio/
  components/   (visitas, anotacoes)
```

**Uses shared:**
- `schema.ts` (visitasPastorais, anotacoesPastorais)
- `preferencias/rbacHelpers.ts` (resolvePermissions)
- `_shared/auditHelpers.ts`
- `shared/components/auth/*` (ModuloGuard)
- `shared/providers/PermissionsProvider`

---

### Pedidos de Oracao

**Owned files (safe to edit):**
```
convex/pedidosOracao/
  mutations.ts
  queries.ts

app/(ready)/pedidos-oracao/

features/pedidosOracao/
  components/   (PedidoForm, PedidoList, cards)
```

**Uses shared:**
- `schema.ts` (pedidosOracao, pedidoOracaoComentarios, pedidoOracaoIntercessores)
- `shared/components/auth/*` (ModuloGuard)
- `shared/providers/PermissionsProvider`

---

### Pequenos Grupos

**Owned files (safe to edit):**
```
convex/pequenosGrupos/
  mutations.ts
  queries.ts

app/(ready)/pequenos-grupos/

features/pequenosGrupos/
  components/   (GrupoForm, GrupoList)
```

**Uses shared:**
- `schema.ts` (pequenosGrupos, pgMembros)
- `_shared/auditHelpers.ts`
- `shared/components/auth/*` (ModuloGuard)
- `shared/providers/PermissionsProvider`

---

### Preferencias / Admin

**Owned files (safe to edit):**
```
convex/preferencias/
  rbac.ts
  rbacHelpers.ts
  queries.ts
  mutations.ts

convex/modulos/
  queries.ts
  mutations.ts

app/(ready)/admin/modulos/

features/preferencias/
  components/   (ModuloToggle, RoleEditor)
```

**Uses shared:**
- `schema.ts` (rolePermissions, preferencias, modulos)
- `shared/components/auth/*`

**Nota:** Este modulo *possui* os shared files `rbac.ts` e `rbacHelpers.ts`.

---

### Auth

**Owned files (safe to edit):**
```
convex/auth/
  auth.ts
  auth.config.ts
  phoneOTP.ts

app/(auth)/signin/
```

**Uses shared:**
- `schema.ts` (users via authTables)
- `types/auth.ts`

---

### Audit

**Owned files (safe to edit):**
```
convex/audit/
  mutations.ts
  queries.ts

convex/_shared/auditHelpers.ts
```

**Uses shared:**
- `schema.ts` (auditLogs)

**Nota:** Audit *possui* `auditHelpers.ts`, que e consumido por 7 modulos.

---

### Files

**Owned files (safe to edit):**
```
convex/files/
  helpers.ts
  signing.ts

shared/files/
  components/   (FileUpload, PhotoUpload, SecureAudioPlayer)
  hooks/        (useFileUpload, useAudioCompressor)
```

**Uses shared:**
- `schema.ts` (se houver tabela de files)

**Nota:** Upload via presigned URL direto para B2. Mudancas aqui afetam Gravacoes e Membros.

---

## Module Dependency Matrix

```
                  Uses →
                | schema | rbac | rbacHelpers | auditHelpers | files/ | llm/ | auth types |
Creates ↓       |--------|------|-------------|--------------|--------|------|------------|
Membros         |   X    |  X   |             |      X       |   X    |      |     X      |
Gravacoes       |   X    |  X   |             |      X       |   X    |  X   |     X      |
Escalas         |   X    |  X   |             |      X       |        |      |     X      |
Avisos          |   X    |  X   |             |              |        |      |     X      |
Pastoreio       |   X    |  X   |      X      |      X       |        |      |     X      |
Pedidos Oracao  |   X    |  X   |             |              |        |      |     X      |
Pequenos Grupos |   X    |  X   |             |      X       |        |      |     X      |
Preferencias    |   X    |  *   |      *      |              |        |      |     X      |
Auth            |   X    |      |             |              |        |      |     X      |
Audit           |   X    |      |             |      *       |        |      |            |
Files           |   X    |      |             |              |   *    |      |            |
```

`*` = modulo possui (owns) o arquivo shared

---

## Worktree Guidelines

### Trabalho seguro em paralelo

| Worktree A | Worktree B | Seguro? |
|------------|------------|---------|
| Avisos | Pedidos Oracao | SIM |
| Avisos | Pequenos Grupos | SIM |
| Pedidos Oracao | Pequenos Grupos | SIM |
| Escalas frontend | Pastoreio frontend | SIM |
| Gravacoes frontend | Membros frontend | SIM |
| Qualquer frontend-only | Qualquer frontend-only | SIM |

### Trabalho perigoso em paralelo

| Worktree A | Worktree B | Risco |
|------------|------------|-------|
| Qualquer + `schema.ts` | Qualquer + `schema.ts` | ALTO — nunca em paralelo |
| Qualquer + `rbac.ts` | Qualquer + `rbac.ts` | ALTO |
| Qualquer + `rbacHelpers.ts` | Qualquer + `rbacHelpers.ts` | ALTO |
| Qualquer + `auditHelpers.ts` | Qualquer + `auditHelpers.ts` | ALTO |
| Qualquer + `types/auth.ts` | Qualquer + `types/auth.ts` | ALTO |
| Gravacoes + `FileUpload` | Membros + `PhotoUpload` | MEDIO |
| Qualquer + `AppSidebar.tsx` | Qualquer + `AppSidebar.tsx` | MEDIO |
| Qualquer + `DevContext.tsx` | Qualquer + `DevContext.tsx` | MEDIO |

### Workflow recomendado

1. **Antes de comecar:** Verificar se o trabalho toca shared files
2. **Se toca shared files:** Trabalhar sequencialmente, shared primeiro
3. **Mudancas apenas em owned files:** Seguro rodar em paralelo
4. **Mudancas em schema:** Sempre coordenar, nunca em paralelo

### Merge Strategy

1. Completar mudancas em shared files primeiro no main
2. Rebase das worktrees de modulo sobre o main atualizado
3. Merge de branches de modulo somente apos shared estar estavel

---

## Adicionando Novos Modulos

Ao criar um novo modulo:

1. **Backend:** Criar `convex/{modulo}/` com `mutations.ts` e `queries.ts`
2. **Frontend route:** Criar `app/(ready)/{modulo}/`
3. **Feature dir:** Criar `features/{modulo}/` com `components/`, `hooks/`, `lib/`
4. **Schema:** Adicionar tabelas em `convex/schema.ts` (coordenar — nunca em paralelo)
5. **RBAC:** Adicionar permissoes em `convex/preferencias/rbac.ts`
6. **Modulo toggle:** Adicionar entrada na tabela `modulos` se for togglavel
7. **Sidebar:** Atualizar `shared/components/layout/AppSidebar.tsx`
8. **DevContext:** Atualizar `CONTEXT_MAP` em `shared/components/layout/DevContext.tsx`
9. **Atualizar este doc** com detalhes do novo modulo
