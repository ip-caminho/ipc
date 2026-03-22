# Modulo: Entidades

## Visao Geral

Entidades e o modulo de gestao da base polimorfica de pessoas fisicas (PF) e juridicas (PJ) do sistema. Toda pessoa ou organizacao no sistema e representada como uma entidade, que pode assumir diferentes papeis (Membro, Visitante, Contato, Fornecedor, Igreja Parceira). Membros sao uma extensao de entidades com dados eclesiasticos adicionais.

Rota: `/entidades`

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/entidades/page.tsx` | Pagina de listagem de entidades (client component) |
| `convex/entidades/queries.ts` | Queries `list` e `getById` |
| `convex/entidades/mutations.ts` | Mutations `create`, `update`, `updateStatus`, `remove` |
| `features/membros/lib/constants.ts` | `PAPEL_OPTIONS` e `STATUS_COLORS` usados na UI |
| `shared/components/auth/ModuloGuard.tsx` | Guard que verifica se o modulo "entidades" esta ativo |
| `shared/components/auth/PermissionGate.tsx` | Guard de permissao para botao de criacao |

## Funcionalidades

### Listagem de Entidades
- Busca textual com debounce de 300ms, pesquisando em nome, telefone e email.
- Cada entidade exibida em card vertical com:
  - Icone de tipo (`Building2` para PJ, `User` para PF)
  - Nome completo (PF) ou razao social (PJ)
  - Badges de tipo (PF/PJ), papeis e status
  - WhatsApp ou email como informacao secundaria
- Skeleton de 5 itens durante carregamento.
- Mensagem "Nenhuma entidade encontrada" quando vazio.

### Botao "Nova Entidade"
- Link para `/entidades/novo`.
- Protegido por `PermissionGate` com permissao `entidades:create`.

### Query `list` (Backend)
- Aceita filtros opcionais: `tipo` (PF/PJ), `papel`, `status`, `search`.
- Filtro por `tipo` usa indice `by_tipo` na tabela `entidades`.
- Busca textual por `includes` em nomeCompleto/nomeRazaoSocial, whatsapp e email (case-insensitive).
- Filtro por `papel` verifica se `papeis` (array) inclui o valor.

### Query `getById` (Backend)
- Busca simples por ID na tabela `entidades`.
- Retorna o documento completo.

### Mutation `create` (Backend)
- Requer autenticacao (`getAuthUserId`).
- Aceita todos os campos de PF e PJ: nomeCompleto, cpf, rg, dataNascimento, sexo, estadoCivil, nacionalidade, naturalidade, pai, mae, profissao, formacao, foto, nomeRazaoSocial, nomeFantasia, cnpj, inscricaoEstadual, responsavelNome, whatsapp, telefone, email, endereco.
- Status inicial e sempre `"ATIVO"`.
- Gera log de auditoria via `createActionAuditLog` (acao CREATE).

### Mutation `update` (Backend)
- Requer autenticacao.
- Aceita `id` e `data` (any) — faz patch parcial.
- Gera audit logs comparando campos antigos x novos via `createFieldAuditLogs`.

### Mutation `updateStatus` (Backend)
- Requer autenticacao.
- Status validos: `ATIVO`, `INATIVO`, `TRANSFERIDO`, `FALECIDO`, `DESLIGADO`.
- Gera audit logs de campo.

### Mutation `remove` (Backend)
- Requer autenticacao.
- Faz hard delete (`ctx.db.delete`).
- Gera audit log de acao DELETE antes de deletar.

## Permissoes

- **Modulo**: Protegido por `ModuloGuard` com slug `"entidades"`.
- **Permissoes RBAC**:
  - `entidades:read` — ver lista e detalhes (secretaria por padrao)
  - `entidades:create` — criar novas entidades (secretaria por padrao)
  - `entidades:update` — editar entidades existentes (secretaria por padrao)
  - `entidades:delete` — excluir entidades (secretaria por padrao)
- Membros com role `"membro"` nao tem acesso as permissoes de entidades por padrao.
- O botao "Nova Entidade" e condicionalmente exibido via `PermissionGate`.

## Dependencias

- `@shared/hooks/useDebounce` — debounce da busca
- `@shared/components/ui/*` — Button, Input, Card, Badge, Skeleton (shadcn/ui)
- `lucide-react` — icones (Plus, Search, Building2, User)
- `next/link` — navegacao para criacao de entidade
- `@features/membros/lib/constants` — `PAPEL_OPTIONS`, `STATUS_COLORS`
- `@shared/components/auth/PermissionGate` — guard de permissao
- `@shared/components/auth/ModuloGuard` — guard de modulo ativo
- `convex/_shared/auditHelpers` — `createFieldAuditLogs`, `createActionAuditLog` (backend)

## Padroes de UI

- **Lista vertical** de cards (nao grid), cada card com layout horizontal (icone + conteudo + info secundaria).
- Badges coloridos por status usando `STATUS_COLORS` (verde para ATIVO, vermelho para DESLIGADO, etc.).
- Badges de papeis usando labels amigaveis de `PAPEL_OPTIONS`.
- Badge de tipo (PF/PJ) com variante `outline`.
- Busca com icone de lupa integrado no input.

## Notas Tecnicas

- A tabela `entidades` e polimorfica: campos de PF (nomeCompleto, cpf, rg, dataNascimento, etc.) e PJ (nomeRazaoSocial, cnpj, nomeFantasia, etc.) coexistem no mesmo documento. O campo `tipoEntidade` discrimina o tipo.
- O campo `papeis` e um array de strings que permite multiplos papeis simultaneos (ex: um membro pode tambem ser fornecedor).
- Status da entidade afeta diretamente o login: membros TRANSFERIDO/DESLIGADO/INATIVO sao bloqueados.
- Mutations usam `v.any()` para campos como `endereco` e `naturalidade` (objetos flexiveis) e `data` no update (patch parcial).
- Auditoria completa: todas as mutations geram logs de auditoria, com mascaramento de CPF/RG nos logs.
- Nao ha `features/entidades/` — as constantes usadas vem de `features/membros/lib/constants.ts`.
