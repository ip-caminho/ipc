# Modulo Biblioteca

Catalogar o acervo de livros da igreja (doacoes e emprestimos), com cadastro facilitado por Google Books/foto/IA, etiquetas com QR code, ficha virtual publica e emprestimo self-service.

**Status**: Planejado (nao implementado)

---

## Indice

1. [Visao geral](#visao-geral)
2. [Schema (tabelas)](#schema-tabelas)
3. [Rotas e paginas](#rotas-e-paginas)
4. [Cadastro facilitado](#cadastro-facilitado-busca-automatica--fotoía)
5. [Etiqueta com QR code](#etiqueta-com-qr-code)
6. [Ficha virtual publica + emprestimo self-service](#ficha-virtual-publica--emprestimo-self-service)
7. [Controle de emprestimos](#controle-de-emprestimos)
8. [Historico de vida do exemplar](#historico-de-vida-do-exemplar)
9. [Dashboard de atrasados](#dashboard-de-atrasados)
10. [Categorias (hibrido)](#categorias-hibrido)
11. [Permissoes (RBAC)](#permissoes-rbac)
12. [Estrutura de arquivos](#estrutura-de-arquivos)
13. [Ordem de implementacao](#ordem-de-implementacao)
14. [Verificacao](#verificacao)

---

## Visao geral

Membros da igreja fazem doacoes ou deixam livros na biblioteca. O modulo permite:
- Cadastrar e catalogar livros (busca por ISBN/titulo, foto com IA, ou manual)
- Controlar emprestimos e devolucoes (incluindo self-service via QR code)
- Gerar etiquetas com QR code para colar nos livros
- Ficha virtual publica acessivel via QR code com opcao de emprestimo
- Codigo automatico por exemplar (BIB-0001)
- Multiplos exemplares por obra
- Timeline completa de vida de cada exemplar
- Dashboard de emprestimos atrasados

---

## Schema (tabelas)

### Tabela `livros` (obra/titulo)

Representa a **obra** (titulo unico). Pode ter multiplos exemplares.

| Campo | Tipo | Obs |
|-------|------|-----|
| titulo | string | obrigatorio |
| autores | string[] | obrigatorio |
| editora | string? | |
| isbn | string? | validar unicidade (warning se duplicado) |
| ano | number? | |
| categorias | string[] | lista predefinida + customizadas (hibrido) |
| edicao | string? | |
| idioma | string? | default "Portugues" |
| capaUrl | string? | URL do B2 (download do Google Books no cadastro) |
| descricao | string? | sinopse do livro |
| paginas | number? | |
| observacoes | string? | |

Indices: `by_isbn`, `search_livros` (fulltext em titulo)

### Tabela `exemplares` (unidades fisicas)

Cada unidade fisica de um livro. Um livro pode ter N exemplares.

| Campo | Tipo | Obs |
|-------|------|-----|
| livroId | Id<"livros"> | referencia a obra |
| codigo | string | "BIB-0001" gerado automaticamente (retry se race condition) |
| condicao | "NOVO" \| "BOM" \| "REGULAR" \| "RUIM" | |
| status | "DISPONIVEL" \| "EMPRESTADO" \| "PERDIDO" \| "DANIFICADO" | DANIFICADO nao pode ser emprestado |
| dataAquisicao | string | YYYY-MM-DD — quando entrou no acervo |
| doadorId | Id<"entidades">? | quem doou |
| doadorNome | string? | fallback texto livre |
| observacoes | string? | |

Indices: `by_livro`, `by_status`, `by_codigo`

### Tabela `emprestimos`

| Campo | Tipo | Obs |
|-------|------|-----|
| exemplarId | Id<"exemplares"> | qual exemplar fisico |
| livroId | Id<"livros"> | denormalizado para queries rapidas |
| membroId | Id<"membros"> | quem pegou |
| dataEmprestimo | string | YYYY-MM-DD |
| dataPrevistaDevolucao | string | YYYY-MM-DD, default +14 dias |
| dataDevolucao | string? | quando devolveu |
| status | "ATIVO" \| "DEVOLVIDO" | ATRASADO computado em query-time |
| selfService | boolean? | true se feito pelo proprio membro via QR |
| observacoes | string? | |
| registradoPor | Id<"membros">? | |

Indices: `by_exemplar`, `by_livro`, `by_membro`, `by_status`

### Tabela `livroEventos` (historico de vida)

Timeline completa de tudo que aconteceu com cada exemplar.

| Campo | Tipo | Obs |
|-------|------|-----|
| exemplarId | Id<"exemplares"> | |
| livroId | Id<"livros"> | denormalizado |
| tipo | string | "CADASTRO" \| "EMPRESTIMO" \| "DEVOLUCAO" \| "CONDICAO" \| "PERDA" \| "DOACAO" \| "OBSERVACAO" |
| data | string | YYYY-MM-DD |
| descricao | string | texto descritivo gerado automaticamente |
| membroId | Id<"membros">? | membro envolvido (emprestimo/devolucao) |
| registradoPor | Id<"membros">? | quem registrou |

Indices: `by_exemplar`, `by_livro`

Paginacao: queries de eventos devem usar `limit` + cursor para exemplares com muito historico.

### Codigo do exemplar

- Formato `BIB-0001` (4 digitos, ate 9999)
- Gerado no backend: `query("exemplares").order("desc").first()` + incremento
- Retry pattern se race condition (2 cadastros simultaneos)
- Cada exemplar tem seu proprio codigo unico

### Regras de negocio

- **Limite de emprestimos**: 3 simultaneos por membro (configuravel)
- **Periodo padrao**: 14 dias para devolucao (editavel no momento do emprestimo)
- **DANIFICADO/PERDIDO**: nao pode ser emprestado
- **ISBN duplicado**: warning no cadastro ("Ja existe livro com este ISBN"), mas permite salvar (pode ser edicao diferente)

---

## Rotas e paginas

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/biblioteca` | `app/(ready)/biblioteca/page.tsx` | Lista com busca e filtros |
| `/biblioteca/novo` | `app/(ready)/biblioteca/novo/page.tsx` | Cadastro de livro |
| `/biblioteca/lote` | `app/(ready)/biblioteca/lote/page.tsx` | Cadastro em lote (doacoes) |
| `/biblioteca/[id]` | `app/(ready)/biblioteca/[id]/page.tsx` | Detalhe + exemplares + historico + acoes |
| `/biblioteca/[id]/etiqueta` | `app/(ready)/biblioteca/[id]/etiqueta/page.tsx` | Impressao de etiqueta |
| `/livro/[codigo]` | `app/(public)/livro/[codigo]/page.tsx` | Ficha publica + emprestimo self-service |

---

## Cadastro facilitado (busca automatica + foto/IA)

### Fluxo unificado

Tela unica com campo de busca no topo:

1. **Campo de busca** aceita ISBN ou titulo
2. **Resultados do Google Books** aparecem como cards selecionaveis (capa + titulo + autor + ano)
3. Ao selecionar: preenche formulario automaticamente (usuario revisa antes de salvar)
4. **Botao "Cadastrar manualmente"** como fallback (abre form vazio)
5. **Icone de camera** ao lado do campo: tira foto → OCR/IA extrai dados → se tem ISBN, busca Google Books para complementar
6. Capa do Google Books: download e upload para B2 no momento do cadastro (evita URLs externas que podem quebrar)

### Google Books API

- Endpoint: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}` ou `?q={titulo}`
- Sem necessidade de API key para volume baixo
- Chamada direta do frontend (se CORS issues, usar Convex action como proxy)
- Retorna: titulo, autores, editora, ano, descricao, paginas, categorias, thumbnail

Componente: `features/biblioteca/components/BookSearch.tsx`

### Cadastro em lote (doacoes)

Para quando chegam varias doacoes de uma vez:

1. Tela dedicada `/biblioteca/lote` com lista editavel
2. Para cada livro: campo ISBN → busca Google Books → preenche automaticamente (titulo, autor, capa)
3. Fluxo rapido: digitar/escanear ISBN → dados aparecem → confirmar → proximo
4. Opcao de leitor de codigo de barras (camera) para escanear ISBN dos livros em sequencia
5. Tabela mostra todos os livros adicionados na sessao com status (encontrado/nao encontrado)
6. Campos editaveis inline: doador (unico para todo o lote), condicao, categorias
7. Ao finalizar: cria todos os livros + exemplares + eventos CADASTRO/DOACAO em batch
8. Resumo final: "X livros cadastrados com sucesso, Y nao encontrados (cadastrar manualmente)"

Componente: `features/biblioteca/components/CadastroLote.tsx`
Rota: `app/(ready)/biblioteca/lote/page.tsx`

### OCR/IA (fallback)

1. Usuario tira foto da capa ou ficha catalografica (`FileUpload` com `accept="image/*"` + `capture="environment"`)
2. Imagem vai para B2 via presigned URL (fluxo existente)
3. Convex action envia para Claude Vision (sonnet) — mesmo padrao de `convex/gravacoes/aiAction.ts`
4. Prompt extrai: titulo, autores, editora, ISBN, ano, edicao, idioma, categoria
5. Se extraiu ISBN: frontend busca Google Books separadamente (evita gastar tokens da IA quando ISBN bastaria)
6. Retorna JSON estruturado → preenche formulario

Arquivo: `convex/biblioteca/ocrAction.ts`

---

## Etiqueta com QR code

- Dependencia: `qrcode.react`
- QR code aponta para `/livro/{codigo}` (ficha publica, usando codigo BIB-XXXX)
- Layout: codigo (BIB-0001) + titulo truncado + QR code
- Impressao via `window.print()` + CSS `@media print`
- Opcao de grade (multiplas etiquetas por folha A4)

Componente: `features/biblioteca/components/EtiquetaLivro.tsx`

---

## Ficha virtual publica + emprestimo self-service

### Ficha publica

- Rota `(public)/livro/[codigo]` — sem autenticacao
- Mostra: capa, titulo, autores, editora, ano, categorias, descricao, status de disponibilidade
- **Nunca expor**: nome do doador, historico de emprestimos, nome de quem emprestou (privacidade)
- Query `convex/biblioteca/queries.ts:getPublicByCodigo` (sem auth, sem `getAuthUserId`)

### Fluxo de emprestimo self-service

1. Membro escaneia QR code do livro com celular
2. Abre ficha publica → ve dados do livro e status
3. Se disponivel: botao **"Quero pegar emprestado"**
4. Se nao logado → redireciona para login (com `returnUrl` para voltar)
5. Apos login → confirma emprestimo (periodo padrao 14 dias)
6. Sistema registra emprestimo com `selfService: true` e atualiza status do exemplar
7. Se multiplos exemplares disponiveis: sistema seleciona automaticamente um (sem forcar escolha)
8. Se nao disponivel: mostra mensagem "Todos os exemplares estao emprestados"
9. Valida limite de 3 emprestimos simultaneos

### Fluxo de devolucao self-service

1. Membro escaneia QR code do livro que quer devolver
2. Abre ficha publica → sistema detecta que o membro logado tem emprestimo ativo deste livro
3. Mostra botao **"Devolver"** em destaque (em vez de "Quero pegar emprestado")
4. Ao confirmar: registra devolucao, atualiza status do exemplar
5. Alternativa sem QR: na area "Meus emprestimos" (perfil do membro), botao devolver em cada item

Rota autenticada para acoes: `app/(ready)/biblioteca/emprestar/[codigo]/page.tsx`

---

## Controle de emprestimos

- Emprestar **exemplar** para membro (selecionar membro + data prevista devolucao)
- Se livro tem 1 exemplar, seleciona automaticamente; se tem N, usuario escolhe qual
- Periodo padrao: 14 dias (editavel)
- Limite: 3 emprestimos simultaneos por membro
- **Devolucao rapida**: na listagem de emprestimos ativos, botao "Devolver" direto no card (sem abrir detalhe)
- **Devolucao self-service**: membro escaneia QR ou devolve pela area "Meus emprestimos"
- **Meus emprestimos**: secao no perfil do membro listando emprestimos ativos com botao devolver
- Historico de emprestimos por exemplar e por membro
- Status ATRASADO computado em query-time comparando `dataPrevistaDevolucao` com data atual

Componentes:
- `features/biblioteca/components/EmprestimoForm.tsx` — dialog para registrar emprestimo
- `features/biblioteca/components/EmprestimoHistory.tsx` — historico de emprestimos

---

## Historico de vida do exemplar

Timeline completa de eventos registrados automaticamente via `livroEventos`:
- **CADASTRO**: quando o exemplar foi adicionado ao acervo
- **DOACAO**: registro de quem doou
- **EMPRESTIMO**: quem pegou e quando
- **DEVOLUCAO**: quando devolveu
- **CONDICAO**: mudanca de condicao (ex: BOM -> REGULAR)
- **PERDA**: marcado como perdido
- **OBSERVACAO**: anotacoes manuais

Exibido como timeline vertical na pagina de detalhe do livro, filtravel por exemplar.
Paginacao com limit + cursor para exemplares com muito historico.

Componente: `features/biblioteca/components/ExemplarTimeline.tsx`

---

## Dashboard de atrasados

Visivel para secretaria/admin:
- Badge vermelha "X atrasados" no topo da listagem de emprestimos
- Filtro dedicado "Atrasados" na listagem
- Card de atrasado mostra: livro, membro, dias de atraso, data prevista
- Acao direta: "Entrar em contato" (link WhatsApp do membro)

---

## Categorias (hibrido)

- **Lista predefinida**: Teologia, Devocional, Infantil, Biografias, Ficcao Crista, Estudo Biblico, Familia, Lideranca, Missoes, Aconselhamento
- Campo permite adicionar categorias customizadas (input com autocomplete baseado nas existentes)
- Armazenado como `string[]` — livro pode ter multiplas categorias
- Query auxiliar `listCategorias` retorna todas categorias distintas do acervo

---

## Permissoes (RBAC)

| Permissao | Descricao |
|-----------|-----------|
| `biblioteca:read` | Ver acervo |
| `biblioteca:create` | Cadastrar livros |
| `biblioteca:update` | Editar livros |
| `biblioteca:delete` | Remover livros (admin) |
| `biblioteca:emprestar` | Registrar emprestimos/devolucoes |

Roles:
- **admin**: todas (wildcard)
- **secretaria**: read, create, update, emprestar
- **obreiro**: read
- **membro**: read + self-service emprestimo (via ficha publica, sem `biblioteca:emprestar`)

Nota: self-service emprestimo usa ownership check (`membro.userId === ctx.auth.userId`) em vez de permissao explicita.

---

## UX/UI

### Listagem (`/biblioteca`)

**Mobile:**
- Busca sticky no topo com debounce 300ms
- Filtros em drawer: categoria, status (Disponivel/Emprestado/Todos), ordenacao
- Cards compactos: capa (48px) a esquerda + titulo + autor + badge "2/3 disponiveis"
- Sem capa: fallback com icone de livro + cor da categoria

**Desktop:**
- Toolbar inline: busca + filtros + sort
- Grid de cards (lg:grid-cols-2) com mais informacao: descricao truncada, categorias como badges

### Detalhe (`/biblioteca/[id]`)

- Capa grande + titulo + autores + metadados
- Lista de exemplares com status e condicao
- Tab ou accordion: emprestimos ativos | historico | timeline de vida
- CTAs: "Emprestar" (se admin/secretaria) + "Adicionar exemplar" + "Imprimir etiqueta"

### Cadastro (`/biblioteca/novo`)

- Campo de busca no topo (ISBN ou titulo)
- Resultados Google Books como cards selecionaveis
- Formulario pre-preenchido apos selecao
- Botao camera para OCR/IA
- Ao salvar livro: opcao de adicionar primeiro exemplar na mesma tela

---

## Estrutura de arquivos

### Backend

```
convex/biblioteca/
  queries.ts        — list, getById, getPublicByCodigo, listExemplares, listEmprestimos, listEventos, listByMembro, listCategorias, listAtrasados
  mutations.ts      — create, createBatch, update, delete, addExemplar, removeExemplar, emprestar, emprestimoSelfService, devolverSelfService, devolver, registrarEvento
  ocrAction.ts      — extractBookData (Claude Vision)
  helpers.ts        — gerarCodigo (BIB-XXXX sequencial com retry), registrarEvento (helper interno)
```

### Frontend

```
features/biblioteca/
  components/
    LivroForm.tsx           — form completo (RHF + Zod)
    BookSearch.tsx           — busca por ISBN/titulo via Google Books API
    CadastroLote.tsx        — cadastro em lote com scan ISBN + doador unico
    LivroCard.tsx           — card mobile e desktop
    ExemplaresList.tsx      — lista de exemplares de um livro com status
    EmprestimoForm.tsx      — dialog emprestimo (select membro + exemplar + data)
    EmprestimoHistory.tsx   — historico de emprestimos
    ExemplarTimeline.tsx    — timeline de vida do exemplar
    AtrasadosBadge.tsx      — badge com contagem de atrasados
    EtiquetaLivro.tsx       — etiqueta com QR code para impressao
    OcrCapture.tsx          — foto + IA para preencher form
    StatusBadge.tsx         — badge por status (disponivel/emprestado/etc)
    DisponibilidadeBadge.tsx — "2/3 disponiveis"
  lib/
    constants.ts            — CATEGORIAS_PADRAO, CONDICOES, STATUS, LIMITE_EMPRESTIMOS, PERIODO_PADRAO_DIAS
    validations.ts          — schemas Zod 4
```

### Paginas

```
app/(ready)/biblioteca/
  page.tsx                  — lista com busca e filtros
  novo/page.tsx             — cadastro com busca Google Books
  lote/page.tsx             — cadastro em lote (doacoes)
  [id]/page.tsx             — detalhe + exemplares + historico + acoes
  [id]/etiqueta/page.tsx    — impressao de etiqueta
  emprestar/[codigo]/page.tsx — confirmacao emprestimo self-service

app/(public)/livro/
  [codigo]/page.tsx         — ficha virtual publica + botao emprestimo
```

---

## Arquivos existentes a modificar

| Arquivo | Mudanca |
|---------|---------|
| `convex/schema.ts` | +tabelas `livros`, `exemplares`, `emprestimos`, `livroEventos` |
| `types/auth.ts` | +permissao `biblioteca:emprestar` |
| `convex/preferencias/rbacHelpers.ts` | +`biblioteca:emprestar` nos roles (secretaria) |
| `convex/preferencias/rbac.ts` | +`biblioteca:emprestar` em ALL_PERMISSIONS |
| `shared/components/layout/AppSidebar.tsx` | +item Biblioteca no menu |
| `shared/components/layout/MobileTabBar.tsx` | +Biblioteca nos drawerSections |
| `shared/components/layout/DevContext.tsx` | +entradas no CONTEXT_MAP |
| `package.json` | +dep `qrcode.react` |

---

## Ordem de implementacao

| Fase | Escopo | Depende de |
|------|--------|------------|
| 1 | Schema (livros + exemplares + emprestimos + livroEventos) + permissoes + RBAC | — |
| 2 | Backend CRUD livros + exemplares + helpers (codigo sequencial, eventos) | Fase 1 |
| 3 | Frontend: listagem + cadastro com Google Books + sidebar | Fase 2 |
| 4 | Cadastro em lote (doacoes) | Fase 3 |
| 5 | Frontend: detalhe do livro + exemplares + timeline | Fase 2 |
| 6 | Emprestimos (mutations + UI + devolucao rapida) | Fase 5 |
| 7 | Ficha publica + emprestimo/devolucao self-service | Fase 6 |
| 8 | Etiqueta QR code | Fase 3 |
| 9 | Meus emprestimos (perfil do membro) | Fase 6 |
| 10 | Dashboard de atrasados | Fase 6 |
| 11 | OCR/IA cadastro por foto (nice-to-have) | Fase 3 |

Fases 8, 9, 10 e 11 sao independentes entre si — podem ser feitas em paralelo apos suas dependencias.

---

## Verificacao

- `npm run dev` — testar CRUD completo de livros e exemplares
- Cadastrar livro via busca Google Books (ISBN e titulo)
- Cadastrar livro manualmente
- Cadastrar livros em lote (doacoes)
- Adicionar multiplos exemplares ao mesmo livro
- Registrar emprestimo e devolver (admin e self-service)
- Devolucao self-service via QR e via "Meus emprestimos"
- Verificar limite de 3 emprestimos simultaneos
- Verificar computacao de atrasados
- Imprimir etiqueta e escanear QR code
- Acessar ficha publica sem login
- Fluxo completo: QR → ficha → login → emprestimo
- Verificar que ficha publica NAO expoe dados de membros
- Verificar permissoes: membro so ve + self-service, secretaria gerencia
- `npm run lint` + `npm test`
