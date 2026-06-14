# Modulo Gravacoes

Modulo mais complexo do sistema. Gerencia gravacoes de pregacoes/sermoes, incluindo upload de audio, importacao do YouTube, pipeline de IA (transcricao + analise teologica), player de audio global, comentarios, reacoes, rastreamento de escutas e filtro por livro da Biblia.

---

## Indice

1. [Visao geral](#visao-geral)
2. [Schema (tabelas)](#schema-tabelas)
3. [Rotas e paginas](#rotas-e-paginas)
4. [Pipeline de IA](#pipeline-de-ia)
5. [Player de audio global](#player-de-audio-global)
6. [Comentarios](#comentarios)
7. [Reacoes](#reacoes)
8. [Rastreamento de escutas](#rastreamento-de-escutas)
9. [Filtro por livro da Biblia](#filtro-por-livro-da-biblia)
10. [Editor de segmentos](#editor-de-segmentos)
11. [Avisos do culto](#avisos-do-culto)
12. [Frases (carrossel)](#frases-carrossel)
13. [Series de gravacoes](#series-de-gravacoes)
14. [Permissoes (RBAC)](#permissoes-rbac)
15. [Arquivos-chave](#arquivos-chave)

---

## Visao geral

O modulo permite que a igreja gerencie gravacoes de cultos. O fluxo principal e:

1. Admin faz upload de audio ou importa do YouTube
2. Pipeline de IA transcreve (Deepgram) e analisa (Claude/LLM) o conteudo
3. IA preenche automaticamente: titulo, pregador, passagem biblica, resumo, descricao, tags, timestamps do sermao/avisos, e avisos estruturados
4. Admin revisa e publica
5. Membros podem ouvir o sermao, reagir, comentar

### Tipos de gravacao

| Valor            | Label           |
|------------------|-----------------|
| `SERMAO`         | Sermao          |
| `ESTUDO_BIBLICO` | Estudo Biblico  |
| `PALESTRA`       | Palestra        |
| `OUTRO`          | Outro           |

### Status

| Valor       | Descricao                              |
|-------------|----------------------------------------|
| `RASCUNHO`  | Criado, nao visivel para membros       |
| `PUBLICADO` | Visivel na listagem para todos         |

---

## Schema (tabelas)

### `gravacoes`

Tabela principal. Campos:

| Campo                     | Tipo                                | Descricao                                   |
|---------------------------|-------------------------------------|---------------------------------------------|
| `titulo`                  | `string`                            | Titulo da gravacao                           |
| `tipo`                    | `SERMAO\|ESTUDO_BIBLICO\|PALESTRA\|OUTRO` | Tipo da gravacao           |
| `serieId`                 | `Id<serieGravacoes>?`              | Referencia a serie                           |
| `pregadorId`              | `Id<membros>?`                     | Pregador (se for membro)                     |
| `pregadorNome`            | `string?`                           | Nome do pregador (texto livre ou auto-fill IA) |
| `data`                    | `string` (YYYY-MM-DD)              | Data da gravacao                             |
| `descricao`               | `string?`                           | Descricao curta                              |
| `resumo`                  | `string?`                           | Resumo longo (2-4 paragrafos)                |
| `textoBase`               | `string?`                           | Passagem biblica (ex: "Romanos 8:28-30")     |
| `audioUrl`                | `string?`                           | URL do audio no B2/CDN                       |
| `youtubeUrl`              | `string?`                           | URL original do YouTube                      |
| `materiaisComplementares` | `string[]?`                         | URLs de materiais extras                     |
| `tags`                    | `string[]?`                         | Tags de categorizacao                        |
| `status`                  | `RASCUNHO\|PUBLICADO`              | Status de publicacao                         |
| `iaStatus`                | `PENDENTE\|BAIXANDO\|TRANSCREVENDO\|ANALISANDO\|CONCLUIDO\|ERRO` | Status do processamento IA |
| `iaErro`                  | `string?`                           | Mensagem de erro da IA                       |
| `iaTranscricao`           | `string?`                           | Transcricao completa (Deepgram)              |
| `iaResultado`             | `any?`                              | JSON com resultado da analise da IA          |
| `iaProcessadoEm`         | `number?`                           | Timestamp de quando foi processado           |
| `iaProcessadoPor`         | `Id<membros>?`                     | Quem solicitou o processamento               |
| `inicioSermao`            | `number?`                           | Segundo de inicio do sermao no audio         |
| `fimSermao`               | `number?`                           | Segundo de fim do sermao no audio            |
| `inicioAvisos`            | `number?`                           | Segundo de inicio dos avisos no audio        |
| `fimAvisos`               | `number?`                           | Segundo de fim dos avisos no audio           |
| `iaAvisos`                | `{titulo, descricao}[]?`           | Avisos estruturados extraidos pela IA        |

**Indices**: `by_tipo`, `by_status`, `by_data`, `by_pregador`, `by_serie`

### `comentariosGravacao`

| Campo        | Tipo                        | Descricao                     |
|--------------|-----------------------------|-------------------------------|
| `gravacaoId` | `Id<gravacoes>`             | Gravacao referenciada         |
| `membroId`   | `Id<membros>`               | Autor do comentario           |
| `texto`      | `string`                    | Conteudo do comentario        |
| `parentId`   | `Id<comentariosGravacao>?`  | Comentario pai (para replies) |
| `createdAt`  | `number`                    | Timestamp de criacao          |

**Indices**: `by_gravacao` (gravacaoId, createdAt), `by_parent` (parentId)

### `reacoesGravacao`

| Campo        | Tipo            | Descricao                |
|--------------|-----------------|--------------------------|
| `gravacaoId` | `Id<gravacoes>` | Gravacao referenciada    |
| `membroId`   | `Id<membros>`   | Quem reagiu              |
| `tipo`       | `string`        | Emoji da reacao          |
| `createdAt`  | `number`        | Timestamp               |

**Tipos de reacao disponveis**: `["❤️", "🙏", "🔥", "👏", "💡"]`

**Indices**: `by_gravacao`, `by_gravacao_membro`

### `escutasGravacao`

| Campo           | Tipo            | Descricao                          |
|-----------------|-----------------|------------------------------------|
| `gravacaoId`    | `Id<gravacoes>` | Gravacao escutada                  |
| `membroId`      | `Id<membros>`   | Ouvinte                            |
| `ultimoSegundo` | `number`        | Ultimo segundo ouvido              |
| `duracaoTotal`  | `number`        | Duracao total do audio             |
| `progresso`     | `number`        | Percentual de progresso (0-100)    |
| `completou`     | `boolean`       | Se ouviu >= 90%                    |
| `iniciadoEm`    | `number`        | Timestamp do primeiro heartbeat    |
| `atualizadoEm`  | `number`        | Timestamp do ultimo heartbeat      |

**Indices**: `by_gravacao`, `by_membro`, `by_gravacao_membro`

### `serieGravacoes`

| Campo      | Tipo      | Descricao            |
|------------|-----------|----------------------|
| `nome`     | `string`  | Nome da serie        |
| `descricao`| `string?` | Descricao da serie   |

---

## Rotas e paginas

### `/gravacoes` — Listagem publica

**Arquivo**: `app/(ready)/gravacoes/page.tsx`

Pagina principal do modulo. Exibe todas as gravacoes com status `PUBLICADO`. Protegida por `ModuloGuard` ("gravacoes").

**Funcionalidades**:

- **Busca com debounce** (300ms): filtra por titulo, pregador, texto base e tags
- **Ordenacao**: segmented control com dois modos — "Por data" (agrupado por mes/ano) ou "Pregador" (agrupado alfabeticamente por nome)
- **Filtro por tag**: barra de pills mostrando as top 5 tags (expansivel). Tags retornadas pela query `listTags` com contagem. Toggle ativo/inativo.
- **Filtro por livro da Biblia**: popover com heatmap de todos os 66 livros (ver secao dedicada)
- **Cards de gravacao**: cada card exibe data (dia + mes abreviado), titulo, passagem biblica (badge), pregador, descricao (line-clamp-2), ate 2 tags, resumo de reacoes e contagem de comentarios

**Queries utilizadas**: `gravacoes.queries.list` (com filtros search, tag), `gravacoes.queries.listTags`

### `/gravacoes/[id]` — Detalhe da gravacao

**Arquivo**: `app/(ready)/gravacoes/[id]/page.tsx`

Pagina de detalhe com layout fixo (header fixo + scroll no meio + input de comentario fixo no rodape).

**Layout**:

1. **Topo fixo**: badge de passagem biblica, titulo, metadados (pregador + data formatada), botao "Ouvir sermao" (aparece somente se `iaStatus === "CONCLUIDO"` e `audioUrl` existe)
2. **Area scrollavel**: resumo (expansivel se > 300 chars), tags, reacoes, header de comentarios, lista de comentarios
3. **Rodape fixo**: input de comentario

**Logica do botao de play**: usa `useAudioPlayer` global. Verifica se a track atual corresponde a mesma gravacao (comparando `gravacaoId`, `inicioSermao`, `fimSermao`). Se ja esta tocando, pausa. Se e a mesma track pausada, retoma. Se nao, inicia nova track com `resumeFrom` do ultimo segundo salvo via `useEscutaTracker`.

**Queries**: `gravacoes.queries.getById`

### `/gravacoes/[id]/admin` — Administracao

**Arquivo**: `app/(ready)/gravacoes/[id]/admin/page.tsx`

Pagina administrativa para gestao completa da gravacao. Requer permissao `gravacoes:update` ou `gravacoes:process_ai`.

**Header**: titulo, badge de status IA (`IaStatusBadge`), botao de processar IA (`IaProcessarButton`), botoes publicar/despublicar, botao excluir.

**Painel de progresso IA** (`IaProgressPanel`): exibido quando `iaStatus` nao e `null` e nem `CONCLUIDO`. Mostra steps visuais com barra de progresso.

**Tabs**:

| Tab            | Conteudo                                               |
|----------------|---------------------------------------------------------|
| **Dados**      | `DadosEditor` — formulario completo de edicao          |
| **Avisos**     | `AvisosEditor` — CRUD inline dos avisos                |
| **Resultado IA** | `IaResultadoDisplay` — resultado da analise          |
| **Trechos**    | `SegmentEditor` — ajuste de timestamps                 |
| **Audio completo** | Player do audio completo (sem restricao de trecho) |

**DadosEditor**: formulario com campos titulo, tipo (select), data, pregador, texto base, descricao (textarea), resumo (textarea), tags (separadas por virgula). Salva via `gravacoes.mutations.update`.

**AvisosEditor**: lista de avisos editaveis com titulo e descricao. Permite adicionar e remover avisos. Salva via `gravacoes.mutations.update` (campo `iaAvisos`).

**Mutations**: `gravacoes.mutations.update`, `gravacoes.mutations.publish`, `gravacoes.mutations.remove`

---

## Pipeline de IA

O pipeline de processamento e o cerne do modulo. Transforma audio bruto em conteudo estruturado.

### Fluxo completo

```
                   Upload de audio                  YouTube URL
                        |                               |
                        v                               v
               createFromAudio()               createFromYouTube()
                        |                               |
                        |                    downloadYouTubeAudio()
                        |                     [Innertube → B2]
                        |                               |
                        +----------- PENDENTE ----------+
                                        |
                                        v
                              processSermon()
                                        |
                            TRANSCREVENDO (Deepgram)
                                        |
                                        v
                              ANALISANDO (Claude/LLM)
                                        |
                          +---------+-------+--------+
                          |         |       |        |
                      CONCLUIDO  (auto-fill campos)  ERRO
```

### Etapas detalhadas

#### 1. Criacao da gravacao

Tres formas de criar:

- **`ai.createFromAudio`**: recebe `audioUrl` ja no B2. Cria gravacao com titulo "Processando..." e dispara `processSermon` via scheduler.
- **`ai.createFromYouTube`**: recebe URL do YouTube. Cria gravacao com titulo "Importando do YouTube..." e dispara `downloadYouTubeAudio` via scheduler.
- **`mutations.create`**: criacao manual sem processamento automatico.

#### 2. Download do YouTube (`youtubeAction.ts`)

Usa a biblioteca `youtubei.js` (Innertube) para acessar a API interna do YouTube. Etapas:

1. Extrai video ID da URL (suporta `youtube.com/watch`, `youtu.be`, `youtube.com/live`, `youtube.com/embed`)
2. Obttem info do video e seleciona stream de audio (best quality)
3. Baixa stream em buffer
4. Faz upload para B2 via S3 SDK (`PutObjectCommand`)
5. Salva `audioUrl` e `titulo` (do video) na gravacao
6. Dispara `processSermon` via scheduler

#### 3. Transcricao (`aiAction.ts` — Step 1)

Usa **Deepgram** (modelo `nova-2`, idioma `pt-BR`) com `smart_format`, `punctuate` e `paragraphs` ativados.

1. Baixa audio do B2 via `fetchB2File()`
2. Envia buffer para Deepgram
3. Extrai transcricao com timestamps por paragrafo no formato `[MM:SS] texto do paragrafo`
4. Salva transcricao plana no campo `iaTranscricao` (mesmo se o proximo passo falhar)

A versao com timestamps e enviada para a analise da IA — a versao plana e salva para exibicao.

#### 4. Analise teologica (`aiAction.ts` — Step 2)

Envia a transcricao com timestamps para um LLM (via `createLlmProvider()`) com um prompt detalhado que solicita:

| Campo do resultado       | Descricao                                                   |
|--------------------------|-------------------------------------------------------------|
| `tituloSugerido`         | Titulo conciso (max 80 chars)                               |
| `pregadorIdentificado`   | Nome do pregador se identificavel                           |
| `temaCentral`            | `{titulo, passagemBiblica}`                                 |
| `pontosChave`            | 3-5 pontos principais                                       |
| `aplicacaoPratica`       | 2-4 aplicacoes praticas                                     |
| `momentoInteracao`       | Momento marcante de interacao com a congregacao             |
| `fraseChave`             | Frase mais impactante (citacao direta)                      |
| `resumo`                 | Resumo em 2-4 paragrafos                                    |
| `descricao`              | Descricao curta (max 2 frases)                              |
| `frasesRedesSociais`     | 14 frases para posts                                        |
| `descricoesInstagram`    | 14 descricoes para Instagram (com hashtags e CTA)           |
| `tags`                   | 3-8 tags de categorizacao                                   |
| `inicioSermao`           | Segundo de inicio do sermao                                 |
| `fimSermao`              | Segundo de fim do sermao (apos momento de interacao)        |
| `inicioAvisos`           | Segundo de inicio dos avisos                                |
| `fimAvisos`              | Segundo de fim dos avisos                                   |
| `avisos`                 | Array de `{titulo, descricao}` para cada aviso individual   |

O prompt e especifico para o contexto **reformado/presbiteriano** e inclui regras detalhadas sobre o que considerar como inicio e fim do sermao (inclui saudacao e leitura biblica, exclui avisos e bencao).

#### 5. Auto-fill

Apos analise bem-sucedida, os campos da gravacao sao preenchidos automaticamente:

- `titulo` ← `tituloSugerido`
- `pregadorNome` ← `pregadorIdentificado`
- `textoBase` ← `temaCentral.passagemBiblica`
- `resumo`, `descricao`, `tags` ← direto do resultado
- `inicioSermao`, `fimSermao`, `inicioAvisos`, `fimAvisos` ← timestamps
- `iaAvisos` ← avisos estruturados

#### 6. Status da IA

| Status          | Descricao                                            |
|-----------------|------------------------------------------------------|
| `PENDENTE`      | Processamento agendado, aguardando inicio            |
| `BAIXANDO`      | Baixando audio do YouTube                            |
| `TRANSCREVENDO` | Deepgram processando o audio                         |
| `ANALISANDO`    | LLM analisando a transcricao                         |
| `CONCLUIDO`     | Processamento completo                               |
| `ERRO`          | Falha em alguma etapa                                |

#### 7. Retry inteligente

A mutation `startProcessing` aceita um parametro `retryFrom`:

- **`"BAIXANDO"`**: re-baixa do YouTube e refaz todo o pipeline
- **`"TRANSCREVENDO"`**: re-transcreve e re-analisa (descarta transcricao anterior)
- **`"ANALISANDO"`**: reutiliza a transcricao existente (`skipTranscription`) e refaz apenas a analise com LLM

O `IaProgressPanel` detecta automaticamente qual etapa falhou com base nos dados disponveis (`iaTranscricao` existe? `audioUrl` existe?) e oferece botao de retry contextual.

### Componentes de IA (frontend)

#### `IaProcessarButton`

Botao para iniciar/reprocessar IA. Tres estados:

- **Sem processamento**: botao "Processar com IA" (sparkles icon)
- **Processando**: botao desabilitado "Processando..." com spinner
- **Apos conclusao/erro**: botao "Reprocessar com IA" ou "Tentar novamente"

Exibe `AlertDialog` de confirmacao antes de processar.

#### `IaStatusBadge`

Badge colorido com o status atual:

- `PENDENTE`, `BAIXANDO`, `TRANSCREVENDO`, `ANALISANDO`: variant `secondary` com spinner
- `CONCLUIDO`: variant `default`
- `ERRO`: variant `destructive` com tooltip mostrando `iaErro`

#### `IaProgressPanel`

Painel visual de progresso exibido enquanto o processamento esta ativo ou em erro. Funcionalidades:

- **Barra de progresso**: percentual baseado na etapa atual
- **Checklist de etapas**: icone de check (concluido), spinner (ativo), circulo vazio (pendente)
- **Adaptativo ao YouTube**: se `youtubeUrl` existe, mostra etapa extra "Baixando audio do YouTube"
- **Estado de erro**: mostra etapas concluidas, etapa que falhou (com AlertCircle), mensagem de erro, e botao "Tentar novamente" contextual

#### `IaResultadoDisplay`

Exibicao rica do resultado da analise em tabs:

| Tab            | Conteudo                                                      |
|----------------|---------------------------------------------------------------|
| **Resumo**     | Tema central (com badge da passagem), pontos-chave, aplicacao pratica, momento de interacao, frase-chave (blockquote) |
| **Frases**     | 14 frases para redes sociais com botao copiar individual + "Copiar todos" |
| **Instagram**  | 14 descricoes para Instagram com botao copiar                 |
| **Transcricao**| Transcricao completa em collapsible (preview de 500 chars)    |

Cada secao tem botao `CopyButton` para copiar para clipboard.

---

## Player de audio global

Sistema de audio centralizado que persiste enquanto o usuario navega entre paginas. Implementado como Context + Provider com `<audio>` HTML oculto.

### Arquitetura

```
AudioPlayerProvider (Context)
    ├── <audio> hidden element
    ├── GainNode (Web Audio API — volume boost ate 2x)
    ├── Heartbeat integrado (escutas tracking)
    └── GlobalAudioPlayer (UI)
```

### `AudioPlayerProvider` (`shared/audio/AudioPlayerProvider.tsx`)

Provider que gerencia todo o estado do audio. Usa um `<audio>` HTML escondido como engine.

**Interface `AudioTrack`**:

| Campo          | Tipo                 | Descricao                              |
|----------------|----------------------|----------------------------------------|
| `url`          | `string`             | URL do audio (convertida para CDN)     |
| `title`        | `string`             | Titulo para exibicao                   |
| `artist`       | `string?`            | Nome do pregador                       |
| `gravacaoId`   | `Id<gravacoes>?`     | ID para tracking de escuta             |
| `inicioSermao` | `number?`            | Inicio do segmento em segundos         |
| `fimSermao`    | `number?`            | Fim do segmento em segundos            |
| `resumeFrom`   | `number?`            | Posicao para retomar de onde parou     |

**Estado exposto**:

| Campo             | Descricao                                              |
|-------------------|---------------------------------------------------------|
| `track`           | Track atual (null se nenhuma)                          |
| `isPlaying`       | Se esta tocando                                        |
| `isActive`        | Se ha uma track carregada (track != null)              |
| `relativeTime`    | Tempo relativo ao segmento (nao ao audio completo)     |
| `segmentDuration` | Duracao do segmento (ou do audio todo se sem segmento) |
| `volume`          | Volume atual (0 a maxVolume)                           |
| `maxVolume`       | 1 (sem GainNode) ou 2 (com GainNode)                  |
| `duration`        | Duracao total do audio                                 |

**Acoes**:

| Acao               | Descricao                                             |
|--------------------|-------------------------------------------------------|
| `play(track)`      | Inicia nova track (ou retoma se mesma track pausada)  |
| `pause()`          | Pausa                                                 |
| `resume()`         | Retoma                                                |
| `togglePlayPause()`| Alterna play/pause                                    |
| `seek(relative)`   | Seek para posicao relativa ao segmento                |
| `seekRelative(d)`  | Avanca/retrocede delta segundos                       |
| `setVolume(v)`     | Ajusta volume (0-maxVolume)                           |
| `close()`          | Fecha player, limpa tudo                              |

**Restricao de segmento**: quando `inicioSermao` esta definido, o player:

- No `loadedMetadata`: posiciona no `resumeFrom` (se valido) ou no `inicioSermao`
- No `timeUpdate`: impede seek antes do `inicioSermao` e pausa automaticamente ao atingir `fimSermao`
- No `togglePlayPause`: se o audio ja acabou (currentTime >= fimSermao), reinicia do inicio do segmento

**GainNode (Web Audio API)**: permite amplificar o volume acima de 100% (ate 200%). Inicializado na primeira interacao do usuario. Requer `crossOrigin = "anonymous"` no elemento `<audio>`. Se falhar (CORS), fallback para volume nativo.

**Heartbeat integrado**: a cada 15 segundos de playback, envia `escutas.heartbeat` para registrar progresso de escuta. Reseta o timer quando troca de track.

**CDN URL**: todas as URLs de audio sao convertidas para CDN (`https://cdn.yhc.com.br/`) via `toCdnUrl()` antes de carregar no `<audio>`.

### `GlobalAudioPlayer` (`shared/audio/GlobalAudioPlayer.tsx`)

Componente de UI do player. Fixo no rodape da aplicacao. Responsivo:

**Desktop** (barra compacta):
- Titulo + artista, botao play/pause, slider de progresso com tempos, slider de volume

**Mobile**:
- **Colapsado**: barra de progresso fina no topo, titulo (tap para expandir), botao expand, botao play/pause, botao fechar
- **Expandido**: artista, slider de progresso com tempos, controles (skip back -10s, play/pause, skip forward +30s)

**Animacao**: slide-up ao montar, slide-down ao fechar (com timeout de 200ms para completar animacao antes de destruir).

### `useAudioPlayer` (`shared/audio/useAudioPlayer.ts`)

Hook simples que consome o `AudioPlayerContext`. Lanca erro se usado fora do Provider.

### `useMediaSession` (`shared/audio/useMediaSession.ts`)

Hook que integra com a Media Session API do navegador para controles de midia nativos (lock screen, notificacoes de midia, etc.).

Funcionalidades:
- **Metadata**: define titulo e artista na sessao
- **Playback state**: atualiza `playing`/`paused`
- **Action handlers**: play, pause, seekbackward (-10s), seekforward (+30s), stop
- **Position state**: atualiza posicao e duracao para a barra de progresso nativa

### `utils.ts` (`shared/audio/utils.ts`)

Duas utilidades:

- **`toCdnUrl(url)`**: converte URL de B2 (`/file/bucket/key`) para CDN (`https://cdn.yhc.com.br/key`)
- **`formatTime(seconds)`**: formata segundos para `MM:SS` ou `H:MM:SS`

---

## Comentarios

Sistema de comentarios threaded (com respostas) nas gravacoes.

### Backend (`convex/gravacoes/comentarios.ts`)

**`listByGravacao(gravacaoId)`**: retorna todos os comentarios de uma gravacao, enriquecidos com `autorNome` (resolvido via membro → entidade).

**`create(gravacaoId, texto, parentId?)`**: cria comentario. Requer autenticacao. `parentId` opcional para respostas. `texto` e trimmed.

**`remove(id)`**: exclui comentario. Apenas o autor ou admin pode excluir. Ao excluir um comentario pai, remove tambem todas as respostas (`by_parent` index).

### Frontend

**`ComentarioInput`** — input de texto no rodape fixo da pagina de detalhe. Enter para enviar. Callback `onCreated` com o ID do novo comentario.

**`ComentariosList`** — lista de comentarios. Separa comentarios top-level e respostas. Top-level ordenados por `createdAt` crescente. Respostas agrupadas por `parentId` em um `repliesMap`.

**`ComentarioItem`** — um comentario individual com:
- Avatar com inicial do nome
- Nome (com `MembroProfilePopover` para ver perfil ao clicar)
- Tempo relativo ("ha 3 horas")
- Texto
- Botao "Responder" (abre input inline)
- Botao "Excluir" (visivel apenas para autor ou admin)
- Respostas renderizadas indentadas com borda lateral

**Highlight de novo comentario**: quando o usuario cria um comentario, o ID e passado como `highlightId`. O comentario recebe background azul temporario (1s de transicao, removido apos 2s).

**`Comentarios`** — componente legado (`@deprecated`) que combina `ComentarioInput` + `ComentariosList`. Mantido para retrocompatibilidade.

---

## Reacoes

Sistema de reacoes com emoji tipo toggle (like/unlike).

### Backend (`convex/gravacoes/comentarios.ts`)

**`listReacoes(gravacaoId)`**: retorna array de `{tipo, count, mine}` — agrupado por tipo, com flag indicando se o usuario atual reagiu.

**`toggleReacao(gravacaoId, tipo)`**: toggle de reacao. Se ja existe reacao do usuario com esse tipo, remove. Senao, cria. Retorna `{action: "removed" | "added"}`.

### Frontend (`Reacoes`)

Renderiza 5 botoes de emoji: `["❤️", "🙏", "🔥", "👏", "💡"]`

Cada botao:
- Mostra emoji + contagem (se > 0)
- Estilo diferenciado quando o usuario ja reagiu (`mine === true`): borda e fundo azul
- Click dispara `toggleReacao`

---

## Rastreamento de escutas

Sistema de tracking que registra o progresso de escuta de cada membro, permitindo retomar de onde parou e saber quem ouviu o que.

### Backend

#### `escutasHelpers.ts` (funcoes puras)

- **`calcProgress(currentTime, duration)`**: calcula percentual de progresso (0-100)
- **`isComplete(progresso)`**: retorna `true` se progresso >= 90%
- **`mergeHeartbeat(existing, newProgresso, newCurrentTime)`**: merge de heartbeat — progresso e posicao so avancam (nunca regridem). Uma vez `completou = true`, nunca volta a `false`.

#### `escutas.ts` (mutations/queries)

**`heartbeat(gravacaoId, currentTime, duration)`**: upsert de escuta. Se nao existe, cria registro. Se ja existe, faz merge. Chamado a cada 15 segundos pelo `AudioPlayerProvider` e pelo `useEscutaTracker`.

**`getMyProgress(gravacaoId)`**: retorna o registro de escuta do usuario atual para uma gravacao.

**`listByGravacao(gravacaoId)`**: lista todos os ouvintes de uma gravacao (enriquecido com nome e foto).

**`listByMembro(membroId?)`**: lista todas as escutas de um membro (enriquecido com titulo da gravacao).

### Frontend (`useEscutaTracker`)

Hook que expoe:

| Retorno         | Descricao                                      |
|-----------------|-------------------------------------------------|
| `onTimeUpdate`  | Callback para enviar heartbeat (throttled 15s)  |
| `ultimoSegundo` | Ultimo segundo ouvido (para "retomar de onde parou") |
| `completou`     | Se o membro completou >= 90% da escuta         |

O `onTimeUpdate` usa `useRef` para throttling — so envia se passaram >= 15 segundos desde o ultimo envio. Erros sao silenciosos (non-critical).

Na pagina de detalhe, `ultimoSegundo` e passado como `resumeFrom` ao iniciar o play, permitindo que o membro retome exatamente de onde parou.

---

## Filtro por livro da Biblia

### Dados (`features/gravacoes/lib/bible.ts`)

Constante `BIBLE` com a estrutura completa da Biblia:

```
BIBLE: BibleTestament[]
  └── sections: BibleSection[]
       └── books: BibleBook[]
            ├── name: string      (ex: "Romanos")
            ├── abbr: string      (ex: "Rm")
            └── aliases: string[] (ex: ["romanos", "rm"])
```

Organizado em dois testamentos (AT, NT) com secoes (Pentateuco, Historicos, Poeticos, Profetas Maiores, Profetas Menores, Evangelhos, Historico, Cartas Paulinas, Cartas Gerais, Profetico).

**Lookup table**: `ALIAS_LOOKUP` — array flat de `{alias, bookName}` ordenado por tamanho de alias decrescente para evitar matches parciais.

**`extractBookName(textoBase)`**: extrai o nome do livro a partir do campo `textoBase` da gravacao. Normaliza para lowercase, percorre a lookup table, verifica que o alias e seguido por espaco, digito, `:`, `;` ou fim da string. Retorna o nome canonico (ex: "Salmos" para input "Sl 23").

**`getAllBooks()`**: retorna array flat de todos os livros.

### Componente (`BibleBookFilter`)

Popover com visualizacao heatmap de todos os 66 livros da Biblia.

**Funcionamento**:

1. Recebe array de gravacoes publicadas
2. Conta quantas gravacoes referenciam cada livro (via `extractBookName`)
3. Renderiza grid de botoes por secao, divididos em AT e NT
4. **Heatmap**: cor proporcional a contagem relativa ao maximo:
   - 0: cinza apagado, cursor default
   - < 30%: primary/15
   - 30-70%: primary/30
   - >= 70%: primary/50
5. Livro selecionado: anel primario com ring-2
6. **Tooltip**: nome completo + contagem ao hover
7. **Legenda**: "Nenhum", "Poucos", "Alguns", "Muitos"
8. Botao de limpar filtro

O botao trigger muda de `variant="outline"` para `variant="default"` quando um livro esta selecionado, e mostra o nome do livro com `X` para limpar.

---

## Editor de segmentos

### `SegmentEditor` (`features/gravacoes/components/SegmentEditor.tsx`)

Ferramenta administrativa para ajuste fino dos timestamps de inicio/fim do sermao e avisos.

**Interface**:

1. **Player de referencia**: elemento `<audio>` proprio (nao usa o global) com slider, play/pause e display de tempo. Permite navegar livremente pelo audio completo para encontrar os pontos exatos.
2. **4 campos de timestamp** (formato `HH:MM:SS`):
   - Inicio do sermao
   - Fim do sermao
   - Inicio dos avisos
   - Fim dos avisos
3. **Botao de captura**: cada campo tem um botao que preenche o valor com a posicao atual do player de referencia
4. **Botao salvar**: persiste via `gravacoes.mutations.update`

**Conversao de tempo**:
- `secondsToHHMMSS(seconds)`: converte segundos para string `HH:MM:SS`
- `hhmmssToSeconds(value)`: converte string para segundos (aceita `HH:MM:SS`, `MM:SS` ou numero direto)

Ao iniciar o play no editor, o player global e pausado (`globalPlayer.pause()`) para evitar dois audios simultaneos.

---

## Avisos do culto

### `AvisosSection` (`features/gravacoes/components/AvisosSection.tsx`)

Secao de avisos na pagina de detalhe. Renderiza lista de avisos (`titulo` + `descricao`) em um Card com icone de megafone.

Se `inicioAvisos` esta definido, exibe botao "Ouvir avisos" que toca o trecho de avisos no player global (usando `inicioSermao` = `inicioAvisos` e `fimSermao` = `fimAvisos` para restringir o seek).

### `AvisosWidget` (`features/gravacoes/components/AvisosWidget.tsx`)

Widget usado na dashboard/home. Mostra os avisos do ultimo domingo.

**Query**: `gravacoes.queries.getLatestAvisos` — busca a gravacao do ultimo domingo com `iaStatus === "CONCLUIDO"` e `iaAvisos` preenchidos (independente do status de publicacao).

Exibe:
- Titulo "Avisos da semana" com icone megafone
- Botao pill "Ouvir avisos" (se `audioUrl` e `inicioAvisos` disponiveis)
- Link para a gravacao com data formatada
- Lista de avisos (titulo + descricao)

---

## Frases (carrossel)

### `FrasesCarrossel` (`features/gravacoes/components/FrasesCarrossel.tsx`)

Widget para a dashboard que exibe uma frase aleatoria extraida das gravacoes processadas pela IA.

**Query**: `gravacoes.queries.listFrases` — coleta `fraseChave` e `frasesRedesSociais` de todas as gravacoes publicadas e concluidas.

**Logica de selecao**: escolhe uma frase aleatoria do array completo (`Math.random()`). Memorizado com `useMemo` para nao trocar a cada re-render.

**UI**:
- Card com background `primary/5` e borda `primary/10`
- Icone de aspas
- Frase em italico
- Autor (pregador) e titulo da gravacao
- Botao "Ouvir pregacao" linkando para a pagina de detalhe

---

## Series de gravacoes

### Backend (`convex/gravacoes/series.ts`)

CRUD simples:
- **`list()`**: retorna todas as series
- **`create(nome, descricao?)`**: cria nova serie (requer autenticacao)

Series sao referenciadas pelo campo `serieId` nas gravacoes e exibidas como badge violeta nos cards da listagem.

---

## Permissoes (RBAC)

| Permissao              | Descricao                        |
|------------------------|----------------------------------|
| `gravacoes:update`     | Editar dados, publicar/despublicar, ajustar timestamps |
| `gravacoes:process_ai` | Iniciar/reprocessar pipeline de IA |
| `gravacoes:delete`     | Excluir gravacao                  |

A pagina de admin verifica `gravacoes:update` ou `gravacoes:process_ai`. Botoes individuais sao protegidos com `PermissionGate`.

A mutation `startProcessing` verifica permissao diretamente no backend (admin role, permissao explicita no membro, ou permissao do role).

---

## Arquivos-chave

### Frontend — Paginas

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/gravacoes/page.tsx` | Listagem de gravacoes |
| `app/(ready)/gravacoes/[id]/page.tsx` | Detalhe da gravacao |
| `app/(ready)/gravacoes/[id]/admin/page.tsx` | Administracao da gravacao |

### Frontend — Componentes

| Arquivo | Descricao |
|---------|-----------|
| `features/gravacoes/components/AvisosSection.tsx` | Secao de avisos no detalhe |
| `features/gravacoes/components/AvisosWidget.tsx` | Widget de avisos na dashboard |
| `features/gravacoes/components/BibleBookFilter.tsx` | Filtro heatmap por livro biblico |
| `features/gravacoes/components/Comentarios.tsx` | Sistema de comentarios threaded |
| `features/gravacoes/components/Reacoes.tsx` | Reacoes com emoji |
| `features/gravacoes/components/SegmentEditor.tsx` | Editor de timestamps de trechos |
| `features/gravacoes/components/IaProcessarButton.tsx` | Botao processar/reprocessar IA |
| `features/gravacoes/components/IaStatusBadge.tsx` | Badge de status da IA |
| `features/gravacoes/components/IaProgressPanel.tsx` | Painel de progresso com retry |
| `features/gravacoes/components/IaResultadoDisplay.tsx` | Exibicao dos resultados da IA |
| `features/gravacoes/components/FrasesCarrossel.tsx` | Frase aleatoria para dashboard |

### Frontend — Hooks

| Arquivo | Descricao |
|---------|-----------|
| `features/gravacoes/hooks/useEscutaTracker.ts` | Rastreamento de escuta com heartbeat |

### Frontend — Lib

| Arquivo | Descricao |
|---------|-----------|
| `features/gravacoes/lib/bible.ts` | Dados biblicos e funcao `extractBookName` |
| `features/gravacoes/lib/constants.ts` | Opcoes de tipo e status |

### Frontend — Audio (shared)

| Arquivo | Descricao |
|---------|-----------|
| `shared/audio/AudioPlayerProvider.tsx` | Provider central de audio |
| `shared/audio/GlobalAudioPlayer.tsx` | UI do player global |
| `shared/audio/useAudioPlayer.ts` | Hook para consumir o player |
| `shared/audio/useMediaSession.ts` | Integracao com Media Session API |
| `shared/audio/utils.ts` | `toCdnUrl` e `formatTime` |

### Backend

| Arquivo | Descricao |
|---------|-----------|
| `convex/gravacoes/queries.ts` | Queries: list, getById, getLatestAvisos, listFrases, listTags |
| `convex/gravacoes/mutations.ts` | Mutations: create, update, publish, remove |
| `convex/gravacoes/comentarios.ts` | Comentarios + reacoes |
| `convex/gravacoes/escutas.ts` | Tracking de escutas |
| `convex/gravacoes/escutasHelpers.ts` | Funcoes puras de calculo de progresso |
| `convex/gravacoes/ai.ts` | Mutations de IA: createFromAudio, createFromYouTube, startProcessing, updateIaStatus |
| `convex/gravacoes/aiAction.ts` | Action de processamento: Deepgram + LLM |
| `convex/gravacoes/youtubeAction.ts` | Action de download do YouTube |
| `convex/gravacoes/series.ts` | CRUD de series |
