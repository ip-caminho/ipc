# Sincronização Notion → Sistema (versículo, escala, avisos)

## Escopo

Automatizar a importação de três databases do Notion (Escala, Liturgia, Avisos) para o sistema, com sincronização automática periódica + botão manual. Unidirecional (Notion é fonte de verdade durante transição), sem duplicar lógica dos scripts de import CSV já existentes.

## Modelos Afetados

| Tabela | Mudança |
|--------|---------|
| `cultos` | Nenhuma (reusa lógica de `importLiturgia.ts` / `importEscalas.ts`) |
| `cultoEscalas` | Nenhuma (reusa lógica de `importLiturgia.ts` / `importEscalas.ts`) |
| `avisos` | **Adiciona campo `notionId` + `.index("by_notionId")`** |
| `notionSyncRuns` | **Nova tabela** (log de sincronizações) |

## Permissões

- Quem pode acionar sync manual: admins (gate por `role === "admin"`)
- Quem pode ver status de sincronização: admins
- Sync automático: cron a cada 3 horas (sem gatekeep)

## Impacto em Shared

Nenhum impacto em arquivos compartilhados críticos (`schema.ts` tem mudanças mas é localizadas em novas seções; nenhuma mudança em rbac/auth/types).

| Arquivo | Risco | Detalhes |
|---------|-------|---------|
| `convex/schema.ts` | **MÉDIO** — adição de novos campos/tabelas, sem remover nada | Apenas `avisos.notionId` + nova `notionSyncRuns` |
| `convex/crons.ts` | **BAIXO** | Só adiciona um novo cron, sem tocar nos existentes |

## Riscos

- **Bug real achado em planejamento**: campo `Louvor` no Notion é multi-select de nomes, mas `importEscalas.importar` só aceita `membroId` de verdade (sem fallback pra `nomeCustom` como os outros campos). Solução: resolver nomes contra `membros` antes de chamar a mutation; nomes que não resolverem são pulados + registrados no `resumo`.
- **Paginação Notion API**: se houver >100 registros na janela (7 dias atrás até +12 semanas), precisa tratar `has_more`/`next_cursor`.
- **Chave de upsert para avisos**: adicionar `notionId` (ID da página Notion) na tabela `avisos` pra diferenciar "aviso sincronizado" de "aviso criado manualmente no sistema" (nunca mexe em manual ao arquivar). Precedente: `calendarioEventos.origem`.

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Adiciona `notionId` a `avisos`, cria `notionSyncRuns` |
| `convex/notionSync/action.ts` | Criar | `"use node"` + `internalAction`, busca 3 databases via Notion REST API, chama mutations de import |
| `convex/notionSync/mutations.ts` | Criar | `upsertAvisos` (upsert por `notionId`), `triggerSync` (botão manual) |
| `convex/notionSync/queries.ts` | Criar | `getLastRun` (status pra UI) |
| `convex/crons.ts` | Modificar | Adiciona cron de 3h para sync automático |
| `app/(ready)/admin/escalas/page.tsx` | Modificar | Nova aba "Sincronizar Notion" |
| `features/escalas/components/NotionSyncTab.tsx` | Criar | Componente da aba: mostra status + botão de sync |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualiza CONTEXT_MAP de `/admin/escalas` |

## Ordem de Implementação

1. Schema (`convex/schema.ts`)
2. Backend de sync (`convex/notionSync/*`, `convex/crons.ts`)
3. UI (`app/(ready)/admin/escalas/`, `features/escalas/components/NotionSyncTab.tsx`)
4. DevContext
5. Testes + lint

## Pré-requisitos (usuário)

- [ ] Criar Notion internal integration em `ipdocaminho` workspace
- [ ] Compartilhar as 3 databases com a integration
- [ ] Passar token via: `npx convex env set NOTION_API_KEY <token>` (dev + prod)

IDs das databases:
- Escala: `fb9d7d0f-7673-41ea-8870-eddbbc574fa7`
- Liturgia: `79c9f3b6-8778-4535-aa2b-69d6f21f12bf`
- Avisos: `604f6cb7-4add-4341-9efa-bf5ffb1d395b`
