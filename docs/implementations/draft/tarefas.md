# Tarefas + Comentários Unificados + Integração Slack

## Escopo

Três entregas interligadas:

1. **Tarefas** — sistema de gestão de tarefas com status, prioridade, prazos, atribuição a membros
2. **Comentários unificados** — tabela polimórfica que substitui `comentariosGravacao` e `pedidoOracaoComentarios`, servindo qualquer módulo
3. **Integração Slack** — bidirecional, conecta o fluxo que a liderança já usa (threads + Slack Todos) com o app

**Princípios:**
- Qualquer membro autenticado pode criar tarefas
- Tarefas atribuídas a membros específicos (responsável)
- Comentários/discussões funcionam em qualquer entidade (tarefas, gravações, pedidos de oração, etc.)
- Slack é o canal de comunicação diário; o app é o sistema de registro
- Sync bidirecional: thread no Slack ↔ comentários no app

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  TAREFAS                                                     │
│                                                              │
│  tarefas ────────── título, status, prioridade, responsável  │
│       │             prazo, módulo relacionado                 │
│       │             slackChannelId, slackMessageTs            │
│       │                                                      │
│       └── comentarios (polimórfico) ◄── sync bidirecional    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  COMENTÁRIOS UNIFICADOS                                      │
│                                                              │
│  comentarios ────── tabela polimórfica                       │
│       entidadeTipo: "tarefas" | "gravacoes" | "pedidos-     │
│                      oracao" | "ministerios" | ...           │
│       entidadeId: ID genérico                                │
│       parentId: threading (respostas)                        │
│       tipo: COMENTARIO | ATUALIZACAO                         │
│       slackMessageTs: vínculo com thread do Slack            │
│                                                              │
│  Substitui:                                                  │
│    - comentariosGravacao (tem parentId, sem tipo)            │
│    - pedidoOracaoComentarios (tem tipo, sem parentId)        │
│  Unifica o melhor dos dois.                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SLACK (bidirecional)                                        │
│                                                              │
│  App → Slack:                                                │
│    Tarefa criada → posta no canal + cria Slack Todo          │
│    Tarefa concluída → atualiza mensagem + completa Todo      │
│    Comentário no app → posta na thread do Slack              │
│    Cron diário → alerta tarefas atrasadas                    │
│                                                              │
│  Slack → App:                                                │
│    Resposta na thread → vira comentário no app               │
│    Slack Todo criado → cria tarefa no app                    │
│    Reação ✅ → marca tarefa como concluída                   │
│    /tarefa (slash command) → cria tarefa no app              │
└─────────────────────────────────────────────────────────────┘
```

### Decisões de arquitetura

| Decisão | Justificativa |
|---------|---------------|
| Tabela `comentarios` polimórfica | Unifica `comentariosGravacao` e `pedidoOracaoComentarios`. Evita proliferação de tabelas de comentários para cada módulo novo. |
| `parentId` para threading | Gravações já usa, pedidos de oração não. Unificar com suporte a threading permite respostas em qualquer contexto. |
| `tipo` (COMENTARIO/ATUALIZACAO) | Pedidos de oração já usa para diferenciar updates do autor. Manter para todos os módulos. |
| `slackMessageTs` nos comentários | Vincula cada comentário à mensagem correspondente no Slack. Permite sync bidirecional sem tabela de mapeamento. |
| Slack App (não só webhooks) | Liderança já usa Slack Todos + threads. Precisa de Events API para bidirecionalidade. |
| Migração gradual das tabelas antigas | v1 cria tabela nova + migra dados. Módulos migram um a um. Tabelas antigas removidas quando todos migrarem. |
| Referência polimórfica em tarefas | `moduloRelacionado` + `referenciaId` + `referenciaTitulo` desnormalizado. Sem foreign keys por módulo. |
| Ownership check no backend | Criador e responsável sempre veem/editam status das suas tarefas, independente de permissão RBAC. |

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
  // Referência polimórfica a outro módulo
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
  // Conclusão
  concluidaEm: v.optional(v.number()),
  concluidaPor: v.optional(v.id("membros")),
  // Slack sync
  slackChannelId: v.optional(v.string()),
  slackMessageTs: v.optional(v.string()), // timestamp da mensagem raiz no Slack
  slackTodoId: v.optional(v.string()),    // ID do Slack Todo do responsável
  // Timestamps
  criadoEm: v.number(),
  atualizadoEm: v.optional(v.number()),
})
  .index("by_responsavel", ["responsavelId"])
  .index("by_criador", ["criadoPor"])
  .index("by_status", ["status"])
  .index("by_vencimento", ["dataVencimento"])
  .index("by_modulo", ["moduloRelacionado", "referenciaId"])
  .index("by_slack", ["slackChannelId", "slackMessageTs"]),
```

