# Aviso de Ausencia

## Escopo
Permitir que membros da lideranca ("obreiro para cima") registrem que estarao
ausentes/indisponiveis em uma data ou intervalo de datas, com motivo opcional.
O aviso e visivel apenas para a lideranca (no calendario interno) e dispara push
para os inscritos da lideranca no momento da criacao. A ausencia trava a escala
de forma **bidirecional**: nao se marca ausencia de quem ja esta escalado/no
planejamento, e nao se escala/planeja quem esta marcado como ausente.

Reaproveita a UI morta de disponibilidade em calendario (`DisponibilidadeTab` +
rota `/escalas/disponibilidade` que hoje so faz `redirect`) e o mecanismo
existente de `indisponibilidades`, que o gerador de escala ja respeita.

## Ponto de Entrada (UX)
- **Sidebar > secao "Culto" > "Ausencias"** (`GESTAO_SECTIONS`), ao lado de
  "Planejamento" (escalas) que e o que a ausencia afeta. So aparece com
  `ausencias:read` → automaticamente "obreiro para cima". No mobile, cai dentro
  do sheet "Mais" (nao gasta slot da bottom bar).
- A pagina `/ausencias` e um lugar so: lista as proximas ausencias + botao
  "Registrar ausencia" (dialog). Reaproveita o calendario morto para marcar datas.
- Camada passiva adicional: tarja nos dias em `/calendario` (atras de
  `ausencias:read`) para quem so esta olhando a agenda esbarrar na informacao.

## Contexto — o que ja existe
- `indisponibilidades` (schema:445) — VIVA. Marca um domingo como indisponivel;
  usada em `/escalas` (`MinhaEscalaUnificada`) e respeitada pelo gerador
  (`gerarEscala.ts` → `gerarEscalaHelpers.ts`). Limitacoes: so domingos, data
  unica (sem intervalo), silenciosa (ninguem e notificado).
- `DisponibilidadeTab.tsx` — UI em calendario, MORTA (nunca renderizada).
- Rota `/escalas/disponibilidade` — so `redirect("/escalas")`.
- `upsertEscala` (`convex/escalas/mutations.ts:157`) — alocacao MANUAL na escala;
  hoje **nao** checa indisponibilidade.
- `toggleIndisponibilidade` (`disponibilidade.ts:117`) — ja bloqueia marcar
  indisponivel quem ja esta escalado no domingo (reusar essa logica).
- Papeis (`types/auth.ts`): sem hierarquia ordinal. "Obreiro para cima" NAO existe
  como nivel — sera modelado como **permissao dedicada** concedida aos papeis de
  lideranca (regra do repo: RBAC sem heranca, permissoes explicitas).
- Push: `sendPushToAll` (`notifications/actions.ts:7`) manda para TODOS. Precisa de
  variante segmentada por papel.

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| `avisosAusencia` | **Nova tabela** — `membroId`, `dataInicio`, `dataFim?`, `motivo?`, `criadoEm` |
| `indisponibilidades` | Sem schema change — upsert automatico dos domingos cobertos por um aviso |
| `cultoEscalas` | Sem schema change — `upsertEscala` passa a bloquear alocacao de ausente |

Schema novo:
```ts
avisosAusencia: defineTable({
  membroId: v.id("membros"),        // quem estara ausente (= sempre o proprio, self)
  dataInicio: v.string(),            // YYYY-MM-DD
  dataFim: v.optional(v.string()),   // YYYY-MM-DD (default = dataInicio)
  motivo: v.optional(v.string()),
  criadoEm: v.number(),
})
  .index("by_dataInicio", ["dataInicio"])
  .index("by_membro", ["membroId"]),
```
Tabela dedicada (nao sobrecarrega `calendarioEventos`) para: (1) nao vazar ausencia
no site publico e (2) suportar intervalo de datas (pastor viaja uma semana).
Sem `criadoPor`: so o proprio membro registra a sua ausencia, entao seria sempre
igual a `membroId`.

## Permissoes
- Novas permissions: `ausencias:read`, `ausencias:manage`
- Concedidas a: `obreiro`, `secretaria`, `secretario_executivo`, `presbitero`,
  `pastor` (e `admin` via `*`). `membro` NAO recebe → nao ve nem cria.
- `ausencias:read` controla visibilidade da camada no calendario.
- `ausencias:manage` controla o botao "Registrar ausencia" e as mutations.

## Regras de Negocio (travas bidirecionais)
0. **Ownership**: `criarAusencia`/`removerAusencia` operam sempre sobre o membro
   logado (`membroId` = self). Nao ha registro por terceiros. Gate: `ausencias:manage`.
