# Site Público IPC v2 — PRD

> Documento de produto (PRD) — não contém implementação. Dados factuais da igreja
> não inventados: marcados `[PREENCHER]` ou resolvidos em runtime via
> `preferencias.getIgrejaInfo`. Decisões consolidadas e fechadas na §16.

---

## 1. Resumo executivo

O **Site Público IPC v2** expande a área pública existente do chrMS (Igreja
Presbiteriana do Caminho) de uma única landing institucional para um conjunto de
rotas públicas funcionais, sem login, servidas pelo mesmo Next.js e lendo do
mesmo Convex. Mantém o princípio já vigente — **uma plataforma, dois
consumidores**: o chrMS é a fonte de verdade e a interface de edição; o site
público é uma camada de leitura (com uma exceção: o formulário público de
inscrições, que escreve).

Existe agora por dois problemas da landing atual: (1) é só uma página — não
atende o membro que precisa conferir horário, agenda da semana ou se uma
inscrição abriu; (2) não há fluxo claro entre o "visitante novo" que chegou pelo
Instagram e o "membro buscando informação prática". O v2 resolve isso adicionando
`/quem-somos`, `/trajetoria`, `/agenda`, `/visite` e `/inscricoes`, e enriquecendo
a home com blocos dinâmicos de "esta semana" e "próximos eventos".

Difere do chrMS: o chrMS é autenticado (Convex Auth + WhatsApp OTP), com RBAC,
sidebar e 25+ módulos administrativos. O site público não monta `AuthGuard`, não
exige login para ler, e reusa dados que voluntários autenticados já publicam no
chrMS (avisos, cultos, eventos, informações da igreja). O conteúdo do site
público se atualiza automaticamente quando o chrMS muda.

A arquitetura **não muda**: domínio único, separação por path/route-group
(`(public)` evolui, `(app)` intocado), middleware por path com whitelist
expandida, Convex Cloud + Vercel, Next 16, fontes Spectral + Source Sans 3 +
Geist. As únicas adições estruturais são `@next/mdx` (conteúdo estático) e duas
tabelas Convex genéricas para inscrições não atreladas a cursos.

**Fora de escopo:** blog/CMS multiusuário, comentários, multilíngua, split por
hostname/subdomínio, refactor de `turmas`/`cultos`/`escalas`/`auth`/RBAC além do
mínimo documentado, e mudança de deploy além de apontar `ipdocaminho.com` na
Vercel.

---

## 2. Objetivos e não-objetivos

### Objetivos
- Servir conteúdo público estruturado da IPC sem login.
- Reusar dado existente do chrMS (avisos, cultos, calendário, igreja) — sem
  duplicar tabelas.
- Adicionar fluxo de inscrição **genérico** (retiros, voluntariado, eventos),
  independente do módulo de turmas/cursos.
- Voluntários autenticados publicam avisos, eventos e inscrições no chrMS → o
  site público lê automaticamente (ISR + revalidação).
- Visitante novo entende quem a IPC é em menos de 30 segundos.
- Membro encontra horário, agenda e inscrições abertas em 1–2 cliques a partir da
  home.

### Não-objetivos
- Não é blog nem CMS multiusuário com fluxo de aprovação.
- Sem comentários ou interação social.
- Não substitui o chrMS — é a face pública dele.
- Sem multilíngua.
- Não altera a landing além das adições de blocos descritas em §7.1.
- Não refatora `turmas`.
- Não introduz split por hostname.
- Não muda deploy/domínio além de configurar `ipdocaminho.com` na Vercel.

---

## 3. Audiências

Ordem de prioridade e jornada-exemplo de cada.

**P1 — Membro buscando informação prática.** Uso mais frequente.
> Maria, membro, abre o site no celular sábado à noite. Quer saber o horário do
> culto e se o PG dela tem encontro essa semana. Entra em `/`, vê "Esta semana"
> e "Próximos eventos" sem rolar muito; confere em 10s. Se precisar de mais,
> toca em "Agenda completa →".

**P2 — Visitante novo.** Função histórica do site institucional.
> João descobriu a IPC pelo Instagram. Quer entender se vale visitar. Cai na `/`,
> lê o hero e o bloco "Sobre", toca em "Quero conhecer →" e vai a `/visite`:
> endereço, horário, o que esperar, a Ceia. Decide visitar no domingo.

**P3 — Pesquisador denso.** Pastor de outra igreja / pesquisa sobre
presbiterianismo em SP.
> Rev. Pedro pesquisa igrejas reformadas confessionais em São Paulo. Acessa
> `/quem-somos` (manual de marca expandido) e `/trajetoria`. Lê conteúdo
> editorial denso, identifica a tradição (Westminster) no rodapé.

**P4 — Membro novo querendo se inscrever.**
> Ana, recém-chegada, quer se inscrever no retiro. Vai a `/inscricoes`, escolhe o
> card, preenche o form em `/inscricoes/[slug]`, consente LGPD, vê confirmação
> inline. Sem precisar de login.

---

## 4. Arquitetura técnica

Sem split por hostname. O que muda em relação ao estado atual:

| Item | Estado atual | Mudança |
|---|---|---|
| `middleware.ts` (whitelist linha 9) | `/signin`, `/ativar/*`, `/convite/*`, `/culto`, `/inscricao/*`, `/livro/*`, `/convidado/*`, `/api/convidado-acesso`, `/g/*`, `/subir-audio` | **Adicionar**: `/quem-somos`, `/trajetoria`, `/agenda`, `/visite`, `/inscricoes`, `/inscricoes/(.*)`, `/privacidade`, `/api/inscricoes/(.*)`. A raiz `/` já é pública. ⚠️ `/inscricao/*` (singular, turmas) ≠ `/inscricoes` (plural, novo). |
| `app/(public)/layout.tsx` | passthrough `<>{children}</>` | `<HeaderPublico />` + `<FooterPublico />` envolvendo `children`; sem `AuthGuard`. Centralizar as fontes Spectral/Source Sans 3 aqui (hoje a landing as redeclara). |
| `next.config.ts` | sem MDX | adicionar `@next/mdx` (`createMDX`) + `pageExtensions` incluindo `mdx`. ⚠️ build/dev usam **Turbopack** (`next dev --turbopack`, Next 16) — ver risco em §15. |
| `content/` | inexistente | criar `quem-somos.mdx`, `trajetoria.mdx`, `visite.mdx`, `privacidade.mdx`. |
| Providers Convex (`app/layout.tsx` raiz) | envolvem tudo | **inalterado** — `(public)` continua dentro do provider global, sem AuthGuard. |

**Por que os providers globais não são refatorados:** o
`ConvexAuthNextjsServerProvider` + `ConvexClientProvider` no `app/layout.tsx`
envolvem `(public)` hoje sem causar dano (a landing já funciona assim). Isolar
seria refactor desnecessário e fora de escopo. As páginas públicas usam
`fetchQuery` (server) ou `useQuery` em queries públicas; nenhuma depende de auth.

