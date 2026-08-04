# Segregação de arquivos em buckets B2 por sensibilidade (LGPD)

> Status: **CONCLUÍDO em produção** (04/08/2026) · issue #206 · PRs #207, #208, #209, #210.
> Uma pendência fora do código: purgar o cache do Cloudflare (ver "Estado final").

## Estado final (verificado em produção)

| | Bucket aberto `ipc-files` | Bucket fechado `ipc-privado` |
|---|---|---|
| Conteúdo | 155 áudios de sermão + 1 capa | 269 fotos + 1 comprovante |
| Dado pessoal | **nenhum** | todo |
| Acesso sem assinatura | público (é o objetivo) | **401** |
| Lifecycle | versão antiga expira em 1 dia | idem |

Migração: 122 fotos re-hospedadas (vinham do Tally), 18 arquivos copiados entre
buckets, 17 originais apagados, 12 órfãos removidos. Zero falhas.

### Pendência (ação no painel, fora do código)

**Purgar o cache do Cloudflare.** Arquivos apagados do B2 seguem sendo servidos
pelo CDN enquanto o cache viver — herdaram `max-age` de 1 ano de quando eram
públicos. Verificado em 04/08: o comprovante do retiro ainda responde 200 com
`cf-cache-status: HIT` apesar de o B2 devolver 404. Caching → Purge Everything.

## O que o plano não previu (e apareceu na execução)

- **Pasta legada `acampamento-comprovantes`** — o dry-run em produção acusou 1
  arquivo "ignorado": um comprovante numa pasta anterior à renomeação do módulo
  para "retiro", que não existia em nenhum mapa. Sem registrá-la, aquele
  comprovante ficaria público para sempre. O dry-run passou a denunciar pasta
  não registrada em vez de ignorar em silêncio.
- **12 arquivos órfãos** — fotos de pessoas no bucket aberto sem nenhum registro
  apontando para elas (resíduo de troca de foto: cada troca gravava chave nova e
  abandonava a anterior). A migração percorre o BANCO, então nunca as veria.
  Apagadas após identificação.
- **Cache do CDN** — apagar do bucket não fecha o acesso enquanto o CDN tiver
  cópia. Só descoberto ao conferir o resultado da limpeza.
- **`ContentType` perdido na cópia** — `MetadataDirective: REPLACE` substitui
  todos os metadados; sem repassar o tipo, o comprovante virava
  `binary/octet-stream` e baixaria em vez de exibir. Reparado antes de apagar os
  originais — depois disso não haveria mais de onde recuperar o tipo.
- **Retrocompatibilidade do `Cache-Control`** — o backend vai a produção antes do
  frontend; assinar o upload com `private` enquanto o frontend ainda mandava o
  valor antigo quebraria todo upload com 403. O valor só muda junto com a env.

## Fase futura (não feita)

**Direito ao esquecimento / órfãos novos.** Trocar ou remover foto continua
deixando o arquivo no bucket: `PhotoUpload` só desassocia no banco. Hoje apenas
a exclusão de gravação apaga no B2 (`convex/gravacoes/mutations.ts`). Enquanto
isso não for tratado, a lista de órfãos volta a crescer.

---

> Plano original abaixo, mantido como registro do que foi desenhado.

## Context

Hoje **todos** os arquivos ficam num único bucket B2 (`ipc-files`) servido pelo CDN
`cdn.yhc.com.br` **sem nenhuma assinatura de leitura** — `generatePresignedReadUrl`
(`convex/files/signing.ts:25`) é um no-op que devolve a URL pública. Comprovantes, cartas,
certificados e fotos ficam acessíveis por qualquer um que tenha o link. É o furo de LGPD.

Objetivo: **dois** buckets por sensibilidade — um aberto (tudo bem ser público) e um fechado
(dados pessoais, leitura só via URL assinada temporária) — com organização interna por pastas
e garantia estrutural de que arquivo novo sempre cai no bucket certo.

Decisões tomadas:
- **Dois buckets, não mais**: categorias novas viram pastas dentro do bucket existente.
- **Migração completa** (mover objetos + reescrever URLs no banco).
- **Direito ao esquecimento (delete de órfãos)**: fase separada, fora deste escopo.

## Arquitetura

| Bucket | Visibilidade | Leitura | Pastas | Migra dados? |
|---|---|---|---|---|
| `ipc-files` (atual) | **Aberto** (CDN) | `cdn.yhc.com.br/<key>` | `gravacoes-audio/`, `biblioteca-capas/` | Não |
| `ipc-privado` (novo) | **Fechado** | presigned read (~1h) | `membros/fotos/`, `membros/cartas-transferencia/`, `educacional/fotos/`, `educacional/certificados-cac/`, `retiro-comprovantes/` | Sim |

