# Otimização de Custo Convex + Render Next.js

## Escopo

Ajustar queries Convex para usar índices já existentes + paginação, e descer `"use client"` para componentes filhos nas páginas públicas (+ `generateMetadata` no detalhe de livro). Sem alteração de schema/dados, sem denormalização.

Origem: auditoria read-only de 14/06/2026. Entrega de áudio confirmada segura (B2 → Cloudflare direto). O custo evitável está em queries reativas quentes que fazem `.collect()` total + `.filter()` em memória em vez de usar o índice que já têm, e em `auditLogs` (cresce sem limite) sem paginação.

Decisões de escopo confirmadas:
- **Sem denormalização / sem migração.** N+1 que usam `ctx.db.get(_id)` (point lookup barato) ficam para backlog.
- **/gravacoes (rota autenticada) não vira ISR.** Mantém client component; otimiza-se só a query backend.

## Modelos Afetados

| Tabela | Tipo de Mudança |
|--------|-----------------|
| Nenhuma | Sem alteração de schema. Apenas uso de índices já existentes. |

## Permissões

Sem mudança. Queries mantêm `requirePermission`/`PermissionGate` atuais. Públicas continuam públicas; auditoria/campanhas continuam admin-only.

## Impacto em Shared

- [ ] `convex/schema.ts` — **não tocar** (nenhum índice novo previsto). Se necessário, isolar em commit próprio (arquivo sensível).
- [ ] Risco de regressão: baixo. Mudanças por-query e por-página, sem shared files críticos.

## Achados priorizados (ALTO + MÉDIO)

### Frente A — Queries Convex (backend)

| Pri | Arquivo:linha | Problema | Conserto |
|-----|---------------|----------|----------|
| ALTO | `convex/gravacoes/queries.ts:31` (`list`) | `.collect()` total + 5 `.filter()` em memória; reativa quente | Base via `.withIndex("by_status", q=>q.eq("status","PUBLICADO"))` (ou `by_tipo` quando filtra tipo); demais filtros em memória sobre o subconjunto. `search` permanece em memória (sem full-text) — documentar. Respeitar visibilidade por papel (admin vê rascunhos). |
| ALTO | `convex/gravacoes/queries.ts:220` (`listFrases`) | scan total p/ extrair frases; reativa na home (`FrasesCarrossel`) | `.withIndex("by_status", PUBLICADO)`; iterar só publicados. |
| ALTO | `convex/gravacoes/queries.ts:251` (`listTags`) | scan total p/ agregar tags | Base `by_status` (PUBLICADO). |
| ALTO | `convex/audit/queries.ts:64` (`listFiltered`) | scan total de `auditLogs` (cresce ilimitado) + filtros em memória | `.withIndex("by_created_at").order("desc").paginate()`; usar `by_referencia` quando filtra tabela/registro. Expor cursor/`hasMore`. |
| ALTO | `convex/audit/queries.ts:14` (`list`) | scan + filter por tabela/id | Usar `by_referencia` [referenciaTabela, referenciaId]. |
| MÉDIO | `convex/audit/queries.ts:122` (`listTabelas`) | scan total só p/ distinct | `.take(N)` com cap + `log` do limite, ou lista fixa cacheada de tabelas auditáveis. Admin, baixa freq. |
| MÉDIO | `convex/calendario/queries.ts:14` | `.collect()` + filter por data em memória | Usar `by_data` (gte/lte no range). |
| MÉDIO | `convex/membros/queries.ts:122,195` (`birthdays*`) | scan de `membros` + 4× `useQuery` reativo no dashboard | Sem índice de aniversário (sem denormalização) → manter scan (tabela pequena), mas **consolidar as 4 `useQuery` em 1**. |
| MÉDIO | `convex/messaging/campanhas.ts:490` (`listCampanhas`) | N+1: conta envios por campanha | Já usa `by_campanha`; limitar/paginar a lista, contar só na visível. Admin. |

N+1 com `ctx.db.get(_id)` (`membros.list:18`, `escutas:86-117`, `getCampanha:529`, autor de audit) — **backlog** (só somem com denormalização).

### Frente B — Render Next.js (frontend)

