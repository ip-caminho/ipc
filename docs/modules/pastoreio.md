# Pastoreio

## Visao Geral

Modulo de acompanhamento pastoral dos membros da igreja. Agrega informacoes de visitas pastorais, pedidos de oracao e anotacoes pastorais em uma unica interface com abas. Inclui um perfil pastoral completo por membro que reune dados pessoais, eclesiasticos, familiares, historico de visitas, pedidos de oracao, anotacoes, escalas de culto e gravacoes escutadas. O modulo e voltado para lideranca (pastores, presbiteros, diaconos) e tem controle de acesso baseado em permissoes RBAC.

**Rota**: `/pastoreio`
**Modulo guard**: `pastoreio` (controlado pela tabela `modulos`)

## Arquivos

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/pastoreio/page.tsx` | Pagina principal com dashboard de stats, abas (Membros, Visitas, Pedidos de Oracao, Anotacoes) e formularios em dialogs |
| `features/pastoreio/components/VisitaForm.tsx` | Dialog de formulario de visita: membro visitado, visitante, data, tipo, observacoes |
| `features/pastoreio/components/VisitaCard.tsx` | Card de visita com nome do visitado/visitante, tipo (badge colorido), data formatada e observacoes |
| `features/pastoreio/components/PedidoOracaoForm.tsx` | Dialog simples de pedido de oracao (apenas descricao) |
| `features/pastoreio/components/PedidoOracaoCard.tsx` | Card de pedido com nome, data, descricao, status e botoes de acao (Respondido/Arquivar) |
| `features/pastoreio/components/AnotacaoForm.tsx` | Dialog de anotacao pastoral: selecao de membro + textarea |
| `features/pastoreio/components/AnotacaoCard.tsx` | Card de anotacao com nome do membro, autor, data e texto |
| `features/pastoreio/components/MembroPerfilPastoral.tsx` | Perfil pastoral completo de um membro: dados pessoais, eclesiasticos, familia, visitas, pedidos, anotacoes, escalas, escutas |
| `features/pastoreio/lib/constants.ts` | Constantes: `TIPO_VISITA_OPTIONS`, `STATUS_PEDIDO_OPTIONS`, `TIPO_VISITA_COLORS`, `STATUS_PEDIDO_COLORS` |
| `features/pastoreio/lib/validations.ts` | Schemas Zod 4: `visitaFormSchema`, `pedidoOracaoFormSchema`, `anotacaoFormSchema` |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/pastoreio/queries.ts` | Queries: `listVisitas`, `listPedidosOracao`, `listAnotacoes`, `getMembroPerfil`, `listMembrosResumo`, `dashboardStats` |
| `convex/pastoreio/mutations.ts` | Mutations: `createVisita`, `updateVisita`, `removeVisita`, `createPedidoOracao`, `updatePedidoOracao`, `arquivarPedidoOracao`, `createAnotacao`, `updateAnotacao`, `removeAnotacao` |

### Schema (tabelas)

**`visitasPastorais`**: `membroId` (quem foi visitado), `visitanteId` (quem visitou), `data` (YYYY-MM-DD), `tipo` (DOMICILIAR/HOSPITALAR/ACOLHIMENTO/OUTRO), `observacoes?`, `criadoEm`. Indices: `by_membro`, `by_visitante`, `by_data`.

**`pedidosOracao`**: Compartilhada com o modulo Pedidos de Oracao. `membroId`, `descricao`, `status` (ATIVO/RESPONDIDO/ARQUIVADO), `compartilhadoIgreja?`, `criadoEm`, `atualizadoEm?`. Indices: `by_membro`, `by_status`, `by_criadoEm`.

**`anotacoesPastorais`**: `membroId` (sobre quem e a anotacao), `autorId` (quem escreveu), `texto`, `criadoEm`, `atualizadoEm?`. Indices: `by_membro`, `by_autor`.

## Funcionalidades

### Dashboard de Estatisticas
- Tres cards de stats (visiveis apenas para quem tem `pastoreio:read`):
  - **Visitas este mes**: Conta visitas com `data` no mes/ano atual
  - **Pedidos ativos**: Conta pedidos com `status === "ATIVO"`
  - **Anotacoes recentes**: Conta anotacoes criadas nos ultimos 7 dias

