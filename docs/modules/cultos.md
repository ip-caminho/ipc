# Modulo: Cultos

## Visao Geral

A pagina de Cultos (`/cultos`) e a interface administrativa central para gerenciar os cultos da igreja. Funciona como uma tabela interativa onde coordenadores podem atribuir membros a funcoes (escala), gerenciar a liturgia (passagens biblicas e louvores), e administrar avisos. A pagina oferece tres modos de visualizacao — Escala, Liturgia e Avisos — alternados por tabs.

Este modulo reutiliza o backend de `convex/escalas/` para queries e mutations de cultos/escalas, e `convex/avisos/` para gestao de avisos.

## Arquivos

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/cultos/page.tsx` | Pagina principal (~640 linhas). Tabela interativa de cultos com celulas editaveis. Contém componentes internos: `SingleCell`, `PregacaoCell`, `MultiCell`, `PassagemCell`, `LouvoresCell`, `ReadonlyCell`, `ReadonlyPassagemCell`, `ReadonlyLouvoresCell`. |
| `features/avisos/components/AvisosSection.tsx` | Secao de avisos: formulario de criacao/edicao, listagem de avisos ativos e expirados. Componentes internos: `AvisoForm`, `AvisoCard`. |
| `features/escalas/components/MembroCombobox.tsx` | Combobox reutilizavel para selecao de membros (compartilhado com modulo Escalas). |
| `features/escalas/hooks/useFuncoes.ts` | Hook para lista de funcoes ativas (compartilhado). |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/escalas/queries.ts` | `listCultos`: todos os cultos com escalas enriquecidas (nome do membro resolvido). |
| `convex/escalas/mutations.ts` | `createCulto`, `deleteCulto` (cascade), `upsertEscala` (singular), `addEscala` (multipla), `removeEscala`, `updatePassagem`, `updateLouvores`. |
| `convex/avisos/queries.ts` | `list`: todos os avisos ordenados por `dataInicio`, com nome do criador resolvido. `listByData`: avisos validos para uma data especifica. |
| `convex/avisos/mutations.ts` | `create`, `update`, `remove` — CRUD de avisos com permissoes `escalas:*`. |

### Schema (tabelas)

| Tabela | Campos principais | Indices |
|--------|-------------------|---------|
| `cultos` | `data`, `tipo` (DOMINICAL/ESPECIAL), `horario`, `louvores[]`, `status` (RASCUNHO/PUBLICADO) | `by_data`, `by_status_data` |
| `cultoEscalas` | `cultoId`, `funcao`, `membroId?`, `nomeCustom?`, `passagemBiblica?` | `by_culto`, `by_membro`, `by_culto_funcao` |
| `avisos` | `titulo`, `descricao?`, `dataInicio`, `dataFim?`, `criadoPor?`, `criadoEm`, `atualizadoEm?` | `by_dataInicio` |

## Funcionalidades

### Modo Escala (view default)

Tabela com coluna de data + uma coluna por funcao visivel no modo "escala". As funcoes exibidas sao filtradas pelo campo `views` da tabela `funcoes`.

**Tipos de celula editavel:**

- **SingleCell**: para funcoes singulares (ABERTURA, CONFISSAO, SOM, MULTIMIDIA). Combobox que permite selecionar um membro ou remover o existente.
- **PregacaoCell**: como SingleCell, mas com opcao extra "Pregador externo" que abre um input para nome customizado (campo `nomeCustom`).
- **MultiCell**: para funcoes multiplas (LOUVOR, HOSPITALIDADE). Lista membros atribuidos com botao X para remover cada um, e combobox para adicionar mais. Filtra membros ja atribuidos.
- **ReadonlyCell**: exibicao somente-leitura para usuarios sem permissao de edicao.

**Validacao de conflito**: o backend (`upsertEscala`, `addEscala`) verifica se o membro ja esta escalado em outra funcao no mesmo culto, impedindo duplicatas.

### Modo Liturgia

Mesma tabela, mas exibindo apenas funcoes com `views.includes("liturgia")`: ABERTURA, CONFISSAO, PREGACAO, LOUVOR.

**Tipos de celula:**

- **PassagemCell**: para ABERTURA, CONFISSAO, PREGACAO. Combina combobox de membro + campo editavel de passagem biblica (ex: "Salmo 23:1-6"). A passagem e salva via `updatePassagem` ou incluida no `upsertEscala`.
- **LouvoresCell**: para LOUVOR. Textarea que aceita um louvor por linha. Salva via `updateLouvores` no campo `louvores[]` do culto.
- **ReadonlyPassagemCell** e **ReadonlyLouvoresCell**: versoes somente-leitura.

### Modo Avisos

Substitui a tabela inteira pela `AvisosSection`:

- **Formulario de aviso** (`AvisoForm`): titulo (obrigatorio), descricao (opcional), data inicio (obrigatoria), data fim (opcional — se omitida, aviso vale so na data inicio).
- **Card de aviso** (`AvisoCard`): exibe titulo, datas formatadas ("dd/MM" ou "dd/MM -- dd/MM"), descricao truncada, metadados (criado por, data criacao, data edicao). Botoes de editar e excluir condicionais.
- **Separacao ativo/expirado**: avisos cuja `dataFim` (ou `dataInicio` se `dataFim` ausente) ja passou sao agrupados em `<details>` colapsavel com opacidade reduzida.
- **Edicao inline**: click no botao editar transforma o card em formulario pre-preenchido.