**Estratégia de renderização por rota:**

| Rota | Estratégia | Fonte |
|---|---|---|
| `/` | ISR `revalidate = 300` (mantém atual) | Convex (avisos, agenda, inscrições) |
| `/quem-somos` | SSG | MDX |
| `/trajetoria` | SSG | MDX (placeholder) |
| `/visite` | SSG | MDX + `preferencias.getIgrejaInfo` (ISR leve se dinâmico) |
| `/privacidade` | SSG | MDX (`content/privacidade.mdx`, texto LGPD) |
| `/agenda` | ISR `revalidate = 900` | Convex |
| `/inscricoes` | ISR `revalidate = 300` | Convex |
| `/inscricoes/[slug]` | ISR `revalidate = 60` | Convex (vagas mudam) |

**Revalidação on-demand (opcional, ver §15):** quando um aviso de `prioridade
alta` é criado/editado no chrMS, disparar `revalidatePath('/')` via route handler
para evitar aviso urgente preso em cache de 5 min.

---

## 5. Schema Convex

Auditoria realizada (`convex/schema.ts`). Decisões por tabela:

### Manter intactos (zero alteração)
`cultos` (`:391`), `turmas` (`:871`), `inscricoes` (`:909`, pertence a turmas),
`preferencias` (`:380`), `cultoEscalas`. Confirmado que `cultos.status`
(`RASCUNHO`/`PUBLICADO`) é o filtro de visibilidade pública.

### Estender minimamente — `calendarioEventos` (`:767`)
Adicionar `tipo?: v.union('pg','evento','reuniao')` (opcional, não-breaking;
default tratado como `'evento'` na leitura). Permite o filtro preciso de `/agenda`
desde o início (decisão §16.5). Custo: 1 campo opcional + ajuste mínimo na UI atual
de calendário (select de tipo ao criar/editar evento). `cultos` continua mapeando
para `tipo: 'culto'` na query agregadora, sem campo novo.

### Estender minimamente — `avisos` (`:454`)
Campos atuais: `titulo`, `descricao?`, `dataInicio`, `dataFim?`, `criadoPor?
(id membros)`, `criadoEm`, `atualizadoEm?`. Índice `by_dataInicio`.

Proposta de extensão (ambos opcionais, não-breaking):
- `prioridade?: v.union('alta','media','baixa')` — default tratado como `'media'`
  na leitura. **Justificativa vs deduzir por proximidade de `dataInicio`:** a
  proximidade não captura urgência editorial (ex.: mudança de local de um culto
  hoje vs aviso rotineiro que começa hoje). Campo explícito é mais previsível e
  alimenta o destaque visual da home (border-left `#1E3A5F`). Custo: 1 campo
  opcional + ajuste mínimo na UI atual de avisos (§9).
- `corpoMarkdown?: v.string()` — **só adicionar se** `/avisos` (futuro) ou cards
  precisarem de formatação rica. Para os cards da home (descrição curta), o
  `descricao` atual basta. **Recomendação: NÃO adicionar agora** (YAGNI); a home
  usa `descricao` truncado. Registrar como possível extensão futura.

> Nota de eficiência (regra Convex do projeto): a extensão não muda padrão de
> leitura; `avisos.listByData` continua usando `by_dataInicio`.

### Criar novo — genéricos, independentes de `turmas`

Nomenclatura `inscricoesEvento` / `respostasInscricaoEvento` para **não conflitar
com a tabela `inscricoes` atual** (que pertence ao módulo de turmas). Documentado
explicitamente.

**Modelo de dois tipos de campo** (espelha o que `turmas` já faz com
`camposSistema`/`perguntasExtras`, agora generalizado): o criador monta o
formulário escolhendo (a) quais **campos de sistema** solicitar — dados que já
existem no perfil do membro e que, se o inscrito logar, vêm **pré-preenchidos** —
e (b) **campos customizados** arbitrários que ele adiciona/remove livremente.

```ts
inscricoesEvento: defineTable({
  slug: v.string(),
  titulo: v.string(),
  descricao: v.string(),                    // markdown
  ativa: v.boolean(),
  dataAbertura: v.optional(v.number()),
  dataLimite: v.optional(v.number()),
  vagas: v.optional(v.number()),         // null/ausente = ilimitado
  vagasOcupadas: v.number(),             // contador denormalizado (padrão `turmas.vagasOcupadas`); evita .collect() por submissão
  // (a) Campos de perfil a solicitar — pré-preenchidos p/ membro logado.
  //     Mapeiam 1:1 para campos de entidade/membro (ver getMyProfile).
  camposSistema: v.array(v.union(
    v.literal('nomeCompleto'), v.literal('whatsapp'), v.literal('email'),
    v.literal('telefone'), v.literal('dataNascimento'), v.literal('sexo')
  )),
  // (b) Campos arbitrários montados pelo criador no builder.
  camposCustom: v.array(v.object({
    id: v.string(),
    label: v.string(),
    tipo: v.union(
      v.literal('text'), v.literal('email'), v.literal('tel'),
      v.literal('select'), v.literal('textarea'), v.literal('checkbox')
    ),
    obrigatorio: v.boolean(),
    opcoes: v.optional(v.array(v.string())),
    placeholder: v.optional(v.string()),
  })),
  criadoPor: v.optional(v.id('membros')),   // alinhado ao padrão (avisos usa id membros), NÃO id users
  criadoEm: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_ativa_dataAbertura', ['ativa', 'dataAbertura']),

respostasInscricaoEvento: defineTable({
  inscricaoId: v.id('inscricoesEvento'),
  membroId: v.optional(v.id('membros')),    // preenchido (server-side, via auth) se o inscrito logou
  dadosSistema: v.optional(v.object({       // valores dos camposSistema (do perfil ou digitados)
    nomeCompleto: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
    telefone: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.string()),
  })),
  dadosCustom: v.any(),                      // { [campoId]: valor } — validado contra camposCustom na escrita
  status: v.union(v.literal('CONFIRMADA'), v.literal('LISTA_ESPERA')),  // vagas esgotadas → LISTA_ESPERA (§16.6)
  lgpdConsentimento: v.boolean(),
  ipHash: v.string(),                        // hash de IP (nunca IP cru) p/ rate limit
  criadoEm: v.number(),
})
  .index('by_inscricao', ['inscricaoId'])
  .index('by_inscricao_status', ['inscricaoId', 'status'])
  .index('by_ipHash_criadoEm', ['ipHash', 'criadoEm']),
```

**Divergências do brief documentadas:**
- `criadoPor` → `v.id('membros')` (padrão real; `avisos.criadoPor` é `id membros`)
  em vez de `v.id('users')` do brief. Decisão em §16.
- `campos[]` único do brief → **`camposSistema` + `camposCustom`** para suportar o
  pré-preenchimento de membro logado (requisito do produto).