1. **Criar ausencia** (`criarAusencia`): para cada domingo dentro de
   `[dataInicio, dataFim]`, se o membro ja estiver escalado em algum `culto`
   daquela data (`cultoEscalas`), **bloquear** com erro claro ("Ja esta escalado
   em DD/MM. Fale com o coordenador antes de registrar ausencia."). So cria o
   aviso se nenhuma data do intervalo tiver conflito.
2. **Unificacao com escala**: apos criar o aviso, faz upsert em
   `indisponibilidades` para cada domingo do intervalo → o gerador de escala ja
   passa a pular a pessoa automaticamente.
3. **Alocacao manual** (`upsertEscala`): ao setar `membroId`, checar se existe
   `avisosAusencia`/`indisponibilidades` cobrindo a `data` do culto. Se houver,
   **bloquear** ("Membro esta marcado como ausente em DD/MM.").
4. **Remover ausencia** (`removerAusencia`): remove o aviso e as
   `indisponibilidades` correspondentes que ele criou.

## Notificacao
- Nova action `sendPushToRoles(roles, title, body, url)` — junta
  `pushSubscriptions` → `membros` → filtra por `role` na lista de lideranca.
- `criarAusencia` agenda essa action (via scheduler) notificando a lideranca:
  "Fulano estara ausente em DD/MM – motivo".

## Impacto em Shared
- [x] Toca arquivos sensiveis:
  - `convex/schema.ts` — ALTO risco (nova tabela)
  - `types/auth.ts` — ALTO risco (novas Permissions)
  - `convex/preferencias/rbac.ts` — ALTO risco (ALL_PERMISSIONS + labels)
  - `convex/preferencias/rbacHelpers.ts` — ALTO risco (INITIAL_ROLE_PERMISSIONS)
  - `shared/components/layout/DevContext.tsx` — registrar superficie
- [x] Risco de regressao: nenhuma outra worktree/feature ativa toca esses
  arquivos em paralelo. Implementar sequencialmente nesta branch.

## Riscos
- Esquecer de conceder as permissions a algum papel de lideranca → some da UI para
  ele. Mitigar cobrindo todos os 5 papeis + validando na matriz de permissoes.
- `sendPushToAll` referencia funcoes por string (`@ts-ignore`); a variante nova
  deve seguir o mesmo padrao para nao quebrar o "use node".
- Intervalo grande (ex: 30 dias) gera muitos upserts em `indisponibilidades` —
  aceitavel (so domingos do intervalo, poucos por mes).

## Arquivos a Criar/Modificar
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | tabela `avisosAusencia` + indices |
| `types/auth.ts` | Modificar | `ausencias:read`, `ausencias:manage` em Permission |
| `convex/preferencias/rbac.ts` | Modificar | permissions em ALL_PERMISSIONS + labels + grupo |
| `convex/preferencias/rbacHelpers.ts` | Modificar | conceder a obreiro/secretaria/secretario_executivo/presbitero/pastor |
| `convex/ausencias/mutations.ts` | Criar | `criarAusencia`, `removerAusencia` (+ upsert indisponibilidades + trava escala + agenda push) |
| `convex/ausencias/queries.ts` | Criar | `listPorPeriodo`, `listProximas` (gated `ausencias:read`) |
| `convex/escalas/mutations.ts` | Modificar | `upsertEscala` bloqueia alocar membro ausente na data do culto |
| `convex/notifications/actions.ts` | Modificar | `sendPushToRoles` (push segmentado por papel) |
| `convex/notifications/queries.ts` | Modificar | query de subscriptions com role do membro |
| `shared/constants/navigation.ts` | Modificar | item "Ausencias" na secao "Culto" (`GESTAO_SECTIONS`), `permission: "ausencias:read"` |
| `app/(ready)/ausencias/page.tsx` | Criar | pagina dedicada: lista proximas ausencias + botao "Registrar ausencia" + calendario revivido |
| `features/ausencias/components/AvisoAusenciaDialog.tsx` | Criar | dialog: periodo (dataInicio/dataFim) + motivo (sempre a propria ausencia) |
| `features/ausencias/components/AusenciasCalendario.tsx` | Criar | calendario para marcar (reaproveita `DisponibilidadeTab` morto) |
| `features/calendario/components/*` | Modificar | camada "Ausencias" (tarja nos dias) atras de `can("ausencias:read")` |
| `app/(ready)/escalas/disponibilidade/page.tsx` | Modificar | remover o redirect morto (substituido por `/ausencias`) |
| `shared/components/layout/DevContext.tsx` | Modificar | registrar `/ausencias` no CONTEXT_MAP |

## Ordem de Implementacao
1. Schema (`avisosAusencia`)
2. RBAC (auth.ts, rbac.ts, rbacHelpers.ts)
3. Backend ausencias (mutations + queries) com travas bidirecionais + unificacao
4. Trava reversa em `upsertEscala`
5. Push segmentado (`sendPushToRoles`)
6. UI: pagina `/ausencias` (lista + dialog + calendario) + item no sidebar "Culto"
7. Camada de tarja no `/calendario`
8. DevContext
9. Testes (tsc + lint + vitest)
