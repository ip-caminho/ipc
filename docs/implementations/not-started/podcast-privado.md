# Podcast privado dos sermões (feed por membro)

## Escopo
Cada membro com `gravacoes:read` recebe um **feed RSS privado** (URL com token
pessoal) para assinar no app de podcast do celular (Apple Podcasts, Pocket
Casts, Overcast, AntennaPod). O app baixa os sermões novos automaticamente e
toca offline (metrô), com tela bloqueada. O feed entrega **só o sermão cortado**,
servido por redirect 302 para URL assinada de curta duração do bucket privado —
nunca uma URL fixa. Spotify fica de fora (não aceita feed privado nem por URL).

O feed é **complementar** ao app: descrição de cada episódio traz o link da
gravação em `/gravacoes/<id>` ("comente no app"). Nada muda no player atual.

## Decisões fixadas (24/08/2026)
- Um token **por membro**, autoatendido (o próprio membro gera na tela de
  Gravações) e revogável por ele ou por admin/secretaria.
- Token deixa de valer automaticamente quando o membro perde `gravacoes:read`
  ou sai de `status: ATIVO` (checado a cada requisição).
- Episódio só entra no feed quando o corte do sermão está pronto
  (`audioSermaoStatus === "PRONTO"`). Sem fallback para o culto inteiro.
- Não é DRM: o app de podcast guarda o MP3 no aparelho. O token identifica de
  quem saiu um vazamento e permite revogar; é o teto de proteção desta abordagem.

## Pré-requisito
**Corte físico do sermão em bucket privado** — etapa 1 de
`sermao-offline-app.md` (`audioSermaoKey`, `audioSermaoBytes`,
`audioSermaoDuracao`, `audioSermaoStatus` em `gravacoes`; folder
`gravacoes-sermao` no `ipc-privado`). Este PRD começa depois dela.

## Diagnóstico (encaixes existentes)
- Assinatura de leitura no bucket privado: `convex/files/signing.ts:32-46`
  (`generatePresignedReadUrl`, Node action, TTL por folder em `urls.ts`).
- Padrão de rota Next chamando Convex sem sessão: `app/api/convidado-acesso/route.ts`
  (`ConvexHttpClient` + `NEXT_PUBLIC_CONVEX_URL`).
- Padrão de token aleatório: `gerarToken()` em `convex/gravacoes/share.ts:11` e
  `convex/membros/acesso.ts:63`.
- Revalidação sob demanda já existe: `app/api/site-publico/revalidate/route.ts`.
- Índice útil: `gravacoes.by_tipo_status_data` (`convex/schema.ts:317`).
- Tela de acesso do membro (admin): `features/membros/components/AcessoSection.tsx`.

## Arquitetura

### 1. Token
Tabela nova `podcastAssinaturas` (separada de `membros` para não engordar nem
re-disparar queries do Rol a cada acesso ao feed):

```
membroId: v.id("membros")
token: v.string()            // 32 chars, crypto
criadoEm: v.number()
revogadoEm: v.optional(v.number())
ultimoAcessoEm: v.optional(v.number())   // atualizado no máximo 1x/hora
acessos: v.optional(v.number())
index by_token ["token"], by_membro ["membroId"]
```
Gerar novo token revoga o anterior (um ativo por membro).

### 2. Feed — `GET /api/podcast/<token>/feed.xml`
1. Rota Next valida o token via query `podcast.validarToken` (1 doc por índice +
   membro + contexto de permissão).
2. Corpo do feed vem de `podcast.listEpisodios` (SERMAO + PUBLICADO +
   `audioSermaoStatus: PRONTO`, `by_tipo_status_data` desc, `take(50)`), **cacheado
   no Next por tag `podcast-feed`** e invalidado na publicação/edição de bordas
   (mesmo mecanismo de `site-publico/revalidate`). Assim N membros × polling
   horário custa 1 leitura de token por fetch, não 50 docs — importante pelo
   limite do plano Convex.
3. XML (RSS 2.0 + namespace iTunes): `<itunes:block>Yes</itunes:block>`,
   `<itunes:author>`, `<itunes:image>`, `<itunes:explicit>false</itunes:explicit>`;
   por episódio: `<guid isPermaLink="false">gravacaoId</guid>`, `<pubDate>`,
   `<itunes:duration>` (`audioSermaoDuracao`), `<enclosure url=".../ep/<id>.mp3"
   length="audioSermaoBytes" type="audio/mpeg">`, `<description>` = resumo +
   link `/gravacoes/<id>`.
4. Headers: `Content-Type: application/rss+xml`, `Cache-Control: private,
   max-age=900`, `X-Robots-Tag: noindex`. Token inválido/revogado/membro
   inativo → 404 (sem distinguir motivo).

### 3. Episódio — `GET|HEAD /api/podcast/<token>/ep/<gravacaoId>.mp3`
- Valida token, chama action `podcast.getEpisodioUrl` (Node: assina
  `audioSermaoKey`, TTL 1 h) → **302** para a URL assinada. Apps fazem `HEAD`
  antes de baixar: responder 302 igual.
- Sem proxy de bytes pela Vercel (não gasta bandwidth da função). Egress direto
  do B2: grátis até 3× o storage/mês, depois US$0,01/GB.
- `ultimoAcessoEm`/`acessos` atualizados com throttle de 1 h.

