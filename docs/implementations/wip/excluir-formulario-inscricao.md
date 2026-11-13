# Excluir formulário de inscrição sem respostas

Issue: #359

## Escopo
Permitir, na tela `/admin/inscricoes`, excluir um formulário de inscrição que não tenha nenhuma resposta. Hoje só existe "Encerrar", então formulários de teste ou criados por engano ficam para sempre na lista (caso real: `acamp27` em produção, encerrado, 0 respostas).

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `inscricoesEvento` | Exclusão de documento (mutation nova). Sem mudança de schema |
| `respostasInscricaoEvento` | Somente leitura: 1 documento via índice `by_inscricao` para checar se existe resposta |
| `auditLogs` | 1 registro `DELETE` por exclusão |

`convex/schema.ts` **não é editado**: o índice `by_inscricao` já existe (`convex/schema.ts:1510`).

## Permissões
- Quem pode usar: quem tem `inscricoes:manage`, checado no backend com `requirePermission`.
- Quem pode ver: a página já está atrás de `PermissionGate permission="inscricoes:manage"` (`app/(ready)/admin/inscricoes/page.tsx:13`). O botão não precisa de checagem extra.

## Comportamento

### Backend — mutation `excluir` em `convex/inscricoesEvento/mutations.ts`
Colocar logo depois de `encerrar` (`:98-110`), antes do bloco "Gestão de respostas". Args: `{ id: v.id("inscricoesEvento") }`. Passos, nesta ordem:

1. `await requirePermission(ctx, "inscricoes:manage")`.
2. `ctx.db.get(id)`; se não existir, erro "Inscrição não encontrada" (mesmo texto de `encerrar`, `:103`).
3. Checar respostas com uma única leitura por índice:
   `ctx.db.query("respostasInscricaoEvento").withIndex("by_inscricao", (q) => q.eq("inscricaoId", id)).first()`.
   - Usar `by_inscricao`, não `by_inscricao_status`: a regra vale para **qualquer** status (CONFIRMADA ou LISTA_ESPERA).
   - Proibido `.filter()` e `.collect()` aqui. Não usar `vagasOcupadas` como atalho: o contador só conta CONFIRMADA (`convex/public/inscricoesEvento.ts:235-239`).
4. Se existir resposta, recusar com `ConvexError` e a mensagem:
   `"Este formulário tem respostas. Exclua as respostas antes de excluir o formulário."`
5. `await ctx.db.delete(id)`.
6. `await createActionAuditLog(ctx, "DELETE", "inscricoesEvento", id)` (assinatura em `convex/_shared/auditHelpers.ts:138-146`; mesmo uso de `excluirResposta`, `mutations.ts:159`).
7. Retornar `id`.

Por que `ConvexError` e não `Error`: em produção o Convex troca a mensagem de `Error` comum por um texto genérico, e o critério de aceite pede mensagem clara na tela. `ConvexError` (import de `convex/values`) chega ao cliente; o padrão já existe em `convex/ausencias/mutations.ts:86`. Só o erro de "tem respostas" precisa disso; não alterar os erros das outras mutations.

Não exigir que o formulário esteja encerrado: a regra do pedido é só "zero respostas". A mutation é transacional, então uma resposta enviada ao mesmo tempo ou entra antes (e a exclusão é recusada) ou falha por formulário inexistente.

Sem limpeza de storage: nenhuma das duas tabelas guarda arquivo. `inscricoesEvento` não tem campo de imagem/arquivo (`convex/schema.ts:1449-1489`), os campos custom não têm tipo arquivo (`:1468-1485`) e nenhuma das duas aparece em `CAMPOS_ARQUIVO`/`ARRAYS_COM_ARQUIVO` (`convex/files/orfaos.ts:28-50`). Nenhuma outra tabela referencia `inscricoesEvento` além de `respostasInscricaoEvento.inscricaoId`.

### Frontend — `features/site-publico/components/paineis/InscricoesPanel.tsx`
Espelhar o que já existe para "Encerrar" (estado `encerrarId` `:41`, `confirmarEncerrar` `:51-62`, `AlertDialog` `:125-138`):