- `dadosCustom: v.any()` aceitável: resposta não é lida em query reativa pública;
  só no admin sob demanda. Validar formato na escrita.
- `ipHash` exige segredo de hashing (env `INSCRICOES_IP_SALT` no Convex).
  Documentado em §10/§15.

---

## 6. Queries e mutations Convex

Convenção: queries verdadeiramente públicas vivem sob `convex/public/*`
(namespace `public.*`), sem `getAuthUserId`/`requirePermission`. Cada uma audita
explicitamente o payload de retorno (não vazar campos sensíveis).

### Novas públicas (`public.*`)
```ts
public.agenda.proximos(limit)        // agrega cultos(PUBLICADO) + calendarioEventos futuros, ordena por data
public.agenda.list({ tipo? })        // agenda completa futura; tipo ∈ culto|pg|evento|reuniao
public.avisos.listProximaSemana()    // top 4: avisos VIGENTES hoje (dataInicio<=hoje<=dataFim||dataInicio), ordena prioridade (alta>media>baixa) depois dataInicio
public.inscricoesEvento.listAtivas() // ativa=true e (dataLimite ausente ou futura), ordena por dataLimite
public.inscricoesEvento.getBySlug(slug)
```

**`public.agenda.*` — detalhe.** Une duas fontes:
- `cultos` via `by_status_data`, filtrando `status === 'PUBLICADO'` e `data >=
  hoje`. **Corrige a lacuna** apontada em `escalas.listCultos` (que não filtra
  status). Mapeia para `tipo: 'culto'`.
- `calendarioEventos` via `by_data`, `data >= hoje`. Usa o novo campo `tipo`
  (`pg|evento|reuniao`; default `'evento'` se ausente em registros antigos).
- Retorno enxuto: `{ id, titulo, subtitulo?, data, horario?, tipo }`. **Sem
  `local`** — nem `cultos` nem `calendarioEventos` têm esse campo (só `turmas` tem);
  o local fixo da igreja vem de `preferencias.getIgrejaInfo` no rodapé/visite.
  `subtitulo` = `descricao` (calendarioEventos) ou `observacoes`/tema (culto).
  **Não incluir** escalas, nomes de membros nem fotos (evita o vazamento de foto de
  membro apontado na auditoria).

### Submissão pública: route handler → mutation

**Correção de arquitetura (revisão):** uma mutation Convex **não recebe o IP do
browser** — `ctx` não expõe headers do request do cliente. O padrão real do projeto
é capturar o IP num **route handler Next.js** (`app/api/convidado-acesso/route.ts:19`
lê `x-forwarded-for`) e repassar via `ConvexHttpClient`. Portanto a submissão
**não** usa `useMutation` direto.

Fluxo: `POST /api/inscricoes/responder` (novo route handler) →
1. lê `x-forwarded-for`/`x-real-ip`; gera `ipHash = sha256(ip + INSCRICOES_IP_SALT)`
   com `node:crypto` (server-side; IP cru nunca sai do handler);
2. obtém o token de auth da sessão via `convexAuthNextjsToken()`
   (`@convex-dev/auth/nextjs/server`) — presente só se o inscrito logou;
3. `new ConvexHttpClient(...).setAuth(token?)` e chama a mutation abaixo.

A rota `/api/inscricoes/responder` entra na **whitelist do middleware** (como
`/api/convidado-acesso`).

```ts
public.inscricoesEvento.responder({ slug, dadosCustom, lgpdConsentimento, website /*honeypot*/, ipHash })
```
- **Auth opcional (membro logado):** a mutation chama `getAuthUserId(ctx)` (resolve
  via token propagado pelo handler). Se houver sessão, resolve o `membroId` **no
  servidor** e **deriva `dadosSistema` do perfil real** (`getMyProfile`) — o client
  não envia dados de sistema de membro logado (são read-only, §7.6/§8). Anônimo:
  `dadosSistema` vem do form.
- **Honeypot:** `website` deve vir vazio; se preenchido, retorna sucesso falso
  (silencioso) sem gravar.
- **Rate limit:** máx. 5/h por `ipHash` (`by_ipHash_criadoEm`, range última hora).
- **Validação server:** dinâmica a partir de `camposSistema` + `camposCustom`
  (obrigatórios presentes, `email`/`tel` com formato, `select` dentro de `opcoes`).
  LGPD obrigatório (`true`).
- **Dedup:** por `membroId` (se logado) **ou** por email/whatsapp (mesma ideia de
  `turmas.registrar`; preferir índice a `.collect()` amplo).
- **Vagas:** usa o contador `vagasOcupadas`. Se `vagas` definido e
  `vagasOcupadas >= vagas` → grava `status: 'LISTA_ESPERA'`; senão `'CONFIRMADA'` +
  `patch(vagasOcupadas + 1)` (idêntico a `turmas.registrar:222-229`). Resposta
  informa ao inscrito em qual situação ficou.

### Reaproveitar (já existem)
- `membros.selfService.getMyProfile` (**autenticada**, `convex/membros/selfService.ts:20`)
  — retorna membro + entidade (nomeCompleto, whatsapp/telefone, email,
  dataNascimento, sexo). O `<InscricaoForm>` a consome **quando o inscrito está
  logado** para pré-preencher os `camposSistema`. Sem login, não é chamada.
- `avisos.listByData(data)` — `convex/avisos/queries.ts`. Encapsular sob
  `public.avisos` se conveniente, sem reescrever a lógica.
- `preferencias.getIgrejaInfo()` — nome, foto, endereço, horários, contato, PIX.
- `turmas.listTurmasAbertas()` — pode aparecer na home junto às inscrições de
  evento (cursos continuam sendo um tipo de "inscrição aberta").

### Privadas (apenas chrMS autenticado, RBAC)
```ts
inscricoesEvento.criar / atualizar / encerrar          // permissão: ver §9
respostasInscricaoEvento.listar(inscricaoId)            // criador + admin
respostasInscricaoEvento.exportCsv(inscricaoId)         // criador + admin (ou montar CSV no client)
```

---

## 7. Páginas — especificação visual

Paleta literal (do brief): off-white `#FAFAF7`, areia `#F4F0E8`, borda `#E5E3DC`,
tinta `#1A1A1A`, cinza texto `#595959`, marinho `#1E3A5F`, preto rodapé
`#0A0A0A`/`#0A0A0A`, creme rodapé `#E8E4D8`, cinza rodapé `#8A8A8A`. Tipografia:
Spectral (serif, títulos/editorial) + Source Sans 3 (sans, UI/corpo).

### 7.1 Home (`/`) — refatorar a landing atual

**Atual:** existe, `fetchQuery(api.turmas.queries.listTurmasAbertas)` server-side,
`revalidate = 300`, Spectral + Source Sans 3, conteúdo React puro. **Refatoração:
manter o que funciona, adicionar blocos.**

