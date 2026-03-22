# Pedidos de Oracao

## Visao Geral

Modulo de pedidos de oracao da comunidade. Permite que qualquer membro autenticado crie pedidos, acompanhe os pedidos do seu Pequeno Grupo e da igreja inteira, sinalize que esta orando por um pedido (sistema de intercessores), comente e poste atualizacoes. Ha dois pontos de acesso distintos: a pagina dedicada `/pedidos-oracao` (modulo self-service para membros) e a aba "Pedidos de Oracao" dentro do modulo de Pastoreio (`/pastoreio`, visao administrativa). Cada ponto tem queries e mutations proprios.

**Rota**: `/pedidos-oracao`
**Modulo guard**: `pedidos-oracao` (controlado pela tabela `modulos`)

## Arquivos

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/pedidos-oracao/page.tsx` | Pagina principal com abas "Meus pedidos", "Meu PG" e "Todos". Dialog de criacao inline |
| `features/pedidosOracao/components/PedidoOracaoListCard.tsx` | Card de listagem com avatar do autor, descricao truncada, status, avatares dos intercessores, botao toggle "Orar" e contagem de comentarios |
| `features/pedidosOracao/components/PedidoOracaoDetalhe.tsx` | Tela de detalhe: layout fixo com header/descricao/atualizacoes no topo, comentarios rolavel no meio e input fixo embaixo |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/pedidosOracao/queries.ts` | Queries: `listPublicos` (com filtro MEUS/MEU_PG/TODOS), `getById` (com comentarios, intercessores e autor enriquecidos) |
| `convex/pedidosOracao/mutations.ts` | Mutations: `create`, `updateStatus`, `addComentario`, `removeComentario`, `toggleOrando` |

### Schema (tabelas)

**`pedidosOracao`**: `membroId` (ref membros), `descricao`, `status` (ATIVO/RESPONDIDO/ARQUIVADO), `compartilhadoIgreja?` (boolean), `criadoEm`, `atualizadoEm?`. Indices: `by_membro`, `by_status`, `by_criadoEm`.

**`pedidoOracaoComentarios`**: `pedidoId` (ref pedidosOracao), `membroId` (quem comentou), `texto`, `tipo?` (COMENTARIO/ATUALIZACAO), `criadoEm`. Indices: `by_pedido`, `by_membro`.

**`pedidoOracaoIntercessores`**: `pedidoId` (ref pedidosOracao), `membroId` (quem esta orando), `criadoEm`. Indices: `by_pedido`, `by_pedido_membro` (composto para lookup rapido).

## Funcionalidades

### Listagem com filtros (Tabs)
- **Meus pedidos** (`filtro: "MEUS"`): Filtra por `membroId` do usuario logado
- **Meu PG** (`filtro: "MEU_PG"`): Encontra os PGs do membro via `pgMembros`, coleta todos os membros desses PGs (incluindo lideres/colideres) e filtra pedidos criados por qualquer um deles
- **Todos** (`filtro: "TODOS"`): Retorna todos os pedidos ordenados por data descendente
- Contagem exibida na tab: `Meus pedidos (3)`

### Criacao de pedido
- Dialog simples com Textarea para descricao
- Switch "Compartilhar com a igreja" (`compartilhadoIgreja`): quando ativado, exibe nota "Este pedido sera apresentado no momento de oracao do culto"
- Qualquer membro autenticado pode criar (nao exige permissao especifica)

### Detalhe do pedido
- **Layout fixo em 3 faixas**: Header (autor + descricao + atualizacoes + intercessores) no topo, comentarios rolavel no meio, input de comentario fixo embaixo
- **Atualizacoes do autor**: Separadas visualmente dos comentarios, exibidas com borda lateral colorida e icone de megafone. Apenas o dono do pedido pode postar atualizacoes
- **Comentarios**: Qualquer membro pode comentar. Exibidos com avatar, nome, tempo relativo (`date-fns formatDistanceToNow`). Autor ou admin podem excluir
- **Highlight de novo comentario**: Ao enviar, o comentario recebe fundo amarelo por 2 segundos
- **Intercessores**: AvatarGroup animado mostrando quem esta orando. Botao toggle para sinalizar "Estou orando"
- **Acoes do dono** (quando status ATIVO): "Postar atualizacao", "Respondido", "Arquivar"
- **Acoes do dono** (quando status nao ATIVO): "Reabrir"

