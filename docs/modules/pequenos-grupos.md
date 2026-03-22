# Pequenos Grupos

## Visao Geral

Modulo de gestao de Pequenos Grupos (PGs) da igreja. Permite criar, editar e excluir grupos, gerenciar membros vinculados a cada grupo e remanejar membros entre grupos via drag-and-drop. A pagina principal exibe um grid de cards com os PGs ativos, alem de uma secao "Sem grupo" listando membros ativos que nao pertencem a nenhum PG.

**Rota**: `/pequenos-grupos`
**Modulo guard**: `pequenos-grupos` (controlado pela tabela `modulos`)

## Arquivos

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/pequenos-grupos/page.tsx` | Pagina principal. Grid de PGs, secao "Sem grupo", modo remanejamento, dialog de criacao |
| `features/pequenosGrupos/components/PGCard.tsx` | Card de resumo do PG (nome, lider, dia/horario, local, qtd membros, status) |
| `features/pequenosGrupos/components/PGDetalhe.tsx` | Tela de detalhe de um PG: dados completos, lista de membros, edicao, exclusao, adicao de membros |
| `features/pequenosGrupos/components/PGForm.tsx` | Dialog de formulario (criacao/edicao) com campos: nome, descricao, lider, co-lider, dia da semana, horario, local |
| `features/pequenosGrupos/components/PGRemanejamento.tsx` | Interface de drag-and-drop para mover membros entre PGs. Usa `@dnd-kit/core` |
| `features/pequenosGrupos/components/MembrosPGList.tsx` | Lista de membros de um PG com avatar e botao de remocao |
| `features/pequenosGrupos/lib/constants.ts` | Constantes: `DIA_SEMANA_OPTIONS`, `PG_STATUS_OPTIONS`, `PG_STATUS_COLORS`, `DIA_SEMANA_LABELS` |
| `features/pequenosGrupos/lib/validations.ts` | Schema Zod 4 `pgFormSchema` (nome min 2 chars, liderId obrigatorio; descricao, coliderId, diaSemana, horario, local opcionais) |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/pequenosGrupos/queries.ts` | Queries: `list`, `getById`, `listAllWithMembros`, `listByMembro` |
| `convex/pequenosGrupos/mutations.ts` | Mutations: `create`, `update`, `remove`, `addMembro`, `moveMembro`, `removeMembro` |

### Schema (tabelas)

**`pequenosGrupos`**: `nome`, `descricao?`, `liderId` (ref membros), `coliderId?` (ref membros), `diaSemana?`, `horario?`, `local?`, `status` (ATIVO/INATIVO). Indices: `by_lider`, `by_status`.

**`pgMembros`**: Tabela de vinculacao N:N. `pgId` (ref pequenosGrupos), `membroId` (ref membros). Indices: `by_pg`, `by_membro`.

## Funcionalidades

### Listagem de PGs
- Grid responsivo (1/2/3 colunas) com cards dos PGs ativos
- Cada card exibe: nome, status (badge colorido), lider/co-lider, quantidade de membros, dia da semana com horario, local
- Secao "Sem grupo" exibe membros ativos que nao pertencem a nenhum PG (apenas entidades com status ATIVO)

### Criacao de PG
- Dialog com formulario validado por Zod 4
- Campos: nome (obrigatorio), descricao, lider (obrigatorio, select de membros), co-lider (opcional), dia da semana, horario, local
- Status automaticamente definido como "ATIVO"

### Detalhe do PG
- Navegacao inline (sem rota propria; troca de state `selectedPgId`)
- Exibe dados completos, lista de membros com avatares
- Botoes de edicao e exclusao (condicionais por permissao)
- Dialog para adicionar membro ao PG (select de membros)
- Exclusao de PG com cascade delete dos vinculos `pgMembros`

### Remanejamento (drag-and-drop)
- Modo ativado por botao "Remanejar" na pagina principal
- Interface Kanban com colunas: "Sem grupo" + cada PG ativo
- Arrastar membro de uma coluna para outra executa `moveMembro`
- Usa `@dnd-kit/core` com `PointerSensor` e `TouchSensor` (mobile-friendly)
- Salva automaticamente ao soltar (sem botao de confirmacao)
- Overlay visual durante o arraste

### Gestao de membros no PG
- Adicionar membro: Dialog com Select de membros, verifica duplicidade
- Remover membro: Botao de lixeira na lista de membros
- Mover membro (`moveMembro`): Remove do PG de origem, adiciona ao PG de destino, verifica duplicidade

## Permissoes

| Permissao | Uso |
|-----------|-----|
| `pequenos_grupos:create` | Criar novo PG (botao "Novo PG") |
| `pequenos_grupos:update` | Editar PG, adicionar/remover membros, remanejar membros, botao "Remanejar" |
| `pequenos_grupos:delete` | Excluir PG (botao destructive no detalhe) |

As queries (`list`, `getById`, `listAllWithMembros`, `listByMembro`) exigem apenas autenticacao (nao verificam permissoes especificas), portanto qualquer membro logado pode visualizar os PGs.

## Dependencias

### Tabelas externas
- `membros` — referencia para lider, co-lider e membros do PG
- `entidades` — resolucao de nomes via `resolveMembroNome()`

### Queries externas
- `api.membros.queries.list` — usado nos Selects de lider, co-lider e adicionar membro

### Bibliotecas
- `@dnd-kit/core` + `@dnd-kit/utilities` — drag-and-drop no remanejamento
- `react-hook-form` + `@hookform/resolvers/zod` — formularios
- `zod/v4` — validacao
- `sonner` — toasts

### Shared
- `ModuloGuard` — verifica se o modulo "pequenos-grupos" esta ativo
- `PermissionGate` — controle de visibilidade de botoes por permissao
- `useAuth()` — hook de permissoes (`can()`)

## Padroes de UI

- **Cards em grid responsivo**: `sm:grid-cols-2 lg:grid-cols-3`
- **Navegacao inline**: Detalhe do PG troca state ao inves de navegar para rota separada
- **Dialog para formularios**: Criacao e edicao usam `Dialog` do shadcn/ui
- **Badges coloridos**: Status do PG com cores definidas em `PG_STATUS_COLORS`
- **Avatares com fallback**: Iniciais do nome como fallback
- **Loading state**: Texto "Carregando..." enquanto queries retornam `undefined`
- **Empty state**: Mensagem quando nao ha PGs cadastrados
- **Confirmacao de exclusao**: `confirm()` nativo do browser antes de excluir PG

## Notas Tecnicas

- Os comentarios `// @ts-ignore Convex TS2589` sao usados para contornar um bug de inferencia de tipos do Convex que causa "Type instantiation is excessively deep and possibly infinite"
- A mutation `moveMembro` opera atomicamente: remove do PG de origem e adiciona ao PG de destino na mesma transacao, evitando inconsistencias
- A mutation `remove` faz cascade delete: exclui todos os registros `pgMembros` antes de excluir o PG
- A query `listAllWithMembros` carrega todos os `pgMembros` de uma vez e filtra em memoria (ao inves de N queries por PG), otimizando para o cenario de remanejamento
- O `PGForm` usa `form.watch()` para selects controlados (ao inves de `register`), necessario para o componente `Select` do shadcn/ui
- O sensor de toque no drag-and-drop tem `delay: 200` e `tolerance: 5` para evitar ativacao acidental em mobile
- Audit trail (`createActionAuditLog`) registra CREATE e DELETE de PGs, mas nao atualizacoes parciais