### 4. UI do membro — tela `/gravacoes`
Botão "Ouvir no app de podcast" → `Drawer` (mobile) / `Dialog`:
- Detecta plataforma. iOS: "Abrir no Apple Podcasts" (`podcast://<host>/api/podcast/<token>/feed.xml`),
  "Overcast" (`overcast://x-callback-url/add?url=`), "Pocket Casts"
  (`pktc://subscribe/<host>/api/podcast/<token>/feed.xml`). Android: Pocket
  Casts, AntennaPod + instrução "Adicionar por URL".
- "Copiar link" + aviso: "este link é pessoal; quem tiver o link ouve como você".
- "Gerar novo link" (revoga o anterior) e "Desativar".
- Aviso de que Spotify não suporta.

### 5. Admin — `AcessoSection`
Mostra se o membro tem feed ativo, último acesso, botão "Revogar".

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `podcastAssinaturas` | **Nova** (campos acima) |
| `gravacoes` | nenhuma além do pré-requisito (`audioSermao*`) |

## Permissões
- Gerar/ver/revogar o próprio feed: autenticado com `gravacoes:read` (ownership
  por `ctx.auth` → `membros.userId`).
- Revogar feed de terceiros: `membros:update`.
- Feed e episódio: sem sessão, autorizados pelo token + checagem de status/permissão
  do membro dono em cada requisição.

## Impacto em Shared
- [x] `convex/schema.ts` (tabela nova, aditivo). Não toca `rbac*`, `auth`,
  `FileUpload`, `AppSidebar`. `DevContext.tsx` (nova entrada).
- [x] Regressão: baixa — código novo. Atenção ao cache por tag: publicar
  gravação sem invalidar deixa o feed velho por até 1 h.

## Riscos
- **Convex bandwidth**: sem o cache por tag, polling de apps (a cada 1 h por
  membro) leria 50 docs por fetch — inviável no plano atual. Cache é obrigatório.
- **Vazamento por link**: token = senha. Mitigação: identificável e revogável;
  throttle/log de acessos; opcional bloquear por IP/UA anômalo depois.
- **Android sem app padrão** (Google Podcasts descontinuado): exige instalar app
  de terceiros; instruções por app.
- **Capa**: apps exigem imagem quadrada 1400–3000 px. Precisa de arte.
- Apps podem cachear o 302: TTL da assinatura de 1 h cobre um download em
  andamento; download interrompido e retomado depois de 1 h precisa refazer o
  `GET` (apps fazem isso normalmente).
- Deep links `podcast://` / `pktc://` só funcionam com o app instalado; manter
  "Copiar link" como caminho universal.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | tabela `podcastAssinaturas` |
| `convex/gravacoes/podcast.ts` | Criar | `getMeuFeed`, `gerarMeuToken`, `revogarMeuToken`, `revogarTokenDeMembro` (admin), `validarToken`, `listEpisodios`, `registrarAcesso` (throttle) |
| `convex/gravacoes/podcastAction.ts` | Criar | `"use node"` — `getEpisodioUrl` (valida + assina) |
| `convex/gravacoes/mutations.ts` | Modificar | ao publicar/cortar → chamar revalidate da tag `podcast-feed` |
| `app/api/podcast/[token]/feed.xml/route.ts` | Criar | RSS (cache por tag + token) |
| `app/api/podcast/[token]/ep/[id]/route.ts` | Criar | GET/HEAD → 302 assinado |
| `app/api/podcast/revalidate/route.ts` | Criar | `revalidateTag("podcast-feed")` com segredo (padrão de site-publico) |
| `features/gravacoes/lib/podcastLinks.ts` | Criar | montagem de deep links por app/plataforma |
| `features/gravacoes/components/PodcastDialog.tsx` | Criar | Drawer/Dialog com links, copiar, gerar/revogar |
| `app/(ready)/gravacoes/page.tsx` | Modificar | botão "Ouvir no app de podcast" |
| `features/membros/components/AcessoSection.tsx` | Modificar | status do feed + revogar |
| `public/podcast-capa.jpg` | Criar | capa 3000×3000 |
| `shared/components/layout/DevContext.tsx` | Modificar | entrada da tela |

## Ordem de Implementação
1. Concluir pré-requisito (corte do sermão → bucket privado).
2. Schema + `podcast.ts`/`podcastAction.ts` + testes (token inválido, membro
   inativo, sem permissão, throttle). ~1 dia.
3. Rotas `feed.xml` (cache por tag) e `ep` (302, GET+HEAD) + revalidate na
   publicação. Testar com `curl -I` e validador de feed. ~1 dia.
4. `PodcastDialog` + botão em `/gravacoes` + `AcessoSection`. Screenshot mobile
   390 px. ~1 dia.
5. Capa, teste real em Apple Podcasts (iPhone), Pocket Casts e AntennaPod
   (Android); texto de instruções. ~0,5-1 dia.

Total: ~3,5-4 dias após o corte. PR por etapa, preview na Vercel.

## Perguntas em aberto
- Nome e capa do podcast (ex.: "Sermões — IP do Caminho").
- Só `SERMAO` ou também `ESTUDO_BIBLICO`/`PALESTRA`?
- Quantos episódios no feed: últimos 50 (proposta) ou 12 meses?
- Futuro role `ouvinte` (`acesso-ouvinte-gravacoes.md`) também ganha feed?
