# Inscrição de Acampamento (modelo especial)

## Escopo

Novo tipo de inscrição, separado das inscrições genéricas de evento: inscrição **por grupo/família** para o acampamento anual, com tabela de preços configurável e cálculo automático do valor, envio de comprovantes com baixa manual pela secretaria, e gestão de alocação de quartos pelo admin. Formulário público (sem login) **e** com pré-preenchimento para membro logado.

Origem: análise do CSV do Tally (73 respostas, jul/2025–jan/2026). Problemas do form atual que o modelo resolve:
- Inscrição é por grupo (1–5 pessoas), o modelo genérico é individual.
- Datas de nascimento inválidas (~8 respostas com data "de hoje") → validar + puxar da base p/ membros.
- Checkbox "Membro IPC" autodeclarado e inconfiável → matching automático contra a base por nome/CPF.
- Reenvio como "edição" (4 duplicatas) → edição real da inscrição (dedupe por responsável).
- "À vista" com parcelas preenchidas / CPFs em formato misto → campos condicionais + validação.
- Observação livre usada p/ alocação de quarto, berço, alergia, acessibilidade → campos dedicados.

## Modelos Afetados

| Tabela | Tipo de Mudança |
|--------|-----------------|
| `acampamentos` (NOVA) | Config do evento: slug, título, período (datas), ativa, janela de inscrição, **tabela de preços** (3 faixas etárias configuráveis `[{idadeMin, idadeMax, valor}]` — cortes e valores editáveis pelo admin —, adicional cama extra, adicional pet/dia, **valor da palestra por participante**), **estoque de quartos** (qtd de duplos e triplos disponíveis no hotel), `aportesFundo[]` `{valor, descricao, criadoPor, em}` (entradas avulsas no fundo solidário, sem vínculo com inscrição) |
| `inscricoesAcampamento` (NOVA) | 1 doc = 1 grupo: responsável `{nome, whatsapp, membroId?}`, `participantes[]` `{nome, dataNascimento, membroId?, participaPalestras}`, hospedagem `{quartosDuplos, quartosTriplos, camasExtras, pets}`, extras `{colegaDeQuartoPreferido?, berco?, necessidadesEspeciais?, observacao?}`, pagamento `{formaPreferida, parcelasPreferidas?, cpfPagante}` (o que o inscrito pediu no form), **financeiro flexível**: `valorTabela` (snapshot do cálculo), `ajustes[]` `{tipo DESCONTO/CONTRIBUICAO_FUNDO, valor, motivo?, criadoPor, em}`, `recebimentos[]` `{valor, data, comprovanteUrl?, registradoPor, obs?}`, `planoPagamento[]` `{data, valor}` (previsão editável pela secretaria), status `ATIVA/LISTA_ESPERA/CANCELADA`, observacaoCancelamento?, lgpd, ipHash |
| `quartosAcampamento` (NOVA) | Alocação: `{acampamentoId, tipo DUPLO/TRIPLO, identificacao?, ocupantes: [{inscricaoId, participanteIndex}]}` |
| `entidades`/`membros` | Sem mudança (só leitura p/ matching e pré-preenchimento) |

Sem mudança em tabelas existentes → risco de conflito de schema baixo (só adições).

## Permissões

- Gestão (criar acampamento, editar preços, respostas, baixa de pagamento, quartos): **`inscricoes:manage`** (já existe; secretaria/pastor/sec.exec já têm). Sem permissão nova.
- Público: formulário sem auth (mesmo padrão das inscrições genéricas — mutation em `convex/public/`, ipHash via route handler, honeypot, LGPD).
- Membro logado: pré-preenchimento (dados próprios + família via `conjugeId`/`responsaveis`), ownership check no backend.

## Cálculo automático do valor

- Preço por participante = faixa etária na **data de início do acampamento** (idade calculada da dataNascimento). 3 faixas configuráveis (ex.: 0–4 isento, 5–10 reduzido, 11+ inteiro — cortes e valores livres).
- Palestra = item com preço próprio, somado por participante com `participaPalestras: true`.
- Total = Σ faixa(participante) + Σ palestra(participantes marcados) + camasExtras × adicional + pets × adicionalPetDia × nº dias.
- `valorTotal` gravado como snapshot na inscrição (com a tabela vigente); botão "recalcular" no admin se os preços mudarem.
- Parcelamento: divide o total em N parcelas iguais → gera `parcelasPagamento[]`.