### `comentarios` (unificado)

```ts
comentarios: defineTable({
  // Referência polimórfica
  entidadeTipo: v.union(
    v.literal("tarefas"),
    v.literal("gravacoes"),
    v.literal("pedidos-oracao")
    // Novos módulos adicionam literals aqui
  ),
  entidadeId: v.string(), // ID da entidade (polimórfico)
  // Autor
  membroId: v.id("membros"),
  texto: v.string(),
  // Threading
  parentId: v.optional(v.id("comentarios")), // resposta a outro comentário
  // Tipo (herdado de pedidoOracaoComentarios)
  tipo: v.optional(v.union(
    v.literal("COMENTARIO"),
    v.literal("ATUALIZACAO") // updates do autor/responsável
  )),
  // Slack sync
  slackMessageTs: v.optional(v.string()), // timestamp da mensagem no Slack
  slackAuthorId: v.optional(v.string()),  // Slack user ID (quando veio do Slack)
  // Timestamps
  criadoEm: v.number(),
})
  .index("by_entidade", ["entidadeTipo", "entidadeId", "criadoEm"])
  .index("by_parent", ["parentId"])
  .index("by_membro", ["membroId"])
  .index("by_slack", ["slackMessageTs"]),
```

### Migração das tabelas existentes

| Tabela antiga | Mapeamento | Notas |
|--------------|------------|-------|
| `comentariosGravacao` | `entidadeTipo: "gravacoes"`, `entidadeId: gravacaoId`, `parentId` mantido | Já tem threading |
| `pedidoOracaoComentarios` | `entidadeTipo: "pedidos-oracao"`, `entidadeId: pedidoId`, `tipo` mantido | Já tem tipo COMENTARIO/ATUALIZACAO |

Migração via Convex migration (batch). Tabelas antigas mantidas em paralelo até todos os módulos migrarem, depois removidas.

---

## Permissões RBAC

### Tarefas

```ts
"tarefas:read"      // Ver todas as tarefas
"tarefas:create"    // Criar tarefas
"tarefas:update"    // Editar tarefas de outros
"tarefas:delete"    // Excluir tarefas
```

| Permissão | admin | secretaria | membro |
|-----------|-------|------------|--------|
| `tarefas:read` | x | x | x |
| `tarefas:create` | x | x | x |
| `tarefas:update` | x | x | |
| `tarefas:delete` | x | x | |

**Ownership check (sempre, sem permissão):**
- Criador e responsável podem ver e atualizar status da própria tarefa
- Criador pode excluir própria tarefa

### Comentários

Sem permissões dedicadas. Herdam do módulo pai:
- Se pode ver a entidade → pode ler comentários
- Se pode ver a entidade → pode adicionar comentário
- Autor ou admin pode deletar comentário

---

## Integração Slack

### Ambiente de teste

- Criar canal `#bot-testes` no workspace da igreja (ou workspace separado "IPC Dev")
- Env vars por deployment Convex:
  - `SLACK_BOT_TOKEN` — token do Slack App (Bot)
  - `SLACK_SIGNING_SECRET` — para verificar requests do Slack
  - `SLACK_DEFAULT_CHANNEL` — canal padrão para notificações
- Dev e prod com valores diferentes (`npx convex env set`)

### Slack App — Configuração

Criar um Slack App com:
- **Bot Token Scopes**: `chat:write`, `chat:read`, `reactions:read`, `commands`, `users:read`
- **Event Subscriptions**: `message.channels` (mensagens em canais), `reaction_added`
- **Slash Commands**: `/tarefa`
- **Interactivity**: habilitado (para botões)

### Fluxos bidirecionais