**Header sticky** (64px desktop / 56px mobile):
- Fundo `#FAFAF7`, `backdrop-filter: blur(12px)` quando `scroll > 0`.
- `border-bottom: 0.5px solid #E5E3DC` quando scrolled.
- Logo IPC esquerda: moldura retangular borda 1.5px, padding 4px 10px, "ipc"
  Spectral 500 16px, `#1A1A1A`.
- Nav central: 5 links Source Sans 3 13px `#595959`: `Quem somos · Trajetória ·
  Agenda · Visite · Inscrições`.
- Botão "Área de membros →" direita: borda 1px `#1A1A1A`, padding 6px 14px,
  Source Sans 3 12px → `/dashboard`.

**Hero** (padding 64px topo / 48px laterais / 48px fundo):
- Pré-título Source Sans 3 11px uppercase `#595959` letter-spacing 0.1em:
  "Igreja Presbiteriana do Caminho · São Paulo".
- Headline Spectral 38px peso 400 line-height 1.15 `#1A1A1A` letter-spacing
  -0.02em max-width 540px, duas linhas: "Uma comunidade bíblica de discipulado," /
  "participando da missão de Deus neste mundo."
- Subheadline Spectral 16px itálico `#595959` max-width 480px: "Presbiteriana.
  Pequena por escolha. No centro de São Paulo."
- CTAs: primário "Quero conhecer →" (borda 1.5px `#1A1A1A`, padding 10px 20px,
  Source Sans 3 13px → `/visite`); secundário "Sou membro" (Source Sans 3 13px,
  border-bottom 1px `#1A1A1A` → `/dashboard`).

**Bloco "Esta semana"** (padding 48px lat / 48px topo / 32px fundo, border-top
0.5px):
- H2 "Esta semana" Spectral 22px peso 400 + link "Ver todos os avisos →" Source
  Sans 3 12px `#595959`.
- Grid 4 col desktop / 2 col tablet / 1 col mobile, gap 16px.
- `AvisoCard`: branco, borda 0.5px `#E5E3DC`, padding 16px 18px; se `prioridade
  === 'alta'` → `border-left: 2px #1E3A5F`. Meta Source Sans 3 10px uppercase
  letter-spacing 0.08em (`#1E3A5F` se alta, senão `#595959`). Título Spectral 14px
  500. Descrição Source Sans 3 12px `#595959` line-height 1.5.
- **Carrega** `public.avisos.listProximaSemana()` (top 4). **Vazio:** oculta o
  bloco inteiro.

**Bloco "Próximos eventos"** (padding 48px, border-top 0.5px):
- H2 "Próximos eventos" Spectral 22px + link "Agenda completa →" → `/agenda`.
- Lista vertical gap 0. `EventoLinha`: grid `100px 1fr auto` gap 24px, padding
  14px 0, border-bottom 0.5px `#E5E3DC`. Data/hora Source Sans 3 12px uppercase
  `#595959` ("Dom · 10h"). Título Spectral 15px + subtítulo Source Sans 3 12px
  `#595959`. Badge tipo Source Sans 3 11px `#595959`, borda 0.5px, padding 2px 8px.
- **Carrega** `public.agenda.proximos(4)`. **Vazio:** oculta o bloco.

**Bloco "Sobre + Inscrições"** (padding 56px 48px, border-top 0.5px, background
`#F4F0E8`), grid 2 col iguais gap 48px:
- Esquerda: eyebrow "Sobre nós" Source Sans 3 11px uppercase `#595959`; parágrafo
  Spectral 18px `#1A1A1A` line-height 1.5 max-width 380px: "Somos uma comunidade
  aprendendo, junto, a se parecer com Cristo — começando pela segunda-feira."; link
  "Conheça nossa comunidade →" → `/quem-somos`.
- Direita: eyebrow "Inscrições abertas"; flex column gap 12px; `InscricaoCard`
  (branco, borda 0.5px, padding 14px 16px): título Spectral 14px 500, meta Source
  Sans 3 11px `#595959` "Até [data] · [N] vagas"; card inteiro → `/inscricoes/[slug]`.
- **Carrega** `public.inscricoesEvento.listAtivas()` (top 3). **Vazio:** oculta a
  coluna direita, esquerda expande.

**Footer** (padding 56px 48px 40px, background `#0A0A0A`, color `#E8E4D8`), grid 4
col `2fr 1fr 1fr 1fr` gap 32px:
- Col 1: logo invertido (borda 1.5px `#E8E4D8`, padding 6px 12px, Spectral 18px) +
  tagline Spectral 14px max-width 280px.
- Col 2 "Liderança": eyebrow + Pastor / Conselho / Diaconia, Source Sans 3 12px
  `#E8E4D8` (dados de `preferencias.getIgrejaInfo`; `[PREENCHER]` se ausente).
- Col 3 "Contato": eyebrow + endereço + email, Source Sans 3 12px (de
  `preferencias`).
- Col 4 "Tradição": eyebrow + "Presbiteriana reformada. Westminster, 1647." Source
  Sans 3 12px line-height 1.5.
- Border-top `rgba(255,255,255,0.12)`. Copyright esquerda + "Voltar ao topo ↑"
  direita, Source Sans 3 11px `#8A8A8A`.

> Mobile (regra `mobile-ux.md`): base mobile, `md:`/`lg:` para desktop. Grids 3/4
> col colapsam para 1 col; header 56px; tap targets ≥44px nos CTAs e cards-link.

### 7.2 Quem somos (`/quem-somos`)
MDX (`content/quem-somos.mdx`). One-page editorial: Hero → Eixos → Contraste →
Cremos → Vivemos → Mundo. Conteúdo do brief externo (colado na implementação;
`[PREENCHER]` até lá). Layout próprio com seções **full-bleed** — o
`(public)/layout.tsx` não pode constranger a página num container fixo. Solução
(§8 `<MDXLayout fullBleed>`): o layout público aplica container só ao chrome
(header/footer); o `children` MDX recebe a largura total e cada seção gerencia seu
próprio padding/max-width interno.

### 7.3 Trajetória (`/trajetoria`)
Placeholder. MDX (`content/trajetoria.mdx`) com "em construção" elegante (não erro
404). Rota existe para URL estável; conteúdo vem em PR posterior.

### 7.4 Agenda (`/agenda`)
Lista completa de eventos públicos futuros. Filtros por tipo `culto | pg | evento
| reuniao` (chips no topo; estado em URL via **nuqs**, ex. `?tipo=culto`). Layout
lista vertical, mesmo padrão visual de `EventoLinha` da home. **Carrega**
`public.agenda.list({ tipo? })`. **Vazio:** "Nenhum evento programado." Loading:
skeleton de linhas.