- `useMutation(api.inscricoesEvento.mutations.excluir)` e estado `excluirId`.
- Botão **"Excluir"** no container de ações do card (`:100-114`), depois de "Encerrar", com `text-destructive`. Seguindo `.claude/rules/mobile-ux.md` (ações que quebram linha viram ícone compacto no mobile): no mobile o botão é só o ícone `Trash2` com `aria-label="Excluir formulário"` e tap target de 44px (`h-11 w-11`); a partir de `md:` mostra também o texto "Excluir" e volta ao tamanho dos vizinhos (`md:h-8 md:w-auto`).
- **O botão aparece sempre**, em todos os cards (ativos e encerrados). Quem decide é o backend. Motivo: `listarTodas` não traz contagem de respostas e `vagasOcupadas` ignora a lista de espera, então esconder o botão por esse número liberaria ou bloquearia errado. Não adicionar contagem à query.
- O `ml-auto` hoje fica no "Encerrar" (`:110`), que só existe em formulário ativo. Ajustar para que as ações destrutivas fiquem juntas à direita nos dois casos (ativo: Encerrar + Excluir; encerrado: só Excluir), sem estourar a largura a 390px (o botão Excluir é só ícone no mobile).
- Segundo `AlertDialog` (nunca `window.confirm`), no padrão de `app/(ready)/admin/inscricoes/[id]/respostas/page.tsx:308-321`:
  - Título: "Excluir formulário?"
  - Descrição: "O formulário será apagado e não poderá ser recuperado. Só é possível excluir um formulário sem respostas; se houver alguma, exclua as respostas antes."
  - Botões: "Cancelar" e "Excluir".
- `confirmarExcluir`: fecha o diálogo, chama a mutation, `await revalidarSite("inscricoes")` (mesmo que `confirmarEncerrar`, `:57`, porque um formulário ativo sem respostas aparece no site público) e `toast.success("Formulário excluído")`. No `catch`: `toast.error(getConvexErrorMessage(e, "Erro ao excluir"))`, com o helper de `shared/lib/utils/convexError.ts:9`.

### DevContext — `shared/components/layout/DevContext.tsx`
Na entrada `"/admin/inscricoes"` (`:1742-1764`):
- `mutations`: acrescentar `"inscricoesEvento.mutations.excluir"` depois de `encerrar` (`:1756`).
- `componentes` (`:1758`): "InscricoesPanel (lista + builder + AlertDialog encerrar + AlertDialog excluir)".
- `notas`: acrescentar "Excluir só com zero respostas (qualquer status); backend recusa e orienta a excluir as respostas antes".

## Impacto em Shared
- [x] Toca arquivos sensíveis? Só `shared/components/layout/DevContext.tsx` (uma entrada). Não toca `convex/schema.ts`, RBAC nem `FileUpload`.
- [x] Risco de regressão em quais features? Nenhuma fora de `/admin/inscricoes`. A mutation é nova e nada existente passa a chamá-la.

