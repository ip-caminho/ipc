# Erro não tratado na suíte de testes (gravacoesLouvorPermissao) — issue #340

## Escopo
`npm test` sai com código 1, apesar de 711/711 testes passarem, por causa de `Error: Write outside of transaction 10004;_scheduled_functions`. A correção é só no arquivo de teste: cancelar a função agendada antes de o teste terminar. Nenhuma mudança em código de produção.

## Causa raiz
- `convex/__tests__/gravacoesLouvorPermissao.integration.test.ts:147-157` ("createFromAudio: com gravacoes:process_ai funciona") é o único teste do arquivo que chega a agendar algo: `createFromAudio` chama `ctx.scheduler.runAfter(0, processSermon)` em `convex/gravacoes/ai.ts:168`. O teste termina sem tratar esse agendamento.
- O `convex-test` 0.0.41 implementa `runAfter` com um `setTimeout` real (`node_modules/convex-test/dist/index.js:847`). O timer dispara depois, já dentro do teste seguinte ("louvor: create: membro comum recusa", `:161`), que criou outro `convexTest()`. A transação aberta pertence ao banco novo, e o `db.patch` no banco antigo (`index.js:856`) estoura em `_addWrite` (`index.js:73`). Por isso o Vitest aponta o teste errado.
- Conferido: rodar só o teste `:147` não dá erro; rodar `:147` + `:161` reproduz. Os testes de `remove` não agendam nada (a gravação do seed não tem `audioUrl`, `convex/gravacoes/mutations.ts:98`).
- **Código de produção está correto**: o agendamento em `ai.ts:168` tem `await`. O defeito é do teste.

## Correção mínima
No teste `:147-157`, depois do `expect(id).toBeDefined()`, repetir o padrão já usado em `convex/retiro/__tests__/retiro.integration.test.ts:667-684`:
1. Ler `ctx.db.system.query("_scheduled_functions")` via `t.run` e afirmar que há 1 agendamento cujo `name` contém `processSermon` (o teste passa a cobrir o disparo do pipeline).
2. Cancelar cada um com `ctx.scheduler.cancel(f._id)`. Com o estado `canceled`, o timer do `convex-test` retorna sem escrever (`index.js:850-852`).

Não usar `finishAllScheduledFunctions`/`finishInProgressScheduledFunctions`: executariam `processSermon` (`convex/gravacoes/aiAction.ts:151`, Deepgram + Claude, rede) dentro do teste. Nenhum teste do repo usa essas funções; `useFakeTimers` só aparece em `features/educacional/lib/__tests__/idade.test.ts`. Não usar `dangerouslyIgnoreUnhandledErrors`.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| Nenhuma | Só leitura/cancelamento de `_scheduled_functions` no banco falso do teste |

## Permissões
- Sem mudança (o teste segue validando `gravacoes:process_ai`).

## Impacto em Shared
- [ ] Toca arquivos sensíveis? Não.
- [ ] Risco de regressão em features? Nenhum; produção intocada.

## Riscos
- O cancelamento depende de acontecer antes de o timer disparar. Em experimento fora do repo (mesmo teste + teste seguinte), só o cancelamento eliminou o erro em 3 de 3 execuções, e o controle sem correção reproduziu o erro. Se aparecer intermitência, envolver o teste em `vi.useFakeTimers()` / `vi.useRealTimers()` (em `try/finally`): também validado, sem erro.
- O teste "create: com gravacoes:create funciona" (`:46`) e os demais não agendam nada; não mexer neles.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/__tests__/gravacoesLouvorPermissao.integration.test.ts` | Modificar | No teste `:147-157`, afirmar e cancelar o agendamento de `processSermon` |

## Ordem de Implementação
1. Editar o teste `:147-157` conforme a correção mínima.
2. `npx vitest run convex/__tests__/gravacoesLouvorPermissao.integration.test.ts`: 13 testes passando, sem "Unhandled Errors".

## Verificação
- `npm test` termina com código de saída 0 e sem "Unhandled Errors" na saída.
- Total de testes continua 711 (13 neste arquivo); nenhum `it.skip`, `it.todo`, `describe.skip` ou teste removido no diff.
- Diff restrito ao arquivo de teste acima.