Notas validadas em revisão:
- `educacional/certificados-cac` está **quebrado hoje** (ausente de `FOLDER_PERMISSIONS` → upload sempre lança). Uploader real: `VoluntarioForm.tsx:201`, gateado por `voluntarios_edu:manage` (`VoluntariosTab.tsx:30,124`) — quem sobe é o **gestor**, não o voluntário. Permissão correta: `["voluntarios_edu:manage"]`.
- Foto de criança fica em `entidades.foto` (criança é `entidade`); **há uploader ativo** em `CriancaDetalhe.tsx:77` (folder `educacional/fotos`). Migração dirigida por campo do DB, não por pasta.
- `inscricoesAcampamento` é **tabela legada morta** (migração p/ retiro concluída, `retiroMigracao.ts`; 0 docs em dev). Fase 3 só a inclui se houver docs residuais em prod; coordenar com a remoção pendente da tabela.
- Multimídia de culto: código dormente, sem uploader. Ignorar.

## Regra para o futuro (fail-closed REAL)

A resolução folder→bucket é **centralizada no helper**: `generatePresignedUploadUrl` e o helper
de PutObject server-side derivam o folder da própria key e **lançam erro se a pasta não estiver
no mapa `FOLDER_BUCKET`** — nenhum caller escolhe bucket diretamente. Assim upload novo em pasta
não registrada falha em qualquer fluxo (logado, público, server-side), sem depender de disciplina.
Teste automatizado garante que as chaves de `FOLDER_BUCKET` e `FOLDER_PERMISSIONS` coincidem.

## Sequência de deploy (ordem crítica)

1. **Backend 2-buckets** (bucket novo ainda com leitura pública liberada): mapa, presign por bucket, `parseFileUrl`, presigned read real + lote.
2. **Frontend leitura assinada**: exibição resolve presigned. Ainda funciona nos dois modos.
3. **Migração**: copiar objetos + reescrever URLs no DB.
4. **Fechar acesso público** do `ipc-privado`. Ponto sem volta — validar 1-3 antes.

**Amarração Vercel ↔ Convex**: `NEXT_PUBLIC_CONVEX_URL` é inlined no build. A Fase 1 precisa
estar deployada no deployment Convex que o build alvo consome **antes** da Fase 2 (deploy do
Convex prod é manual: `npx convex deploy`). Regra: backend no deployment-alvo → depois merge do frontend.

## Infra manual (pré-requisito Fase 1)

- B2: criar `ipc-privado` (mesma região `us-east-005`), privado. Application key com R/W nos 2 buckets (least privilege).
- CDN: `cdn.yhc.com.br` continua só na frente do `ipc-files`. `ipc-privado` não passa por CDN.
- Env no **Convex** (dev + prod): `BACKBLAZE_BUCKET_PUBLICO=ipc-files`, `BACKBLAZE_BUCKET_PRIVADO=ipc-privado` (manter `BACKBLAZE_BUCKET_NAME` como alias na transição). *Não* adicionar ao `.env.example` — convenção do repo: env de backend B2 não entra ali.

## Fase 1 — Backend

### Novo `convex/files/urls.ts` (módulo SEM SDK — importável por mutations V8)
- `parseFileUrl(url) → { bucketKey: "publico"|"privado", key } | null`. Resolve 3 formatos:
  CDN (→ publico), S3 endpoint path-style `https://<BACKBLAZE_ENDPOINT>/<bucket>/<key>`, legado
  `f005.../file/<bucket-público>/<key>` (só o público tem URLs legadas). Host desconhecido → null.
  Teste defensivo: formato virtual-hosted retorna null.
- `FOLDER_BUCKET` mora aqui. Precisa de `BACKBLAZE_ENDPOINT` + nomes de bucket no env V8.
- Motivo da extração: `convex/public/retiro.ts` (mutation) vai importar `parseFileUrl` sem arrastar `@aws-sdk/client-s3` pro bundle (o comentário em `retiro.ts:19` sobre "não puxar SDK" continua respeitado).

### `convex/files/helpers.ts`
- `generatePresignedUploadUrl(key, contentType)`: deriva folder da key → bucket via `FOLDER_BUCKET`
  (fail-closed, lança se pasta desconhecida). Retorno mantém a chave `publicUrl` carregando a URL
  a persistir: CDN p/ público, **canônica** `https://<endpoint>/ipc-privado/<key>` p/ privado
  (não quebra `useFileUpload.ts:21`, `ComprovanteForm.tsx:80`, `EnviarComprovanteDialog.tsx:80`).