### Gestao de Cultos

- **Adicionar culto**: input de data + botao (tipo fixo DOMINICAL, requer `escalas:create`).
- **Excluir culto**: botao trash com `window.confirm`. Cascade delete de todas as escalas.
- **Ordenacao**: cultos ordenados cronologicamente (ascendente).
- **Visual**: dias que nao sao domingo aparecem com opacidade reduzida.

## Permissoes

| Acao | Permissao | Nota |
|------|-----------|------|
| Ver pagina | `escalas:read` (via ModuloGuard `escalas`) | Todos os membros |
| Criar culto | `escalas:create` | Admin, secretaria |
| Criar aviso | `escalas:create` | Admin, secretaria |
| Editar escalas/liturgia | `escalas:update` | Admin, secretaria |
| Editar avisos | `escalas:update` | Admin, secretaria |
| Excluir cultos | `escalas:delete` | Admin, secretaria |
| Excluir avisos | `escalas:delete` | Admin, secretaria |

**Frontend**: o hook `useAuth().can()` controla a exibicao de controles de edicao. Sem permissao, o usuario ve celulas read-only (`ReadonlyCell`, `ReadonlyPassagemCell`, etc.).

**Backend**: todas as mutations usam `requirePermission(ctx, "escalas:*")` para validacao server-side.

**Avisos**: compartilham as permissoes de `escalas:*` — nao possuem permissoes proprias.

## Dependencias

### Modulos internos
- **Escalas** (`convex/escalas/`): todo o backend de cultos e escalas. A pagina de Cultos e a interface administrativa do mesmo dominio.
- **Avisos** (`convex/avisos/`): queries e mutations de avisos.
- **Membros** (`convex/membros/queries.ts`): lista de membros ativos para os comboboxes.
- **Funcoes** (`convex/escalas/funcoes.ts`): configuracao dinamica de funcoes (quais colunas exibir por modo de visualizacao).

### Shared
- `features/escalas/components/MembroCombobox.tsx` — combobox de membros
- `features/escalas/hooks/useFuncoes.ts` — hook de funcoes
- `shared/components/auth/ModuloGuard.tsx` — guard de modulo
- `shared/providers/PermissionsProvider.tsx` — hook `useAuth()`
- `convex/_shared/requirePermission.ts` — validacao de permissao

### Bibliotecas externas
- `date-fns` + `date-fns/locale/ptBR`
- `sonner` (toast)
- `lucide-react` (Plus, Trash2, X, UserPlus, Pencil, Megaphone, Check)

## Padroes de UI

- **Tabela interativa** com `overflow-x-auto` e primeira coluna sticky (`sticky left-0`).
- **Tabs compactas** (h-8, text-xs) no header para alternar entre Escala/Liturgia/Avisos.
- **Celulas editaveis inline**: comboboxes abrem em popover, passagens biblicas editam com input inline, louvores com textarea.
- **Tamanhos compactos**: celulas usam `text-xs` e `text-[11px]`, inputs com `h-6` e `h-7`.
- **Feedback visual**:
  - Domingos destacados (dias nao-domingo com opacidade reduzida).
  - Placeholder italico em cinza ("Passagem...", "Louvores...").
  - Botoes de remover aparecem com hover destrutivo (`hover:text-destructive`).
- **Skeleton** como estado de loading.
- **Toast (sonner)** para feedback de todas as operacoes.
- **Confirm nativo** para exclusoes.

## Notas Tecnicas

- **Componentes internos**: a pagina define 8 componentes internos (SingleCell, PregacaoCell, MultiCell, PassagemCell, LouvoresCell e suas versoes readonly) diretamente no arquivo da pagina, sem extrair para arquivos separados. Isso mantém o escopo fechado mas resulta em um arquivo grande (~640 linhas).
- **Funcoes dinamicas**: as colunas da tabela sao determinadas pela tabela `funcoes` no banco, filtradas pelo campo `views` conforme o modo de visualizacao selecionado. Novas funcoes adicionadas via aba Equipes aparecem automaticamente.
- **Pregador externo**: o campo `nomeCustom` em `cultoEscalas` permite registrar pregadores que nao sao membros da igreja (sem `membroId`).
- **Louvores**: armazenados como `string[]` diretamente no documento do culto (campo `louvores`), nao na tabela de escalas. Editados via textarea com um louvor por linha.
- **Avisos e permissoes compartilhadas**: os avisos reutilizam as permissoes `escalas:*` ao inves de ter permissoes proprias. Isso significa que quem pode editar escalas tambem pode editar avisos.
- **`AvisosSection` e controlada**: o estado do formulario (`showForm`/`setShowForm`) e gerenciado pelo componente pai (pagina de Cultos), permitindo que o botao "Novo aviso" no header controle a abertura do formulario no corpo da pagina.
- **Resolucao de nomes**: `resolveEscalaNome` retorna o primeiro nome do membro (para exibicao compacta na tabela), enquanto `resolveEscalaNomeCompleto` retorna o nome completo (usado no boletim).