### Aba: Membros
- Lista de todos os membros ativos com busca textual (debounced 300ms)
- Grid responsivo de cards com avatar, nome, cargo eclesiastico e WhatsApp
- Click em um membro abre o Perfil Pastoral
- Permissao: `pastoreio:read`

### Aba: Visitas Pastorais
- Listagem de todas as visitas ordenadas por data descendente
- Card exibe: membro visitado, visitante, tipo (badge colorido), data formatada em portugues, observacoes
- Botao "Nova visita" (permissao `pastoreio:create`)
- Botao de exclusao no card (permissao `pastoreio:delete`)
- Formulario: selecao de membro visitado e visitante (Selects), data (input date), tipo (Select: Domiciliar, Hospitalar, Acolhimento, Outro), observacoes (textarea)
- Permissao para listar: `pastoreio:read`

### Aba: Pedidos de Oracao
- Listagem de pedidos (visao administrativa vs. self-service)
- Card com nome do membro, data, descricao, status
- Botoes de acao (visiveis com `pastoreio:update`): "Respondido" e "Arquivar" (apenas quando ATIVO)
- Qualquer membro pode criar pedido de oracao via formulario simples (descricao)
- Permissao para ver todos: `pastoreio:read`. Sem essa permissao, so ve os proprios (com `pedidos_oracao:read`)

### Aba: Anotacoes Pastorais
- Listagem de anotacoes com nome do membro, autor, data e texto
- Botao "Nova anotacao" (permissao `pastoreio:create`)
- Botao de exclusao (permissao `pastoreio:delete`)
- Formulario: selecao de membro (Select) e texto (textarea)
- A anotacao registra automaticamente o `autorId` do membro logado
- Permissao para listar: `pastoreio:read`

### Perfil Pastoral do Membro
- Tela completa carregada pela query `getMembroPerfil`
- Secoes organizadas em cards:

#### Dados Pessoais
- Data de nascimento (com calculo de idade), estado civil, profissao, WhatsApp, telefone, email, endereco completo

#### Dados Eclesiasticos
- Rol, data de membresia, forma de admissao (Batismo, Profissao de Fe, Transferencia, Jurisdicao), data de batismo, data de conversao, igreja de procedencia, PGs participantes, funcoes em que serve

#### Familia
- Conjuge (nome, data de nascimento com idade, WhatsApp)
- Filhos (nome e data de nascimento com idade de cada um)

#### Visitas Pastorais
- Ultimas 10 visitas recebidas com data, tipo (badge), visitante e observacoes. Total exibido no header

#### Pedidos de Oracao
- Ultimos 10 pedidos com descricao, status (badge) e data. Total no header

#### Anotacoes Pastorais
- Ultimas 10 anotacoes com texto, autor e data. Total no header

#### Escalas Recentes
- Ultimas 10 participacoes em escalas de culto com funcao e data do culto
- Lista funcoes distintas em "Serve como" nos dados eclesiasticos

#### Gravacoes Escutadas
- Ultimas 10 escutas com titulo da gravacao e progresso (porcentagem ou "Completo")
- Resumo: "N completas de M"

## Permissoes

| Permissao | Uso |
|-----------|-----|
| `pastoreio:read` | Ver abas Membros, Visitas, Anotacoes. Ver dashboard de stats. Ver todos os pedidos de oracao. Acessar perfil pastoral |
| `pastoreio:create` | Registrar visita. Criar anotacao pastoral. Criar pedido de oracao (alternativamente, `pedidos_oracao:create` tambem permite) |
| `pastoreio:update` | Alterar status de pedido de terceiros (Respondido/Arquivar). Editar visita |
| `pastoreio:delete` | Excluir visita. Excluir anotacao pastoral |
| `pedidos_oracao:read` | Ver apenas os proprios pedidos na aba Pedidos (quando nao tem `pastoreio:read`) |
| `pedidos_oracao:create` | Criar pedido de oracao (alternativa a `pastoreio:create`) |

**Nota sobre tab default**: Se o usuario tem `pastoreio:read`, a tab padrao e "Membros". Se nao tem, a tab padrao e "Pedidos" (unica acessivel).

As queries do backend usam `getAuthContext()` que resolve permissoes via `resolvePermissions()` (RBAC helper). As mutations usam `requirePermission()` para visitas e anotacoes, e `getAuthContextWithPerms()` com verificacao manual para pedidos de oracao (permite ownership check).