#### App → Slack

| Evento no app | Ação no Slack |
|----------------|---------------|
| Tarefa criada | Posta Block Kit no canal do módulo (ou default). Salva `slackMessageTs`. Cria Slack Todo para o responsável. |
| Tarefa concluída | Atualiza mensagem original (strikethrough + checkmark). Completa Slack Todo. |
| Tarefa atrasada (cron) | Reply na thread da tarefa: "Tarefa atrasada há X dias". |
| Comentário adicionado no app | Posta como reply na thread do Slack (usando `slackMessageTs` como `thread_ts`). |
| Status alterado | Reply na thread: "Status: ABERTA → EM_ANDAMENTO por {nome}". |

#### Slack → App

| Evento no Slack | Ação no app |
|-----------------|-------------|
| Reply na thread de uma tarefa | Cria comentário na tarefa (identifica via `slackMessageTs`). |
| Reação ✅ na mensagem da tarefa | Marca tarefa como concluída (identifica membro via Slack user ID). |
| `/tarefa Título @responsavel sexta` | Cria tarefa no app. Posta confirmação no canal. |
| Slack Todo criado (se API permitir) | Cria tarefa no app vinculada. |

#### Mapeamento Slack ↔ Membro

Tabela ou campo para vincular:
```ts
// Opção: campo no schema de membros
slackUserId: v.optional(v.string()) // no registro do membro
```
Vinculação feita manualmente (admin mapeia) ou por match de email.

### Backend Slack

```
convex/slack/
  slackApp.ts          — configuração do Slack App, helpers
  slackActions.ts      — internalActions: postMessage, updateMessage, createTodo
  slackWebhook.ts      — HTTP handler: recebe events do Slack (via convex/http.ts)
  slackHelpers.ts      — Block Kit builders, user mapping
```

O endpoint HTTP em `convex/http.ts` recebe eventos do Slack (challenge, message events, slash commands) e roteia para as actions/mutations correspondentes.

---

## Telas

### 1. Lista de Tarefas (`/tarefas`)

- Header: título + botão "Nova Tarefa"
- Tabs (nuqs): "Atribuídas a mim" (default) | "Minhas tarefas" (criadas) | "Todas" (se `tarefas:read`)
- Filtros: status, prioridade, módulo, toggle "atrasadas"
- Cards ordenados por data de vencimento, atrasadas em destaque (vermelho)
- Opcional: toggle kanban (ABERTA → EM_ANDAMENTO → CONCLUÍDA)
- `<ModuloGuard modulo="tarefas">`

### 2. Detalhe da Tarefa (`/tarefas/[id]`)

- Topo fixo: título, descrição, badges (status, prioridade), responsável (avatar + nome), criador, data vencimento, link módulo relacionado
- Ações: mudar status, editar (abre TarefaForm), excluir
- Meio scrollável: thread de comentários (componente `<ComentariosThread>` reutilizável)
- Bottom fixo: input de comentário
- Indicador de sync Slack (ícone Slack se vinculado a thread)

### 3. Componente reutilizável `<ComentariosThread>`

Usado em qualquer página de detalhe:
- `/tarefas/[id]` — comentários da tarefa
- `/gravacoes/[id]` — substitui componente atual `Comentarios.tsx`
- `/pedidos-oracao/[id]` — substitui seção de comentários em `PedidoOracaoDetalhe.tsx`
- Futuros módulos — plug-and-play

Props: `entidadeTipo`, `entidadeId`, `showTipo?` (mostrar toggle COMENTARIO/ATUALIZACAO), `showSlackBadge?`

---

## Arquivos a Criar/Modificar

### Backend — Tarefas

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | MODIFICAR | Tabelas `tarefas` e `comentarios`. Campo `slackUserId` em `membros`. |
| `convex/preferencias/rbac.ts` | MODIFICAR | 4 permissões tarefas |
| `convex/preferencias/rbacHelpers.ts` | MODIFICAR | Permissões por role |
| `types/auth.ts` | MODIFICAR | Tipo Permission |
| `convex/tarefas/queries.ts` | CRIAR | list, getById, listByModulo, dashboardStats |
| `convex/tarefas/mutations.ts` | CRIAR | create, update, updateStatus, remove |
| `convex/modulos/mutations.ts` | MODIFICAR | Adicionar "tarefas" ao seed |

