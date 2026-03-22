# Dashboard (/)

## Visao Geral

O Dashboard e a pagina inicial do sistema, acessivel em `/` dentro do layout autenticado `(ready)`. Funciona como hub central que agrega informacoes relevantes de varios modulos do sistema: avisos do culto, aniversariantes, pedidos de oracao, educacional infantil e frases de sermoes.

A pagina tambem contém o fluxo de **bootstrap** do sistema — quando nenhum membro esta vinculado ao usuario autenticado (primeiro acesso), exibe um formulario para criacao do primeiro administrador.

## Arquivos

### Pagina

- `app/(ready)/page.tsx` — Componente principal `DashboardPage` + componente interno `BootstrapForm`

### Componentes

- `features/gravacoes/components/AvisosWidget.tsx` — Widget de avisos da semana extraidos por IA da gravacao do ultimo domingo
- `features/gravacoes/components/FrasesCarrossel.tsx` — Card "Palavra do dia" com frase aleatoria dos sermoes processados pela IA
- `features/educacional/components/EducacionalPaisWidget.tsx` — Widget para pais/maes com info das turmas dos filhos no educacional infantil

### Hooks e Providers

- `shared/audio/useAudioPlayer.ts` — Hook que expoe o contexto do player global de audio (usado pelo AvisosWidget)
- `shared/audio/AudioPlayerProvider.tsx` — Provider do player de audio global com controle de segmentos (inicio/fim), volume via GainNode, e heartbeat de escuta
- `shared/audio/utils.ts` — Utilitarios: conversao de URL para CDN (`toCdnUrl`) e formatacao de tempo
- `shared/providers/PermissionsProvider.tsx` — Provider de autenticacao e permissoes RBAC (`useAuth`)

### Backend (Convex)

#### Queries utilizadas

| Query | Arquivo | Descricao |
|-------|---------|-----------|
| `gravacoes.queries.getLatestAvisos` | `convex/gravacoes/queries.ts` | Busca avisos da gravacao do ultimo domingo (IA processada). Retorna avisos, audioUrl, timestamps de inicio/fim dos avisos, data e gravacaoId. Independe do status da gravacao (RASCUNHO ou PUBLICADO). |
| `gravacoes.queries.listFrases` | `convex/gravacoes/queries.ts` | Coleta `fraseChave` e `frasesRedesSociais` de todas as gravacoes PUBLICADAS com IA concluida. Retorna array com frase, pregador, titulo e gravacaoId. |
| `membros.queries.birthdaysThisMonth` | `convex/membros/queries.ts` | Lista membros ativos com aniversario no mes corrente. Filtra por `dataNascimento` (formato YYYY-MM-DD) e ordena por dia do mes. Retorna membro + entidade completa. |
| `pastoreio.queries.listPedidosOracao` | `convex/pastoreio/queries.ts` | Lista pedidos de oracao. Com `pastoreio:read` ve todos; com `pedidos_oracao:read` ve apenas os proprios. Filtra por status "ATIVO" quando chamado pelo dashboard. |
| `educacional.queries.dashboardPais` | `convex/educacional/queries.ts` | Retorna criancas vinculadas ao membro logado como responsavel, com turma e proxima escala (professores). Retorna `null` se o membro nao e pai/mae. |
| `preferencias.rbac.getUserPermissionContext` | `convex/preferencias/rbac.ts` | Resolve role, permissoes, nome, foto e dados do membro logado (usado pelo `PermissionsProvider`). |

#### Mutations utilizadas

| Mutation | Arquivo | Descricao |
|----------|---------|-----------|
| `membros.bootstrap.bootstrapAdmin` | `convex/membros/bootstrap.ts` | Cria o primeiro administrador do sistema (entidade + membro atomicamente). |
| `debug.relinkAdmin` | `convex/debug.ts` | Religa sessao de um usuario que ja era admin (vincula userId ao membro existente). |
| `gravacoes.escutas.heartbeat` | `convex/gravacoes/escutas.ts` | Registra progresso de escuta a cada 15 segundos durante playback de audio. Faz upsert na tabela `escutasGravacao`. |