| Pri | Arquivo:linha | Problema | Conserto |
|-----|---------------|----------|----------|
| ALTO | `app/(public)/subir-audio/page.tsx:1` | `"use client"` na página pública toda; só o form precisa | Page vira Server Component; `"use client"` só em `SubirAudioForm`; manter `<Suspense>`. |
| MÉDIO | `app/(public)/culto/page.tsx:1` | `"use client"` herdado; header/logo estáticos | Descer `"use client"` p/ `BoletimContent`; page renderiza header + `<Suspense>`. |
| MÉDIO | `app/(public)/livro/[codigo]/page.tsx:1` | sem `generateMetadata` (SEO/preview) | `generateMetadata({params})` com `fetchQuery(getPublicByCodigo)`; ações de empréstimo em filho client. |
| MÉDIO | `app/(ready)/comunidade/page.tsx:1` | `"use client"` redundante (filhos já client) | Remover diretiva do page; `ContinueListeningCard`/`RecentByTipo` já têm `"use client"`. |

Modelo de referência correto: `app/(public)/page.tsx` (`export const revalidate = 300` + `fetchQuery` server-side + `HeroFX` client isolado).

## Riscos

- `gravacoes.list`: confirmar regra de visibilidade por papel antes de fixar base `by_status` (admin vê rascunhos).
- Paginação de auditoria muda contrato → ajustar `app/(ready)/admin/auditoria/page.tsx` (cursor/`hasMore`).
- Mover `"use client"` pode quebrar import de hooks no page → validar build por página.

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/gravacoes/queries.ts` | Modificar | `list`, `listFrases`, `listTags` → `by_status`. |
| `convex/audit/queries.ts` | Modificar | `list`/`listFiltered` índice + paginação; `listTabelas` cap. |
| `convex/calendario/queries.ts` | Modificar | range via `by_data`. |
| `convex/messaging/campanhas.ts` | Modificar | paginar/limitar `listCampanhas`. |
| `app/(ready)/admin/auditoria/page.tsx` | Modificar | consumir paginação. |
| `features/dashboard/components/AniversariantesCard.tsx`, `BirthdayList.tsx` | Modificar | consolidar `useQuery` de aniversários. |
| `app/(public)/subir-audio/page.tsx` + `SubirAudioForm` | Modificar | descer `"use client"`. |
| `app/(public)/culto/page.tsx` | Modificar | descer `"use client"` p/ `BoletimContent`. |
| `app/(public)/livro/[codigo]/page.tsx` | Modificar | `generateMetadata`. |
| `app/(ready)/comunidade/page.tsx` | Modificar | remover `"use client"`. |

## Ordem de Implementação

1. **Frente A (backend, sequencial por arquivo)** — `gravacoes/queries.ts` (maior impacto) → `audit` (+ página de auditoria) → `calendario` → `campanhas`. Cada: editar → `npm run lint` → validar via `mcp__convex__run`/`runOneoffQuery`.
2. **Frente B (frontend)** — paralela à A (worktree separada). `subir-audio` (ALTO) → `culto` → `livro` → `comunidade`. Após cada: `npm run build`.
3. **Dashboard aniversários** — consolidar `useQuery` (toca A+B).

Nenhum índice novo previsto → `schema.ts` intocado → frentes A e B paralelizáveis sem conflito sensível.

## Verificação

- **Backend**: comparar resultado antes/depois com `mcp__convex__runOneoffQuery` (mesmos args) — output idêntico. `mcp__convex__insights`/logs p/ confirmar queda de documentos lidos.
- **Render**: `npm run build` sem erro de boundary; `agent-browser` screenshot 390px (via `scripts/screenshot-auth.sh` p/ rotas autenticadas) — UI idêntica.
- **Auditoria**: paginação funcional em `/admin/auditoria`.
- `npm run lint` e `npm test` verdes antes de integrar.
- Atualizar `DevContext.tsx` se alguma página mudar queries/estrutura.

## Backlog (fora desta rodada)

- Denormalizar nome/foto da entidade em `membros`/`escutas` e contadores em `campanhas` para eliminar os N+1 de `ctx.db.get` — exige migração; reavaliar se o custo persistir.
