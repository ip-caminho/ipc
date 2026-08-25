# Confirmar eventos do calendário gerados pela IA

## Escopo
Hoje o pipeline de IA cria eventos no calendário **automaticamente** a partir
dos avisos do culto. Resultado: eventos repetidos (o mesmo aviso é dado várias
semanas seguidas, com título parafraseado) e eventos errados (a IA entende mal
data ou conteúdo). A mudança: o pipeline **para de criar eventos**; em vez
disso, ao terminar a análise, a página admin da gravação abre **uma janela de
confirmação** com os avisos que têm data. A pessoa marca/desmarca, corrige
título ou data se precisar, e clica em "Adicionar ao calendário". Um clique e
pronto — sem fila, sem página de revisão, sem status por aviso.

## Decisões fixadas (24/08/2026)
- **Não** é um passo burocrático: no máximo um diálogo de confirmação.
- Sem tabela nova, sem rota nova, sem permissão nova.
- Quem confirma é quem processa a IA (`gravacoes:process_ai`).
- Avisos **sem** data continuam só na aba Avisos, como hoje (não viram evento).
- A dedup por título parecido (`titulosSimilares`) continua existindo, mas
  como **sugestão** (desmarca por padrão e mostra "já existe: X"), não como
  decisão automática.

## Diagnóstico (estado atual)
- `convex/gravacoes/aiAction.ts:339-349` — ao fim do `processSermon`, filtra
  avisos com `dataEvento` e chama `createEventosFromAvisos`.
- `convex/gravacoes/ai.ts:33-71` — `createEventosFromAvisos` (internalMutation)
  faz dedup por `by_data` + `titulosSimilares` e insere em `calendarioEventos`
  com `origem: "aviso-ia"`.
- `convex/gravacoes/iaHelpers.ts:57` — `titulosSimilares(a, b)`.
- Os avisos já ficam salvos em `gravacoes.iaAvisos` (schema `convex/schema.ts:287`)
  e são editáveis na aba Avisos do admin (`app/(ready)/gravacoes/[id]/admin/page.tsx`,
  `AvisosEditor`). Ou seja: a informação já está no lugar certo; só falta a
  confirmação antes de virar evento.
- `calendarioEventos` (`convex/schema.ts:903`): `titulo`, `data`, `descricao`,
  `origem`, `tipo`, `publicadoNoSite`, índice `by_data`.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `gravacoes` | +1 campo opcional: `avisosCalendarioRevisadosEm: number` (marca que a decisão já foi tomada; evita o diálogo reabrir) |
| `calendarioEventos` | sem mudança de schema; passa a ser escrita só via confirmação |

## Permissões
- Confirmar/ignorar: `gravacoes:process_ai` (mesma de quem dispara a IA).
- Ver o diálogo: página admin da gravação (já gated).

## Arquitetura proposta

### Backend (`convex/gravacoes/ai.ts`, `aiAction.ts`, `schema.ts`)
1. `aiAction.ts`: remover o Step 4 (chamada a `createEventosFromAvisos`).
2. Nova **query** `getAvisosParaCalendario({ id })`:
   - lê a gravação, filtra `iaAvisos` com `dataEvento`;
   - para cada um, busca em `calendarioEventos` via `by_data` e devolve o
     evento parecido (`titulosSimilares`) se houver → `{ index, titulo,
     descricao, dataEvento, quando, onde, existente?: { _id, titulo } }`;
   - devolve também `avisosCalendarioRevisadosEm`.
   - Custo: N leituras pequenas por índice; só roda com o diálogo aberto.
3. Nova **mutation** `confirmarEventosDeAvisos({ id, eventos: [{ titulo,
   data, descricao }] })`:
   - `requirePermission(ctx, "gravacoes:process_ai")`;
   - insere cada item em `calendarioEventos` (`origem: "aviso-ia"`,
     `criadoEm`), sem dedup automática — a pessoa já decidiu;
   - `patch(id, { avisosCalendarioRevisadosEm: Date.now() })`.
   - Lista vazia = "ignorar tudo" (só marca como revisado).
4. `createEventosFromAvisos` fica sem uso → remover (ou manter só se algum
   teste depender; verificar `convex/gravacoes/__tests__/gravacoesIA.integration.test.ts`).

### Frontend
- Novo `features/gravacoes/components/ConfirmarEventosDialog.tsx`:
  - `Dialog` no desktop, `Drawer` no mobile (rule mobile-ux).
  - Uma linha por aviso: checkbox + input de título + input `date`; abaixo,
    descrição em texto pequeno; se `existente`, rótulo "já existe no
    calendário: <título>" e checkbox desmarcado por padrão.
  - Botões: **Adicionar N ao calendário** (primário) e **Ignorar**.
  - Abre sozinho quando `iaStatus === "CONCLUIDO"`, há avisos com data e
    `avisosCalendarioRevisadosEm` está vazio. Fechar sem decidir não marca
    nada — reabre na próxima visita ou pelo botão abaixo.
- `app/(ready)/gravacoes/[id]/admin/page.tsx`: montar o diálogo + botão
  "Calendário" no header da aba Avisos (reabre o diálogo a qualquer momento,
  inclusive para gravações antigas ou depois de editar avisos).
- `shared/components/layout/DevContext.tsx`: atualizar entrada da página admin
  (nova query/mutation/componente).

## Impacto em Shared
- [x] Toca `convex/schema.ts` (1 campo opcional em `gravacoes`) — não editar
  em paralelo com outra feature de schema.
- [ ] Não toca rbac, auth, FileUpload, AppSidebar.
- Risco de regressão: testes de IA que esperam eventos criados ao fim do
  pipeline.

## Riscos
- Gravações já processadas antes da mudança têm `avisosCalendarioRevisadosEm`
  vazio → o diálogo abriria ao abrir o admin. Mitigação: só abrir sozinho se
  `iaProcessadoEm` for posterior ao deploy da feature (constante no código) —
  ou aceitar que abre uma vez e a pessoa clica "Ignorar". Decidir na
  implementação; a segunda opção é mais simples.
- Quem processa via `/subir-audio` (voluntário) não vê o diálogo — o áudio
  entra como rascunho sem IA; a IA é disparada depois por admin na página
  admin, onde o diálogo aparece. OK.
- Se a pessoa nunca abrir o admin depois do processamento, os eventos não
  entram. Aceitável: é exatamente o "humano no meio" pedido.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | `avisosCalendarioRevisadosEm` em `gravacoes` |
| `convex/gravacoes/aiAction.ts` | Modificar | remover Step 4 (criação automática) |
| `convex/gravacoes/ai.ts` | Modificar | `getAvisosParaCalendario`, `confirmarEventosDeAvisos`; remover `createEventosFromAvisos` |
| `convex/gravacoes/__tests__/gravacoesIA.integration.test.ts` | Modificar | ajustar/adicionar testes da confirmação |
| `features/gravacoes/components/ConfirmarEventosDialog.tsx` | Criar | diálogo de confirmação |
| `app/(ready)/gravacoes/[id]/admin/page.tsx` | Modificar | montar diálogo + botão na aba Avisos |
| `shared/components/layout/DevContext.tsx` | Modificar | atualizar entrada da página admin |

## Ordem de Implementação
1. Schema + backend (query, mutation, remover Step 4) + testes.
2. Diálogo + integração na página admin.
3. Screenshot mobile (390px) e desktop; PR com preview para revisão.
4. Após merge: `npx convex deploy` (backend) — só com autorização.
