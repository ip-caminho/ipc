# Reintegrar a página de inscrição ao site público

## Contexto

A página `/inscricao/[token]` foi isolada de propósito: sem cabeçalho, sem menu e sem saída para o
site. Fazia sentido quando **o domínio não estava no ar** e o link era a única coisa que a igreja
compartilhava — não havia site para onde voltar.

Isso mudou. O domínio está no ar (`www.ipdocaminho.com`; o apex redireciona com 308), e desde o commit
`a6829d2` a **home lista a turma** e o hub `/inscricoes` também. Hoje a pessoa sai de uma página com
identidade e menu e cai numa tela órfã, sem cabeçalho e sem nenhuma forma de voltar — porque o botão
"Voltar para o site" foi removido em `0ca4061`, quando o isolamento ainda era o certo.

O objetivo é devolver a página ao site: menu em cima, rodapé embaixo e caminho de volta.

### O que a investigação mostrou

1. **O grupo `(auth)` não significa "exige login".** `app/(auth)/layout.tsx` (11 linhas) só centraliza o
   conteúdo, e `middleware.ts:9` lista `/inscricao/(.*)` como rota pública. Todos os providers do
   Convex vivem em `app/layout.tsx:63-71`, então **mover a rota de grupo é seguro** e a URL não muda
   (grupo de rota não entra no caminho).

2. **O chrome do site vem de `app/(public)/(site)/layout.tsx:23-41`** — `SiteHeader`, `SiteFooter`,
   fontes e `landing.css`. O comentário em `:20-22` fixa a convenção: o layout dá o chrome, e **o corpo
   das páginas funcionais não entra em `.site-v2`**. É exatamente o caso deste formulário, que hoje usa
   a escala tipográfica própria (constantes `CAMPO`/`ROTULO`/`ENTRADA` em `page.tsx:26-31`).

3. **Precedentes divergentes, ambos deliberados**: `/inscricoes/[slug]` (evento) fica dentro de
   `(site)`, com chrome e link `← Inscrições` (`page.tsx:49-51`); `/retiro/[slug]` tem layout próprio
   sem header, e o comentário em `app/(public)/retiro/layout.tsx:19-22` diz que é para "não dar acesso
   ao resto do site durante o fluxo". A turma vai seguir o primeiro caminho.

4. **`robots.ts:19` bloqueia `/inscricao/`** enquanto a home e o hub — ambos no sitemap — linkam para
   lá. É uma contradição criada pelo commit que trouxe a turma para o site.

5. **Sem metadata**: a página é `"use client"` na linha 1, então herda o título da raiz. Colar o link no
   WhatsApp mostra **"IPC"**. As equivalentes usam `generateMetadata` (`inscricoes/[slug]/page.tsx:11-19`,
   `retiro/[slug]/page.tsx:11-19`).

6. **O link copiado usa `window.location.origin`** (`app/(ready)/turmas/[id]/page.tsx:104`): copiar de um
   preview gera link de preview. Existe `SITE_URL` (`features/site-publico/lib/seo.ts:4-5`), mas com
   fallback para o endereço da Vercel, e `NEXT_PUBLIC_SITE_URL` **não existe** em nenhum `.env`.

7. **`DevContext` não tem entrada** para a rota (`resolveRoute` cai no fallback).

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Voltar | `← Inscrições` no topo e "Ver outras inscrições" nas telas finais, apontando para `/inscricoes` |
| Prévia do link | Corrigir agora: título e descrição próprios (exige dividir em servidor + cliente) |
| Google | Liberar a indexação (sai do `disallow`) |
| Link copiado | Fixar no domínio oficial via `NEXT_PUBLIC_SITE_URL` |

## Passo 1 — Mover a rota para dentro do site

`app/(auth)/inscricao/[token]/page.tsx` → `app/(public)/(site)/inscricao/[token]/`. A URL segue
`/inscricao/[token]`. Com isso a página ganha `SiteHeader`/`SiteFooter`, as fontes do site e o JSON-LD
de `app/(public)/layout.tsx`.

Ajustes no corpo, porque o shell agora é do layout:

- tirar `min-h-screen bg-background` dos três estados (formulário, sucesso, encerrada) — hoje em
  `page.tsx:63-98,147-151`; o layout já pinta o fundo e garante a altura.
