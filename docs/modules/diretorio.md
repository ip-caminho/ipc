# Modulo: Diretorio

## Visao Geral

O Diretorio e a lista de contatos da igreja, acessivel a todos os membros ativos. Exibe membros em um grid de cards com busca por nome/telefone, filtros por cargo eclesiastico e ficha detalhada em sheet lateral. O foco e somente leitura — nenhuma edicao e feita por esta tela.

Rota: `/diretorio`

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/diretorio/page.tsx` | Pagina principal do diretorio (client component) |
| `convex/membros/queries.ts` | Queries `list` e `getPublicProfile` consumidas pelo diretorio |
| `features/membros/lib/constants.ts` | `CARGO_ECLESIASTICO_OPTIONS` usado nos badges e filtros |
| `shared/components/auth/ModuloGuard.tsx` | Guard que verifica se o modulo "diretorio" esta ativo |

## Funcionalidades

### Busca e Filtros
- **Busca textual** com debounce de 300ms (nome ou telefone), delegada ao backend via `api.membros.queries.list({ search })`.
- **Filtro por categoria** (client-side sobre os resultados):
  - **Todos** — sem filtro
  - **Membros** — `MEMBRO_COMUNGANTE` e `MEMBRO_NAO_COMUNGANTE`
  - **Obreiros** — `PASTOR`, `PRESBITERO`, `DIACONO`
  - **Pastores e Presbiteros** — `PASTOR` e `PRESBITERO`
- Cada botao de filtro possui tooltip explicativo.
- Resultados ordenados alfabeticamente por `nomeCompleto` (locale `pt-BR`).

### Grid de Membros
- Grid responsivo: 1 coluna (mobile), 2 colunas (sm), 3 colunas (lg).
- Cada card exibe: avatar (com foto se disponivel), nome ou apelido, badge de cargo eclesiastico.
- Indicador de aniversario do dia (emoji de bolo) calculado client-side via `isToday()`.
- Skeleton de 6 cards enquanto carrega.

### Ficha do Membro (Sheet lateral)
- Aberta ao clicar em um card, usa `Sheet` do shadcn/ui.
- Consome `api.membros.queries.getPublicProfile` que retorna apenas dados publicos:
  - Nome completo, apelido, foto, cargo eclesiastico
  - WhatsApp (com link `wa.me/` para abrir conversa)
  - Data de nascimento (com calculo de idade via `differenceInYears`)
  - Profissao, bairro/cidade
  - Data de membresia (formatada "Membro desde MMMM de yyyy")
  - Conjuge (busca nome da entidade do conjuge se ativo)
  - Filhos (nome + idade de cada um)
  - Pequeno Grupo (nome do PG ativo, se houver)
- Exibe icones contextuais para cada informacao (MessageCircle, Cake, Briefcase, MapPin, CalendarDays, Users, Baby).

### Query `list` (Backend)
- Busca todos os membros, faz join com entidades.
- Filtro padrao: apenas entidades com `status === "ATIVO"`.
- Suporta filtros opcionais: `search`, `cargoEclesiastico`, `status`.
- Busca por nome funciona via `includes` (case-insensitive) em `nomeCompleto` e `whatsapp`.

### Query `getPublicProfile` (Backend)
- Retorna perfil publico de um membro por ID.
- Valida que a entidade esta ativa (`status === "ATIVO"`).
- Busca conjuge: se `conjugeId` existe e entidade do conjuge esta ativa, retorna o nome.
- Busca pequeno grupo: consulta tabela `pgMembros` pelo index `by_membro`, depois busca o PG se ativo.
- Retorna campos curados (nome, apelido, foto, whatsapp, cargoEclesiastico, dataNascimento, profissao, bairro, cidade, dataMembresia, conjugeNome, filhos, pgNome).

## Permissoes

- **Modulo**: Protegido por `ModuloGuard` com slug `"diretorio"`. Se o modulo estiver desativado na tabela `modulos`, redireciona para `/`.
- **Permissao RBAC**: `diretorio:read` — concedida por padrao a todos os roles (admin, secretaria, membro).
- Nao ha controle de escrita pois o diretorio e somente leitura.

## Dependencias

- `@shared/hooks/useDebounce` — debounce da busca
- `@shared/components/ui/*` — Card, Input, Avatar, Badge, Button, Skeleton, Sheet, Tooltip (shadcn/ui)
- `lucide-react` — icones (Search, MessageCircle, MapPin, Briefcase, Users, CalendarDays, Baby, Cake, ChevronRight)
- `date-fns` + `date-fns/locale/ptBR` — formatacao de datas e calculo de idade
- `@features/membros/lib/constants` — `CARGO_ECLESIASTICO_OPTIONS`
- `@shared/components/auth/ModuloGuard` — guard de modulo ativo

## Padroes de UI

- **Grid responsivo** com `gap-3 sm:grid-cols-2 lg:grid-cols-3`.
- **Cards interativos** com hover (`hover:bg-accent`), cursor pointer e seta de navegacao (ChevronRight).
- **Sheet lateral** para detalhes sem sair da pagina.
- **Skeleton loading** padrao (6 cards durante carregamento).
- **Estado vazio** com mensagem centralizada "Nenhum membro encontrado".
- **Tooltips** nos filtros de cargo para descrever cada categoria.
- Avatar com `AvatarFallback` usando a primeira letra do nome.
- Badge de cargo com variante `secondary` e tamanho compacto (`text-[10px]`).

## Notas Tecnicas

- Usa `@ts-ignore` para contornar erro TS2589 ("Type instantiation is excessively deep") do Convex — problema conhecido.
- A query `list` no backend faz full scan + filter in-memory. Nao usa indices para busca textual. Funcional para igrejas de tamanho medio, mas pode precisar de otimizacao para bases maiores.
- `getPublicProfile` faz ate 3 queries adicionais (conjuge, pgMembros, pg) alem da busca principal — todas sequenciais.
- Link de WhatsApp gerado com `wa.me/` assume formato brasileiro (prepend `55` se necessario).
- Contagem de resultados exibida no subtitulo da pagina.
- A filtragem por cargo e feita client-side (pos-fetch), enquanto a busca textual e delegada ao backend.
