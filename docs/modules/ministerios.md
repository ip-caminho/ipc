# Modulo: Ministerios

## Visao Geral

O modulo de Ministerios gerencia os grupos de servico da igreja (ex: Louvor, Som, Hospitalidade, Educacional Infantil, Multimidia). Cada ministerio possui papeis configuraveis, subgrupos opcionais e membros vinculados. O modulo serve como base para outros modulos (Educacional, Calendario, Escalas) que referenciam ministerios.

**Rota principal**: `/ministerios`
**Rota de detalhe**: `/ministerios/[id]`

## Arquivos

### Frontend (Pages)

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/ministerios/page.tsx` | Pagina principal — lista ministerios ativos em grid de cards, botao de criacao |
| `app/(ready)/ministerios/[id]/page.tsx` | Pagina de detalhe — renderiza `MinisterioDetalhe` com id da URL |

### Frontend (Components)

| Arquivo | Descricao |
|---------|-----------|
| `features/ministerios/components/MinisterioCard.tsx` | Card de preview com nome, status (badge colorido), descricao truncada e contagem de membros |
| `features/ministerios/components/MinisterioDetalhe.tsx` | Tela completa de detalhe — info do ministerio, lista de membros com avatar/papel/subgrupos/CBCM, dialogs de edicao e adicao de membro |
| `features/ministerios/components/MinisterioForm.tsx` | Dialog (Dialog/Form) para criar/editar ministerio — campos nome, descricao, papeis (tag input dinamico) e subgrupos (tag input dinamico) |

### Frontend (Lib)

| Arquivo | Descricao |
|---------|-----------|
| `features/ministerios/lib/constants.ts` | Constantes de status (`ATIVO`/`INATIVO` com cores), opcoes e cores de CBCM (`NAO_INICIADO`, `CURSANDO`, `CONCLUIDO`) |
| `features/ministerios/lib/validations.ts` | Schemas Zod 4: `ministerioFormSchema` (nome, descricao, icone, cor, papeis, subgrupos) e `addMembroFormSchema` (membroId, papel, subgrupos) |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/ministerios/queries.ts` | Queries: `list`, `getById`, `listByMembro` |
| `convex/ministerios/mutations.ts` | Mutations: `create`, `update`, `remove`, `addMembro`, `updateMembro`, `removeMembro`, `seedMinisterios` |

### Schema (tabelas em `convex/schema.ts`)

| Tabela | Campos principais | Indices |
|--------|-------------------|---------|
| `ministerios` | `nome`, `descricao?`, `icone?`, `cor?`, `papeis[]`, `subgrupos?[]`, `status` (ATIVO/INATIVO), `criadoEm` | `by_status` |
| `ministerioMembros` | `ministerioId`, `membroId`, `papel`, `subgrupos?[]`, `status` (ATIVO/INATIVO), `criadoEm`, `atualizadoEm?` | `by_ministerio`, `by_membro`, `by_ministerio_membro` |

## Funcionalidades

### Listagem de Ministerios
- Query `list` retorna todos os ministerios, com filtro opcional por `status`
- Para cada ministerio, calcula `qtdMembros` contando membros ativos na tabela `ministerioMembros`
- Exibido em grid responsivo (1/2/3 colunas) de `MinisterioCard`

### Detalhe do Ministerio
- Query `getById` retorna ministerio com todos os membros enriquecidos (nome via entidade, status CBCM)
- Exibe: status, descricao, lista de papeis, lista de subgrupos
- Lista de membros ativos com avatar, papel (badge secondary), subgrupos (badge outline) e status CBCM (badge colorido — so exibe se nao concluido)

### CRUD de Ministerio
- **Criar**: Dialog com nome (obrigatorio), descricao, papeis (tag input com Enter/botao +, minimo 1) e subgrupos (tag input opcional)
- **Editar**: Mesmo dialog pre-preenchido com `defaultValues`
- **Excluir**: Confirmacao via `confirm()`. Cascade delete: remove todos os `ministerioMembros` vinculados antes de deletar o ministerio

### Gestao de Membros
- **Adicionar membro**: Dialog com Select de membro (query `membros.queries.list`), Select de papel (opcoes vindas dos papeis do ministerio), checkboxes de subgrupos (se o ministerio tiver subgrupos). Valida duplicata no backend (`by_ministerio_membro`)
- **Remover membro**: Botao lixeira ao lado de cada membro, deleta o registro `ministerioMembros`
- **Atualizar membro**: Mutation `updateMembro` disponivel no backend (papel, subgrupos, status) — UI nao implementada diretamente