### 7.5 Visite (`/visite`)
MDX (`content/visite.mdx`) + dados práticos de `preferencias.getIgrejaInfo`
(endereço, horário, mapa embed). Parágrafo da Ceia com tratamento especial
(`<CeiaQuote />`): border-left 2px `#1E3A5F`, padding-left 32px, Spectral 20px
itálico. "O que esperar" em lista.

### 7.6 Inscrições (`/inscricoes` e `/inscricoes/[slug]`)
**`/inscricoes`:** grid 2 col desktop / 1 mobile de inscrições ativas;
`InscricaoCard` com título, descrição curta, deadline, vagas, "Inscrever-se".
Vazio: "Não há inscrições abertas no momento. As próximas serão publicadas aqui."

**`/inscricoes/[slug]`:** header com título + descrição completa (markdown
renderizado); `<InscricaoForm />` dinâmico baseado em `camposSistema` +
`camposCustom`.

**Identificação como membro (opcional, agiliza):** acima do formulário, um bloco
"É membro da IPC? **Entre para preencher mais rápido**".
- **Não logado:** o inscrito preenche todos os campos solicitados (sistema +
  custom). Pode tocar em "Entrar" → abre um **modal inline** (`Dialog` shadcn) com
  o login WhatsApp OTP em 2 passos (telefone → código), reconstruído a partir da
  lógica do `/signin`; sem trocar de rota. Ao confirmar, o modal fecha e o estado
  de auth atualiza (o `(public)` já está dentro do `ConvexAuthProvider` global).
- **Logado (membro):** o form chama `membros.selfService.getMyProfile` (dados em
  `profile.entidade.*`) e **pré-preenche** os `camposSistema`, exibidos **somente
  leitura** (para corrigir, o membro edita no perfil). O inscrito completa apenas os
  campos custom. O vínculo `membroId` é resolvido no servidor. Mostra "Inscrevendo
  como **[nome]**" + sair.
  - **Exceção (campo vazio no perfil):** campos de entidade são opcionais — se um
    `campoSistema` solicitado estiver **ausente** no perfil, ele aparece
    **editável** (não read-only) com dica "complete no seu perfil depois". Evita
    travar um membro com, p.ex., e-mail em branco num campo obrigatório.

Estados `idle → submitting → success | error`. Sucesso: confirmação inline, sem
redirect (e informa se ficou `CONFIRMADA` ou em `LISTA_ESPERA`). Anti-spam:
honeypot invisível + rate limit por `ipHash` (5/h). LGPD: checkbox obrigatório com
link para **`/privacidade`**. **Carrega** `public.inscricoesEvento.getBySlug(slug)`;
**Submete** `public.inscricoesEvento.responder(...)`. Slug inexistente/encerrada →
estado "inscrição não encontrada/encerrada" (não crash).

---

## 8. Componentes a construir

Signatures TypeScript propostas (Server Component salvo indicação).

```ts
<HeaderPublico />                                 // server + ilha client p/ scroll effect (blur/border)
<FooterPublico igrejaInfo={IgrejaInfo} />         // server
<HomeHero />                                      // server
<AvisosBloco avisos={Aviso[]} />                  // server
<AgendaBloco eventos={EventoPublico[]} />         // server
<SobreInscricoesBloco inscricoes={InscricaoEvento[]} />  // server
<AvisoCard aviso={Aviso} />                       // server
<EventoLinha evento={EventoPublico} />            // server
<InscricaoCard inscricao={InscricaoEvento} />     // server
<InscricaoForm inscricao={InscricaoEvento} />     // client (RHF + Zod dinâmico; auth opcional + pré-preenchimento)
<LoginModalInline open onOpenChange />            // client (Dialog + WhatsApp OTP 2 passos, reusa /signin)
<CeiaQuote />                                      // server (em /visite)
<MDXLayout fullBleed?: boolean>{children}</MDXLayout>  // wrapper de páginas MDX
```

- `<InscricaoForm>`: usa shadcn `button, input, textarea, select, checkbox, label,
  card` (todos já existem em `shared/components/ui/`). Gera schema Zod em runtime
  a partir de `camposSistema` + `camposCustom`; honeypot field `website` com
  `aria-hidden` + estilo off-screen; **submit faz `fetch('POST /api/inscricoes/
  responder')`** (route handler captura IP→`ipHash` e propaga auth — §6), **não**
  `useMutation` direto; em sucesso troca o form pela confirmação inline (informando
  CONFIRMADA/LISTA_ESPERA).
- **Auth opcional:** lê `useConvexAuth()`; se autenticado, dispara
  `getMyProfile` (`useQuery`) e popula os `camposSistema` (exibidos **read-only**).
  Anônimo: bloco "Entrar para preencher mais rápido" que abre `<LoginModalInline>`.
  Logado: "Inscrevendo como [nome]" + sair. `membroId` nunca vem do client
  (resolvido na mutation).
- `<LoginModalInline>`: **client**. `Dialog` shadcn com o login WhatsApp OTP em 2
  passos (telefone → código de 6 dígitos), reusando a lógica do `/signin`
  (`useAuthActions().signIn` com provider `whatsapp-otp`). Fecha ao autenticar; não
  troca de rota. Escopo: só login simples (não os modos senha/primeiro-acesso do
  `/signin`).
- Localização sugerida: `features/site-publico/components/` (componentes) e
  `app/(public)/**` (rotas), seguindo organização feature-based do projeto.

---

## 9. Editor admin (lado autenticado, no chrMS)

Rotas novas dentro de `(app)` (na prática `app/(ready)/admin/site-publico/...`,
seguindo a estrutura real — não há group `(app)`):
- `/admin/site-publico/inscricoes` — CRUD de `inscricoesEvento` com **builder de
  formulário**. Quem tem acesso monta o form em duas partes:
  - **Campos de sistema** (`camposSistema`): seletor (checkboxes/toggles) de quais
    dados de perfil solicitar — nomeCompleto, whatsapp, email, telefone,
    dataNascimento, sexo. Cada um vem com o aviso de que, **se o inscrito for
    membro e logar, esse campo já estará pré-preenchido** (não precisa recriá-lo
    como campo custom). Reforça: "Membros não digitam de novo o que já temos."
  - **Campos customizados** (`camposCustom`): adicionar/remover/reordenar campos
    livremente (tipo, label, obrigatório, opções p/ select, placeholder).
  - Demais metadados: slug (gerado do título, editável), título, descrição
    (markdown), datas de abertura/limite, vagas, ativa.
- `/admin/site-publico/inscricoes/[id]/respostas` — tabela de submissões (TanStack
  Table, já no projeto) com colunas de **status** (`CONFIRMADA`/`LISTA_ESPERA`) e
  origem **membro** (vínculo `membroId`) vs anônimo; export CSV.

Avisos e eventos **continuam editáveis pelas interfaces atuais** — não criar UI
nova. Única adição: o campo opcional `prioridade` na UI atual de avisos (select
alta/média/baixa).

