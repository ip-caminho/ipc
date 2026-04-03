# Modulo Biblioteca

Catalogar o acervo de livros da igreja (doacoes e emprestimos), com cadastro facilitado por foto/IA, etiquetas com QR code e ficha virtual publica.

**Status**: Planejado (nao implementado)

---

## Indice

1. [Visao geral](#visao-geral)
2. [Schema (tabelas)](#schema-tabelas)
3. [Rotas e paginas](#rotas-e-paginas)
4. [Cadastro por foto (OCR/IA)](#cadastro-por-foto-ocria)
5. [Etiqueta com QR code](#etiqueta-com-qr-code)
6. [Ficha virtual publica](#ficha-virtual-publica)
7. [Controle de emprestimos](#controle-de-emprestimos)
8. [Categorias (hibrido)](#categorias-hibrido)
9. [Permissoes (RBAC)](#permissoes-rbac)
10. [Estrutura de arquivos](#estrutura-de-arquivos)
11. [Ordem de implementacao](#ordem-de-implementacao)
12. [Verificacao](#verificacao)

---

## Visao geral

Membros da igreja fazem doacoes ou deixam livros na biblioteca. O modulo permite:
- Cadastrar e catalogar livros (manual ou por foto com IA)
- Controlar emprestimos e devolucoes
- Gerar etiquetas com QR code para colar nos livros
- Ficha virtual publica acessivel via QR code
- Codigo automatico por livro (BIB-0001)

---

## Schema (tabelas)

### Tabela `livros`

| Campo | Tipo | Obs |
|-------|------|-----|
| titulo | string | obrigatorio |
| autores | string[] | obrigatorio |
| editora | string? | |
| isbn | string? | |
| ano | number? | |
| categorias | string[] | lista predefinida + customizadas (hibrido) |
| edicao | string? | |
| idioma | string? | default "Portugues" |
| condicao | "NOVO" \| "BOM" \| "REGULAR" \| "RUIM" | |
| capaUrl | string? | CDN URL (foto da capa) |
| doadorId | Id<"entidades">? | quem doou |
| doadorNome | string? | fallback texto livre |
| codigo | string | "BIB-0001" gerado automaticamente |
| status | "DISPONIVEL" \| "EMPRESTADO" \| "PERDIDO" \| "DANIFICADO" | |
| observacoes | string? | |

Indices: `by_status`, `by_codigo`, `by_doador`, `search_livros` (fulltext em titulo)

### Tabela `emprestimos`

| Campo | Tipo | Obs |
|-------|------|-----|
| livroId | Id<"livros"> | |
| membroId | Id<"membros"> | quem pegou |
| dataEmprestimo | string | YYYY-MM-DD |
| dataPrevistaDevolucao | string | YYYY-MM-DD |
| dataDevolucao | string? | quando devolveu |
| status | "ATIVO" \| "DEVOLVIDO" | ATRASADO computado em query-time (sem persistir) |
| observacoes | string? | |
| registradoPor | Id<"membros">? | |

Indices: `by_livro`, `by_membro`, `by_status`, `by_livro_status`

### Codigo do livro

- Formato `BIB-0001` (4 digitos, ate 9999)
- Gerado no backend consultando o ultimo codigo existente

---

## Rotas e paginas

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/biblioteca` | `app/(ready)/biblioteca/page.tsx` | Lista com busca e filtros |
| `/biblioteca/novo` | `app/(ready)/biblioteca/novo/page.tsx` | Cadastro de livro |
| `/biblioteca/[id]` | `app/(ready)/biblioteca/[id]/page.tsx` | Detalhe + historico + acoes |
| `/biblioteca/[id]/etiqueta` | `app/(ready)/biblioteca/[id]/etiqueta/page.tsx` | Impressao de etiqueta |
| `/livro/[id]` | `app/(public)/livro/[id]/page.tsx` | Ficha virtual publica (QR code) |

---

## Cadastro por foto (OCR/IA)

1. Usuario tira foto da capa ou ficha catalografica (`FileUpload` com `accept="image/*"` + `capture="environment"` para mobile)
2. Imagem vai para B2 via presigned URL (fluxo existente)
3. Convex action envia para Claude Vision (sonnet) — mesmo padrao de `convex/gravacoes/aiAction.ts`
4. Prompt extrai: titulo, autores, editora, ISBN, ano, edicao, idioma, categoria
5. Retorna JSON estruturado -> preenche formulario (usuario revisa antes de salvar)

Arquivo: `convex/biblioteca/ocrAction.ts`

---

## Etiqueta com QR code

- Dependencia: `qrcode.react`
- QR code aponta para `/livro/{id}` (ficha publica)
- Layout: codigo (BIB-0001) + titulo truncado + QR code
- Impressao via `window.print()` + CSS `@media print`
- Opcao de grade (multiplas etiquetas por folha A4)

Componente: `features/biblioteca/components/EtiquetaLivro.tsx`

---

## Ficha virtual publica

- Rota `(public)/livro/[id]` — sem autenticacao, totalmente publica
- Mostra: dados do livro, status atual, foto da capa
- Sem historico de emprestimos na versao publica
- Membros logados veem historico completo em `(ready)/biblioteca/[id]`

Query: `convex/biblioteca/queries.ts:getPublicById` (sem auth)

---

## Controle de emprestimos

- Emprestar livro para membro (selecionar membro + data prevista devolucao)
- Devolver livro (registra data de devolucao)
- Historico de emprestimos por livro e por membro
- Status ATRASADO computado em query-time comparando `dataPrevistaDevolucao` com data atual
- Sem sistema de reservas no MVP

Componentes:
- `features/biblioteca/components/EmprestimoForm.tsx` — dialog para registrar emprestimo
- `features/biblioteca/components/EmprestimoHistory.tsx` — historico

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
- **membro**: read

---

## Estrutura de arquivos

### Backend

```
convex/biblioteca/
  queries.ts        — list, getById, getPublicById, listEmprestimos, listByMembro, listCategorias
  mutations.ts      — create, update, delete, emprestar, devolver
  ocrAction.ts      — extractBookData (Claude Vision)
  helpers.ts        — gerarCodigo (BIB-XXXX sequencial)
```

### Frontend

```
features/biblioteca/
  components/
    LivroForm.tsx           — form completo (RHF + Zod)
    LivroTable.tsx          — tabela TanStack Table
    LivroCard.tsx           — card para mobile
    EmprestimoForm.tsx      — dialog emprestimo (select membro + data)
    EmprestimoHistory.tsx   — historico
    EtiquetaLivro.tsx       — etiqueta com QR code para impressao
    OcrCapture.tsx          — foto + IA para preencher form
    StatusBadge.tsx         — badge por status
  lib/
    constants.ts            — CATEGORIAS_PADRAO, CONDICOES, STATUS
    validations.ts          — schemas Zod 4
```

### Paginas

```
app/(ready)/biblioteca/
  page.tsx                  — lista com busca e filtros
  novo/page.tsx             — cadastro
  [id]/page.tsx             — detalhe + historico + acoes
  [id]/etiqueta/page.tsx    — impressao de etiqueta

app/(public)/livro/
  [id]/page.tsx             — ficha virtual publica (QR code)
```

---

## Arquivos existentes a modificar

| Arquivo | Mudanca |
|---------|---------|
| `convex/schema.ts` | +tabelas `livros` e `emprestimos` |
| `types/auth.ts` | +permissoes `biblioteca:*` |
| `convex/preferencias/rbacHelpers.ts` | +permissoes nos roles defaults |
| `shared/components/layout/AppSidebar.tsx` | +item Biblioteca no menu |
| `shared/components/layout/DevContext.tsx` | +entradas no CONTEXT_MAP |
| `package.json` | +dep `qrcode.react` |

---

## Ordem de implementacao

| Fase | Escopo | Depende de |
|------|--------|------------|
| 1 | Schema + backend CRUD + permissoes | — |
| 2 | Frontend CRUD livros + sidebar | Fase 1 |
| 3 | Emprestimos (mutations + UI) | Fase 2 |
| 4 | Etiqueta + QR code | Fase 2 |
| 5 | Ficha virtual publica | Fase 1 |
| 6 | OCR/IA cadastro por foto | Fase 2 |

Fases 4, 5 e 6 sao independentes entre si — podem ser feitas em paralelo apos fase 2.

---

## Verificacao

- `npm run dev` — testar CRUD completo de livros
- Cadastrar livro manualmente e via foto/IA
- Registrar emprestimo e devolver
- Imprimir etiqueta e escanear QR code
- Acessar ficha publica sem login
- Verificar permissoes: membro so ve, secretaria gerencia
- `npm run lint` + `npm test`