## Dependencias

### Tabelas externas
- `membros` — todas as queries resolvem nomes de membros
- `entidades` — dados pessoais, foto, endereco
- `pgMembros` / `pequenosGrupos` — PGs do membro no perfil pastoral
- `cultoEscalas` / `cultos` — escalas recentes no perfil pastoral
- `escutasGravacao` / `gravacoes` — escutas de gravacoes no perfil pastoral
- `rolePermissions` — resolucao de permissoes RBAC

### Queries externas
- `api.membros.queries.list` — usado nos Selects de membros (VisitaForm, AnotacaoForm)

### Bibliotecas
- `react-hook-form` + `@hookform/resolvers/zod` — formularios
- `zod/v4` — validacao
- `date-fns` + `date-fns/locale/ptBR` — formatacao de datas
- `sonner` — toasts

### Shared
- `ModuloGuard` — verifica se o modulo "pastoreio" esta ativo
- `PermissionGate` — controle de visibilidade de botoes por permissao
- `useAuth()` — hook de permissoes (`can()`)
- `useDebounce` — debounce na busca de membros (300ms)
- `resolvePermissions` (rbacHelpers) — resolucao de permissoes no backend

## Padroes de UI

- **Tabs com icones**: Cada aba tem icone (Users, ClipboardList, HandHeart, FileText)
- **Dashboard de stats**: Grid de 3 cards com metricas numericas
- **Cards em grid**: `sm:grid-cols-2` para visitas, pedidos e anotacoes; `sm:grid-cols-2 lg:grid-cols-3` para membros
- **Busca com debounce**: Input com icone de lupa, debounce de 300ms via `useDebounce`
- **Badges coloridos por tipo**: Visitas (azul/vermelho/verde/cinza), Pedidos (amarelo/verde/cinza)
- **Dialogs para formularios**: Todos os formularios (visita, pedido, anotacao) usam Dialog do shadcn/ui
- **Navegacao inline**: Perfil do membro troca state (sem rota propria)
- **Confirmacao de exclusao**: `confirm()` nativo para excluir visitas e anotacoes
- **Secoes com contadores**: Cards do perfil pastoral exibem `Badge` com total no header
- **Perfil com grid adaptativo**: `md:grid-cols-2` para dados pessoais/eclesiasticos, `md:grid-cols-2 lg:grid-cols-3` para visitas/pedidos/anotacoes

## Notas Tecnicas

- O modulo de Pastoreio e o modulo de Pedidos de Oracao compartilham a mesma tabela `pedidosOracao`, mas com queries e mutations separadas. As mutations do pastoreio (`createPedidoOracao`, `updatePedidoOracao`, `arquivarPedidoOracao`) nao definem `compartilhadoIgreja`
- A query `getMembroPerfil` e a mais pesada do sistema — faz lookups em 8+ tabelas para montar o perfil completo. Resultados sao limitados (slice de 10 ou 20 por secao) para mitigar
- A query `dashboardStats` faz full table scans em 3 tabelas (`visitasPastorais`, `pedidosOracao`, `anotacoesPastorais`). Para igrejas grandes, considerar agregacoes pre-computadas
- A query `listMembrosResumo` faz full scan em `membros` + resolve `entidade` para cada um. Filtragem de busca e feita em memoria apos enriquecimento
- As mutations de visita e anotacao usam `requirePermission()` (que lanca erro se nao autorizado), enquanto as mutations de pedido de oracao usam `getAuthContextWithPerms()` com verificacao manual (permite ownership check mais flexivel)
- Audit trail registra CREATE e DELETE de visitas e anotacoes via `createActionAuditLog`. Pedidos de oracao nao geram audit trail neste modulo
- O perfil pastoral cruza dados de modulos distintos (escalas, gravacoes, PGs), criando um acoplamento indireto. Se esses modulos mudarem schema, o perfil pastoral precisa ser atualizado
- A aba "Pedidos de Oracao" e visivel para todos os membros (sem `canReadPastoreio` gate), permitindo que membros sem permissao de pastoreio ainda criem e vejam pedidos de oracao
- O `CARGO_LABELS` esta duplicado entre `page.tsx` e `MembroPerfilPastoral.tsx` — potencial candidato a extracao para constants