## Funcionalidades

### 1. Bootstrap do Sistema (BootstrapForm)

Exibido quando o usuario esta autenticado mas nao possui membro vinculado (`role === null`). Condicao: `!isLoading && isAuthenticated && !role`.

**Campos:**
- Nome Completo (obrigatorio)
- WhatsApp (opcional, formato brasileiro)

**Acoes:**
- **"Criar Admin e Entrar"** — chama `bootstrapAdmin`, cria entidade + membro com role `admin`, faz `window.location.reload()` apos sucesso
- **"Ja sou admin (religar sessao)"** — chama `relinkAdmin`, vincula o userId da sessao atual a um membro admin existente

Apos a criacao, a pagina recarrega completamente para que o `PermissionsProvider` capture as novas permissoes.

### 2. Widget de Avisos da Semana (AvisosWidget)

Card que exibe os avisos extraidos pela IA da gravacao do ultimo domingo.

**Logica de busca:**
- Calcula o ultimo domingo (UTC)
- Procura gravacoes com `data === lastSunday`, `iaStatus === "CONCLUIDO"` e `iaAvisos.length > 0`
- Independe do status da gravacao (aparece mesmo em RASCUNHO)

**Exibicao:**
- Titulo "Avisos da semana" com icone Megaphone
- Lista de avisos com titulo (negrito) e descricao
- Link para a gravacao com a data formatada (dd/MM/yyyy)
- Botao "Ouvir avisos" (se existe audioUrl e timestamps de inicio)

**Player de audio integrado:**
- Usa o `useAudioPlayer` (player global persistente do `AudioPlayerProvider`)
- Toca apenas o trecho dos avisos (usa `inicioAvisos`/`fimAvisos` como segmento)
- Toggle play/pause: detecta se a track atual e a mesma comparando `gravacaoId`, `inicioSermao` e `fimSermao`
- Botao muda entre "Ouvir avisos" (Play) e "Pausar" (Pause)

**Estados:**
- `data === undefined` → "Carregando..."
- `data === null` → "Nenhum aviso recente"
- Com dados → lista de avisos + botao de audio

### 3. Aniversariantes do Mes

Card que lista membros ativos com aniversario no mes corrente.

**Exibicao:**
- Titulo "Aniversariantes do mes" com icone Cake
- Contador de aniversariantes no canto superior direito
- Instrucao: "Clique no (icone) para enviar uma mensagem"
- Lista com Avatar (foto ou inicial do nome), nome (usa `apelido` se disponivel, senao `nomeCompleto`), data formatada ("dd de MMMM" em pt-BR)
- Icone WhatsApp (MessageCircle verde) ao lado do nome — abre `wa.me/{numero}` em nova aba

**Funcao auxiliar `formatWhatsappLink`:**
- Remove caracteres nao-numericos
- Adiciona prefixo `55` se nao presente
- Retorna URL `https://wa.me/{numero}`

**Estados:**
- `aniversariantesMes === undefined` → "Carregando..."
- Array vazio → "Nenhum aniversariante este mes"
- Com dados → lista ordenada por dia do mes

### 4. Pedidos de Oracao (condicional)

Card exibido apenas se o membro possui permissao `pedidos_oracao:read`.

**Logica:**
- Query com skip condicional: `can("pedidos_oracao:read") ? { status: "ATIVO" } : "skip"`
- Exibe ate 3 pedidos ativos (`.slice(0, 3)`)
- Link "Ver todos" aponta para `/pedidos-oracao`

**Exibicao:**
- Titulo "Meus Pedidos de Oracao" com icone HandHeart
- Contador de pedidos ativos
- Lista com descricao de cada pedido

**Controle de acesso no backend:**
- Com `pastoreio:read` → ve todos os pedidos
- Com `pedidos_oracao:read` (sem `pastoreio:read`) → ve apenas os proprios

