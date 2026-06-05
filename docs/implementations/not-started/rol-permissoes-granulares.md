# Permissoes Granulares do Rol de Membros

## Escopo

Separar o acesso a pagina Rol de Membros (`/secretario-executivo`) em permissoes granulares — **ver** (`membros:rol_read`) e **editar** (`membros:rol_update`) — mantendo `membros:update_eclesiastico` como permissao "total" legada (compatibilidade, sem migracao de dados). Permite liberar a pagina em modo somente-leitura para usuarios especificos via `/admin/permissoes`.

## Modelo de permissoes proposto

| Permissao | Concede |
|-----------|---------|
| `membros:rol_read` (nova) | Ver a pagina Rol: tabela, dashboard de cards, historico, exportacao/impressao |
| `membros:rol_update` (nova) | Edicao inline, status, tornar membro, cargos/mandatos, vinculos de familia |
| `membros:update_eclesiastico` (existente) | Continua valendo como acesso total ao Rol (ver + editar). Sem breaking change |
| `membros:delete` (existente) | Exclusao de membro — a pagina Rol nao tem acao de excluir hoje; nada a fazer |

### Decisoes de design

- **Aditivo**: as novas permissoes sao ADICIONADAS aos `requireAnyPermission` existentes. Nenhum role ou membro perde acesso; **zero migracao** de `rolePermissions`/overrides no banco.
- **Nao criar `rol_delete`** (YAGNI — a pagina nao tem exclusao; se surgir, reaproveitar `membros:delete`).
- O wildcard `membros:*` cobre as novas automaticamente (`hasPermission` em rbacHelpers).
- Override individual por membro **substitui** o role (comportamento atual de `resolvePermissions`) — ao conceder `rol_read` individual, incluir as demais permissoes que o usuario ja tinha pelo papel.

## Modelos Afetados

| Tabela | Tipo de Mudanca |
|--------|-----------------|
| (nenhuma) | Sem mudanca de schema — permissoes sao strings em `membros.permissions` e `rolePermissions.permissions` |

## Permissoes

- **Quem pode ver a pagina**: `rol_read` OU `rol_update` OU `update_eclesiastico` (via `AnyPermissionGate`, ja existente)
- **Quem pode editar**: `rol_update` OU `update_eclesiastico`
- **Defaults por papel** (`INITIAL_ROLE_PERMISSIONS`): `pastor`, `secretaria` e `secretario_executivo` ganham `rol_read` + `rol_update`; `admin` ja tem `*`

## Impacto em Shared

- [x] Toca arquivos sensiveis:
  - `convex/preferencias/rbac.ts` (ALL_PERMISSIONS, PERMISSION_LABELS) — danger zone, TODOS os modulos
  - `convex/preferencias/rbacHelpers.ts` (INITIAL_ROLE_PERMISSIONS) — danger zone
  - `types/auth.ts` (union `Permission`) — danger zone
- Risco de regressao: todos os modulos dependem do RBAC. Mudancas sao puramente aditivas (novas strings no catalogo), risco baixo — mas **nao implementar em paralelo** com outra feature que toque esses arquivos (rule worktree-parallel) e rodar `npm test` (testes de RBAC existentes).

## Riscos

1. **Leitura ja vazara pelo backend**: `listParaSecretario`/`getResumoSecretario` hoje aceitam `membros:read` alem de `update_eclesiastico`. Restringir seria breaking; proposta: manter (ver pergunta 1).
2. **Override substitui o role**: conceder so `rol_read` individual apaga as permissoes do papel. Mitigacao: orientacao na UI; tornar o override aditivo fica fora de escopo (fase futura).
3. **Tabela com edicao inline**: `SecretarioExecutivoTabela` salva no blur (selects/inputs). Precisa de modo somente-leitura quando o usuario nao tem `rol_update` — principal esforco de frontend. O card mobile ja e read-only (reaproveitar padrao).
4. **Detalhe `/secretario-executivo/[id]`** tambem edita (EclesiasticoForm, AtosPastoraisSection, CargosHistoricoSection) — precisa dos mesmos gates.

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `types/auth.ts` | Modificar | Adicionar `"membros:rol_read"` e `"membros:rol_update"` ao union `Permission` |
| `convex/preferencias/rbac.ts` | Modificar | Novas entradas em `ALL_PERMISSIONS` + `PERMISSION_LABELS` (aparecem automaticamente na PermissionMatrix) |
| `convex/preferencias/rbacHelpers.ts` | Modificar | `INITIAL_ROLE_PERMISSIONS`: pastor/secretaria/secretario_executivo ganham as novas |
| `convex/membros/eclesiastico.ts` | Modificar | Adicionar `rol_read` aos checks de leitura (`listParaSecretario`, `getResumoSecretario`, `getHistorico`, `getFamily`) e `rol_update` aos de escrita (`updateEclesiastico`, `marcarCampoVerificado`, `tornarMembro`, `updateStatus`, grupo `PERM_FAMILIA`) |
| `app/(ready)/secretario-executivo/page.tsx` | Modificar | `PermissionGate` -> `AnyPermissionGate` `[rol_read, rol_update, update_eclesiastico]` |
| `features/secretarioExecutivo/components/SecretarioExecutivoTabela.tsx` | Modificar | Modo somente-leitura sem permissao de edicao (inline edit, drawers, Tornar membro, Cargos) |
| `app/(ready)/secretario-executivo/[id]/page.tsx` + `EclesiasticoForm.tsx` | Modificar | Gates de edicao no detalhe |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualizar notas de permissao das rotas do rol |
| testes de RBAC existentes | Modificar | Cobrir resolucao das novas permissoes (wildcard, role default, override) |

## Ordem de Implementacao

1. Catalogo compartilhado: `types/auth.ts` + `rbac.ts` + `rbacHelpers.ts` (base; rodar `npm test`)
2. Backend: checks aditivos em `eclesiastico.ts` (+ `npx convex codegen`)
3. Frontend: gate da pagina -> modo leitura da tabela -> detalhe `[id]`
4. `npm test` + lint + atualizar DevContext
5. Validacao manual: conceder apenas `rol_read` a um usuario de teste via `/admin/permissoes` e conferir que ve a pagina sem nenhum controle de edicao (e que `convex deploy` de prod acompanha o merge)

## Perguntas em aberto

1. Restringir a leitura do rol removendo `membros:read` dos checks de `listParaSecretario`/`getResumoSecretario`? (proposta: nao — manter aditivo; revisitar se quiser leitura exclusiva por `rol_read`)
2. Mostrar aviso na PermissionMatrix de que o override individual substitui o papel?
3. Fase 2 (futuro): deprecar `membros:update_eclesiastico` em favor das granulares, com migracao dos `rolePermissions` no banco?
