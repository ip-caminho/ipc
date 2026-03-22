# Modulo: Calendario

## Visao Geral

O modulo Calendario gerencia eventos da igreja com navegacao mensal, suporte a datas de inicio/fim e vinculo opcional a ministerios. E o modulo mais simples dos tres, com CRUD basico e filtro por ministerio.

**Rota principal**: `/calendario`
**Nao possui rota de detalhe** — edicao via dialog inline.

## Arquivos

### Frontend (Pages)

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/calendario/page.tsx` | Pagina principal — navegacao por mes, filtro por ministerio, lista de eventos, dialogs de criacao/edicao |

### Frontend (Components)

| Arquivo | Descricao |
|---------|-----------|
| `features/calendario/components/EventoCard.tsx` | Card de evento com icone de calendario, titulo, data formatada (dd/MM/yyyy), data fim (se diferente), badge de ministerio, descricao truncada |
| `features/calendario/components/EventoForm.tsx` | Dialog para criar/editar evento — titulo, data inicio/fim, ministerio (Select com opcao "Geral"), descricao |

### Frontend (Lib)

| Arquivo | Descricao |
|---------|-----------|
| `features/calendario/lib/validations.ts` | Schema Zod 4: `eventoFormSchema` (titulo, data, dataFim?, ministerioId?, descricao?) |

**Nota**: O modulo nao possui `constants.ts` — nao ha enums ou cores especificas.

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/calendario/queries.ts` | Queries: `list`, `getById` |
| `convex/calendario/mutations.ts` | Mutations: `create`, `update`, `remove` |

### Schema (tabela em `convex/schema.ts`)

| Tabela | Campos principais | Indices |
|--------|-------------------|---------|
| `calendarioEventos` | `titulo`, `data` (YYYY-MM-DD), `dataFim?`, `ministerioId?` (ref a `ministerios`), `descricao?`, `criadoEm` | `by_data`, `by_ministerio` |

## Funcionalidades

### Navegacao Mensal
- Estado local `year`/`month` com botoes ChevronLeft/ChevronRight
- Calcula range do mes (`getMonthRange`) e passa como `dataInicio`/`dataFim` para a query
- Label centralizado: "Mes Ano" (ex: "Marco 2026")
- Array de nomes de meses em portugues hardcoded

### Filtro por Ministerio
- `Select` com opcao "Todos" (valor `__all__`) e lista de ministerios ativos
- Passa `ministerioId` como argumento da query quando selecionado

### Listagem de Eventos
- Query `list` filtra por `ministerioId`, `dataInicio` e `dataFim` (todos opcionais)
- Enriquece cada evento com `ministerioNome` (resolve via `ministerioId`)
- Ordenado por data ascendente
- Lista vertical de `EventoCard` com botao de exclusao (lixeira) no hover

### CRUD de Eventos

#### Criar Evento
- Dialog `EventoForm` com: titulo (obrigatorio, min 2 chars), data (obrigatoria), data fim (opcional), ministerio (Select com "Geral (todos)" como default), descricao
- Mutation `create` com `requirePermission("calendario:create")` e audit log

#### Editar Evento
- Mesmo `EventoForm` pre-preenchido via `defaultValues`
- Aberto ao clicar no `EventoCard` (se usuario tem `calendario:update`)
- Mutation `update` com `requirePermission("calendario:update")`. Faz `cleanUpdates` para ignorar campos `undefined`

#### Excluir Evento
- Botao lixeira no hover do card (visivel apenas com `calendario:delete`)
- `confirm()` nativo antes de excluir
- Mutation `remove` com `requirePermission("calendario:delete")` e audit log

### Query por ID
- `getById` retorna evento individual enriquecido com `ministerioNome` — disponivel no backend mas nao utilizado pela UI atual

## Permissoes

| Permissao | Descricao | Onde e verificada |
|-----------|-----------|-------------------|
| `calendario:read` | Ver eventos do calendario | Nao verificada explicitamente — queries checam apenas autenticacao (`getAuthUserId`) |
| `calendario:create` | Criar eventos | `PermissionGate` no botao "Novo Evento" + `requirePermission` na mutation `create` |
| `calendario:update` | Editar eventos | `can()` para habilitar click no `EventoCard` + `requirePermission` na mutation `update` |
| `calendario:delete` | Excluir eventos | `can()` para mostrar botao lixeira + `requirePermission` na mutation `remove` |

**Nota**: A permissao `calendario:read` existe no RBAC mas nao e verificada nas queries — qualquer usuario autenticado pode ver eventos. A protecao de leitura e feita apenas pelo `ModuloGuard` (modulo ativo) e autenticacao.

## Dependencias

### Dependencias internas
- **Modulo Ministerios**: Busca lista de ministerios ativos para o filtro e para o Select no formulario de evento
- **`ModuloGuard`**: Verifica se modulo "calendario" esta ativo
- **`PermissionGate`** / **`useAuth`**: Controle de permissoes no client
- **`requirePermission`**: Verificacao de permissao no backend (mutations)
- **`createActionAuditLog`**: Auditoria em create/remove

### Tabelas referenciadas
- `ministerios`: Para resolver nome do ministerio vinculado ao evento

## Padroes de UI

- **Navegacao de mes**: Botoes ChevronLeft/ChevronRight com label centralizado. Sem calendario visual (grid) — apenas lista
- **Filtro**: `Select` de ministerio alinhado a direita da navegacao
- **Cards de evento**: Layout horizontal com icone de calendario (box `bg-primary/10`), titulo, data formatada, badge de ministerio (outline), descricao truncada (line-clamp-2)
- **Hover actions**: Botao lixeira aparece no hover do card (`opacity-0 group-hover:opacity-100`)
- **Dialogs**: `EventoForm` em Dialog (max-w-md), campos em grid 2 colunas para datas
- **Sentinel values**: `__all__` para "Todos" no filtro de ministerio, `__none__` para "Geral (todos)" no Select de ministerio do form
- **Formatacao de data**: Funcao local `formatDate` simples (split + reorder) — nao usa date-fns

## Notas Tecnicas

- **Modelo simples**: Tabela unica `calendarioEventos` sem tabelas auxiliares. Ministerio e referencia opcional
- **Sem validacao de datas cruzadas**: O backend nao valida se `dataFim >= data`. A validacao Zod tambem nao faz essa checagem
- **Filtragem client-side no backend**: A query `list` coleta todos os eventos e filtra em memoria (`filter`). Nao utiliza indices para filtro por data (indice `by_data` existe mas nao e usado na query `list`)
- **Enriquecimento N+1**: Cada evento faz uma query `ctx.db.get(ministerioId)` para resolver o nome — pode ser ineficiente com muitos eventos vinculados a ministerios
- **Audit trail parcial**: `create` e `remove` geram audit log. `update` nao gera
- **useMemo**: `getMonthRange` e `queryArgs` sao memoizados para evitar re-renders desnecessarios
- **Eventos multi-dia**: Suportados via `dataFim`. O card exibe "data — dataFim" quando as datas sao diferentes
- **Sem recorrencia**: Nao ha suporte a eventos recorrentes. Cada evento e unico
- **Sem horario**: Eventos sao apenas por data (YYYY-MM-DD), sem campo de horario
- **@ts-ignore**: Usado nas queries de ministerios e calendario para suprimir TS2589