- **Cache-Control**: para bucket privado, assinar **sem** `CacheControl: public...` (ou com `private`).
  ATENÇÃO: o header assinado precisa bater com o que o cliente envia no PUT — mudar em sincronia os
  3 PUTs do frontend (`useFileUpload.ts:34`, `ComprovanteForm.tsx:71`, `EnviarComprovanteDialog.tsx:73`)
  e `importarFotoTally:227`, senão 403.
- Helper server-side de PutObject com a mesma resolução fail-closed (reusado por `importFormNovos`, `youtubeAction`).
- `deleteFromB2(url)`: bucket via `parseFileUrl`. `toCdnUrl` só para o público.
- **Centralizar `CDN_BASE`**: hoje duplicado em `helpers.ts:21`, `public/retiro.ts:20`,
  `shared/audio/utils.ts:1`, `SecureAudioPlayer.tsx:16`, `SegmentEditor.tsx:98`,
  `BirthdayList.tsx:101`, `next.config.ts:11`. Unificar numa constante/env única (carona: prepara a
  troca futura do domínio pessoal `cdn.yhc.com.br` pelo domínio da igreja — a URL canônica S3 do
  bucket privado já nasce desacoplada do domínio pessoal; a troca futura afeta só as URLs públicas,
  reusando a máquina de reescrita da Fase 3. Registrado como pendência futura, fora deste escopo).

### `convex/files/signing.ts`
- `generatePresignedReadUrl(url)`: privado → `GetObjectCommand` presigned (~1h); público → CDN;
  **host desconhecido → passthrough (retorna a própria URL)** — hoje `entidades.foto` em dev é
  100% `storage.tally.so/...`; retornar null apagaria essas fotos da tela.
- `generatePresignedReadUrls(urls[])` em lote.

### `convex/files/authz.ts`
- Adicionar `"educacional/certificados-cac": ["voluntarios_edu:manage"]` (corrige o upload quebrado; é o gestor quem sobe).
- **Authz de leitura** (decisão nova): `getReadUrl(s)` deixa de ser só-login. Mapa pasta→leitura:
  `membros/fotos` e `educacional/fotos` → qualquer autenticado (avatares aparecem em todo o app);
  `retiro-comprovantes` → `inscricoes:manage`; `membros/cartas-transferencia` → permissões de rol/membros;
  `educacional/certificados-cac` → `voluntarios_edu:manage`. Sem isso, qualquer membro logado
  assinaria comprovante financeiro/carta de disciplina de terceiros — "fechado pra internet, aberto
  pra qualquer conta" não atende LGPD.

### `convex/files/upload.ts`
- Actions não resolvem mais bucket — o helper resolve (fail-closed). Adicionar `getReadUrls` (lote).
- Remover `console.log` de key/uploadUrl (`upload.ts:24`).

### `convex/public/retiro.ts` (blocker rodada 1)
- Trocar `COMPROVANTE_URL_PREFIXO` (`:20,:564`) por validação via `parseFileUrl` (de `files/urls.ts`):
  `bucketKey === "privado"` + key com prefixo `retiro-comprovantes/`; aceitar também o formato CDN
  legado durante a transição. Atualizar `retiro.integration.test.ts:426-431`.

### `convex/membros/importFormNovos.ts` (blocker rodada 1)
- `importarFotoTally` (`:205-234`): PutObject via helper novo → `ipc-privado` + URL canônica
  (hoje despeja no público com URL CDN — reintroduziria o vazamento a cada import).

### `convex/gravacoes/youtubeAction.ts`
- `:92-105`: adaptar ao helper novo (folder `gravacoes-audio` → público). Só compilação/assinatura.

### Testes
- `helpers.test.ts`/novo `urls.test.ts`: `parseFileUrl` (3 formatos × 2 buckets + desconhecido/virtual-hosted → null), fail-closed de pasta não mapeada, sincronização `FOLDER_BUCKET` × `FOLDER_PERMISSIONS`.

## Fase 2 — Frontend: leitura assinada

**Regra de ouro**: assinatura é camada de **exibição**. O value de formulário e o que vai pro DB é
sempre a URL canônica — nunca assinar o value (senão edição de membro persiste URL com
`X-Amz-Signature` de 1h no banco; risco real em `MembroForm`, `EclesiasticoForm`, `PhotoUpload`).

- Hooks: `useSignedFileUrl` + `useSignedFileUrls` (lote), cache em memória (~1h).
- `PrivateImage` (placeholder enquanto assina) para fotos/avatares.
- `useOpenSignedFile` (assina no clique e abre) para documentos: comprovantes em
  `FinanceiroSection.tsx:151,223` e link do CAC em `VoluntarioCard.tsx:119-126`. Carta de
  transferência hoje **não tem** link de abertura (só nome do arquivo no `FileUpload`) — nada a converter.
