# Secretario Executivo

## Escopo
Nova rota `/secretario-executivo` (lista + detalhe) para um role dedicado que consulta dados basicos do membro e edita exclusivamente dados eclesiasticos (cargo, rol, datas sacramentais, admissao, demissao, observacoes pastorais, atos pastorais, cargos historico, selo de verificacao via livro fisico).

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| `membros` | Sem schema change — write em campos eclesiasticos via nova mutation |
| `entidades` | Sem schema change — write em `camposVerificados` via nova mutation |
| `atosPastorais` | Sem mudanca — reusa CRUD existente, gated por nova permission |
| `cargosEclesiasticosHistorico` | Sem mudanca — reusa CRUD existente |

## Permissoes
- Novo role: `secretario_executivo`
- Nova permission: `membros:update_eclesiastico` — granula que secretaria, pastor, admin (via `*`) tambem ganham
- Secretario_executivo: `membros:read`, `entidades:read`, `diretorio:read`, `membros:update_eclesiastico`, `atos_pastorais:manage`, `audit:read`

## Impacto em Shared
- [x] Toca arquivos sensiveis:
  - `types/auth.ts` — ALTO risco
  - `convex/preferencias/rbac.ts` — ALTO risco
  - `convex/preferencias/rbacHelpers.ts` — ALTO risco
  - `shared/components/layout/AppSidebar.tsx` (indireto, via `navigation.ts`) — MEDIO risco
  - `shared/constants/navigation.ts` — adiciona item em GESTAO_SECTIONS + role em ELEVATED_ROLES
  - `shared/components/layout/DevContext.tsx` — registrar rotas novas
- [x] Risco de regressao: nenhuma feature ativa toca esses arquivos em paralelo (esta worktree e a unica ativa).

## Riscos
- Permission granular nova precisa estar nos roles certos. Se esquecer de adicionar a secretaria/pastor, secretaria atual perde a capacidade de editar dados eclesiasticos (que hoje faz via `membros:update`).
- Solucao: a nova mutation aceita `membros:update_eclesiastico` OU `membros:update` (compativel para tras).

## Arquivos a Criar/Modificar
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `types/auth.ts` | Modificar | adicionar `secretario_executivo` em Role + `membros:update_eclesiastico` em Permission |
| `convex/preferencias/rbac.ts` | Modificar | nova permission em ALL_PERMISSIONS + label |
| `convex/preferencias/rbacHelpers.ts` | Modificar | INITIAL_ROLE_PERMISSIONS para `secretario_executivo` + adicionar `membros:update_eclesiastico` a secretaria/pastor |
| `convex/membros/eclesiastico.ts` | Criar | mutations `updateEclesiastico` e `marcarCampoVerificado` |
| `app/(ready)/secretario-executivo/page.tsx` | Criar | lista de membros |
| `app/(ready)/secretario-executivo/[id]/page.tsx` | Criar | detalhe + edicao |
| `features/secretarioExecutivo/components/EclesiasticoForm.tsx` | Criar | form com campos eclesiasticos |
| `features/secretarioExecutivo/components/DadosBasicosSection.tsx` | Criar | bloco read-only de dados pessoais |
| `shared/constants/navigation.ts` | Modificar | item em GESTAO_SECTIONS > Pessoas + role em ELEVATED_ROLES |
| `shared/components/layout/DevContext.tsx` | Modificar | registrar /secretario-executivo e /secretario-executivo/[id] |

## Ordem de Implementacao
1. Tipos + RBAC (auth.ts, rbac.ts, rbacHelpers.ts)
2. Backend mutations (eclesiastico.ts)
3. UI lista e detalhe
4. Navegacao (sidebar + DevContext)
5. Testes (tsc + lint + vitest)
