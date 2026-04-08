# Tarefas + Comentarios Unificados

## Escopo

Duas entregas interligadas:

1. **Tarefas** — sistema de gestao de tarefas com status, prioridade, prazos, atribuicao a membros
2. **Comentarios unificados** — tabela polimorfica que substitui `comentariosGravacao` e `pedidoOracaoComentarios`, servindo qualquer modulo

**Principios:**
- Qualquer membro autenticado pode criar tarefas
- Tarefas atribuidas a membros especificos (responsavel)
- Comentarios/discussoes funcionam em qualquer entidade (tarefas, gravacoes, pedidos de oracao, etc.)
- Ownership check: criador e responsavel sempre veem/editam status da propria tarefa

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  TAREFAS                                                     │
│                                                              │
│  tarefas ────────── titulo, status, prioridade, responsavel  │
│       │             prazo, modulo relacionado                 │
│       │                                                      │
│       └── comentarios (polimorfico)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  COMENTARIOS UNIFICADOS                                      │
│                                                              │
│  comentarios ────── tabela polimorfica                       │
│       entidadeTipo: "tarefas" | "gravacoes" | "pedidos-     │
│                      oracao" | "ministerios" | ...           │
│       entidadeId: ID generico                                │
│       parentId: threading (respostas)                        │
│       tipo: COMENTARIO | ATUALIZACAO                         │
│                                                              │
│  Substitui:                                                  │
│    - comentariosGravacao (tem parentId, sem tipo)            │
│    - pedidoOracaoComentarios (tem tipo, sem parentId)        │
│  Unifica o melhor dos dois.                                  │
└─────────────────────────────────────────────────────────────┘
```

### Decisoes de arquitetura

| Decisao | Justificativa |
|---------|---------------|
| Tabela `comentarios` polimorfica | Unifica `comentariosGravacao` e `pedidoOracaoComentarios`. Evita proliferacao de tabelas de comentarios para cada modulo novo. |
| `parentId` para threading | Gravacoes ja usa, pedidos de oracao nao. Unificar com suporte a threading permite respostas em qualquer contexto. |
| `tipo` (COMENTARIO/ATUALIZACAO) | Pedidos de oracao ja usa para diferenciar updates do autor. Manter para todos os modulos. |
| Migracao dual-write | v1 cria tabela nova + escreve nas duas tabelas. Modulos migram leitura um a um. Tabelas antigas removidas apos validacao. |
| Referencia polimorfica em tarefas | `moduloRelacionado` + `referenciaId` + `referenciaTitulo` desnormalizado. Sem foreign keys por modulo. |
| Ownership check no backend | Criador e responsavel sempre veem/editam status das suas tarefas, independente de permissao RBAC. |
| Sem subtarefas | Fora do escopo. Complexidade desnecessaria para contexto de igreja. |

---

## Schema Convex

### `tarefas`

```ts
tarefas: defineTable({
  titulo: v.string(),
  descricao: v.optional(v.string()),
  status: v.union(
    v.literal("ABERTA"),
    v.literal("EM_ANDAMENTO"),
    v.literal("CONCLUIDA"),
    v.literal("CANCELADA")
  ),
  prioridade: v.union(
    v.literal("BAIXA"),
    v.literal("MEDIA"),
    v.literal("ALTA"),
    v.literal("URGENTE")
  ),
  criadoPor: v.id("membros"),
  responsavelId: v.id("membros"),
  dataVencimento: v.optional(v.string()), // YYYY-MM-DD
  // Referencia polimorfica a outro modulo
  moduloRelacionado: v.optional(v.union(
    v.literal("ministerios"),
    v.literal("escalas"),
    v.literal("calendario"),
    v.literal("pequenos-grupos"),
    v.literal("pastoreio"),
    v.literal("gravacoes"),
    v.literal("pedidos-oracao")
  )),
  referenciaId: v.optional(v.string()),
  referenciaTitulo: v.optional(v.string()),
  // Conclusao
  concluidaEm: v.optional(v.number()),
  concluidaPor: v.optional(v.id("membros")),
  // Timestamps
  criadoEm: v.number(),
  atualizadoEm: v.optional(v.number()),
})
  .index("by_responsavel", ["responsavelId"])
  .index("by_criador", ["criadoPor"])
  .index("by_status", ["status"])
  .index("by_vencimento", ["dataVencimento"])
  .index("by_modulo", ["moduloRelacionado", "referenciaId"]),
