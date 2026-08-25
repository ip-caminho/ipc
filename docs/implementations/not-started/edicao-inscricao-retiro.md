# Edição de inscrição do retiro pela secretaria

> Status: **not-started** · Planejado em 25/08/2026.

## Escopo

Permitir que a secretaria edite uma inscrição já recebida do retiro (responsável,
participantes, quartos/camas/pets, preferências e forma de pagamento) direto no
admin, após conversar com o membro. Hoje o drawer de detalhe é somente leitura e
o formulário público bloqueia reenvio ("Fale com a secretaria para alterá-la") —
não existe caminho no sistema para o caso "escolheu duplo, precisa de triplo".

**Descoberta:** a mutation `retiro.mutations.editarInscricao`
(`convex/retiro/mutations.ts:184`) já existe, está testada
(`convex/retiro/__tests__/retiro.integration.test.ts:335`), faz audit, recalcula
com o `precosSnapshot` e ajusta o estoque pelo delta — mas nenhum frontend a usa.
A feature é expor isso no admin e fechar quatro lacunas do backend.

## Decisões fechadas (25/08)

- Forma de pagamento pedida (à vista/parcelado, nº parcelas, CPF do pagante)
  também é editável.
- Quadro de quartos: ao editar participantes, manter ocupantes que ainda batem
  (mesmo índice + mesmo nome), remover os demais e avisar a secretaria.
- Campo "motivo da alteração" **opcional**, gravado como ActionAuditLog.
- Fora de escopo: mudar `status` (já tem ações dedicadas) e editar inscrição
  CANCELADA.

## Modelos Afetados

| Tabela | Tipo de Mudança |
|--------|-----------------|
| `inscricoesRetiro` | patch (participantes, hospedagem, extras, pagamentoPreferido, responsavel, valorTabela) — sem mudança de schema |
| `retiros` | patch em `reservados` (delta de quartos, já existente) |
| `quartosRetiro` | patch em `ocupantes` (remoção dos que não batem mais) |
| `auditLogs` | FIELD_CHANGE (já existe) + ACTION `EDICAO_INSCRICAO` com motivo |

Nenhuma alteração em `convex/schema.ts`.

## Permissões

- Usar: `retiro:manage` (pastor, secretaria, secretario_executivo, admin).
- Ver botão "Editar": `can("retiro:manage")` e `status !== "CANCELADA"`.

## Impacto em Shared

- [ ] `convex/schema.ts` — não.
- [ ] `rbac.ts` / `rbacHelpers.ts` — não.
- [ ] `FileUpload.tsx` — não.
- [x] `shared/components/layout/DevContext.tsx` — atualizar entrada `/admin/retiro/[id]`.
- Risco de regressão: formulário público `RetiroForm.tsx` (extração do schema
  zod para `features/retiro/lib/validations.ts`). Mudança mecânica; validar com o
  teste do `responder` + smoke em `/retiro/<slug>`.

## Backend

### `editarInscricao` (`convex/retiro/mutations.ts`)

1. Args novos:
   - `pagamentoPreferido?: { forma, parcelas?, cpfPagante? }` — parcelas 2–12
     quando PARCELADO; CPF validado com `cpfValido` (mover de
     `convex/public/retiro.ts:214` para helper compartilhado).
   - `motivo?: string` → `createActionAuditLog("EDICAO_INSCRICAO", ...)` quando
     preenchido (checar se o helper aceita detalhe livre; se não, adicionar arg
     opcional).
2. Preservar `membroNome`: re-derivar de `antes.participantes` por `membroId`
   (o validator atual não o inclui e o vínculo do matching sumiria ao salvar).
3. Validações iguais ao `responder` público: `dataNascimento` `YYYY-MM-DD` e
   < hoje; ≤10 participantes; soma de quartos ≥1; inteiros ≥0.
4. Bloquear se `antes.status === "CANCELADA"`.
5. Sincronizar `quartosRetiro` quando `participantes` vier: para cada quarto do
   retiro (`by_retiro`) com ocupante desta inscrição, manter só se
   `novos[idx]?.nome === antes.participantes[idx]?.nome`. Retornar
   `{ id, valorTabela, ocupantesRemovidos }`.
6. Manter: recálculo com `antes.precosSnapshot`, delta de `reservados` só em
   ATIVA, normalização de whatsapp, `createFieldAuditLogs`.

### `convex/retiro/queries.ts`

- Nova query `getInscricaoParaEdicao({ id })` → `{ precosSnapshot, dataInicio,
  dataFim }`, gate `retiro:manage`. Consultada só com o modo edição aberto
  (`"skip"` fora dele) — mantém `getInscricao` sem o snapshot (economia de
  egress, `queries.ts:79-82`).