### Backend — Comentários unificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/comentarios/queries.ts` | CRIAR | listByEntidade, countByEntidade |
| `convex/comentarios/mutations.ts` | CRIAR | create, remove |
| `convex/comentarios/migration.ts` | CRIAR | Migrar dados de `comentariosGravacao` e `pedidoOracaoComentarios` |

### Backend — Slack

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/slack/slackApp.ts` | CRIAR | Config, helpers |
| `convex/slack/slackActions.ts` | CRIAR | internalActions: postMessage, updateMessage, createTodo |
| `convex/slack/slackWebhook.ts` | CRIAR | HTTP handler para Events API |
| `convex/slack/slackHelpers.ts` | CRIAR | Block Kit builders, user mapping |
| `convex/http.ts` | MODIFICAR | Rota para webhook do Slack |

### Frontend — Tarefas

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/(ready)/tarefas/page.tsx` | CRIAR | Lista com filtros/tabs |
| `app/(ready)/tarefas/[id]/page.tsx` | CRIAR | Detalhe com comentários |
| `features/tarefas/components/TarefaCard.tsx` | CRIAR | Card para lista |
| `features/tarefas/components/TarefaForm.tsx` | CRIAR | Dialog form (RHF + Zod) |
| `features/tarefas/components/TarefaDetalhe.tsx` | CRIAR | Vista detalhe |
| `features/tarefas/components/TarefaStatusBadge.tsx` | CRIAR | Badge de status |
| `features/tarefas/components/TarefaPrioridadeBadge.tsx` | CRIAR | Badge de prioridade |
| `features/tarefas/lib/constants.ts` | CRIAR | Opções de status, prioridade, cores |
| `features/tarefas/lib/validations.ts` | CRIAR | Schemas Zod (zod/v4) |

### Frontend — Comentários (shared)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `shared/components/ComentariosThread.tsx` | CRIAR | Componente reutilizável de comentários |
| `shared/components/ComentarioItem.tsx` | CRIAR | Item individual com threading |
| `shared/components/ComentarioInput.tsx` | CRIAR | Input de comentário |
| `features/gravacoes/components/Comentarios.tsx` | MIGRAR | Substituir por `<ComentariosThread>` |
| `features/pedidosOracao/components/PedidoOracaoDetalhe.tsx` | MIGRAR | Substituir seção de comentários |

### Shared

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `shared/components/layout/AppSidebar.tsx` | MODIFICAR | Item "Tarefas" na navegação |
| `shared/components/layout/DevContext.tsx` | MODIFICAR | Entries para /tarefas e /tarefas/[id] |

---

## Impacto em Shared

- [x] `schema.ts` — 2 tabelas novas (`tarefas`, `comentarios`) + campo `slackUserId` em `membros`
- [x] `rbac.ts` — 4 permissões novas
- [x] `rbacHelpers.ts` — roles iniciais
- [x] `types/auth.ts` — tipo Permission
- [x] `AppSidebar.tsx` — 1 item novo
- [x] `DevContext.tsx` — 2 entries
- [x] `convex/http.ts` — rota para Slack webhook
- [x] Risco de regressão: **médio** — migração de comentários toca gravações e pedidos de oração

---

## Ordem de Implementação

### Fase 1 — Schema + RBAC
1. Adicionar tabelas `tarefas` e `comentarios` em `schema.ts`
2. Adicionar campo `slackUserId` em `membros`
3. Adicionar permissões em `rbac.ts`, `rbacHelpers.ts`, `types/auth.ts`
4. Registrar módulo "tarefas" no seed

### Fase 2 — Comentários unificados
5. `convex/comentarios/` — queries + mutations
6. `shared/components/ComentariosThread.tsx` — componente reutilizável
7. Migrar gravações: substituir `Comentarios.tsx` por `<ComentariosThread>`
8. Migrar pedidos de oração: substituir seção em `PedidoOracaoDetalhe.tsx`
9. Migration script: copiar dados das tabelas antigas para `comentarios`
10. (Após validar) Remover tabelas `comentariosGravacao` e `pedidoOracaoComentarios`

