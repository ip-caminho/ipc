# Sermão offline dentro do app

## Escopo
O membro marca um sermão como "Disponível offline" e consegue ouvi-lo **dentro do
app, sem internet** (metrô), com a tela bloqueada. Guarda-se **só o trecho do
sermão** (não o culto inteiro). O áudio **não** é exposto como arquivo nem como
link compartilhável: fica num bucket privado, servido por URL assinada de curta
duração, e armazenado no aparelho apenas no storage interno do navegador
(IndexedDB), sem botão de download. Sem feed de podcast.

## Decisões fixadas (24/08/2026)
- Ouvir **dentro do app**, não baixar arquivo, não podcast.
- Conteúdo offline = **sermão cortado** (`inicioConteudo/fimConteudo` ou
  `inicioSermao/fimSermao`).
- Acesso só para quem tem `gravacoes:read`; nada de link público para o cortado.
- "Não baixável" = sem botão, sem URL estável, blob só em IndexedDB. Não é DRM:
  quem grava a saída de áudio ou inspeciona o navegador ainda extrai. O objetivo
  é impedir o compartilhamento casual por link.

## Diagnóstico (estado atual)
- O culto inteiro está no bucket **aberto** (`ipc-files` → `cdn.yhc.com.br`,
  cache 1 ano) — `convex/files/urls.ts:17-31`. A restrição de trecho é só JS no
  player (`shared/audio/AudioPlayerProvider.tsx`); não há corte físico.
- Infra de bucket privado + URL assinada já existe e é usada para fotos/documentos:
  `convex/files/signing.ts:32-46` (`generatePresignedReadUrl`), `convex/files/authz.ts:38`
  (`FOLDER_READ_PERMISSIONS`), `files/upload.ts:getReadUrl`. Basta um novo folder.
- Formato: upload manual/público = MP3 CBR mono 64k (32k se >1h) gerado por
  FFmpeg.wasm no browser (`shared/files/hooks/useAudioCompressor.ts:69-79`).
  YouTube = AAC/mp4 sem recompressão (`convex/gravacoes/youtubeAction.ts:65-86`).