## Frontend

- `features/retiro/lib/validations.ts` (novo): extrair de `RetiroForm.tsx:38-88`
  o `participanteSchema` e um `inscricaoBaseSchema` (responsável, participantes,
  quartos flat, camasExtras, pets, extras, forma/parcelas/cpfPagante + refines).
  Form público passa a usar `inscricaoBaseSchema.extend({ lgpd, website })`.
  `inscricaoEditSchema = inscricaoBaseSchema.extend({ motivo })`.
- `features/retiro/lib/mappers.ts` (novo): `inscricaoToForm(insc)` e
  `formToEditArgs(values)` (mesmo mapeamento do submit público,
  `RetiroForm.tsx:402-450`).
- `features/retiro/components/InscricaoEditForm.tsx` (novo, shadcn): RHF +
  zodResolver + `useFieldArray("participantes")`, seguindo `MembroForm.tsx`.
  Seções: Responsável · Participantes (badge "Membro: X" quando vinculado) ·
  Hospedagem (só tipos com preço > 0 no snapshot) · Preferências · Pagamento ·
  Motivo. **Resumo ao vivo** com `calcularValorInscricao`
  (`convex/retiro/calculoHelpers.ts:177`) usando o snapshot: "tabela atual →
  nova", estimativa hotel e saldo resultante (`saldoInscricao`). Mobile-first,
  botões `h-11 md:h-9`.
- `InscricaoDetalheDrawer.tsx`: botão "Editar"; modo edição **dentro do próprio
  drawer** (`"ver" | "editar"`), sem overlay aninhado. Ao salvar: toast com novo
  valor (+ aviso "N participante(s) saíram do quadro de quartos" se
  `ocupantesRemovidos > 0`) e volta para "ver". Remover o comentário
  "leitura; edicao caso a caso" (L320).
- `DevContext.tsx:1285-1311`: + `getInscricaoParaEdicao`, `InscricaoEditForm`,
  nota sobre sync do quadro.

## Riscos

- Sufixo `,03` é reaplicado a cada recálculo: o total muda ao editar e pode não
  bater com recebimentos já feitos — o resumo ao vivo deixa isso explícito.
- Audit por índice de array gera vários `FIELD_CHANGE` (`participantes.1.nome`);
  aceitável, o ActionAuditLog com motivo dá contexto.
- Refatoração do zod do form público em prod (ver Impacto em Shared).

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/retiro/mutations.ts` | modificar | `editarInscricao`: pagamento, motivo, membroNome, validações, CANCELADA, sync quartos |
| `convex/retiro/queries.ts` | modificar | + `getInscricaoParaEdicao` |
| `convex/retiro/calculoHelpers.ts` (ou `_shared`) | modificar | + `cpfValido` movido |
| `convex/public/retiro.ts` | modificar | importar `cpfValido` |
| `convex/retiro/__tests__/retiro.integration.test.ts` | modificar | + testes (pagamento, CANCELADA, membroNome, quartos, parcelas) |
| `features/retiro/lib/validations.ts` | criar | schemas zod compartilhados |
| `features/retiro/lib/mappers.ts` | criar | doc ↔ form |
| `features/retiro/components/InscricaoEditForm.tsx` | criar | form de edição (shadcn) |
| `features/retiro/components/InscricaoDetalheDrawer.tsx` | modificar | botão + modo edição |
| `features/retiro/components/RetiroForm.tsx` | modificar | usar schema extraído |
| `shared/components/layout/DevContext.tsx` | modificar | entrada `/admin/retiro/[id]` |

## Ordem de Implementação

1. Issue + branch `feature/edicao-inscricao-retiro`; mover este PRD para `wip/`.
2. Backend: `editarInscricao` + `getInscricaoParaEdicao` + `cpfValido` movido.
3. Testes de integração (convex-test).
4. `validations.ts` + `mappers.ts`; `RetiroForm.tsx` importa o schema.
5. `InscricaoEditForm.tsx` + integração no drawer.
6. DevContext.
7. `npm run lint && npm test`; screenshot 390px do drawer em modo edição.
8. PR → preview Vercel → revisão → `merge --ff-only` → `npx convex deploy`
   (backend prod). Mover PRD para `ready/`.

## Verificação

- `npm test` cobre backend.
- Manual: abrir inscrição → Editar → duplo→triplo → resumo mostra novo valor →
  salvar → drawer atualizado, `reservados` ajustado, log em auditoria; inscrição
  alocada no quadro mantém quem não mudou.