## Estoque de quartos e lista de espera

- Admin define no acampamento a quantidade de duplos e triplos do hotel.
- A soma dos quartos pedidos pelas inscrições ATIVAS consome o estoque (contador denormalizado, padrão turmas/inscrições).
- Esgotou o tipo: novas inscrições que pedem aquele tipo entram como `LISTA_ESPERA` (mesmo padrão das inscrições genéricas); admin promove manualmente quando abrir vaga.
- Cancelamento (abaixo) devolve os quartos ao estoque.

## Cancelamento

- Status `CANCELADA` marcado pela secretaria + campo de observação p/ registrar devolução manual (sem lógica de reembolso no sistema).
- Cancelar devolve quartos ao estoque e tira os ocupantes da alocação; parcelas pendentes ficam inertes (histórico preservado, auditado).

## Financeiro flexível (foco: usabilidade da secretaria)

A realidade é caso a caso: a igreja adianta ao hotel e recebe parcelado, acordos custom
("10× a partir de janeiro"), e há quem pague a mais para compor o valor de quem precisa.
O modelo evita contabilidade formal — a secretaria opera com 3 conceitos:

1. **Valor final** = `valorTabela` (calculado) − descontos concedidos. Sempre visível: quanto a inscrição deve.
2. **Recebimentos** = cada valor que chega (qualquer valor, qualquer data), com comprovante anexado
   (upload via `shared/files`, pasta `acampamento-comprovantes/`; público exige allowlist no
   `convex/files/authz.ts` — arquivo sensível — com limite de tipo imagem/PDF e rate-limit).
   Saldo = valor final − Σ recebido. Se Σ recebido > valor final, a sobra aparece destacada
   com ação de 1 clique: **"destinar ao fundo"** (vira ajuste CONTRIBUICAO_FUNDO).
3. **Fundo solidário do evento** = Σ contribuições (sobras de inscrições) + Σ **aportes
   avulsos** − Σ descontos concedidos. Aporte avulso = entrada direta no fundo sem vínculo
   com inscrição (doação de alguém que nem vai, verba da igreja): `acampamentos.aportesFundo[]`
   `{valor, descricao, criadoPor, em}`, registrado pela secretaria com 1 ação no painel.
   Card sempre visível ("Fundo: R$ X disponível"). Conceder desconto pede motivo,
   mostra o saldo do fundo e avisa se estourar. Tudo auditado (quem, quando, quanto).

- `planoPagamento[]` é **previsão editável** (datas e valores livres, sem N parcelas iguais
  engessadas) — serve para a secretaria acompanhar acordos; não trava recebimentos.
- O sistema registra só o lado dos recebimentos; o pagamento da igreja ao hotel fica com a
  tesouraria (fora de escopo). Receber depois do evento é normal (igreja adiantou).
- Painel consolidado: total tabela, descontos, valor final, recebido, a receber, fundo
  (entradas/saídas/saldo) e situação por inscrição (Quitada / Em dia / Pendente).
- Ações rápidas na linha da inscrição: registrar recebimento, conceder desconto, editar plano.

## Alocação de quartos

- Auto: a inscrição já pede N duplos/triplos → admin confirma/gera quartos a partir do pedido.
- Manual: secretaria monta quartos com avulsos (drag-and-drop como nos PGs, reaproveitar padrão `PGGrid`).
- Visão de ocupação: quartos × vagas × ocupantes, avulsos sem quarto, pedidos de colega de quarto.

## Impacto em Shared

- [x] `convex/schema.ts` — 3 tabelas novas (commit isolado, arquivo sensível)
- [x] `convex/files/authz.ts` — allowlist p/ comprovante público (sensível)
- [x] `shared/constants/navigation.ts` — item novo em Secretaria (ou sub-página de Inscrições)
- [x] `DevContext.tsx` — páginas novas
- Risco de regressão: baixo (módulo novo); atenção nos 2 sensíveis acima.

## Riscos