### 5. Widget Educacional para Pais (EducacionalPaisWidget)

Card exibido apenas para membros que sao responsaveis de criancas cadastradas no educacional.

**Logica:**
- Query `dashboardPais` busca pelo `userId` logado → encontra membro → busca na tabela `responsaveis` as criancas vinculadas
- Retorna `null` se nao ha criancas (widget nao renderiza)

**Exibicao:**
- Titulo "Educacional Infantil" com icone Baby
- Lista de criancas com:
  - Nome da crianca
  - Badge com turma (cores definidas em `TURMA_COLORS`)
  - Proxima escala com data e nomes dos professores

### 6. Palavra do Dia (FrasesCarrossel)

Card que exibe uma frase aleatoria extraida dos sermoes processados pela IA.

**Logica de coleta (backend):**
- Itera todas as gravacoes PUBLICADAS com `iaStatus === "CONCLUIDO"`
- Coleta `fraseChave` (1 por gravacao) e `frasesRedesSociais` (varias por gravacao) do campo `iaResultado`
- Retorna array com frase, pregador, titulo e gravacaoId

**Selecao aleatoria (frontend):**
- `useMemo` com `Math.random()` seleciona uma frase aleatoria do array completo
- Muda a cada re-render do componente (quando a query atualiza)

**Exibicao:**
- Titulo "Palavra do dia" acima do card
- Card com fundo sutil (`bg-primary/5`)
- Icone de citacao (Quote)
- Frase em italico
- Atribuicao: "— {pregador}" + titulo da pregacao
- Botao "Ouvir pregacao" com icone Headphones — link para `/gravacoes/{gravacaoId}`

**Nao renderiza** se nao ha frases disponiveis (`allFrases` vazio ou undefined).

## Permissoes

| Funcionalidade | Permissao necessaria | Comportamento sem permissao |
|---|---|---|
| Ver avisos da semana | Nenhuma (publico para autenticados) | Sempre visivel |
| Ver aniversariantes | Nenhuma (publico para autenticados) | Sempre visivel |
| Ver pedidos de oracao | `pedidos_oracao:read` | Secao nao renderiza |
| Ver educacional infantil | Nenhuma (filtrado por vinculo de responsavel) | Widget nao renderiza se nao e pai/mae |
| Ver frases dos sermoes | Nenhuma (publico para autenticados) | Sempre visivel (se houver frases) |
| Bootstrap do sistema | Nenhuma (exibido quando `role === null`) | N/A |

**Nota:** O bootstrap so aparece quando o usuario esta autenticado mas nao tem membro vinculado. Apos a criacao do admin, o formulario desaparece permanentemente.

## Dependencias entre Modulos

```
Dashboard (/)
├── gravacoes
│   ├── AvisosWidget → gravacoes.queries.getLatestAvisos
│   ├── FrasesCarrossel → gravacoes.queries.listFrases
│   └── AudioPlayerProvider → gravacoes.escutas.heartbeat
├── membros
│   ├── Aniversariantes → membros.queries.birthdaysThisMonth
│   └── Bootstrap → membros.bootstrap.bootstrapAdmin
├── pastoreio
│   └── Pedidos de oracao → pastoreio.queries.listPedidosOracao
├── educacional
│   └── EducacionalPaisWidget → educacional.queries.dashboardPais
├── preferencias
│   └── RBAC/Auth → preferencias.rbac.getUserPermissionContext
└── debug
    └── relinkAdmin → debug.relinkAdmin
```

**Tabelas do schema acessadas indiretamente:**
- `gravacoes` (avisos, frases)
- `membros` (aniversariantes, bootstrap, pedidos)
- `entidades` (nomes, fotos, whatsapp, datas)
- `pedidosOracao` (pedidos ativos)
- `escutasGravacao` (heartbeat de playback)
- `responsaveis`, `criancaPerfil`, `ministerioEscalas` (educacional)

