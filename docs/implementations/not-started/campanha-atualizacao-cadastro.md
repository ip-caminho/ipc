# Campanha de Atualização de Cadastro

## Escopo

Disparar mensagens WhatsApp em massa para membros ativos pedindo confirmacao/atualizacao do cadastro. Acompanhar quem atualizou via dashboard admin. Ampliar campos voláteis editáveis pelo próprio membro (nome social, contato de emergência, escolaridade). Adicionar marcação `vinculoIgreja` em `entidades` para preparar segmentação futura (frequentadores em Fase 1.5). Bug-fix em `autoLinkByPhone` (valida status) e hardening do provedor WuzAPI (timeout + retry).

Fora de escopo desta entrega: edição de filhos via self-service (mantém array atual, refactor em Fase 2 com pastoreio); sacramentos detalhados (local/oficiante/padrinhos); tabela LGPD; mandato de cargos; campanha para frequentadores.

## Modelos Afetados

| Tabela | Tipo de Mudança |
|--------|-----------------|
| `entidades` | Adicionar `nomeSocial`, `contatoEmergencia`, `vinculoIgreja`, `perfilAtualizadoEm`, `perfilAtualizadoPor`, `dadosIncertos`, `camposVerificados` |
| `membros` | Adicionar `numeroMatricula`, `observacoesPastorais` |
| `campanhas` | Criar (nova tabela) |
| `campanhasEnvios` | Criar (nova tabela) com índice `by_membro_enviadoEm` |

Migração: `convex/migrations/01_vinculo_igreja.ts` derivando `vinculoIgreja` a partir de `entidades.status` + presença em `membros`.

## Permissões

- **Criar/disparar campanha**: `role = 'admin'` apenas (Fase 1). Secretaria não dispara.
- **Visualizar dashboard**: admin.
- **Atualizar próprio perfil**: qualquer membro autenticado (já existe, amplia campos).
- Helper derivado `getTipoRol(membro)` é livre — apenas leitura.

## Impacto em Shared

- [x] **`convex/schema.ts`** — ALTO risco (sensível conforme `worktree-parallel.md`). Worktree única, não paralela com outras que toquem schema.
- [x] **`shared/components/layout/AppSidebar.tsx`** — MÉDIO risco. Adicionar link "Campanhas" com gate.
- [x] **`shared/components/layout/DevContext.tsx`** — MÉDIO risco. Registrar rotas dinâmicas.
- [x] **`convex/membros/autoLink.ts`** — bug pré-existente. Membro TRANSFERIDO/DESLIGADO consegue logar. Fix.
- [x] **`convex/messaging/wuzapiProvider.ts`** — sem timeout/retry. Hardening.

## Riscos

1. **Regressão em pastoreio**: `MembroPerfilPastoral.tsx` lê `membros.filhos` array. Por isso adicionei `paiId`/`maeId` apenas para uso futuro; nessa fase não há fluxo de criação de filho via UI.
2. **Worktree paralela**: `.claude/worktrees/visao-enxuta-por-papel/` toca `convex/membros/mutations.ts` e `convex/pastoreio/queries.ts`. Coordenar ordem de merge.
3. **WuzAPI bloqueio**: envios em rajada com pouco intervalo aumentam risco de ban. Mitigado por jitter 30-90s.
4. **Convex action timeout (~10min)**: pipeline auto-reagendável via `scheduler.runAfter()` evita estouro (pattern em `gravacoes/youtubeAction.ts`).
5. **LGPD menores**: como filhos via UI não entra na Fase 1, sem exposição extra.

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Novos campos + 2 tabelas |
| `convex/migrations/01_vinculo_igreja.ts` | Criar | Derivar `vinculoIgreja` |
| `convex/membros/_shared/tipoRol.ts` | Criar | Helper `getTipoRol()` derivado |
| `convex/membros/selfServiceHelpers.ts` | Modificar | Ampliar `SELF_SERVICE_FIELDS` |
| `convex/membros/selfService.ts` | Modificar | Gravar `perfilAtualizadoEm/Por`; hook ATUALIZOU |
| `convex/membros/autoLink.ts` | Modificar | Validar `status === "ATIVO"` |
| `convex/messaging/wuzapiProvider.ts` | Modificar | Timeout 30s + 1 retry |
| `convex/messaging/campanhas.ts` | Criar | Pipeline com scheduler |
| `app/(ready)/meu-perfil/page.tsx` | Modificar | Novos campos + banner |
| `app/(ready)/campanhas/page.tsx` | Criar | Listagem |
| `app/(ready)/campanhas/nova/page.tsx` | Criar | Form de criação |
| `app/(ready)/campanhas/[id]/page.tsx` | Criar | Detalhe + stats |
| `features/campanhas/components/CampaignForm.tsx` | Criar | Form com filtros |
| `features/campanhas/components/CampaignStats.tsx` | Criar | Stats + tabela envios |
| `shared/components/layout/AppSidebar.tsx` | Modificar | Link "Campanhas" |
| `shared/components/layout/DevContext.tsx` | Modificar | Registrar rotas |
| `convex/membros/__tests__/selfService.test.ts` | Modificar/Criar | Cobertura novos campos |
| `convex/messaging/__tests__/campanhas.test.ts` | Criar | Anti-spam + jitter + pipeline |
| `convex/membros/__tests__/tipoRol.test.ts` | Criar | Helper derivado |

## Ordem de Implementacao

1. PRD (este arquivo)
2. Schema + migração
3. Helper `getTipoRol`
4. Hardening `autoLink` + WuzAPI (paralelo com #3)
5. Self-service backend
6. Mensageria `campanhas.ts` (pipeline scheduler)
7. UI `/meu-perfil`
8. UI `/campanhas`
9. Sidebar + DevContext
10. Testes
11. Smoke test em dev (lint, tsc, vitest, dev sobe limpo, migração)

## Critério de Pronto

- `npm run lint` e `npm test` verdes
- `tsc --noEmit` verde
- Migração rodada em dev: 100% das entidades têm `vinculoIgreja`
- Smoke test backend: criar campanha de teste → disparar em bypass → ver pipeline avançar via `mcp__convex__data`
- Checklist manual do usuário entregue (UI no browser, WhatsApp real)