- manter `max-w-xl` e o respiro atual: a escala tipográfica do formulário (17px de rótulo, entrada de
  48px) foi ajustada e aprovada, e a convenção do layout é não forçar `.site-v2` no corpo funcional.
- conferir contraste: o layout define fundo creme `#FAF8F4` e texto `#1A1A1A` no wrapper, enquanto o
  formulário usa tokens do app. **Este é o ponto de risco visual da mudança** e precisa de screenshot.

## Passo 2 — Prévia do link (servidor + cliente)

Dividir em dois arquivos, como as páginas equivalentes:

- `app/(public)/(site)/inscricao/[token]/page.tsx` — Server Component com `generateMetadata`, buscando a
  turma por token com o mesmo `ConvexHttpClient` de `features/site-publico/lib/data.ts` (função
  `httpClient()`), sobre `api.turmas.queries.getByToken`. Título `"{turma} — Inscrições — IPC"`;
  descrição com dia, horário e prazo. `revalidate = 60`, como as irmãs.
- `features/turmas/components/InscricaoPublicaForm.tsx` — Client Component com o formulário atual
  (mantém `useQuery` reativo, então a janela de inscrição continua conferida em tempo real).

Nada de `openGraph` novo: `app/(public)/opengraph-image.tsx` passa a valer para a rota, que agora está
sob `(public)`.

## Passo 3 — Caminho de volta

- `← Inscrições` no topo do formulário, apontando para `/inscricoes`. Como o corpo não entra em
  `.site-v2`, a classe `link-quiet` não se aplica; usar link em Tailwind com a mesma discrição.
- Tela de sucesso e tela de "inscrições encerradas / abrem em": link **"Ver outras inscrições"** para
  `/inscricoes`.

## Passo 4 — Busca e domínio

- `app/robots.ts:19`: remover `"/inscricao/"` do `disallow`. Manter bloqueados `/ativar/`, `/convite/`,
  `/g/`, `/convidado/`, `/livro/`, `/subir-audio` — esses são links pessoais, não divulgação.
- `app/sitemap.ts`: **não** listar URLs com token. A descoberta vem do hub e da home, que já estão no
  sitemap; enfileirar token no XML não ajuda ninguém.
- `features/site-publico/lib/seo.ts:4-5`: trocar o fallback do endereço da Vercel por
  `https://www.ipdocaminho.com`, para o valor certo valer mesmo sem env.
- `app/(ready)/turmas/[id]/page.tsx:104`: usar `SITE_URL` no lugar de `window.location.origin`.
- `.env.example`: registrar `NEXT_PUBLIC_SITE_URL`. **Ação do André**: definir na Vercel (produção) como
  `https://www.ipdocaminho.com`.

Não vou mexer nos outros lugares que usam `window.location.origin` (convite, gravações, comprovante) —
é o padrão do repo e está fora deste escopo.

## Passo 5 — Registro

- `DevContext`: entrada para `/inscricao/[token]` e regex em `resolveRoute`, anotando que a rota é
  pública, vive em `(site)` e é alcançada por token.
- Issue nova no GitHub e PRD em `docs/implementations/not-started/`, seguindo o procedimento padrão;
  implementação em branch com PR.

## Verificação

- `npx tsc --noEmit`, `npm test`, `npm run lint` (baseline medido: 46 erros / 1215 warnings),
  `npm run build`.
- Navegador no domínio real, a 390px e a 1280px: `/inscricao/<token>` com menu, rodapé e o `← Inscrições`;
  formulário legível sobre o fundo creme; tela de sucesso com a saída.
- `curl` do HTML conferindo `<title>` com o nome da turma e a presença de `<header>`/`<footer>` — hoje o
  título é "IPC" e não há nenhum dos dois.
- `curl https://www.ipdocaminho.com/robots.txt` sem a linha de `/inscricao/`.
- Fluxo completo: entrar pela home → card da turma → formulário → enviar → "Ver outras inscrições".

## Fora de escopo

- Redesenhar o formulário na identidade da landing (`.site-v2`). A convenção do layout é o oposto, e a
  escala atual foi aprovada há pouco.
- Mexer no isolamento do `/retiro/[slug]`, que é intencional e está documentado no layout dele.
- Trocar `window.location.origin` nos demais links compartilháveis do sistema.