- Convex actions não rodam ffmpeg (bundle esbuild, sem binário).
- PWA: `manifest.json` ok; `public/sw.js` só trata push e só é registrado se o
  usuário aceita notificações; sem Workbox/Serwist (dívida #27).
  `next.config.ts:27-47` manda `Cache-Control: no-cache` para tudo.
- App inteiro depende de Convex reativo + Convex Auth; offline, o `(ready)`
  layout ficaria em spinner (queries nunca resolvem).
- Progresso de escuta é server-only (`escutasGravacao`, heartbeat 15s).
- `useMediaSession` já cuida de lockscreen/ações de mídia.

## Arquitetura proposta

### 1. Corte físico do sermão → bucket privado
Gerar `gravacoes-sermao/<gravacaoId>.mp3` **uma vez**, ao publicar e ao editar
as bordas no `SegmentEditor`.

**Onde cortar — recomendado: no browser do admin, ao publicar.** O projeto já
carrega FFmpeg.wasm no browser para comprimir upload; o admin publica de desktop.
`ffmpeg -ss <ini> -to <fim> -i culto.mp3 -c copy sermao.mp3` (MP3: segundos,
sem re-encode; AAC do YouTube: re-encode para MP3 64k mono, ~1 min). Sobe via
presigned PUT no folder `gravacoes-sermao` (bucket **privado**). Nenhum servidor
novo, formato unificado (sempre MP3 CBR).

Alternativas descartadas:
- Corte por bytes no Convex (CBR ⇒ 8.000 B/s via `Range`): barato, mas só cobre
  MP3 CBR; falha no AAC do YouTube. Fica como otimização se o corte no browser
  incomodar.
- Rota Vercel com `ffmpeg-static`: funciona, mas adiciona um componente de
  servidor só para isso.

Campos novos em `gravacoes`: `audioSermaoKey` (key, não URL), `audioSermaoBytes`,
`audioSermaoDuracao`, `audioSermaoStatus: PENDENTE|PRONTO|ERRO`.

### 2. Servir o cortado com URL assinada (online)
- `FOLDER_BUCKET["gravacoes-sermao"] = "privado"`, `FOLDER_READ_PERMISSIONS` =
  `gravacoes:read`, TTL curto (ex.: 15 min — só o tempo de o browser buscar).
- Query `gravacoes.getSermaoAudioUrl(id)` → assina; o player global passa a tocar
  o cortado quando `audioSermaoStatus === "PRONTO"` (menor, sem avisos,
  restrito). Trecho "avisos" continua usando o culto completo.
- CORS do bucket privado precisa liberar `GET` + `Range` da origem do app
  (hoje só o aberto é lido pelo browser). Configurar no B2 (painel/CLI).
- Egress direto do B2 (sem Cloudflare): grátis até 3× o storage/mês, depois
  US$0,01/GB. Para ~20 MB × algumas centenas de escutas/mês é irrelevante.

### 3. Offline no aparelho
- **Armazenamento**: IndexedDB (`idb`), store `sermoesOffline` com `{ gravacaoId,
  titulo, pregadorNome, data, duracao, bytes, blob, baixadoEm }`. Blob em IDB
  funciona em Safari/Chrome/Firefox. Sem Cache Storage para o áudio: evita ter
  de implementar `Range` no service worker (Safari exige para `<audio>`).
- **Reprodução offline**: `URL.createObjectURL(blob)` no mesmo `<audio>` do
  player global. Sem `Range`, sem CORS, funciona em background com tela
  bloqueada via `useMediaSession`. GainNode fica desligado (já é assim no mobile).
- **Download**: `fetch` da URL assinada com progresso (padrão de
  `useWaveformPeaks.ts:66-100`), grava no IDB. Botão "Disponível offline" na
  tela da gravação e na lista (toggle com estado: baixando %/pronto/erro).
- **Biblioteca offline**: rota `/gravacoes/offline` que lê **só do IDB** (não
  depende de Convex) — lista os sermões guardados, toca, remove.
- **Progresso**: heartbeat vai para uma fila no IDB quando offline; ao evento
  `online`, envia o último `ultimoSegundo` por gravação (`escutas.heartbeat` já
  faz upsert).
- **Persistência**: `navigator.storage.persist()` no Android. No iOS o Safari
  apaga storage de site não usado por 7 dias — **exceto** se instalado na tela
  inicial. Mostrar orientação "Adicionar à Tela de Início" ao ativar offline.
- **Retenção**: remoção manual + regra simples (ex.: apagar após 30 dias ou
  manter últimos N) — a definir.

### 4. App shell offline (service worker)
Sem isso, abrir o app no metrô nem carrega a página.
- Adotar **Serwist** (sucessor do next-pwa; App Router). Registrar sempre (não
  só no push); manter os handlers de push no SW gerado.
- Precache: `/gravacoes/offline` + chunks; runtime `StaleWhileRevalidate` para
  `/_next/static`, `NetworkOnly` para Convex. Fallback offline → `/gravacoes/offline`.
- **Auth offline**: `/gravacoes/offline` precisa ficar fora do gate que espera
  Convex (ou o gate deve aceitar sessão em cache quando `navigator.onLine ===
  false`). Sem isso, spinner eterno. Ponto mais delicado do projeto.
- `next.config.ts`: manter `no-cache` para HTML é ok (o SW precacheia
  explicitamente), mas revisar para não invalidar chunks.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `gravacoes` | `audioSermaoKey?`, `audioSermaoBytes?`, `audioSermaoDuracao?`, `audioSermaoStatus?` |
| `escutasGravacao` | nenhuma (fila local só reenvia `heartbeat`) |

## Permissões
- Marcar offline / ouvir: `gravacoes:read` (membro, ouvinte futuro).
- Cortar (publicar/editar bordas): quem já publica (`gravacoes:update`).
- URL assinada do cortado: só autenticado com `gravacoes:read`; sem rota pública.

## Impacto em Shared
- [x] Arquivos sensíveis: `convex/schema.ts` (aditivo); `convex/files/urls.ts`,
  `authz.ts`, `signing.ts` (novo folder); `shared/audio/AudioPlayerProvider.tsx`
  (fonte blob + fila de heartbeat); `public/sw.js`/`app/layout.tsx`/`next.config.ts`
  (Serwist); `shared/files/hooks/useAudioCompressor.ts` (extrair loader do ffmpeg
  para reuso no corte); `DevContext.tsx`.
- [x] Regressão: player global (todas as telas de gravação), push (SW
  substituído), deploy (SW mal configurado serve app shell velho — precisa de
  `skipWaiting`/`clientsClaim` e teste de atualização).

## Riscos
- **iOS**: storage evictado em 7 dias se não instalado; áudio em background em
  PWA standalone funciona enquanto está tocando, mas o SO pode matar o app parado.
  Testar em iPhone real antes de anunciar.
- **Cota**: sermão ~20 MB; 10 sermões = 200 MB. Ok em Android; iOS limita por
  origem (centenas de MB) — retenção obrigatória.
- **Culto inteiro continua público** no CDN (`gravacoes-audio`, usado por `/g/`,
  `/convidado/`, quiosque e Deepgram). Enquanto isso valer, "só para membros"
  não se sustenta de fato — ver perguntas.
- Corte no browser do admin: publicar de celular fica lento (ffmpeg core ~30 MB).
  Mitigação: só disparar corte em desktop ou permitir "cortar depois".
- Serwist + Next 16: verificar compatibilidade da versão antes de começar.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | campos `audioSermao*` |
| `convex/files/urls.ts`, `authz.ts` | Modificar | folder `gravacoes-sermao` (privado, `gravacoes:read`) |
| `convex/gravacoes/sermaoAudio.ts` | Criar | `getSermaoAudioUrl` (assinada), `salvarCorte`, `marcarCortePendente` |
| `convex/gravacoes/mutations.ts` | Modificar | publicar/editar bordas → `audioSermaoStatus: PENDENTE` |
| `features/gravacoes/hooks/useCortarSermao.ts` | Criar | FFmpeg.wasm `-ss -to -c copy` + upload presigned |
| `features/gravacoes/components/CortarSermaoBanner.tsx` | Criar | no admin: "sermão pendente de corte" + botão |
| `shared/offline/db.ts` | Criar | IDB (`sermoesOffline`, `heartbeatsPendentes`) |
| `shared/offline/useSermaoOffline.ts` | Criar | baixar/remover/estado |
| `features/gravacoes/components/OfflineToggle.tsx` | Criar | botão "Disponível offline" |
| `app/(ready)/gravacoes/offline/page.tsx` | Criar | biblioteca offline (só IDB) |
| `shared/audio/AudioPlayerProvider.tsx` | Modificar | fonte blob; heartbeat com fila |
| `app/sw.ts` + `next.config.ts` + `app/layout.tsx` | Criar/Modificar | Serwist, registro sempre, push preservado |
| `shared/components/auth/AuthGuard.tsx` (ou gate atual) | Modificar | bypass/sessão em cache para rota offline |
| `shared/components/layout/DevContext.tsx` | Modificar | nova página |

## Ordem de Implementação
1. Corte + bucket privado + player online tocando o cortado (valor imediato:
   menos bytes, sem avisos, URL não compartilhável). ~3-4 dias.
2. IDB + toggle "Disponível offline" + reprodução por blob + fila de heartbeat. ~3-4 dias.
3. Biblioteca `/gravacoes/offline` + auth offline. ~2 dias.
4. Serwist (app shell) + preservação do push + teste de atualização. ~2-3 dias.
5. iOS: orientação "Adicionar à Tela de Início", `storage.persist`, testes em
   aparelho real. ~2 dias.

Total estimado: ~2,5-3 semanas. Cada etapa em PR próprio, preview na Vercel.

## Perguntas em aberto
- Mover também o **culto completo** para o bucket privado (fecha o vazamento por
  link; afeta `/g/`, `/convidado/`, quiosque e a ingestão do Deepgram, que aceita
  URL assinada)? Recomendo sim, como etapa 6.
- Links de convidado (`/convidado/[codigo]`, `/g/[token]`) continuam existindo?
  Conflitam com "apenas membros".
- Retenção offline: apagar automaticamente após X dias / manter últimos N?
- Baixar automaticamente o sermão mais recente no Wi-Fi, ou só manual?

## Relacionado
- `podcast-privado.md` — feed por membro; reaproveita a etapa 1 (corte do sermão em bucket privado).