- Matching participante ↔ membro por nome é fuzzy → marcar como "sugestão" p/ secretaria confirmar, nunca vincular automático sem revisão.
- Upload público de comprovante = superfície de abuso → limitar tipo (imagem/PDF), tamanho, rate-limit por ipHash.
- Preços mudando após inscrições feitas → snapshot por inscrição + recálculo explícito (nunca silencioso).
- Duplicata de grupo: dedupe por whatsapp do responsável + edição por token/login em vez de reenvio.

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | 3 tabelas + índices (`by_slug`, `by_acampamento`, `by_responsavel_whatsapp`) |
| `convex/acampamento/{queries,mutations}.ts` | Criar | Admin CRUD (gated `inscricoes:manage`) |
| `convex/public/acampamento.ts` | Criar | getBySlug, responder/editar (público + membro) |
| `convex/files/authz.ts` | Modificar | pasta `acampamento-comprovantes/` p/ upload público limitado |
| `app/api/acampamento/responder/route.ts` | Criar | ipHash (mesmo padrão de inscrições) |
| `app/(public)/(site)/acampamento/[slug]/page.tsx` | Criar | Form público multi-participante (RHF+Zod, DatePickerBR, pré-preenchimento se logado) |
| `app/(ready)/admin/acampamento/page.tsx` (+ sub-rotas) | Criar | Painel: config+preços, inscrições, pagamentos (baixa), quartos (DnD) |
| `features/acampamento/*` | Criar | Componentes (form, tabela, quartos, parcelas) |
| `shared/constants/navigation.ts` | Modificar | Item "Acampamento" (Secretaria), permission `inscricoes:manage` |
| `shared/components/layout/DevContext.tsx` | Modificar | Entradas novas |

## Ordem de Implementação

1. **Fase 1 — Backend base**: schema (commit isolado) → config do acampamento + preços → mutation pública `responder` com cálculo do valor → testes do cálculo (faixas etárias, extras).
2. **Fase 2 — Form público**: página `[slug]` com participantes dinâmicos, validação de nascimento, pré-preenchimento p/ logado (família), LGPD/honeypot.
3. **Fase 3 — Admin**: lista de inscrições + matching de membros (sugestão/confirmação) + edição.
4. **Fase 4 — Financeiro**: recebimentos com comprovante (authz público), descontos + fundo solidário, plano de pagamento editável, painel consolidado da secretaria. Testes da aritmética (valor final, saldo, fundo).
5. **Fase 5 — Quartos**: alocação (auto a partir do pedido + montagem manual DnD), visão de ocupação.

Fases 4 e 5 são independentes entre si (paralelizáveis após a 3).

## Decisões fechadas (04/07/2026)

- **Faixas etárias**: 3 faixas com cortes e valores configuráveis pelo admin.
- **Palestras**: item com preço próprio, cobrado por participante marcado.
- **Cancelamento**: status CANCELADA + registro manual da devolução (sem lógica de reembolso).
- **Estoque de quartos**: limite por tipo definido no evento, com lista de espera ao esgotar (padrão das inscrições genéricas).
- **Financeiro flexível**: recebimentos livres (valor/data), descontos caso a caso com motivo, plano de pagamento como previsão editável — nada de parcelas engessadas.
- **Fundo solidário**: pote geral do evento (contribuições anônimas para quem recebe); desconto consome do fundo com saldo visível. Entradas por 2 vias: sobra de pagamento de inscrição **ou aporte avulso direto** (doação sem inscrição / verba da igreja).
- **Só recebimentos**: pagamento da igreja ao hotel fica fora do sistema (tesouraria).
- Valores reais em R$: admin preenche na tela de config quando a igreja definir (não bloqueia nada).

---

## Status da implementação (05/07/2026 — branch feature/acampamento)

5 fases entregues na worktree: schema (3 tabelas), backend de config/preços/
cálculo, form público /acampamento/[slug] (grupo + resumo ao vivo + pré-
preenchimento p/ logado), admin (matching manual, cancelar/promover/recalcular),
financeiro flexível (recebimentos c/ comprovante, descontos c/ fundo, sobra→
fundo em 1 clique, plano editável, aporte avulso) e quartos (gerar dos pedidos
+ DnD manual, capacidade +1 de cama extra). 20 testes de integração no módulo.
Ajuste de escopo: comprovante é anexado pela secretaria (chega via WhatsApp) —
sem upload público, menos superfície. Falta: integrar ao main (rebase ff-only)
e deploy (convex deploy + push).