**RBAC (decidido — §16.4):** adicionar a permission nova **`site_publico:manage`**
ao enum `Permission` (`types/auth.ts`), concedida a `admin`, `pastor` e
`secretario_executivo`. É a **única** alteração de RBAC do projeto (aditiva). Roles
reais auditadas: `admin, pastor, presbitero, obreiro, secretaria,
secretario_executivo, membro` (não existe "LIDERANCA").
- Leitura de respostas: criador da inscrição (`criadoPor === membroId`) **ou** quem
  tem `site_publico:manage`. Ownership check no backend.
- **Auditoria (regra do projeto):** `criar/atualizar/encerrar` de `inscricoesEvento`
  registram via `createActionAuditLog`/`createFieldAuditLogs` (padrão de
  `turmas/mutations.ts`). A submissão pública de resposta também gera log de ação.
- **DevContext (regra do projeto):** cada página nova (públicas + admin) deve entrar
  no `CONTEXT_MAP` de `shared/components/layout/DevContext.tsx`, com rota dinâmica
  (`/inscricoes/[slug]`, `/admin/site-publico/inscricoes/[id]/respostas`) registrada
  em `resolveRoute()`. Incluído nos critérios de aceite dos PRs.

---

## 10. Stack e dependências

**Já existe (auditado):** Next 16.1.6, React 19.2.3, Tailwind v4,
`react-hook-form` ^7.71.2, `zod` ^4.3.6 (`import { z } from "zod/v4"`),
`@tanstack/react-table` ^8.21.3, `nuqs` ^2.8.9, Convex ^1.32, `@convex-dev/auth`
^0.0.91, shadcn/ui (37 componentes em `shared/components/ui/`, incluindo todos os
do form), fontes Spectral + Source Sans 3 + Geist.

**Adicionar:**
- `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`.
- **Nada mais** — RHF e Zod já presentes (o brief permitia "se não existir";
  existem).

**Env nova (Next.js server, NÃO `NEXT_PUBLIC`):** `INSCRICOES_IP_SALT` — segredo
usado no route handler `/api/inscricoes/responder` para gerar `ipHash` com
`node:crypto` (o hash é feito no handler, não no Convex, pois é lá que o IP existe).

---

## 11. SEO e metadata

`metadata` por rota (App Router `export const metadata` / `generateMetadata`):
- `/`: title "Igreja Presbiteriana do Caminho — São Paulo" + description.
- `/quem-somos`: "Quem somos — IPC". `/trajetoria`: "Trajetória — IPC".
- `/agenda`: "Agenda — IPC". `/visite`: "Visite — IPC". `/inscricoes`:
  "Inscrições — IPC".
- `/inscricoes/[slug]`: title dinâmico = título da inscrição.

Outros artefatos (todos inexistentes hoje, criar):
- OG image dinâmica: `app/(public)/opengraph-image.tsx` via `ImageResponse`
  (importante: WhatsApp é canal principal da igreja — preview decente ao
  compartilhar).
- JSON-LD `@type: "Church"` no `(public)/layout.tsx` com dados de
  `preferencias.getIgrejaInfo` (nome, endereço, geo, horários de culto).
- `app/sitemap.ts` com as rotas públicas (`/`, `/quem-somos`, `/trajetoria`,
  `/agenda`, `/visite`, `/inscricoes`, `/privacidade`). Slugs de inscrição podem
  entrar dinamicamente.
- `app/robots.ts` permissivo (bloqueando apenas rotas autenticadas).

---

## 12. Performance

- Meta Lighthouse 100/100/100/100 nas rotas públicas.
- Bundle JS público alvo < 50kb gzip — favorecer Server Components; única ilha
  client significativa é `<InscricaoForm>` (carregada só em `/inscricoes/[slug]`)
  e o efeito de scroll do header.
- Cache por rota conforme §4.
- `next/image` em qualquer foto (hero, etc.); `cdn.yhc.com.br` já liberado em
  `next.config.ts:images`.
- MDX é estático (SSG) → custo zero de runtime.

---

## 13. Acessibilidade (WCAG 2.1 AA)

- Único `<h1>` por página.
- Skip link ("Pular para o conteúdo") no topo de cada página pública.
- Focus states visíveis em links, botões, campos.
- `prefers-reduced-motion`: desativar blur/transições do header e qualquer
  animação.
- Contraste auditado nas seções `#F4F0E8` (texto `#1A1A1A`/`#595959`) e `#0A0A0A`
  (texto `#E8E4D8`/`#8A8A8A` — verificar `#8A8A8A` sobre preto: ~5.4:1, passa AA
  para texto normal; confirmar).
- Form: `<label>` associado a cada campo, `aria-invalid` + mensagem de erro
  ligada por `aria-describedby`, honeypot `aria-hidden`.
- Chips de filtro da agenda navegáveis por teclado.

---

## 14. Plano de execução em PRs

6 PRs pequenos e sequenciáveis. Esforço: S (≤0,5d), M (~1d), L (~2d).

### PR 1 — Shell público
- **Escopo:** `<HeaderPublico>` + `<FooterPublico>` em `(public)/layout.tsx`;
  whitelist do middleware ganha as 5 rotas; páginas placeholder de `/quem-somos`,
  `/trajetoria`, `/agenda`, `/visite`, `/inscricoes`. `FooterPublico` lê
  `preferencias.getIgrejaInfo`.
- **Dependências:** nenhuma.
- **Aceite:** [ ] nav navega entre as rotas sem redirect p/ `/signin`; [ ] header
  fica sticky com blur no scroll; [ ] footer mostra contato real; [ ] landing
  atual intacta (sem regressão visual no hero/seções existentes); [ ] mobile 390px
  ok.
- **Risco chrMS:** baixo — só toca `(public)` e a whitelist do middleware
  (verificar que regex novo não captura rotas autenticadas).
- **Esforço:** M.

### PR 2 — MDX + páginas estáticas
- **Escopo:** `@next/mdx` no `next.config.ts` + deps; `content/quem-somos.mdx`,
  `trajetoria.mdx`, `visite.mdx` (placeholders); `<MDXLayout fullBleed>`;
  `<CeiaQuote>`; `/visite` puxa dados de `preferencias`; **`/privacidade`** (texto
  LGPD padrão simples — usado pelo checkbox do form de inscrição).
- **Dependências:** PR 1 (layout/chrome).
- **Aceite:** [ ] 4 rotas estáticas renderizam SSG (incl. `/privacidade`); [ ]
  `/quem-somos` permite seções full-bleed dentro do layout; [ ] `/visite` mostra
  endereço/horário reais; [ ] build sem erro de `pageExtensions`.
- **Risco chrMS:** baixo — `pageExtensions` afeta resolução de rotas; validar que
  rotas `.tsx` existentes continuam funcionando.
- **Esforço:** M.

