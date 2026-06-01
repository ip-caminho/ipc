# Gravação em Vídeo (culto completo)

## Escopo

Permitir que uma gravação tenha **vídeo** como fonte (além de áudio). O vídeo do culto (câmera/OBS → arquivo único) é subido, transcrito e analisado pela IA exatamente como o áudio hoje, e tocado com o mesmo "corte virtual" (restrição de playback ao trecho do sermão via `inicioSermao`/`fimSermao`). Áudio-only continua funcionando como está, para cultos sem vídeo.

**Não-objetivos:** corte real do arquivo, exportação de clipe baixável, publicação em redes/YouTube, streaming adaptativo (HLS/ABR), análise visual do vídeo. Todos ficam para fases futuras.

## Decisões de produto (definidas)

| Pergunta | Decisão |
|----------|---------|
| Onde o vídeo cortado aparece | Só player no app (corte virtual, igual ao áudio) |
| Origem da gravação | Câmera/OBS → arquivo único com trilha de áudio |
| Custo vs experiência | Custo mínimo — reusa B2 + CDN, sem serviço de streaming |
| Áudio-only continua? | Sim — gravação é áudio-only **OU** vídeo (fonte única por registro) |
| Adaptive bitrate (ABR) | Fora de escopo — MP4 único progressivo |
| Áudio extraído do vídeo? | Não manualmente — Deepgram extrai server-side ao receber a URL do vídeo |

## Princípio central

Cada gravação tem **uma fonte única**: áudio-only (fluxo atual) ou vídeo. A IA **sempre transcreve o mesmo arquivo que o player toca**, então os timestamps (`inicioSermao`/`fimSermao`/avisos) batem sem sincronia manual. O Claude analisa a transcrição em **texto** — não sabe nem se importa se a fonte foi MP3 ou MP4. Resultado: todo o pipeline de IA (resumo, título, tema, frases pra redes, avisos, timestamps) reusa **100%**, mudando apenas a URL de fonte.

## Modelos Afetados

| Tabela | Tipo de Mudança |
|--------|-----------------|
| `gravacoes` | Adicionar campo `videoUrl: v.optional(v.string())` (`convex/schema.ts:210`, ao lado de `audioUrl`) |

Nenhuma mudança em índices. Demais campos (`inicioSermao`, `fimSermao`, `inicioConteudo`, `fimConteudo`, `inicioAvisos`, `fimAvisos`, `iaTranscricao`, `iaResultado`) são agnósticos de mídia e reusam.

## Permissões

- **Subir/processar vídeo:** mesmos papéis que hoje gerenciam gravações (admin, secretaria). Sem permissão nova.
- **Assistir:** mesma visibilidade da gravação atual. Player de vídeo não introduz nova regra de acesso.

## Impacto em Shared

- [x] Toca arquivos sensíveis:
  - `convex/schema.ts` — **ALTO** (todos os módulos). Implementar **sequencialmente**, nunca em paralelo com outra mudança de schema.
  - `shared/files/components/FileUpload.tsx` — **MÉDIO** (gravações, membros, multimídia, biblioteca). Mudança aditiva (`accept`, `maxSizeMB`), revisar regressão nos outros consumidores.
  - `convex/files/helpers.ts` / `shared/files/hooks/useFileUpload.ts` — toda feature com upload. Só mudam se entrarmos no multipart (fast-follow, ver Riscos).
  - `shared/components/layout/DevContext.tsx` — atualizar `CONTEXT_MAP` da página de gravações.
- [x] Risco de regressão: features que usam `FileUpload` (se mexer no componente) e o player de áudio existente (se compartilhar abstração com o de vídeo).

## Riscos