### Sistema de intercessores
- Toggle "Estou orando" (`toggleOrando`): Adiciona ou remove registro na tabela `pedidoOracaoIntercessores`
- No card da listagem: Exibe ate 5 avatares dos intercessores + overflow "+N orando"
- Botao circular com icone `HandHeart` quando orando, `Plus` quando nao
- Tooltips informativos em ambos os estados

### Status e transicoes
- `ATIVO` -> `RESPONDIDO` (via botao "Respondido" ou `updateStatus`)
- `ATIVO` -> `ARQUIVADO` (via botao "Arquivar")
- `RESPONDIDO`/`ARQUIVADO` -> `ATIVO` (via botao "Reabrir")

## Permissoes

### Pagina /pedidos-oracao (self-service)
- **Criacao**: Qualquer membro autenticado (`requireAuth()` — sem verificacao de permissao)
- **Leitura**: Qualquer membro autenticado pode ver todos os pedidos publicos
- **Mudanca de status** (`updateStatus`): O dono do pedido pode alterar. Nao-donos precisam ser admin ou ter permissao `pastoreio:update`
- **Comentarios**: Qualquer membro pode comentar. Apenas o autor do comentario ou admin pode excluir
- **Atualizacoes**: Apenas o dono do pedido pode postar tipo "ATUALIZACAO"

### Pagina /pastoreio (visao administrativa)
- Acesso a aba "Pedidos de Oracao" requer `pedidos_oracao:read` ou `pastoreio:read`
- Quem tem `pastoreio:read` ve todos os pedidos; quem tem apenas `pedidos_oracao:read` ve somente os proprios
- Mudanca de status no card do pastoreio requer `pastoreio:update`

## Dependencias

### Tabelas externas
- `membros` — autor do pedido, intercessores, comentaristas
- `entidades` — resolucao de nomes e fotos
- `pgMembros` / `pequenosGrupos` — filtro "Meu PG" na listagem

### Queries externas
- Nenhuma query externa usada diretamente (todo enriquecimento e feito inline nas queries do modulo)

### Bibliotecas
- `date-fns` + `date-fns/locale/ptBR` — formatacao de tempo relativo e datas
- `sonner` — toasts
- `animate-ui/components/animate/avatar-group` — AvatarGroup animado para intercessores

### Shared
- `ModuloGuard` — verifica se o modulo "pedidos-oracao" esta ativo
- `useAuth()` — verificacao de `isAdmin` no detalhe (para excluir comentarios de terceiros)

## Padroes de UI

- **Tabs (shadcn/ui)**: Organizacao em "Meus pedidos", "Meu PG", "Todos"
- **Cards em grid**: `sm:grid-cols-2`
- **AvatarGroup animado**: Sobreposicao de avatares dos intercessores com tooltip por nome
- **Botao toggle circular**: Estilo outline com borda pontilhada quando inativo, preenchido quando ativo
- **Layout fixo em detalhe**: Header colado no topo, input colado embaixo, conteudo rolavel no meio (usa `flex flex-col` com `overflow-auto` no meio)
- **Indicador visual de "compartilhado com a igreja"**: Icone `Church` no card
- **Highlight efemero**: Fundo amarelo por 2s no novo comentario
- **Tempo relativo**: "ha 3 minutos", "ha 2 dias" via `formatDistanceToNow`

## Notas Tecnicas

- A query `listPublicos` com `filtro: "MEU_PG"` faz multiplos lookups: pgMembros -> pgIds -> membros de cada PG -> pedidos filtrados. Para igrejas com muitos PGs, isso pode ficar pesado. Considerar desnormalizacao futura
- O campo `compartilhadoIgreja` e opcional no schema — pedidos criados pelo modulo de pastoreio nao definem esse campo
- O `enrichPedido()` helper nos queries enriquece cada pedido com: nome do membro, flag `isOwner`, contagem e resumo de intercessores (ate 5), contagem de comentarios, flag `euOrando`
- O tipo `ATUALIZACAO` em comentarios e uma convencao: tecnicamente e um registro na mesma tabela `pedidoOracaoComentarios`, apenas diferenciado pelo campo `tipo`
- A exclusao de comentarios verifica ownership (quem criou) ou role admin; nao ha permissao RBAC especifica para isso
- O detalhe usa margin negativo (`-m-4 md:-m-6`) para estender ate as bordas do container pai, necessario para o layout fixo de 3 faixas
- Nao ha paginacao nas listagens — todos os pedidos sao carregados de uma vez. Para igrejas grandes, considerar cursor-based pagination