### PR 3 — `/agenda` + query agregadora
- **Escopo:** campo `tipo?` (`pg|evento|reuniao`) em `calendarioEventos` +
  select de tipo na UI atual de calendário; `public.agenda.proximos(limit)` e
  `public.agenda.list({tipo?})` unindo `cultos`(PUBLICADO) + `calendarioEventos`
  futuros; página `/agenda` com chips de filtro (nuqs); `<AgendaBloco>`/`<EventoLinha>`.
- **Dependências:** PR 1. **Toca `schema.ts`** → não paralelizar com PR 4
  (`worktree-parallel.md`); sequenciar PR 3 antes de PR 4.
- **Aceite:** [ ] nenhum culto `RASCUNHO` aparece; [ ] filtro por tipo reflete na
  URL; [ ] eventos antigos sem `tipo` caem em `evento`; [ ] payload não inclui
  escalas/fotos de membros; [ ] ISR 900s; [ ] vazio tratado.
- **Risco chrMS:** médio — adiciona campo opcional em `calendarioEventos`
  (`schema.ts`) e toca a UI de calendário; aditivo e não-breaking.
- **Esforço:** M.

### PR 4 — Schema inscrições genéricas + backend
- **Escopo:** tabelas `inscricoesEvento` (com `camposSistema`, `camposCustom`,
  `vagasOcupadas`) + `respostasInscricaoEvento` (com `membroId?`,
  `dadosSistema`/`dadosCustom`, `status` CONFIRMADA/LISTA_ESPERA) no schema;
  `public.inscricoesEvento.{listAtivas,getBySlug,responder}`; **route handler
  `/api/inscricoes/responder`** (captura IP → `ipHash` com `INSCRICOES_IP_SALT`;
  propaga auth via `convexAuthNextjsToken`); mutations privadas
  `criar/atualizar/encerrar` + `respostas.listar` (com auditoria); rate limit por
  `ipHash`, honeypot, validação Zod dinâmica server; resolução de `membroId` via
  `getAuthUserId`; alocação de vaga via contador `vagasOcupadas`; nova permission
  `site_publico:manage` (admin, pastor, secretario_executivo).
- **Dependências:** nenhuma de frontend; isola o schema (consultar regra
  `worktree-parallel.md`: `schema.ts` é danger zone — não editar em paralelo com
  outro PR que toque schema). **Sequenciar sozinho.**
- **Aceite:** [ ] rate limit bloqueia 6ª submissão/h; [ ] honeypot descarta bot;
  [ ] validação rejeita campo obrigatório ausente / email inválido / opção fora de
  `opcoes`; [ ] LGPD obrigatório; [ ] IP nunca gravado cru; [ ] submissão logada
  grava `membroId` resolvido no servidor (não do client); [ ] ao esgotar vagas,
  nova resposta vira `LISTA_ESPERA`; [ ] RBAC barra não autorizados nas mutations
  privadas.
- **Risco chrMS:** **médio** — toca `convex/schema.ts` (todos os módulos) e
  `types/auth.ts` (permission nova). Coordenar conforme `workflow-analysis.md`.
- **Esforço:** L.

### PR 5 — Inscrições: público + builder admin
- **Escopo:** hub `/inscricoes` (`<InscricaoCard>`), página `[slug]`,
  `<InscricaoForm>` (RHF + Zod dinâmico, estados, confirmação inline com
  CONFIRMADA/LISTA_ESPERA, honeypot, LGPD link `/privacidade`, **auth opcional +
  pré-preenchimento read-only via `getMyProfile`**), `<LoginModalInline>` (Dialog +
  WhatsApp OTP 2 passos, reusa lógica do `/signin`); ISR 300/60. **Builder admin**
  `/admin/site-publico/inscricoes` (CRUD com seletor de `camposSistema` + editor de
  `camposCustom`, com o lembrete de pré-preenchimento p/ membros).
- **Dependências:** PR 4 (backend + schema).
- **Aceite:** [ ] form renderiza todos os tipos de campo; [ ] membro logado tem
  `camposSistema` pré-preenchidos **read-only** e completa só os custom; [ ]
  anônimo loga pelo **modal inline** (sem trocar de rota) e o form atualiza; [ ]
  builder adiciona/remove campos custom e seleciona campos de sistema; [ ]
  validação client espelha server; [ ] sucesso inline sem redirect; [ ] slug
  inexistente tratado; [ ] mobile usa Drawer/coluna única conforme `mobile-ux.md`.
- **Risco chrMS:** baixo (admin novo isolado em `(ready)/admin`); modal reusa auth
  existente sem alterá-la.
- **Esforço:** L (modal de login adiciona esforço — §16.11).

### PR 6 — Home dinâmica + admin de respostas
- **Escopo:** refatorar `/` adicionando "Esta semana" (`public.avisos.
  listProximaSemana`, top 4) e "Próximos eventos" (`public.agenda.proximos(4)`) e
  "Sobre + Inscrições" (`listAtivas` top 3); `prioridade` na UI atual de avisos;
  admin `/admin/site-publico/inscricoes/[id]/respostas` com export CSV; SEO (§11:
  sitemap, robots, OG image, JSON-LD); revalidação on-demand para aviso de
  prioridade alta (opcional); atualizar `DevContext`.
- **Dependências:** PR 3 (agenda), PR 4 (inscrições/avisos.prioridade).
- **Aceite:** [ ] blocos somem quando vazios; [ ] aviso `alta` destacado; [ ]
  export CSV correto; [ ] OG image renderiza; [ ] Lighthouse ≥95 nas públicas.
- **Risco chrMS:** baixo–médio (mexe na landing em prod e na UI de avisos —
  revisar no preview da branch antes do main, `mobile-ux.md` §3).
- **Esforço:** L.

---

## 15. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Quebrar landing atual ao adicionar header/footer | Revisar no preview da branch (Vercel) + screenshot 390px/1280px antes do merge (`mobile-ux.md`). |
| Expor `RASCUNHO` em `/agenda` | `public.agenda.*` filtra `status === 'PUBLICADO'` explicitamente. |
| Spam em forms públicos | Honeypot + rate limit por `ipHash` (5/h) + LGPD obrigatório. |
| Queries públicas vazarem dado sensível | Auditar retorno de cada query `public.*`; agenda **não** retorna escalas/fotos/membros; igreja só expõe `igreja.*`. |
| Cache stale com aviso urgente | `revalidatePath('/')` on-demand quando aviso `prioridade alta` é criado/editado. |
| IP cru armazenado (LGPD) | Só `ipHash` (SHA-256 com `INSCRICOES_IP_SALT`); nunca IP puro. |
| `schema.ts` é danger zone | PR 3 (campo `tipo`) e PR 4 (tabelas novas) tocam schema — sequenciar (PR 3 → PR 4), nunca em paralelo (`worktree-parallel.md`). |
| RBAC alterado | Decidido: 1 permission aditiva `site_publico:manage` (admin/pastor/sec.exec). Sem herança nem remoção; baixo risco de regressão. |
| Login no form reconstrói OTP | `<LoginModalInline>` reusa `useAuthActions().signIn` (provider `whatsapp-otp`) sem tocar a auth; só recompõe a UI dos 2 passos. |
| `pageExtensions` (MDX) quebrar rotas `.tsx` | Incluir `tsx` no array; validar build no PR 2. |
| **MDX sob Turbopack (Next 16)** | dev/build usam Turbopack; `@next/mdx` é suportado, mas plugins remark/rehype precisam ser referenciados **por string** (não função) no Turbopack. Manter MDX simples; validar `next build` logo no início do PR 2 (risco de viabilidade — se falhar, avaliar conteúdo em `.tsx`). |
| **IP indisponível em mutation Convex** | Capturar IP em route handler `/api/inscricoes/responder` (`x-forwarded-for`) e passar `ipHash`; mutation não recebe IP do browser (precedente `convidado-acesso`). |
| Membro logado travado em campo read-only vazio | `campoSistema` ausente no perfil vira editável (§7.6); só fica read-only quando há valor. |
| Contagem de vagas custosa por submissão | Contador denormalizado `vagasOcupadas` (patch), não `.collect()` (padrão `turmas`). |