1. **Upload de GBs sem resumabilidade.** `useFileUpload.ts:30` usa PUT presigned único. Funciona até **5GB** no B2, então com cap de bitrate (vídeo < 2GB) **o MVP não precisa de multipart**. Risco: se a conexão da igreja cair no meio, recomeça do zero. Mitigação MVP: barra de progresso clara + orientar upload em wifi. Fast-follow: upload multipart resumável.
2. **Limite de 2GB do Deepgram.** `transcribeUrl` baixa a URL; vídeo acima de 2GB falha. Mitigação: **cap de bitrate no OBS ~2 Mbps** → 2h ≈ 1,8GB. Documentar setup de gravação. Não é configurável em runtime — é disciplina operacional.
3. **Tempo/banda de download no Deepgram.** Vídeo é maior que MP3; o upload do arquivo pro Deepgram demora mais (transcrição em si é rápida). Aceitável — processo é assíncrono com status.
4. **Storage B2 cresce.** Vídeo histórico ≈ 2-4GB/culto vs poucos MB do MP3. ~$6/TB/mês no B2 → ~$2-3/mês no volume esperado. Aceitável; revisar política de retenção depois.
5. **Sem ABR.** MP4 único: conexão do espectador abaixo do bitrate → buffer. Mitigação: gravar 720p ~1,2-1,5 Mbps. Evolução futura: `videoUrl` aponta pra `.m3u8` + hls.js, sem quebrar o schema.

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Adicionar `videoUrl: v.optional(v.string())` em `gravacoes` |
| `convex/gravacoes/ai.ts` | Modificar | Mutation que dispara `processSermon` passa fonte = `videoUrl ?? audioUrl` |
| `convex/gravacoes/aiAction.ts` | Nenhuma | Já aceita qualquer URL via `transcribeUrl`. Sem mudança |
| `convex/files/upload.ts` (action `getUploadUrl`) | Nenhuma (MVP) | Já gera presigned por `mimeType`/`folder`. Reusa para vídeo |
| `convex/files/helpers.ts` | Nenhuma (MVP) | `generateB2Key` aceita folder arbitrário. Multipart só no fast-follow |
| `shared/files/components/FileUpload.tsx` | Modificar | Suportar `accept="video/*"` + `maxSizeMB` maior. **Pular compressão FFmpeg.wasm para vídeo** (só áudio comprime) |
| `features/gravacoes/components/GravacaoForm.tsx` | Modificar | Campo de upload de vídeo (`accept="video/*"`, folder `gravacoes-video`, `maxSizeMB` ~2500), salvar em `videoUrl`. Mutuamente exclusivo com áudio na prática |
| `shared/files/components/SecureVideoPlayer.tsx` | **Criar** | Port do `SecureAudioPlayer`: `<video>` no lugar de `<audio>`, mesma lógica de clamp (`handleTimeUpdate`, `inicioSermao`/`fimSermao`) |
| `features/gravacoes/components/VideoSegmentEditor.tsx` | **Criar** | Port do `SegmentEditor` sem waveform: scrub no `<video>` + botões "marcar início/fim aqui" pegando `currentTime`, reusa inputs HH:MM:SS e a mutation de save |
| Componentes de exibição (`AudioListItem.tsx`, `SermoesQuiosqueView.tsx`, `AvisosSection.tsx`, `shared/audio/AudioPlayerProvider.tsx`) | Modificar | Onde tocam a mídia: se `videoUrl` → `SecureVideoPlayer`; senão → player de áudio atual |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualizar `CONTEXT_MAP` da página de gravações (novo campo, novos componentes) |

## Ordem de Implementação

1. **Schema** — adicionar `videoUrl`. Deploy isolado (toca `schema.ts`, sequencial).
2. **Backend IA** — `ai.ts` passa `videoUrl ?? audioUrl` como fonte do `processSermon`. Testar com um vídeo pequeno < 2GB (Deepgram extrai áudio, timestamps relativos ao vídeo).
3. **Upload** — `FileUpload` aceita vídeo e pula compressão; `GravacaoForm` ganha o campo. Reusa presigned PUT único (MVP).
4. **Player** — criar `SecureVideoPlayer`; ramificar os componentes de exibição por `videoUrl`.
5. **Editor de segmento** — criar `VideoSegmentEditor` (sem waveform).
6. **DevContext** — atualizar `CONTEXT_MAP`.
7. **Fast-follow (se necessário)** — upload multipart resumável quando uploads grandes falharem na prática.

## Verificação

- Subir um vídeo de culto < 2GB → IA transcreve, gera resumo/timestamps relativos ao vídeo.
- Player toca só o trecho do sermão (clamp em `inicioSermao`/`fimSermao`).
- Ajuste manual no `VideoSegmentEditor` salva e o player respeita.
- Gravação áudio-only continua idêntica (regressão zero).
- `npm run lint` + `npm test`.

## Setup de gravação (operacional, não-código)

- OBS/câmera exportando **arquivo único MP4 com trilha de áudio**.
- Bitrate alvo: **720p @ ~1,2-1,5 Mbps** (qualidade/conexão) a **1080p @ ~2 Mbps** (teto), mantendo 2h < 2GB para o Deepgram.
- Subir preferencialmente em wifi enquanto o upload for PUT único (sem resume).
