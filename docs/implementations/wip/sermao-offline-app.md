# Sermão offline dentro do app

## Escopo
O membro marca um sermão como "Disponível offline" e consegue ouvi-lo **dentro do
app, sem internet** (metrô), com a tela bloqueada, e escolher a **velocidade de
reprodução** (1×–2×). O áudio é guardado apenas no storage interno do navegador
(IndexedDB), sem botão de download e sem URL nova. Sem feed de podcast.

## Decisões fixadas
**24/08/2026**
- Ouvir **dentro do app**, não baixar arquivo, não podcast.
- Conteúdo offline = **trecho do sermão** (`inicioConteudo/fimConteudo` ou
  `inicioSermao/fimSermao`), não o culto inteiro.
- Acesso só para quem tem `gravacoes:read`.
- "Não baixável" = sem botão, sem URL estável, blob só em IndexedDB. Não é DRM.

**25/08/2026**
- **Bucket privado sai do caminho crítico.** Ele só faz sentido se as rotas
  públicas (`/g/`, `/convidado/`) forem fechadas; enquanto o culto inteiro
  seguir público no CDN, mover só o cortado para bucket privado não protege
  nada. Fica como etapa opcional, condicionada a essa decisão.
- Trecho do sermão obtido por **`Range` no CDN atual** (MP3 CBR), sem corte
  físico nem ffmpeg. Importações do YouTube (AAC/webm) caem no arquivo inteiro.
- Incluir **velocidade de reprodução** no player (online e offline).

## Diagnóstico (estado atual)
- O culto inteiro está no bucket **aberto** (`ipc-files` → `cdn.yhc.com.br`,
  cache 1 ano) — `convex/files/urls.ts:17-31`. A restrição de trecho é só JS no
  player (`shared/audio/AudioPlayerProvider.tsx:113-183`); `#t=` (Media Fragment)
  não é usado em lugar nenhum.
- CDN aceita `fetch` cross-origin do browser (`features/gravacoes/hooks/useWaveformPeaks.ts:66`
  baixa o MP3 inteiro com progresso) e o player usa `crossOrigin="anonymous"`
  (`AudioPlayerProvider.tsx:220`).
- Formato: upload manual/público = MP3 CBR mono 64k (32k se >1h) gerado por
  FFmpeg.wasm no browser (`shared/files/hooks/useAudioCompressor.ts:60-79`).
  YouTube = AAC/webm sem recompressão (`convex/gravacoes/youtubeAction.ts:64-91`).
- Dois players duplicam `toCdnUrl` e a lógica de segmento: `AudioPlayerProvider`
  (área logada) e `shared/files/components/SecureAudioPlayer.tsx` (rotas públicas
  e quiosque).
- Sem `playbackRate`: `useMediaSession.ts:61` fixa `playbackRate: 1`;
  `GlobalAudioPlayer.tsx` tem só play/pause, seek e volume.