## Padroes de UI

### Layout geral
- Container `space-y-6` para espacamento vertical entre secoes
- Saudacao com nome do usuario (`Bem-vindo, {name}!`) em `text-2xl font-bold`

### Grid responsivo
- Avisos + Aniversariantes lado a lado em `grid gap-6 md:grid-cols-2`
- Em mobile, empilhados verticalmente

### Cards (shadcn/ui)
- Todos os widgets usam `Card` + `CardHeader` + `CardContent`
- Titulos em `text-base` com icone Lucide alinhado (`flex items-center gap-2`)
- Contadores no canto superior direito em `text-sm text-muted-foreground`

### Estados de carregamento
- Texto "Carregando..." em `text-sm text-muted-foreground`
- Sem skeletons — abordagem minimalista

### Estados vazios
- Texto descritivo em `text-sm text-muted-foreground`
- Ex: "Nenhum aviso recente", "Nenhum aniversariante este mes", "Nenhum pedido ativo"

### Renderizacao condicional
- Secoes com permissao usam `can()` para controlar visibilidade
- Widgets que dependem de dados (EducacionalPaisWidget, FrasesCarrossel) retornam `null` quando nao ha dados

### Avatar
- `Avatar` (shadcn/ui) com `AvatarImage` (foto) + `AvatarFallback` (inicial do nome em maiuscula)
- Tamanho `h-9 w-9`

### Botao de audio
- Estilo pill: `rounded-full bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 text-xs`
- Toggle visual entre Play e Pause

### Card de frase destaque
- Fundo sutil `bg-primary/5` com borda `border-primary/10`
- Centralizacao com `max-w-lg mx-auto text-center`
- Fonte italica para a citacao

## Notas Tecnicas

### Player de audio global
O `AvisosWidget` nao cria seu proprio `<audio>`. Utiliza o `AudioPlayerProvider` que injeta um unico `<audio>` invisivel no DOM no nivel do provider. Isso permite que o audio continue tocando ao navegar entre paginas (player persistente). O provider:
- Suporta **segmentos** (inicio/fim) para tocar apenas trechos do audio
- Usa **GainNode** (Web Audio API) para volume ate 200% quando suportado (crossOrigin necessario)
- Envia **heartbeat** a cada 15 segundos via mutation `gravacoes.escutas.heartbeat`, registrando progresso de escuta
- Converte URLs para CDN automaticamente via `toCdnUrl` (`https://cdn.yhc.com.br`)

### Skip condicional de queries
A query de pedidos de oracao usa o padrao de skip condicional do Convex:
```tsx
useQuery(api.pastoreio.queries.listPedidosOracao,
  can("pedidos_oracao:read") ? { status: "ATIVO" } : "skip"
);
```
Quando o usuario nao tem permissao, a query simplesmente nao e executada (economia de leituras no backend).

### Calculo do ultimo domingo (getLatestAvisos)
A query `getLatestAvisos` calcula o ultimo domingo em UTC. Se hoje e domingo, retorna hoje. Busca gravacoes com `data === lastSunday` — portanto depende de que a gravacao tenha sido cadastrada com a data correta do domingo.

### Frases e aleatoriedade
A selecao da frase usa `Math.random()` dentro de `useMemo` com dependencia em `allFrases`. Na pratica, a frase muda:
- Quando a query retorna novos dados (raro, pois depende de novas gravacoes processadas)
- Quando o componente e remontado (navegacao para fora e volta ao dashboard)

### Bootstrap atomico
O `bootstrapAdmin` cria entidade + membro na mesma mutation (atomico). Apos sucesso, faz `window.location.reload()` em vez de invalidar caches do React, garantindo que todo o state (PermissionsProvider, queries) seja reconstruido do zero.

### DevContext
A pagina esta mapeada no `CONTEXT_MAP` de `shared/components/layout/DevContext.tsx` como rota `/` com nome "Dashboard".