## Riscos
- **Exclusão é definitiva.** Mitigação: confirmação obrigatória, recusa com qualquer resposta e registro na auditoria.
- **Mensagem genérica em produção** se o erro for `Error` comum. Mitigação: `ConvexError` + `getConvexErrorMessage`, como descrito acima.
- **Link público antigo** (endereço do formulário já compartilhado) passa a não encontrar o formulário. Aceito: é o efeito esperado de excluir. A página pública não é alterada: `getBySlug` devolve `null` para slug inexistente e a página mostra "Inscrição não encontrada". Ela usa `revalidate = 60`, então o formulário pode aparecer por até 60s depois de excluído (enviar nesse intervalo falha em `responder`). É o mesmo comportamento do Encerrar; nada a alterar.
- **`convex/_generated/api.d.ts`** precisa refletir a mutation nova: é gerado por `npx convex dev`/`codegen`, nunca editado à mão.
- **Deploy**: o push no `main` só publica o frontend. Rodar `npx convex deploy` junto, senão o botão chama uma mutation que não existe em produção.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/inscricoesEvento/mutations.ts` | Modificar | Mutation `excluir` + import de `ConvexError` |
| `features/site-publico/components/paineis/InscricoesPanel.tsx` | Modificar | Botão "Excluir", `AlertDialog` de confirmação, toasts |
| `shared/components/layout/DevContext.tsx` | Modificar | Entrada `/admin/inscricoes` |
| `convex/__tests__/inscricoesEventoExcluir.integration.test.ts` | Criar | Testes da mutation |

## Testes
Arquivo novo `convex/__tests__/inscricoesEventoExcluir.integration.test.ts`, no padrão de `convex/__tests__/turmasPermissao.integration.test.ts:1-60`: `convexTest(schema, modules)`, `seedUser` e `as` de `convex/__tests__/helpers.ts`, dados via `t.run((ctx) => ctx.db.insert(...))`. Fica na pasta e com o sufixo `.integration` porque é onde estão os helpers e todos os testes de permissão que os usam (projeto `integration` do Vitest, `vitest.config.ts:32`).

Casos:
1. **Exclui sem respostas**: usuário com `role: "membro"` e `permissions: ["inscricoes:manage"]`; depois da chamada, `ctx.db.get(id)` é `null` e existe um `auditLogs` com `action: "DELETE"`, `referenciaTabela: "inscricoesEvento"` e `referenciaId` igual ao id (índice `by_referencia`, `convex/schema.ts:415`).
2. **Recusa com resposta CONFIRMADA**: `rejects.toThrow`; o formulário continua existindo.
3. **Recusa com resposta em LISTA_ESPERA** e `vagasOcupadas: 0` no formulário (prova que a checagem não depende do contador): `rejects.toThrow`; o formulário continua existindo.
4. **Recusa sem permissão**: usuário com `role: "membro"` e `permissions: []`, formulário sem respostas: `rejects.toThrow`; o formulário continua existindo.

Seed sempre com `role: "membro"` onde o teste depende das permissões explícitas (`role: "admin"` viraria `*`). Nos casos 2 e 3, conferir também que a mensagem contém "Exclua as respostas". Sem limpeza em `afterAll`: cada `convexTest` cria um banco em memória próprio.

## Critérios de Verificação
- [ ] `npx vitest run convex/__tests__/inscricoesEventoExcluir.integration.test.ts` com os 4 casos passando
- [ ] `npm run lint` sem erros
- [ ] `npx tsc --noEmit` sem erros
- [ ] Conferência local no navegador (`npm run dev`, usuário com `inscricoes:manage`), em 390px e 1280px:
  - formulário sem respostas: Excluir → confirmar → some da lista, toast "Formulário excluído"
  - formulário com resposta: Excluir → confirmar → toast com a mensagem de orientação, formulário continua na lista
  - Cancelar no diálogo não apaga nada
  - a 390px o botão Excluir aparece só com o ícone (44x44px, `aria-label="Excluir formulário"`), a partir de `md:` com o texto "Excluir", e as ações não estouram a largura do card
- [ ] Entrada `/admin/inscricoes` do DevContext mostra a mutation `excluir`

## Fora do Escopo
- Excluir formulário com respostas em cascata.
- Página pública de inscrição (`convex/public/inscricoesEvento.ts` e a rota pública do formulário).
- Outras telas: a tela de respostas e o `InscricaoBuilder` não mudam.
- Contagem de respostas na listagem ou mudança em `listarTodas`.
- Trocar os erros das mutations existentes para `ConvexError`.

## Ordem de Implementação
1. Mutation `excluir` em `convex/inscricoesEvento/mutations.ts`.
2. Arquivo de teste; rodar só ele até passar.
3. Botão, diálogo e toasts em `InscricoesPanel.tsx`.
4. Entrada do DevContext.
5. `npm run lint`, `npx tsc --noEmit`, conferência no navegador.
