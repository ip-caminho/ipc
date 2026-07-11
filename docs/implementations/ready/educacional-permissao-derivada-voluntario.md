# Educacional — permissão derivada de voluntário

## Escopo
Voluntário do educacional com `papelEdu ∈ {PROFESSOR, AUXILIAR}` **herda
automaticamente** o conjunto Professor (`criancas:read`, `educacional:read`,
`relatorio_edu:write`) — e perde ao ser removido — sem o admin tocar em
permissões. Permissão **derivada do estado** (união no momento de resolver),
não gravada em `membro.permissions[]`.

## Por que derivada (e não grant/revoke)
`resolvePermissions` SUBSTITUI: se `membro.permissions[]` tem algo, o papel é
ignorado. Gravar a permissão obrigaria a congelar o papel (drift) e exigiria
rastrear procedência para revogar. Derivar no read é aditivo, instantâneo,
sem drift e sem bug de revogação.

## Regra
Se o membro tem linha em `eduVoluntarios` com papelEdu PROFESSOR ou AUXILIAR:
`perms_efetivas = base ∪ {criancas:read, educacional:read, relatorio_edu:write}`.
APOIO não deriva nada. Base com `*` (admin) fica inalterada.

## Pontos que resolvem permissão (todos os 3)
| Ponto | Mudança |
|---|---|
| `rbac.ts:getUserPermissionContext` (feed do `can()` do front) | une derivadas ao resultado |
| `_shared/requirePermission.ts` (gate de mutations) | fallback: se nega E a permissão pedida é derivada, checa eduVoluntarios (leitura só quando necessário) |
| `educacional/queries.ts:getAuthContext` (queries do módulo) | une derivadas |

## Arquivos
| Arquivo | Ação |
|---|---|
| `convex/_shared/eduVoluntarioPerms.ts` | Criar — `derivedPermsForPapel` (puro), `mergeDerived` (puro), `derivedEduVoluntarioPerms(ctx, membroId)` |
| `convex/_shared/requirePermission.ts` | fallback derivado em requirePermission + checkPermission |
| `convex/preferencias/rbac.ts` | união em getUserPermissionContext |
| `convex/educacional/queries.ts` | união em getAuthContext |
| `convex/_shared/__tests__/eduVoluntarioPerms.test.ts` | testes das funções puras |
| `shared/components/layout/DevContext.tsx` | nota |

## Notas
- Reativo: adicionar/remover voluntário atualiza `can()` do front na hora.
- Custo: 1 leitura indexada (`eduVoluntarios by_membro`) no contexto de permissão;
  no backend, só quando a permissão pedida é derivada e a base nega.
- Sem migração. Sem mudança de schema.

## Verificação
tsc, lint, testes (novos + rbac + educacional), build. Deploy Convex.