- `FileUpload`/`PhotoUpload`: preview pós-upload em bucket privado via `useSignedFileUrl`.
- **Inventário de call sites**: a revisão encontrou **~40 render sites** de foto (a lista anterior cobria
  menos da metade). NÃO trabalhar por lista fixa de linhas — na implementação, varrer com:
  `grep -rn "AvatarImage\|foto\|autorFoto\|responsavelFoto" features/ app/ shared/ --include="*.tsx"`
  e converter todos. Áreas mapeadas: dashboard (BirthdayList — único site com `next/image`,
  AniversariantesCard), boletim, diretório, membros (família, árvore, perfil, onboarding),
  secretário executivo (tabela + seções), cadastro vivo, pastoreio, pedidos de oração (~8 comps),
  educacional (~6 comps), tarefas, comentários, sidebar/MoreSheet (via `PermissionsProvider:101`).
  Critério de pronto: grep zerado de exibição direta de URL canônica privada.
- Fotos Tally (host externo): passam intactas pelo passthrough do signing — sem mudança de UI.
- Telas de lista: hook em lote. Antes de assinar payloads reativos (comentários, tarefas, pedidos),
  rodar o skill `convex-bandwidth` nas queries que projetam foto.

## Fase 3 — Migração de dados

Action interna Node, idempotente, em lotes paginados:
1. `CopyObjectCommand` de `ipc-files` → `ipc-privado` (mesma key; `CopySource` URL-encoded; pular se
   destino já existe; limite single-part 5 GB — irrelevante p/ fotos/PDF).
2. Reescrever URL no doc para a canônica. **Campos aninhados são arrays**: `inscricoesRetiro.recebimentos[]`
   (não `recebimento.` singular) e `comprovantesPendentes[]` — patch do array inteiro.
3. Delete dos objetos antigos no público: etapa de limpeza posterior, após validar.

Campos:
- `entidades.foto` → `ipc-privado` (membros e crianças). **URLs Tally** (100% das fotos em dev):
  **re-hospedar** — baixar do Tally e subir no `ipc-privado` com key `membros/fotos/<entidadeId>_<ts>.<ext>`
  (mesma lógica do `importarFotoTally`). É PII em host de terceiro com token que expira. Download
  que falhar (token Tally expirado) → logar e manter a URL original, sem abortar o lote.
- `membros.cartaTransferencia` → `ipc-privado`
- `inscricoesRetiro.recebimentos[].comprovanteUrl` + `comprovantesPendentes[].comprovanteUrl` → `ipc-privado`
- `inscricoesAcampamento.*` → só se houver docs em prod (tabela legada; ver nota)
- `eduVoluntarios.certificadoCacUrl` → `ipc-privado` (provavelmente vazio)
- **Não migrar** `gravacoes.audioUrl` e `livros.capaUrl`.

Escala: trivial (~230 entidades / ~131 fotos em dev). Janela frágil: reescrever só com Fase 2 no ar;
build antigo em cache pode ver canônica sem saber assinar — transitório aceito.

## Fora de escopo
- Direito ao esquecimento / delete de órfãos (só exclusão de gravação apaga no B2 hoje).
- Troca do domínio CDN pessoal → domínio da igreja (preparada pela centralização do `CDN_BASE`; ver Fase 1).
- Wire-up do uploader de multimídia; app key por bucket.

## Verificação
- Upload por categoria → bucket correto no painel B2 + URL canônica no DB.
- Upload em pasta NÃO mapeada → falha (fail-closed).
- Comprovante público + logado → `enviarComprovante` aceita canônica.
- Import Tally → `ipc-privado` + canônica.
- Leitura privada → URL presigned que expira (403 depois); foto Tally continua renderizando (passthrough).
- Leitura sem permissão da pasta (ex.: membro comum tentando comprovante) → negada.
- Pós-Fase 4: canônica sem assinatura → 403; áudio/capas seguem no CDN; pipeline IA ok.
- `npm run lint` + `npm test`; screenshot mobile das telas de foto/comprovante.

## Decisões fechadas
1. Buckets: `ipc-files` (aberto) + `ipc-privado` (fechado), pastas internas = prefixos atuais.
2. **CAC: permissão `voluntarios_edu:manage`** (quem sobe é o gestor — corrigido; versão anterior dizia self-service, factualmente errado).
3. Presigned read: ~1h.
4. Authz de leitura por pasta: fotos → qualquer autenticado; documentos → permissão da pasta.
5. **Fotos Tally: re-hospedar** no `ipc-privado` durante a migração (fallback: manter URL original se o download falhar).
