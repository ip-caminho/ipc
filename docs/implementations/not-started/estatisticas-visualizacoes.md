# Estatísticas de visualizações (sermões + painel admin)

Issue: https://github.com/ip-caminho/ipc/issues/255

## Escopo

Contador de visualizações por sermão/gravação (membros logados e página pública
compartilhada por link, separados) + painel admin `/admin/estatisticas` com
ranking dos mais vistos. Tráfego do site público fica com `@vercel/analytics`
(zero-config); o painel só linka pro dashboard da Vercel — sem integração via
API (exigiria plano Pro).

Fora da v1: contador em turmas/avisos, tracking custom de pageview, permissão
RBAC nova. Mockup do painel: artifact "Estatísticas" (Claude Design).

## Modelos Afetados

| Tabela | Mudança |
|--------|---------|
| `gravacaoVisualizacoes` | **Nova tabela**: `gravacaoId`, `countMembros`, `countPublico`, `total`, `atualizadoEm`; índices `by_gravacao`, `by_total` |
| `gravacoes` | Nenhuma (contador fica fora de propósito — ver Riscos) |

## Permissões

- Quem pode ver `/admin/estatisticas`: `role === "admin"` via `AdminGate`
  (`shared/components/auth/RoleGate.tsx`); backend repete a checagem e retorna
  `null`. Item de nav com `roles: ["admin"]`.
- Registrar view (membro): qualquer sessão autenticada; sem sessão é no-op.
- Registrar view (público): sem auth, resolve pelo `shareToken` (não
  enumerável), só se `status === "PUBLICADO"`.

## Impacto em Shared

- [x] Toca arquivos sensíveis: `convex/schema.ts` (só adiciona tabela nova),
  `shared/components/layout/DevContext.tsx` (entrada nova), `app/layout.tsx`
  (`<Analytics />`), `shared/constants/navigation.ts` (item novo).
- [x] Risco de regressão: baixo. Nenhuma tabela/índice existente muda.

## Riscos

- **Reatividade/bandwidth (motivo da tabela separada)**: um `patch` em
  `gravacoes` a cada view re-executaria toda query reativa que leu o doc —
  `getById`, `list` (`.collect()` dos publicados), quiosque (`by_tipo SERMAO
  .collect()`, `queries.ts:253`), `getCompartilhada`, dashboard. Docs de
  gravação são pesados (`iaTranscricao`, `iaResultado`, `iaAvisos`). Projeto já
  está acima do plano free do Convex. Contador em tabela própria e enxuta não
  invalida nada disso.
- **Contagem inflável**: sem dedup por membro/dia (mesmo padrão de
  `comentariosCount`/`reacoesResumo`). Reload conta de novo. Guard `useRef` só
  evita o double-fire do StrictMode. Métrica é aproximada por design.
- **Ranking só de publicados**: `by_total desc .take(15)` → `ctx.db.get` de
  cada → descarta não-publicadas em memória → corta em 10. Filtro em memória
  sobre ≤15 docs, aceitável.
- **Vercel Analytics no plano Hobby**: cota mensal de eventos e retenção curta
  (~1 mês). Conferir plano da conta institucional antes de prometer histórico.
- **URL do dashboard Vercel**: constante com TODO até confirmar o slug
  `vercel.com/<team>/<projeto>/analytics`.