---

## 16. Decisões resolvidas

Todas as decisões foram fechadas. Os impactos já estão propagados nas seções
indicadas.

1. **"Sou membro" (hero):** sempre → `/dashboard` (middleware redireciona
   não-autenticado p/ `/signin`). [§7.1]
2. **Limites na home:** avisos **4** · eventos **4** · inscrições **3**. [§7.1]
3. **`criadoPor` em `inscricoesEvento`:** `v.id('membros')` (padrão do projeto). [§5]
4. **RBAC:** criar permission **`site_publico:manage`**, concedida a `admin`,
   `pastor`, `secretario_executivo`. [§9]
5. **`tipo` em `/agenda`:** **adicionar campo `tipo` opcional** em
   `calendarioEventos` (aditivo, não-breaking) + ajuste mínimo na UI atual de
   calendário. Filtro preciso desde o início. [§5, §6, §7.4, §9, §14 PR3]
6. **Vagas esgotadas:** aceitar em **lista de espera** (campo `status`
   confirmada/lista_espera em `respostasInscricaoEvento`). [§5, §6, §9]
7. **`corpoMarkdown` em `avisos`:** **adiar** (YAGNI; home usa `descricao`). [§5]
8. **Política de privacidade (LGPD):** **redigir texto padrão simples** numa nova
   rota estática **`/privacidade`**; checkbox do form linka para ela. [§4, §7, §11,
   §14 PR2]
9. **`ipdocaminho.com` na Vercel:** configurar **perto do lançamento**;
   desenvolvimento roda em `ipc-pi-ten.vercel.app`/preview. [§4]
10. **Conteúdo `/quem-somos` (BRIEF-v3):** colado na implementação do PR 2.
11. **Login no form de inscrição:** **modal inline** (`Dialog` shadcn) com o passo
    telefone→código reconstruído a partir do `/signin`; sem trocar de rota. Custo
    extra registrado no PR 5. [§7.6, §8, §14 PR5]
12. **Campos de sistema pré-preenchidos:** **somente leitura** no form (membro
    corrige no perfil); `membroId` resolvido no servidor. [§7.6, §8]
13. **Catálogo de campos de sistema:** apenas os 6 (nomeCompleto, whatsapp, email,
    telefone, dataNascimento, sexo), todos vindos de `getMyProfile`. [§5]

---

## 17. Notas de revisão técnica (auditoria contra o código)

Ajustes feitos após validar suposições no código real:

1. **Submissão via route handler, não `useMutation`** [§6, §8, §14 PR4/PR5] —
   mutation Convex não recebe IP do browser. Confirmado em
   `app/api/convidado-acesso/route.ts:19-26`. Novo `/api/inscricoes/responder`
   captura IP → `ipHash` (node:crypto + `INSCRICOES_IP_SALT`) e propaga auth via
   `convexAuthNextjsToken()`. Rota entra na whitelist do middleware.
2. **Contador `vagasOcupadas` denormalizado** [§5, §6] — em vez de `.collect()` por
   submissão. Padrão idêntico a `turmas.vagasOcupadas` /
   `turmas/mutations.ts:222-229`.
3. **Campo read-only vazio vira editável** [§7.6] — campos de `entidade` são
   opcionais (`getMyProfile` → `entidade.*` podem ser undefined); read-only só com
   valor presente, senão o membro travaria.
4. **Agenda sem `local`** [§6] — `cultos` e `calendarioEventos` não têm `local`
   (só `turmas`). `subtitulo` = `descricao`/`observacoes`.
5. **Risco MDX × Turbopack** [§15] — dev/build usam `--turbopack` (Next 16.1.6);
   validar `next build` no início do PR 2 (plugins remark/rehype como string).
6. **Números 4/4/3 propagados** [§6, §14 PR6] — `listProximaSemana` top 4,
   `agenda.proximos(4)`, `listAtivas` top 3 (estava 3/3/2 em algumas seções).
7. **Auditoria + DevContext** [§9] — mutations admin auditam
   (`createActionAuditLog`/`createFieldAuditLogs`); páginas novas entram no
   `CONTEXT_MAP`.
8. **Fontes centralizadas** [§4] — Spectral/Source Sans 3 no layout público (hoje a
   landing as redeclara).
9. **`/inscricao/*` (turmas) ≠ `/inscricoes` (novo)** [§4] — rotas distintas; evitar
   colisão de matcher.
10. **`/privacidade` é MDX** [§4] — `content/privacidade.mdx`, não página solta.
11. **Rotas públicas são dinâmicas (`ƒ`), não estáticas** [§4, §12] — descoberto na
    implementação do PR 2: o `ConvexAuthNextjsServerProvider` no **root layout**
    lê o cookie de auth, forçando SSR em todo o app (vale também p/ `/culto`,
    `/subir-audio` etc. já existentes). Não dá p/ tornar SSG sem mexer no root
    (fora de escopo). Mitigação aplicada: dados públicos (igreja) vêm via
    `ConvexHttpClient` dentro de `unstable_cache` (`features/site-publico/lib/
    data.ts`, revalidate 900) — a query Convex roda 1x/15min, não a cada request,
    controlando o custo de bandwidth. Aplicar o mesmo padrão de cache às demais
    leituras públicas (agenda, inscrições) nos PRs 3/5/6.

**Confirmações que validaram o plano:** `getMyProfile` retorna `{...membro,
entidade}` (`convex/membros/selfService.ts:20`); `turmas.registrar` já faz
auth-opcional + dedup + lista de espera (modelo direto p/ `responder`); landing usa
`fetchQuery` + `export const revalidate` (modelo de ISR); shadcn tem todos os
componentes do form. **Não há rate-limiter no projeto** — é construção nova.
