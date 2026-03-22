# Modulo: Admin Gravacoes

## Visao Geral

Pagina administrativa para gerenciamento completo de gravacoes de sermoes e estudos. Permite listar todas as gravacoes (publicadas e rascunhos), filtrar por status de publicacao e status de processamento por IA, publicar/despublicar gravacoes diretamente e navegar para as paginas de gestao individual e visualizacao publica.

Rota: `/admin/gravacoes`

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/admin/gravacoes/page.tsx` | Pagina principal de administracao de gravacoes |
| `features/gravacoes/components/IaStatusBadge.tsx` | Badge de status do processamento IA |
| `convex/gravacoes/queries.ts` | Query `list` consumida pela pagina |
| `convex/gravacoes/mutations.ts` | Mutations `publish` e `update` usadas para toggle de status |
| `shared/components/auth/RoleGate.tsx` | `AdminGate` — guard de role admin |

## Funcionalidades

### Listagem com Filtros
- **Busca textual** com debounce de 300ms, passada como parametro `search` para a query `api.gravacoes.queries.list`.
- **Filtro por status de publicacao**:
  - Todos (sem filtro)
  - Rascunho (`status === "RASCUNHO"`)
  - Publicado (`status === "PUBLICADO"`)
- **Filtro por status de IA** (client-side sobre resultados):
  - IA: Todos — sem filtro
  - IA: OK — `iaStatus === "CONCLUIDO"`
  - IA: Processando — `iaStatus === "TRANSCREVENDO"` ou `"ANALISANDO"`
  - IA: Pendente — sem iaStatus ou `iaStatus === "PENDENTE"`
  - IA: Erro — `iaStatus === "ERRO"`
- Contagem de gravacoes exibida abaixo do titulo.

### Card de Gravacao (`GravacaoAdminCard`)
Cada gravacao exibe:
- **Titulo** com truncamento
- **Badge de status** (Publicado/Rascunho) — clicavel para toggle direto
  - Publicado: icone Globe, variante `default`
  - Rascunho: icone GlobeLock, variante `secondary`
- **Badge de IA** (componente `IaStatusBadge`):
  - PENDENTE: "IA: Pendente" (secondary + spinner)
  - BAIXANDO: "IA: Baixando audio" (secondary + spinner)
  - TRANSCREVENDO: "IA: Transcrevendo" (secondary + spinner)
  - ANALISANDO: "IA: Analisando" (secondary + spinner)
  - CONCLUIDO: "IA: Concluido" (default, sem spinner)
  - ERRO: "IA: Erro" (destructive, com tooltip mostrando mensagem de erro)
- **Metadados**: data formatada (dd/MM/yyyy), nome do pregador, texto base
- **Indicadores**: audio enviado/sem audio, quantidade de avisos da IA, quantidade de tags
- **Acoes**:
  - Botao "Gerenciar" — navega para `/gravacoes/{id}/admin`
  - Botao de link externo — navega para `/gravacoes/{id}` (visualizacao publica)

### Toggle de Publicacao
- Clicar no badge de status alterna entre PUBLICADO e RASCUNHO.
- Para publicar: chama `api.gravacoes.mutations.publish`.
- Para despublicar: chama `api.gravacoes.mutations.update` com `{ status: "RASCUNHO" }`.
- Feedback via toast (Sonner).

### Botao "Nova Gravacao"
- Link direto para `/gravacoes/nova`.

## Permissoes

- **Acesso a pagina**: Protegido por `AdminGate` — apenas role `"admin"`.
- Sem `ModuloGuard` nesta pagina (e uma rota administrativa).
- Permissoes de gravacao no RBAC:
  - `gravacoes:read` — ver gravacoes
  - `gravacoes:create` — criar gravacoes
  - `gravacoes:update` — editar gravacoes
  - `gravacoes:delete` — excluir gravacoes
  - `gravacoes:process_ai` — processar com IA

## Dependencias

- `@shared/hooks/useDebounce` — debounce da busca
- `@shared/components/ui/*` — Card, Badge, Button, Input, Skeleton (shadcn/ui)
- `@features/gravacoes/components/IaStatusBadge` — badge de status IA
- `lucide-react` — Search, ExternalLink, Plus, Globe, GlobeLock
- `date-fns` + `date-fns/locale/ptBR` — formatacao de data
- `sonner` — toasts de feedback
- `next/link` — navegacao
- `@shared/components/auth/RoleGate` — `AdminGate`

## Padroes de UI

- **Lista vertical** de cards (nao grid).
- **Filtros como botoes** dispostos horizontalmente, agrupados por tipo (status / IA).
- Cards com layout horizontal: conteudo a esquerda, acoes a direita.
- **Badges clicaveis** para toggle rapido de publicacao (UX direta sem modal).
- **Feedback visual** de estados:
  - Audio enviado: texto verde "Audio enviado"
  - Sem audio: texto laranja "Sem audio"
- Skeleton de 6 itens durante carregamento.
- Busca com icone de lupa integrado ao input.

## Notas Tecnicas

- Usa `@ts-ignore` para contornar erro TS2589 do Convex.
- O filtro por status de publicacao e passado como parametro ao backend (`status`), enquanto o filtro por IA e aplicado client-side via `useMemo`.
- O componente `IaStatusBadge` e reutilizavel e usado tambem em outras paginas de gravacoes.
- `pregador` e resolvido de duas fontes: `pregadorNome` (campo direto) ou `pregadorInfo?.nome` (objeto aninhado).
- O toggle de status usa duas mutations diferentes: `publish` para publicar (provavelmente com validacoes adicionais) e `update` generico para despublicar.
- A pagina de gestao individual (`/gravacoes/{id}/admin`) e separada e permite edicao completa, processamento IA e outras operacoes.