- Nenhum uso de IndexedDB/Cache API/localStorage no app.
- PWA: `manifest.json` ok; `public/sw.js` só trata push e só é registrado se o
  usuário aceita notificações; sem Workbox/Serwist (dívida #27).
  `next.config.ts:27-47` manda `Cache-Control: no-cache` para tudo.
- App inteiro depende de Convex reativo + Convex Auth; offline, o `AuthGuard`
  (`shared/components/auth/AuthGuard.tsx:26-28`) fica em spinner.
- Progresso de escuta é server-only (`escutasGravacao`, heartbeat 15s).
- `useMediaSession` já cuida de lockscreen/ações de mídia.

## Arquitetura

### 1. Fase 0 — "Guardar para o metrô" (~1-2 dias, sem infra nova)
- Botão "Guardar para ouvir offline" na tela da gravação (`/gravacoes/[id]`)
  e na lista. Estados: ocioso → baixando → pronto → (remover) / erro.
- **Progresso em tempo real, animação sutil** (decisão 25/08):
  - O próprio botão vira o indicador: ícone de download com **anel circular
    SVG** (`stroke-dasharray`/`stroke-dashoffset`) que se preenche conforme os
    bytes chegam. Sem barra separada, sem modal — não sai do lugar.
  - Fonte do progresso: `ReadableStream` do `fetch` (`bytesRecebidos /
    Content-Length`, padrão de `useWaveformPeaks.ts:66-100`). Com `Range`, o
    total é o `Content-Length` da resposta `206`; sem `Content-Length`, cair em
    anel indeterminado (giro lento).
  - Suavizar com `motion` (já no projeto, `motion@12`): `animate` do
    `dashoffset` com `transition: { ease: "linear", duration: 0.25 }` para o
    anel não "pular" entre chunks. Atualizar o estado no máximo a cada 100 ms
    (throttle), para não re-renderizar por chunk.
  - Texto: `%` pequeno ao lado só no desktop; no mobile o anel basta, com
    `aria-label="Baixando, 43%"` (`aria-valuenow` num `role="progressbar"`).
  - Ao completar: anel fecha, ícone troca para "check" com fade curto
    (~300 ms); `toast` do Sonner discreto ("Disponível offline · 18 MB").
    Erro: anel some, ícone volta, toast de erro com "Tentar de novo".
  - Respeitar `prefers-reduced-motion`: sem transição, só o valor.
  - Se o usuário navegar para outra tela, o download continua (estado no
    `useSermaoOffline`, que vive no provider global) e o anel reaparece ao voltar.
- **Download só do trecho** via `fetch` com `Range: bytes=<ini>-<fim>` no CDN.
  Cálculo: `bytesPorSegundo = contentLength / duracao` (obtida por `HEAD` +
  `duracao` já salva na gravação, ou do `<audio>` na primeira escuta). MP3 CBR
  tolera início em byte arbitrário (o decoder ressincroniza em ≤1 frame, ~26 ms).
  Arredondar `ini` 1 s para trás e `fim` 1 s para frente. Se o arquivo não for
  MP3 (`Content-Type` ≠ `audio/mpeg` ou key sem `.mp3`) → baixar inteiro.
- Cloudflare responde `206` com `Range` para objetos cacheados; verificar em
  prod com `curl -r 0-1023 -I`. Se vier `200` completo, cair para download
  inteiro (não quebra, só gasta mais).
- Grava em IndexedDB (`idb`), store `sermoesOffline`: `{ gravacaoId, titulo,
  pregadorNome, data, offsetSegundos, duracao, bytes, blob, baixadoEm }`.
  `offsetSegundos` = segundo do culto onde o blob começa (para mapear
  `inicioConteudo/fimConteudo` para dentro do blob).
- **Reprodução**: `URL.createObjectURL(blob)` no mesmo `<audio>` do player
  global; segmento passa a ser relativo ao `offsetSegundos`. Blob URL não tem
  CORS: o workaround que desliga o GainNode no mobile
  (`AudioPlayerProvider.tsx:90-92`) não se aplica. `useMediaSession` mantém
  lockscreen.
- Escopo = **só o player global** (área logada). `SecureAudioPlayer` (rotas
  públicas, quiosque) fica de fora; consolidar os dois depois.
- `navigator.storage.persist()` ao guardar o primeiro item.
- Retenção: apagar automaticamente após 7 dias ou manter últimos N (a definir).
- Heartbeat: se offline, guarda `ultimoSegundo` no IDB (`heartbeatsPendentes`)
  e reenvia no evento `online` (`escutas.heartbeat` já faz upsert).

**Limitação assumida**: sem service worker, abrir o app *do zero* sem rede não
carrega (spinner). Funciona quando o app já está aberto/em segundo plano ao
entrar no metrô, ou reaberto com rede fraca (a página carrega devagar, mas o
áudio vem do IDB na hora). Abrir do zero sem rede é a etapa 3.

### 2. Velocidade de reprodução (~0,5 dia, entra junto da Fase 0)
- `AudioPlayerProvider`: estado `playbackRate` + ação `setPlaybackRate(r)`;
  aplica `audio.playbackRate = r` e `audio.preservesPitch = true` (padrão, mas
  explícito). Reaplicar ao trocar de faixa/fonte (blob ou CDN).
- Opções: 1×, 1.25×, 1.5×, 1.75×, 2×. Botão no `GlobalAudioPlayer` (desktop e
  mobile) que cicla ou abre `DropdownMenu`; tap target ≥ 44 px no mobile.
- Persistir preferência em `localStorage` (`audio:playbackRate`) — é preferência
  de UI, não dado de negócio; não vai para o Convex.
- `useMediaSession.ts:61`: passar o `playbackRate` real em `setPositionState`
  (senão a lockscreen mostra posição errada).
- Heartbeat continua enviando `currentTime` do áudio (segundos do conteúdo),
  independente da velocidade.
- Testar em iOS Safari: `playbackRate` > 1 funciona, mas `preservesPitch` só a
  partir do iOS 15.

### 3. Biblioteca offline + auth offline (~2 dias)
- Rota `/gravacoes/offline` que lê **só do IDB** (não depende de Convex): lista
  os sermões guardados, toca, remove.
- `AuthGuard`: aceitar sessão em cache quando `navigator.onLine === false` para
  essa rota (ou tirá-la do gate). Ponto mais delicado do projeto.

### 4. App shell offline — Serwist (~2-3 dias)
Sem isso, abrir o app no metrô nem carrega a página.
- Adotar **Serwist** (App Router). Registrar sempre (não só no push); manter os
  handlers de push no SW gerado.
- Precache: `/gravacoes/offline` + chunks; `StaleWhileRevalidate` para
  `/_next/static`, `NetworkOnly` para Convex. Fallback offline → `/gravacoes/offline`.
- `next.config.ts`: manter `no-cache` para HTML (o SW precacheia explicitamente).
- Verificar compatibilidade Serwist × Next 16 antes de começar.

### 5. iOS (~1-2 dias)
- Safari apaga storage de site não usado por 7 dias, **exceto** se instalado na
  tela inicial. Mostrar orientação "Adicionar à Tela de Início" ao ativar offline.
- Testar em iPhone real: áudio em background com tela bloqueada, velocidade,
  retomada após o SO suspender o app.

### 6. Opcional — corte físico + bucket privado
Só se for decidido fechar `/g/` e `/convidado/` (e mover a ingestão do Deepgram
para URL assinada). Caso contrário, não implementar.
- Corte no browser do admin ao publicar (`ffmpeg -ss -to -c copy`, FFmpeg.wasm
  já carregado), upload em `gravacoes-sermao` (privado), campos `audioSermaoKey`,
  `audioSermaoBytes`, `audioSermaoDuracao`, `audioSermaoStatus`.
- `FOLDER_BUCKET["gravacoes-sermao"] = "privado"`, `FOLDER_READ_PERMISSIONS` =
  `gravacoes:read`, TTL curto; CORS + `Range` liberados no bucket privado.
- A camada IDB/player da Fase 0 não muda — só a origem do download.
- Pré-requisito de `podcast-privado.md`.

## Fase 0 — implementada (25/08/2026, branch `feature/sermao-offline-fase0`)
Entregue: `shared/offline/{db,rangeSermao,OfflineProvider}.ts(x)`,
`features/gravacoes/components/OfflineToggle.tsx`,
`shared/audio/VelocidadeButton.tsx`, e alterações em
`AudioPlayerProvider`, `GlobalAudioPlayer`, `useMediaSession`,
`app/(ready)/layout.tsx`, `app/(ready)/gravacoes/[id]/page.tsx`, `DevContext`.
10 testes novos em `shared/offline/__tests__/rangeSermao.test.ts`.

Decisões tomadas na implementação:
- **Duração total** não existe no schema de `gravacoes`: é obtida com um
  `<audio preload="metadata">` antes do download (poucos KB), e sem ela o
  download cai para o arquivo inteiro.
- **Toggle só na tela de detalhe**, não na lista — é onde o membro está quando
  decide guardar; evita 20 botões numa lista. Reavaliar depois.
- **Fallback se o blob não tocar**: `<audio onError>` troca para o CDN, e o
  arquivo local é descartado (`onErroFonte` → `invalidar`). Cobre o risco de o
  browser recusar um MP3 recortado sem header.
- **Range não testado com arquivo real**: as URLs do deployment de dev estão
  404 e o de prod é read-only aqui. O CORS do CDN já libera `Range`
  (`access-control-allow-headers: Range`). O código detecta em runtime: só
  trata como parcial se a resposta for `206`. **Validar em preview/prod.**
- **Economia mínima**: se o trecho passa de 85% do culto, baixa inteiro (o
  Range não compensa o risco).
- **Retenção**: 7 dias sem uso, aplicada na abertura do app; `usadoEm`
  atualizado ao tocar.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `gravacoes` | nenhuma (Fase 0–5). Etapa 6 opcional: `audioSermao*` |
| `escutasGravacao` | nenhuma (fila local só reenvia `heartbeat`) |

## Permissões
- Marcar offline / ouvir / velocidade: `gravacoes:read` (membro, ouvinte futuro).
- Nada novo no backend nas fases 0–5.

## Impacto em Shared
- [x] `shared/audio/AudioPlayerProvider.tsx` (fonte blob, offset, playbackRate,
  fila de heartbeat), `shared/audio/GlobalAudioPlayer.tsx` (botão de
  velocidade, toggle offline), `shared/audio/useMediaSession.ts` (playbackRate).
- [x] Etapa 3–4: `shared/components/auth/AuthGuard.tsx`, `public/sw.js`,
  `app/layout.tsx`, `next.config.ts`.
- [x] `DevContext.tsx` (rota nova).
- Não toca `convex/schema.ts`, `rbac*`, `FileUpload.tsx` (fases 0–5).
- Regressão: player global (todas as telas de gravação); push (SW substituído
  na etapa 4 — precisa de `skipWaiting`/`clientsClaim` e teste de atualização).

## Riscos
- **`Range` no Cloudflare**: se não devolver `206`, download vira o culto
  inteiro (~40 MB). Verificar antes; fallback previsto.
- **YouTube (AAC)**: sem `Range` confiável → arquivo inteiro. Aceitável.
- **iOS**: storage evictado em 7 dias se não instalado; SO pode matar app
  parado. Testar em aparelho real antes de anunciar.
- **Cota**: sermão ~20 MB; 10 sermões = 200 MB. Retenção obrigatória.
- **Culto inteiro continua público** no CDN — decisão consciente (25/08).
- Serwist + Next 16: verificar versão.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `shared/offline/db.ts` | Criar | IDB (`sermoesOffline`, `heartbeatsPendentes`) |
| `shared/offline/useSermaoOffline.ts` | Criar | baixar (Range/inteiro), progresso 0-100 com throttle, remover, estado; vive no provider global |
| `shared/offline/rangeSermao.ts` | Criar | cálculo de bytes por segundo + fallback |
| `features/gravacoes/components/OfflineToggle.tsx` | Criar | botão com anel de progresso (SVG + `motion`), estados ocioso/baixando/pronto/erro |
| `shared/audio/AudioPlayerProvider.tsx` | Modificar | fonte blob + offset; `playbackRate`; fila de heartbeat |
| `shared/audio/GlobalAudioPlayer.tsx` | Modificar | botão de velocidade (desktop + mobile) |
| `shared/audio/useMediaSession.ts` | Modificar | `playbackRate` real em `setPositionState` |
| `app/(ready)/gravacoes/[id]/page.tsx` | Modificar | `OfflineToggle` |
| `app/(ready)/gravacoes/offline/page.tsx` | Criar | biblioteca offline (só IDB) |
| `shared/components/auth/AuthGuard.tsx` | Modificar | sessão em cache offline para a rota |
| `app/sw.ts` + `next.config.ts` + `app/layout.tsx` | Criar/Modificar | Serwist, registro sempre, push preservado |
| `shared/components/layout/DevContext.tsx` | Modificar | nova página |
| `package.json` | Modificar | `idb`; depois `@serwist/next` |

## Ordem de Implementação
1. ~~**Fase 0 + velocidade**~~ — feito (25/08). Falta validar em iPhone e
   Android reais no metrô e confirmar o `206` do CDN em prod.
2. Biblioteca `/gravacoes/offline` + auth offline. ~2 dias.
3. Serwist (app shell) + preservação do push + teste de atualização. ~2-3 dias.
4. iOS: orientação "Adicionar à Tela de Início", `storage.persist`, testes. ~1-2 dias.
5. (Opcional) corte + bucket privado — só com decisão de fechar rotas públicas.

Total fases 1–4: ~1,5-2 semanas. Cada etapa em PR próprio, preview na Vercel.

## Perguntas em aberto
- Retenção offline: apagar após 7 dias / manter últimos N?
- Baixar automaticamente o sermão mais recente no Wi-Fi, ou só manual?
- Fechar `/g/` e `/convidado/` algum dia? (define se a etapa 5 existe)
- Velocidade: lembrar por aparelho (localStorage) basta, ou sincronizar por conta?

## Relacionado
- `podcast-privado.md` — depende da etapa opcional (corte + bucket privado).