### Fase 3 — Backend Tarefas
11. `convex/tarefas/queries.ts` — list, getById, listByModulo, dashboardStats
12. `convex/tarefas/mutations.ts` — CRUD + chamadas ao Slack

### Fase 4 — Frontend Tarefas
13. `features/tarefas/lib/` — constants, validations
14. `features/tarefas/components/` — TarefaCard, Form, Detalhe, Badges
15. `app/(ready)/tarefas/page.tsx` — lista
16. `app/(ready)/tarefas/[id]/page.tsx` — detalhe (usa `<ComentariosThread>`)

### Fase 5 — Navegação + DevContext
17. Sidebar + DevContext

### Fase 6 — Slack (pode começar após fase 1)
18. Configurar Slack App no workspace de teste (`#bot-testes`)
19. `convex/slack/` — actions, webhook handler, helpers
20. Rota HTTP em `convex/http.ts`
21. App → Slack: notificações de tarefas
22. Slack → App: replies em threads → comentários
23. Slash command `/tarefa`
24. Reação ✅ → concluir tarefa

### Fase 7 — Integrações (incremental)
25. Seção "Tarefas relacionadas" em páginas de outros módulos
26. Mapeamento Slack user ↔ membro (admin UI ou auto por email)
27. Notificações Slack para outros módulos (gravações processadas, novos pedidos de oração)

---

## Cenários de Uso

### "Pastor cria tarefa no app, diácono recebe no Slack"
- Pastor cria: "Preparar sala para culto de domingo", atribui ao João, prazo sexta
- App posta no `#geral` (ou canal do módulo): Block Kit com título, responsável, prazo, botão [Ver no app]
- Slack cria Todo para João: "Preparar sala para culto de domingo — sexta"
- João vê o Todo na sua lista do Slack + notificação no canal

### "Líder discute tarefa no Slack, aparece no app"
- Mensagem da tarefa no `#louvor`: "Ensaiar música nova - Salmo 23"
- Sarah responde na thread: "Posso trazer partitura na quarta"
- Resposta aparece como comentário na tarefa no app
- André responde no app: "Perfeito, confirmo!"
- Resposta aparece na thread do Slack

### "Alguém marca ✅ no Slack"
- Reação ✅ na mensagem da tarefa
- App identifica membro via `slackUserId`
- Tarefa marcada como CONCLUIDA
- Mensagem atualizada no Slack: ~~Preparar sala~~ ✅ Concluída por João
- Slack Todo completado

### "Slash command no Slack"
- João digita: `/tarefa Comprar materiais para escola dominical @maria sexta`
- App cria tarefa, atribui à Maria, prazo sexta
- Resposta no canal: "Tarefa criada! [Ver no app]"

### "Discussão em gravação sincronizada"
- Pastor comenta na gravação do sermão: "Excelente ponto no minuto 23"
- Se gravação tem `slackMessageTs` vinculado, comentário aparece na thread do Slack
- Outro líder responde pelo Slack → aparece como comentário no app

### "Tarefa atrasada"
- Cron diário: "Entregar relatório financeiro" venceu há 2 dias
- Reply na thread do Slack: "⚠️ Tarefa atrasada há 2 dias — @maria"
- Na lista do app, card em destaque vermelho

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| `schema.ts` é shared danger zone | Implementar sem outras features tocando schema em paralelo |
| Migração de comentários pode quebrar gravações/pedidos | Manter tabelas antigas em paralelo. Migrar um módulo por vez. Validar antes de remover. |
| Slack Events API requer endpoint público | Convex HTTP routes já são públicas. Verificar `signing_secret` em cada request. |
| Mapeamento Slack user ↔ membro | Fallback: mostrar "Usuário Slack" se não mapeado. Admin pode vincular depois. |
| Rate limits do Slack API | `ctx.scheduler.runAfter` com backoff. Batch notifications no cron. |
| Referência polimórfica sem integridade referencial | Frontend trata entidade deletada gracefully ("Referência removida") |
| Volume de tarefas cresce | Paginação desde o início (cursor-based). `dashboardStats` só faz counts, sem enrichment. |
| Slack App requer aprovação do workspace admin | Testar com `#bot-testes` antes. Documentar scopes necessários para o admin aprovar. |
