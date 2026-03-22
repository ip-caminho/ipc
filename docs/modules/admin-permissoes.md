# Modulo: Admin Permissoes

## Visao Geral

Pagina administrativa para gestao de permissoes (RBAC) e convites de acesso. Exclusiva para administradores, oferece duas abas: uma matriz interativa de permissoes por role e uma ferramenta de geracao de links de convite. O sistema RBAC suporta 3 roles iniciais (admin, secretaria, membro) sem heranca — permissoes sao explicitas e podem ser personalizadas por membro individual.

Rota: `/admin/permissoes`

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/admin/permissoes/page.tsx` | Pagina principal com tabs (Permissoes e Convites) |
| `features/preferencias/components/PermissionMatrix.tsx` | Componente da matriz de permissoes interativa |
| `convex/preferencias/rbac.ts` | Queries e mutations do RBAC |
| `convex/preferencias/rbacHelpers.ts` | Funcoes puras de RBAC (resolvePermissions, hasPermission) |
| `types/auth.ts` | Tipos TypeScript (Role, Permission, AuthContext) |
| `shared/components/auth/RoleGate.tsx` | `AdminGate` — guard de role admin |
| `shared/components/auth/PermissionGate.tsx` | Guards de permissao (PermissionGate, AnyPermissionGate, AllPermissionsGate) |

## Funcionalidades

### Aba "Roles e Permissoes" — Matriz de Permissoes

#### Estrutura da Matriz
- Tabela com colunas: **Permissao**, **Secretaria**, **Membro**, **Personalizado**.
- Admin (role `"admin"`) tem wildcard `"*"` e nao aparece na matriz.
- Permissoes agrupadas por modulo (colapsaveis): Membros, Entidades, Diretorio, Gravacoes, Escalas, Auditoria, Pastoreio, Pequenos Grupos, Pedidos de Oracao, Ministerios, Calendario, Educacional Infantil.
- Cada permissao tem label amigavel, descricao e tooltip com detalhes.

#### Edicao de Permissoes por Role
- Checkboxes para ativar/desativar cada permissao por role.
- Ao alterar, chama `api.preferencias.rbac.updateRolePermissions` enviando o array completo de permissoes do role.
- Feedback via toast (Sonner) de sucesso ou erro.
- Estado otimista: `pendingToggles` (Map) controla visual durante mutacao.

#### Personalizacao por Membro
- Coluna "Personalizado" exibe badges com nomes de membros que possuem permissoes diferentes do seu role padrao.
- Clicar abre `Popover` com lista de todos os membros ativos (exceto admin).
- Cada membro pode ter checkbox individual para conceder/revogar a permissao.
- Ao alterar, chama `api.preferencias.rbac.setMembroPermission`.
- Membros com customizacao recebem badge; sem customizacao exibe tracos.

### Aba "Convites"
- Botoes para gerar convite com role pre-definido: "Convite Membro" ou "Convite Secretaria".
- Chama `api.membros.convites.generateInvite({ role })`.
- Exibe link gerado com botao de copiar para clipboard.
- Links expiram em 24 horas.
- URL do convite: `{origin}/convite/{token}`.

### Sistema RBAC (Backend)

#### Permissoes Disponiveis (ALL_PERMISSIONS)
Total de 38 permissoes organizadas em 12 modulos:

| Modulo | Permissoes |
|--------|-----------|
| Membros | `read`, `create`, `update`, `delete`, `self_service` |
| Entidades | `read`, `create`, `update`, `delete` |
| Diretorio | `read` |
| Gravacoes | `read`, `create`, `update`, `delete`, `process_ai` |
| Escalas | `read`, `create`, `update`, `delete` |
| Auditoria | `read` |
| Pastoreio | `read`, `create`, `update`, `delete` |
| Pequenos Grupos | `read`, `create`, `update`, `delete` |
| Pedidos de Oracao | `create`, `read` |
| Ministerios | `read`, `create`, `update`, `delete` |
| Calendario | `read`, `create`, `update`, `delete` |
| Educacional Infantil | `criancas:read`, `criancas:manage`, `educacional:read`, `educacional:write` |

#### Permissoes Padrao por Role (INITIAL_ROLE_PERMISSIONS)

- **admin**: `["*"]` (wildcard — todas as permissoes)
- **secretaria**: 26 permissoes — CRUD completo ou parcial em quase todos os modulos, sem `membros:delete`
- **membro**: 9 permissoes — basicamente leitura + self-service e pedidos de oracao

#### Resolucao de Permissoes (`resolvePermissions`)
Prioridade de resolucao:
1. Permissoes do membro (campo `permissions` no documento do membro)
2. Permissoes do role no banco (tabela `rolePermissions`)
3. Defaults hardcoded (`INITIAL_ROLE_PERMISSIONS`)

#### Verificacao (`hasPermission`)
- Suporta wildcard `"*"` — retorna `true` para qualquer permissao.
- Caso contrario, verifica via `includes`.

### Queries (Backend)

| Query | Descricao |
|-------|-----------|
| `getUserPermissionContext` | Retorna contexto completo do usuario logado (membroId, role, permissions, name, foto) |
| `getAllPermissionOptions` | Lista todas as permissoes com label, modulo e descricao (apenas admin) |
| `getAllRolesWithPermissions` | Retorna roles visiveis (secretaria, membro) com suas permissoes atuais |
| `getAllMembrosWithPermissions` | Lista membros ativos (exceto admin) com permissoes efetivas e flag de customizacao |
| `listRolePermissions` | Lista registros da tabela `rolePermissions` |

### Mutations (Backend)

| Mutation | Descricao |
|----------|-----------|
| `seedRolePermissions` | Popula tabela `rolePermissions` com defaults (idempotente) |
| `updateRolePermissions` | Atualiza permissoes de um role (requer admin) |
| `setMembroPermission` | Adiciona/remove permissao individual de um membro (requer admin) |
| `syncMembroWithRole` | Limpa customizacoes do membro (volta ao padrao do role) |

## Permissoes

- **Acesso a pagina**: Protegido por `AdminGate` — apenas role `"admin"`.
- **Queries de RBAC**: Todas verificam se o chamador e admin antes de retornar dados.
- **Mutations de RBAC**: Funcao `requireAdmin` valida autenticacao e role admin.
- Admin nao pode editar permissoes de outros admins.

## Dependencias

- `@shared/components/ui/*` — Card, Button, Tabs, Table, Checkbox, Badge, Skeleton, Tooltip, Popover, ScrollArea (shadcn/ui)
- `lucide-react` — Copy, Link, ChevronDown, ChevronRight, Info, Users
- `sonner` — toasts de feedback
- `@shared/lib/utils/cn` — utility para classes condicionais
- `@shared/providers/PermissionsProvider` — hook `useAuth` consumido pelos guards
- `@convex-dev/auth/server` — `getAuthUserId` para autenticacao no backend

## Padroes de UI

- **Tabs** para separar Permissoes e Convites.
- **Tabela com scroll horizontal** (`overflow-x-auto`) para a matriz de permissoes.
- **Linhas de modulo colapsaveis** com icone ChevronDown/ChevronRight.
- **Sticky column** (primeira coluna) para manter visivel o nome da permissao ao scrollar horizontalmente.
- **Checkboxes** com estado otimista (opacity-50 durante pending).
- **Popovers** na coluna "Personalizado" com lista scrollavel de membros.
- **Badges coloridos** por role: azul para secretaria, verde para membro.
- **Tooltips** com descricao detalhada de cada permissao.
- Card dedicado para geracao de convites com campo de codigo copiavel.

## Notas Tecnicas

- O sistema nao tem heranca de roles — todas as permissoes sao explicitas.
- `VISIBLE_ROLES` exclui admin tanto no frontend quanto no backend.
- A tabela `rolePermissions` armazena permissoes customizadas por role; se nao existir registro, usa `INITIAL_ROLE_PERMISSIONS`.
- Quando um membro recebe permissao customizada via `setMembroPermission`, se ele nao tinha customizacoes antes, o sistema copia as permissoes do role como base e aplica a alteracao.
- `syncMembroWithRole` limpa o array `permissions` do membro (volta a `[]`), fazendo o sistema usar as permissoes do role.
- `types/auth.ts` define roles adicionais (lider, diacono, presbitero, tesoureiro, pastor) alem dos 3 iniciais, prevendo expansao futura.
- O `AuthContext` expoe helpers `can(permission)`, `hasRole(role)` e `hasAnyRole(roles)` para uso nos componentes.
- Guards de permissao vem em 3 variantes: `PermissionGate` (uma permissao), `AnyPermissionGate` (qualquer de varias) e `AllPermissionsGate` (todas necessarias).