- **Deploy**: schema/mutations novos exigem `npx convex deploy` no
  earnest-husky-324 além do push (ver memória "Deploy Convex prod").

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Tabela `gravacaoVisualizacoes` perto de `escutasGravacao` |
| `convex/gravacoes/visualizacoes.ts` | Criar | Helper `incrementar` (upsert) + mutations `registrar({gravacaoId})` e `registrarPublica({codigo})`; nunca lançam erro |
| `convex/gravacoes/queries.ts` | Modificar | Query `getEstatisticasVisualizacoes` (admin-only): totais membros/público, `totalGravacoes`, top 10 publicadas |
| `convex/gravacoes/__tests__/contadores.integration.test.ts` | Modificar | 3 casos: membro 2× → `countMembros: 2`; público com token PUBLICADO → `countPublico: 1`, token de RASCUNHO → nada; sem sessão → nada. Reusa `seedAdmin`/`seedSermao` |
| `features/gravacoes/hooks/useVisualizacaoTracker.ts` | Criar | Hook `useVisualizacaoTracker({gravacaoId} \| {codigo} \| null)`, dispara 1× por chave com `useRef`; `// @ts-ignore Convex TS2589` no `useMutation` como em `useEscutaTracker.ts` |
| `app/(ready)/gravacoes/[id]/page.tsx` | Modificar | Chamar o hook abaixo de `useEscutaTracker`, só com `gravacao` carregada |
| `app/(public)/g/[token]/page.tsx` | Modificar | Chamar o hook com `{codigo: token}` quando `data?.valido` |
| `app/(ready)/admin/estatisticas/page.tsx` | Criar | `AdminGate` + 3 cards (views membros, views público, gravações com views) + `Table` top 10 (título→`/gravacoes/[id]`, pregador, membros, público, total) + card link externo Vercel Analytics. Ícones lucide (`Eye`, `Globe`, `BarChart3`, `ExternalLink`) |
| `shared/constants/navigation.ts` | Modificar | Import `BarChart3`; item "Estatísticas" na seção "Sistema" após "Gerenciar gravações", `roles: ["admin"]` |
| `shared/components/layout/DevContext.tsx` | Modificar | Entrada `/admin/estatisticas`; anotar mutation nova nas entradas de `/gravacoes/[id]` e `/g/[token]` |
| `app/layout.tsx` | Modificar | `<Analytics />` de `@vercel/analytics/next` após `<Toaster />` (linha 73) |
| `package.json` | `npm install @vercel/analytics` | Não editar na mão |
| `docs/modules/admin-estatisticas.md` | Criar (opcional) | Formato de `docs/modules/admin-gravacoes.md` |

## Ordem de Implementação

1. `convex/schema.ts` — tabela nova
2. `convex/gravacoes/visualizacoes.ts` — mutations
3. `convex/gravacoes/queries.ts` — query admin
4. Testes em `contadores.integration.test.ts` → `npm test -- contadores`
5. `npx convex dev` rodando (gera tipos)
6. Hook `useVisualizacaoTracker`
7. Plugar nas páginas `/gravacoes/[id]` e `/g/[token]`
8. Página `/admin/estatisticas`
9. Nav + DevContext
10. `npm install @vercel/analytics` + `app/layout.tsx`

## Verificação

1. `npm run lint`, `npm run typecheck`, `npm test -- contadores.integration.test.ts`
2. Dev: abrir sermão logado → doc em `gravacaoVisualizacoes` com `countMembros`
   +1 por reload (não +2). Abrir `/g/<token>` deslogado → `countPublico` +1.
   Token revogado ou rascunho → nada.
3. Logs do Convex: abrir um sermão dispara só `visualizacoes.registrar` — não
   re-executa `list`/`getById` de outros clientes.
4. `/admin/estatisticas` admin → ranking/totais batem; não-admin → fallback e
   query `null`.
5. Sidebar: item só pra admin.
6. Mobile 390px via skill `mobile-ux` — tabela de 5 colunas provavelmente
   precisa de cards (`ResponsiveDataList`).
7. Skill `convex-bandwidth` sobre query e mutations.
8. Pós-deploy: pageviews chegando na Vercel; trocar placeholder da URL.

## Referências

- Plano detalhado com trechos de código: `~/.claude/plans/mutable-hugging-scone.md`
  (sessão de 22–24/08/2026)
- Padrão de contador: `convex/gravacoes/comentarios.ts:96-116`
- Padrão de tracking: `convex/gravacoes/escutas.ts`, `features/gravacoes/hooks/useEscutaTracker.ts`
- Padrão de página admin: `app/(ready)/admin/gravacoes/page.tsx`