```

### `comentarios` (unificado)

```ts
comentarios: defineTable({
  // Referencia polimorfica
  entidadeTipo: v.union(
    v.literal("tarefas"),
    v.literal("gravacoes"),
    v.literal("pedidos-oracao")
    // Novos modulos adicionam literals aqui
  ),
  entidadeId: v.string(), // ID da entidade (validar existencia no backend antes de inserir)
  // Autor
  membroId: v.id("membros"),
  texto: v.string(),
  // Threading
  parentId: v.optional(v.id("comentarios")),
  // Tipo (herdado de pedidoOracaoComentarios)
  tipo: v.optional(v.union(
    v.literal("COMENTARIO"),
    v.literal("ATUALIZACAO")
  )),
  // Timestamps
  criadoEm: v.number(),
})
  .index("by_entidade", ["entidadeTipo", "entidadeId", "criadoEm"])
  .index("by_parent", ["parentId"])
  .index("by_membro", ["membroId"]),
```

### Migracao das tabelas existentes

| Tabela antiga | Mapeamento | Notas |
|--------------|------------|-------|
| `comentariosGravacao` | `entidadeTipo: "gravacoes"`, `entidadeId: gravacaoId`, `parentId` mantido | Ja tem threading |
| `pedidoOracaoComentarios` | `entidadeTipo: "pedidos-oracao"`, `entidadeId: pedidoId`, `tipo` mantido | Ja tem tipo COMENTARIO/ATUALIZACAO |

**Estrategia dual-write:**
1. Criar tabela `comentarios` nova
2. Mutations de gravacoes e pedidos de oracao escrevem nas DUAS tabelas (antiga + nova)
3. Migrar dados historicos via batch migration
4. Migrar leitura de um modulo por vez (gravacoes primeiro, depois pedidos)
5. Validar que leitura da nova tabela retorna mesmos dados
6. Remover dual-write e tabelas antigas

---

## Permissoes RBAC

### Tarefas

```ts
"tarefas:read"      // Ver todas as tarefas
"tarefas:create"    // Criar tarefas
"tarefas:update"    // Editar tarefas de outros
"tarefas:delete"    // Excluir tarefas
```

| Permissao | admin | pastor | presbitero | obreiro | secretaria | membro |
|-----------|-------|--------|------------|---------|------------|--------|
| `tarefas:read` | x | x | x | x | x | |
| `tarefas:create` | x | x | x | x | x | |
| `tarefas:update` | x | x | x | x | x | |
| `tarefas:delete` | x | x | | | x | |

**Visibilidade:**
- **Membro**: sem acesso ao modulo de tarefas
- **Obreiro/presbitero/secretaria/pastor/admin**: ve todas as tarefas

**Ownership check (sempre, sem permissao):**
- Criador e responsavel podem atualizar status da propria tarefa
- Criador pode excluir propria tarefa

### Comentarios

Sem permissoes dedicadas. Herdam do modulo pai:
- Se pode ver a entidade → pode ler comentarios
- Se pode ver a entidade → pode adicionar comentario
- Autor ou admin pode deletar comentario

---

## Telas

### 1. Lista de Tarefas (`/tarefas`)

- Header: titulo + botao "Nova Tarefa" + **quick-add** (input inline: "Titulo / @responsavel / prazo")
- Tabs (nuqs): "Minhas" (atribuidas a mim, default) | "Criadas" (por mim) | "Todas" (se `tarefas:read`)
- Filtros: status, prioridade, modulo, responsavel (na tab Todas), toggle "atrasadas"
- Cards ordenados por data de vencimento, atrasadas em destaque (vermelho)
- **Desktop**: opcional toggle kanban (ABERTA → EM_ANDAMENTO → CONCLUIDA)
- **Mobile**: cards simples, sem kanban
- **Badge na sidebar**: contagem de tarefas pendentes atribuidas ao usuario
- `<ModuloGuard modulo="tarefas">`

### 2. Detalhe da Tarefa (`/tarefas/[id]`)

- Topo fixo: titulo, descricao, badges (status, prioridade), responsavel (avatar + nome), criador, data vencimento, link modulo relacionado
- Acoes: mudar status, editar (abre TarefaForm), excluir
- Meio scrollavel: thread de comentarios (componente `<ComentariosThread>` reutilizavel)
- Bottom fixo: input de comentario

### 3. Dashboard card

- Card no `/dashboard`: "X tarefas pendentes" + "Y atrasadas"
- Link para `/tarefas`

### 4. Componente reutilizavel `<ComentariosThread>`

Usado em qualquer pagina de detalhe:
- `/tarefas/[id]` — comentarios da tarefa
- `/gravacoes/[id]` — substitui componente atual `Comentarios.tsx`
- `/pedidos-oracao/[id]` — substitui secao de comentarios em `PedidoOracaoDetalhe.tsx`
- Futuros modulos — plug-and-play

Props: `entidadeTipo`, `entidadeId`, `showTipo?` (mostrar toggle COMENTARIO/ATUALIZACAO)

### 5. Notificacoes in-app

- Badge vermelha no icone "Tarefas" na sidebar com contagem de pendentes
- Toast quando tarefa e atribuida ao usuario (se estiver online, via Convex real-time)

---

## Arquivos a Criar/Modificar

### Backend — Tarefas

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `convex/schema.ts` | MODIFICAR | Tabelas `tarefas` e `comentarios` |
| `convex/preferencias/rbac.ts` | MODIFICAR | 4 permissoes tarefas + labels |
| `convex/preferencias/rbacHelpers.ts` | MODIFICAR | Permissoes por role |
| `types/auth.ts` | MODIFICAR | Tipo Permission |
| `convex/tarefas/queries.ts` | CRIAR | list, getById, listByModulo, dashboardStats, minhasPendentes |
| `convex/tarefas/mutations.ts` | CRIAR | create, update, updateStatus, remove |
| `convex/modulos/mutations.ts` | MODIFICAR | Adicionar "tarefas" ao seed |

### Backend — Comentarios unificados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `convex/comentarios/queries.ts` | CRIAR | listByEntidade, countByEntidade |
| `convex/comentarios/mutations.ts` | CRIAR | create, remove |
| `convex/comentarios/migration.ts` | CRIAR | Migrar dados + dual-write helpers |

### Frontend — Tarefas

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `app/(ready)/tarefas/page.tsx` | CRIAR | Lista com filtros/tabs + quick-add |
| `app/(ready)/tarefas/[id]/page.tsx` | CRIAR | Detalhe com comentarios |
| `features/tarefas/components/TarefaCard.tsx` | CRIAR | Card para lista |
| `features/tarefas/components/TarefaForm.tsx` | CRIAR | Dialog form (RHF + Zod) |
| `features/tarefas/components/TarefaDetalhe.tsx` | CRIAR | Vista detalhe |
| `features/tarefas/components/TarefaStatusBadge.tsx` | CRIAR | Badge de status |
| `features/tarefas/components/TarefaPrioridadeBadge.tsx` | CRIAR | Badge de prioridade |
| `features/tarefas/components/TarefaQuickAdd.tsx` | CRIAR | Input inline de criacao rapida |
| `features/tarefas/components/TarefaDashboardCard.tsx` | CRIAR | Card para dashboard |
| `features/tarefas/lib/constants.ts` | CRIAR | Opcoes de status, prioridade, cores |
| `features/tarefas/lib/validations.ts` | CRIAR | Schemas Zod (zod/v4) |

### Frontend — Comentarios (shared)

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `shared/components/ComentariosThread.tsx` | CRIAR | Componente reutilizavel de comentarios |
| `shared/components/ComentarioItem.tsx` | CRIAR | Item individual com threading |
| `shared/components/ComentarioInput.tsx` | CRIAR | Input de comentario |
| `features/gravacoes/components/Comentarios.tsx` | MIGRAR | Substituir por `<ComentariosThread>` |
| `features/pedidosOracao/components/PedidoOracaoDetalhe.tsx` | MIGRAR | Substituir secao de comentarios |

### Shared

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `shared/components/layout/AppSidebar.tsx` | MODIFICAR | Item "Tarefas" na secao Gestao + badge |
| `shared/components/layout/MobileTabBar.tsx` | MODIFICAR | Item nos drawerSections |
| `shared/components/layout/DevContext.tsx` | MODIFICAR | Entries para /tarefas e /tarefas/[id] |
| `app/(ready)/dashboard/page.tsx` | MODIFICAR | Card de tarefas pendentes/atrasadas |

---

## Impacto em Shared

- `schema.ts` — 2 tabelas novas (`tarefas`, `comentarios`)
- `rbac.ts` — 4 permissoes novas
- `rbacHelpers.ts` — roles iniciais
- `types/auth.ts` — tipo Permission
- `AppSidebar.tsx` — 1 item novo + badge
- `MobileTabBar.tsx` — 1 item novo
- `DevContext.tsx` — 2 entries
- Risco de regressao: **medio** — migracao de comentarios toca gravacoes e pedidos de oracao

---

## Ordem de Implementacao

### Fase 1 — Schema + RBAC
1. Adicionar tabelas `tarefas` e `comentarios` em `schema.ts`
2. Adicionar permissoes em `rbac.ts`, `rbacHelpers.ts`, `types/auth.ts`
3. Registrar modulo "tarefas" no seed

### Fase 2 — Comentarios unificados
4. `convex/comentarios/` — queries + mutations
5. `shared/components/ComentariosThread.tsx` — componente reutilizavel
6. Ativar dual-write em gravacoes e pedidos de oracao
7. Migration script: copiar dados das tabelas antigas para `comentarios`
8. Migrar leitura: gravacoes usa `<ComentariosThread>`
9. Migrar leitura: pedidos de oracao usa `<ComentariosThread>`
10. Validar + remover dual-write + remover tabelas antigas

### Fase 3 — Backend Tarefas
11. `convex/tarefas/queries.ts` — list, getById, listByModulo, dashboardStats, minhasPendentes
12. `convex/tarefas/mutations.ts` — CRUD

### Fase 4 — Frontend Tarefas
13. `features/tarefas/lib/` — constants, validations
14. `features/tarefas/components/` — Card, Form, Detalhe, Badges, QuickAdd
15. `app/(ready)/tarefas/page.tsx` — lista com tabs + quick-add
16. `app/(ready)/tarefas/[id]/page.tsx` — detalhe (usa `<ComentariosThread>`)

### Fase 5 — Navegacao + Dashboard
17. Sidebar + MobileTabBar + DevContext + badge
18. Card de tarefas no dashboard
19. Secao "Tarefas relacionadas" em paginas de outros modulos (incremental)

---

## Verificacao

- [ ] Criar tarefa com titulo, prioridade, responsavel, prazo
- [ ] Quick-add: "Titulo" cria tarefa atribuida a mim
- [ ] Membro nao tem acesso ao modulo de tarefas
- [ ] Obreiro/presbitero/secretaria/pastor/admin ve todas as tarefas
- [ ] Ownership: responsavel pode mudar status da tarefa
- [ ] Ownership: criador pode excluir propria tarefa
- [ ] Comentarios em tarefa com threading
- [ ] Comentarios em gravacao via `<ComentariosThread>` (apos migracao)
- [ ] Comentarios em pedidos de oracao via `<ComentariosThread>` (apos migracao)
- [ ] Migracao: dados historicos de comentarios preservados
- [ ] Filtros: status, prioridade, modulo, atrasadas
- [ ] Badge na sidebar com contagem de pendentes
- [ ] Card no dashboard com pendentes + atrasadas
- [ ] Kanban no desktop (toggle)
- [ ] Mobile: cards simples sem kanban
- [ ] ModuloGuard funciona quando modulo desativado
- [ ] Permissoes RBAC corretas

---

## Arquivos criticos (danger zones)
- `convex/schema.ts` — 2 tabelas novas
- `convex/preferencias/rbac.ts` — novas permissoes
- `convex/preferencias/rbacHelpers.ts` — defaults por role
- `types/auth.ts` — union type
- `features/gravacoes/components/Comentarios.tsx` — migracao
- `features/pedidosOracao/` — migracao

## Arquivos de referencia
- `convex/gravacoes/queries.ts` — comentarios existentes de gravacoes
- `features/gravacoes/components/Comentarios.tsx` — componente atual
- `features/pedidosOracao/` — componente atual de comentarios

---

## Fase futura: Integracao Slack

Quando implementar, adicionar:

- Campo `slackUserId` em membros (+ index `by_slackUserId`)
- Campos `slackChannelId`, `slackMessageTs`, `slackTodoId` em tarefas
- Campos `slackMessageTs`, `slackAuthorId` em comentarios
- `convex/slack/` — slackApp, slackActions, slackWebhook, slackHelpers
- Rota HTTP em `convex/http.ts` para webhook (responder 200 imediato + processar async)
- Slash command via modal Slack (nao parsear texto livre)
- Cron diario para alertar tarefas atrasadas
- Fallback se Slack Todos API nao disponivel
- Verificar signing_secret em cada request

Fluxos planejados:
- App → Slack: tarefa criada/concluida → posta no canal + cria Todo
- Slack → App: reply na thread → comentario, reacao check → concluir tarefa
- Bidirecional para comentarios em qualquer modulo
