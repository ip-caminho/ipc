# Permissoes Granulares do Rol de Membros (`rol:*`)

## Escopo

Substituir `membros:update_eclesiastico` por um modulo de permissoes proprio e limpo — **`rol:read`** (ver) e **`rol:update`** (editar) — controlando a pagina Rol de Membros (`/secretario-executivo`) com granularidade real. A permissao antiga **deixa de existir** (catalogo limpo, sem legado), com migracao dos dados existentes.

> Decisao do Andre (05/06/2026): "controlar com rol_* e deixar limpo, para nao ficar com permissoes poluidas".

## Modelo de permissoes

| Permissao | Concede |
|-----------|---------|
| `rol:read` | Ver a pagina Rol: tabela, dashboard de cards, historico, exportacao/impressao |
| `rol:update` | Edicao inline, status, tornar membro, cargos/mandatos, vinculos de familia |
| `rol:*` (wildcard) | Tudo do rol (suportado nativamente por `hasPermission`) |
| `membros:delete` (existente) | Exclusao de membro — fora do escopo do rol (sem `rol:delete`, YAGNI) |

### Decisoes de design

- **`membros:update_eclesiastico` e REMOVIDA** do catalogo (types, ALL_PERMISSIONS, labels, defaults). Substituicao 1:1 nos checks: leitura -> `rol:read`, escrita -> `rol:update`.
- **Leitura do rol fica exclusiva de `rol:read`**: `membros:read` sai dos checks de `listParaSecretario`/`getResumoSecretario`/`getHistorico` (granularidade real; na pratica ninguem acessava essas queries sem a permissao antiga, pois a pagina era o unico consumidor).
- Alternativas legitimas que ja existiam em outros checks (`membros:update` em PERM_FAMILIA/cargos, `diretorio:read` em getFamily) **sao mantidas** — a limpeza e da permissao antiga, nao das outras portas.
- Override individual por membro segue SUBSTITUINDO o role (comportamento atual de `resolvePermissions`).

## Migracao de dados (obrigatoria)

`internalMutation` (`convex/preferencias/migrations.ts`) que, de forma idempotente:
1. `rolePermissions`: em cada doc cujo `permissions` contem `membros:update_eclesiastico`, remove-a e adiciona `rol:read` + `rol:update` (dedupe).
2. `membros`: idem para overrides individuais (`membros.permissions`).

Rodar em dev (`npx convex run`) e em prod junto do deploy. Sem ela, roles editados no banco perderiam acesso.

## Modelos Afetados

| Tabela | Tipo de Mudanca |
|--------|-----------------|
| `rolePermissions` | Migracao de dados (conteudo do array `permissions`) |
| `membros` | Migracao de dados (campo `permissions`) |
| (schema) | Sem mudanca de schema |

## Permissoes

- **Ver a pagina**: `rol:read` OU `rol:update` (`AnyPermissionGate`)
- **Editar**: `rol:update`
- **Defaults por papel** (`INITIAL_ROLE_PERMISSIONS`): `pastor`, `secretaria`, `secretario_executivo` trocam a antiga por `rol:read` + `rol:update`; `admin` ja tem `*`
- Item de navegacao (navigation.ts) passa a exigir `rol:read`

## Impacto em Shared

- [x] Danger zones: `convex/preferencias/rbac.ts`, `convex/preferencias/rbacHelpers.ts`, `types/auth.ts` — nao implementar em paralelo com outra feature que toque RBAC; rodar `npm test`
- A remocao do tipo no union faz o `tsc` apontar todos os usos restantes da string antiga (guia de substituicao)

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `types/auth.ts` | Remove `membros:update_eclesiastico`; adiciona `rol:read`, `rol:update` |
| `convex/preferencias/rbac.ts` | ALL_PERMISSIONS + PERMISSION_LABELS (remove antiga, adiciona novas) |
| `convex/preferencias/rbacHelpers.ts` | Defaults: pastor/secretaria/secretario_executivo |
| `convex/preferencias/migrations.ts` (novo) | Migracao idempotente dos dados |
| `convex/membros/eclesiastico.ts` | Checks: leitura -> `rol:read` (exclusiva), escrita -> `rol:update`; getFamily ganha `rol:read` como alternativa |
| `convex/cargosEclesiasticosHistorico/mutations.ts` | 3 checks: antiga -> `rol:update` |
| `app/(ready)/secretario-executivo/page.tsx` | Gate -> `AnyPermissionGate [rol:read, rol:update]` |
| `features/secretarioExecutivo/components/SecretarioExecutivoTabela.tsx` | Modo somente-leitura sem `rol:update` (inline edit, drawers, Tornar membro, Cargos) |
| `app/(ready)/secretario-executivo/[id]/page.tsx` (+ form) | Gate de edicao -> `rol:update` |
| `shared/constants/navigation.ts` | Item do rol: permission -> `rol:read` |
| `shared/components/layout/DevContext.tsx` | Notas de permissao das rotas do rol |
| testes de RBAC | Atualizar/cobrir novas permissoes |

## Ordem de Implementacao

1. Catalogo (types + rbac + rbacHelpers) — o tsc passa a apontar os usos da antiga
2. Backend: eclesiastico.ts + cargosEclesiasticosHistorico + migracao
3. Frontend: navigation + pagina + tabela read-only + detalhe
4. `npm test`, `npx convex codegen`, lint/tsc
5. Deploy: `convex deploy` + `npx convex run preferencias/migrations:migrateRolPermissions` (dev e prod)
6. Validacao manual: usuario de teste com apenas `rol:read` ve a pagina sem controles de edicao

## Perguntas resolvidas

1. ~~Manter `membros:read` na leitura do rol?~~ Nao — leitura exclusiva de `rol:read` (limpo).
2. ~~Manter a antiga como legado?~~ Nao — removida com migracao.
3. Aviso na PermissionMatrix sobre override substituir o papel: fora de escopo desta feature.