### Query por Membro
- `listByMembro` retorna ministerios vinculados a um membro especifico, incluindo papel e subgrupos — utilizado em perfis de membros

### Seed
- Mutation `seedMinisterios` insere 5 ministerios padroes (Educacional Infantil, Louvor, Som, Hospitalidade, Multimidia) com papeis pre-definidos. Verifica duplicatas por nome antes de inserir

## Permissoes

| Permissao | Descricao | Onde e verificada |
|-----------|-----------|-------------------|
| `ministerios:read` | Ver ministerios e seus membros | `PermissionGate` (UI) — queries usam apenas autenticacao |
| `ministerios:create` | Criar novos ministerios | `PermissionGate` no botao "Novo Ministerio" + `requirePermission` na mutation `create` |
| `ministerios:update` | Editar ministerios e gerenciar membros | `can()` nos botoes Editar/Adicionar/Remover membro + `requirePermission` em `update`, `addMembro`, `updateMembro`, `removeMembro` |
| `ministerios:delete` | Excluir ministerios | `can()` no botao Excluir + `requirePermission` na mutation `remove` |

**Nota**: As queries (`list`, `getById`, `listByMembro`) verificam apenas autenticacao (`getAuthUserId`), sem checar permissoes RBAC especificas. Qualquer usuario autenticado pode ler ministerios.

## Dependencias

### Dependencias internas
- **`ModuloGuard`** (`shared/components/auth/ModuloGuard.tsx`): Verifica se o modulo "ministerios" esta ativo antes de renderizar
- **`PermissionGate`** (`shared/components/auth/PermissionGate.tsx`): Controle de visibilidade de botoes por permissao
- **`useAuth`** (`shared/providers/PermissionsProvider`): Hook `can()` para checar permissoes no client
- **`requirePermission`** (`convex/_shared/requirePermission.ts`): Verificacao de permissao no backend (mutations)
- **`createActionAuditLog`** (`convex/_shared/auditHelpers`): Registro de auditoria nas mutations create/remove

### Modulos que dependem de Ministerios
- **Educacional**: Busca ministerio "Educacional Infantil" por nome para vincular escalas
- **Calendario**: Eventos podem ser vinculados a um `ministerioId` opcional
- **Escalas**: Tabela `ministerioEscalas` referencia `ministerioId`

### Tabelas referenciadas
- `membros` (para listar membros disponiveis e resolver nomes)
- `entidades` (para obter `nomeCompleto` e status CBCM dos membros)

## Padroes de UI

- **Grid responsivo**: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` na listagem
- **Cards**: shadcn/ui `Card` com hover (`hover:bg-muted/50`) e cursor pointer
- **Badges coloridos**: Status do ministerio (verde=ATIVO, cinza=INATIVO), CBCM (vermelho/amarelo/verde)
- **Tag input**: Papeis e subgrupos usam padrao de badge com botao X para remover + input com Enter para adicionar
- **Dialogs**: Todos os formularios em `Dialog` do shadcn/ui (max-w-md)
- **Loading state**: Texto "Carregando..." enquanto queries sao `undefined`
- **Empty state**: Texto "Nenhum ministerio cadastrado" / "Nenhum membro neste ministerio"
- **Toasts**: Sonner para feedback de sucesso/erro em todas as operacoes
- **Confirmacao**: `confirm()` nativo para exclusoes

## Notas Tecnicas

- **Papeis dinamicos**: Cada ministerio define seus proprios papeis (array de strings livres). Nao ha enum fixo — o formulario permite adicionar qualquer texto como papel
- **Subgrupos opcionais**: Ministerios podem ter subgrupos (ex: turmas no Educacional). Se definidos, aparecem como opcao ao adicionar membros
- **CBCM (Curso Basico de Capacitacao Ministerial)**: Status lido da entidade vinculada ao membro. Exibido no detalhe apenas quando nao concluido. Valores: `NAO_INICIADO`, `CURSANDO`, `CONCLUIDO`
- **Navegacao**: A pagina principal usa `selectedId` via `useState` para alternar entre listagem e detalhe sem mudar a URL. A rota `/ministerios/[id]` tambem existe como alternativa com URL propria
- **@ts-ignore**: Usado em queries Convex para suprimir erro TS2589 (tipo excessivamente profundo)
- **Cascade delete**: Ao excluir ministerio, todos os registros `ministerioMembros` sao deletados no loop. Nao ha soft delete — registros sao removidos fisicamente
- **Audit trail**: Apenas `create` e `remove` geram logs de auditoria. `update` nao gera audit log
