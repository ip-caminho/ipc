# Escala Educacional — Redesign

## Escopo
Transformar a tela de Escala do Educacional Infantil de "lista de escalas avulsas"
em um planejamento por domingo × turma: grade com lacunas/conflitos visíveis,
criação por domingo (todas as turmas de uma vez) puxando apenas voluntários
habilitados do cadastro `eduVoluntarios`, geração dos domingos do mês (vazios),
e visão "Minha Escala" para o voluntário. Sem alteração de schema.

## Decisões (confirmadas)
- **Gerar mês**: cria apenas os domingos do mês com turmas em branco. SEM rodízio
  automático — preenchimento manual em cada slot.
- **CAC vencido**: avisar (badge de alerta), NÃO bloquear. Voluntário com
  `cacValidade < data` continua elegível, mas sinalizado.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `ministerioEscalas` | Nenhuma alteração de schema. Passa a gravar `papel` normalizado (`PROFESSOR`/`AUXILIAR`/`APOIO`); rows antigas (`"Professor"`/`"Auxiliar"`) continuam válidas via display back-compat |
| `eduVoluntarios` | Somente leitura — vira fonte dos membros elegíveis (papel + `turmasHabilitadas` + `cacValidade`) |

Nenhuma tabela nova, nenhum índice novo (usa `by_ministerio_data` existente).

## Permissões
- **Ver escala** (grade, próximos/passados): `educacional:read`
- **Criar/editar/gerar/excluir escala**: `educacional:write`
- **Minha Escala** (voluntário vê só as próprias datas): `educacional:read` + ownership
  (`membro.userId === ctx.auth.userId`); não exige `write`
- Fonte de voluntários elegíveis: leitura de `eduVoluntarios` dentro de query já
  autorizada por `educacional:read` (não exige `voluntarios_edu:read` para o admin
  montar a escala)

## Impacto em Shared
- [x] Toca arquivos sensíveis? **`DevContext.tsx`** (atualizar entrada da rota
  `/educacional`). **Não** toca `schema.ts`, `rbac.ts`, `FileUpload.tsx`.
- [x] Risco de regressão: `sugestaoVoluntariosRelatorio` depende de
  `ministerioEscalas.membros` e do papel — a normalização de papel precisa manter
  esse fluxo funcionando (Relatório "Preencher pela escala").

## Riscos
- **Papel divergente**: escala grava `"Professor"/"Auxiliar"`; voluntários usam
  `PROFESSOR/AUXILIAR/APOIO`. Normalizar para o enum de voluntário e mapear rows
  antigas na exibição. `sugestaoVoluntariosRelatorio` já resolve papel via
  `eduVoluntarios` (não pelo campo da escala), então não quebra.
- **CAC vencido**: voluntário elegível pode ter `cacValidade < data` da escala.
  Decisão: **avisar, não bloquear** (bloquear deixaria lacuna). Badge de alerta.
- **Bandwidth**: trocar `collect()+filter` de `listEscalas` por range no índice
  `by_ministerio_data` (janela de datas) — melhora, não piora.
- **Migração leve de papel**: não há migração de dados; apenas display tolerante a
  ambos os formatos e escrita nova no formato normalizado.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/educacional/queries.ts` | Modificar | `listEscalas` → range por `by_ministerio_data` + janela; enriquecer com `papel` normalizado e flag `cacVencido` por membro. Nova `minhaEscala` (próximas datas do membro logado). Nova `voluntariosElegiveisEscala(turma)` (habilitados + validade CAC) ou reuso de `listVoluntarios` |
| `convex/educacional/mutations.ts` | Modificar | `upsertEscalaDia` (grava/atualiza todas as turmas de uma data numa tacada, upsert por `ministerioId+data+subgrupo`); `gerarEscalaMes` (cria os domingos do mês em branco, pula datas já existentes); manter/adaptar `createEscala`/`removeEscala`. Papel gravado normalizado |
| `features/educacional/lib/constants.ts` | Modificar | Unificar papel da escala em `PAPEL_VOLUNTARIO_OPTIONS`; helper `normalizePapel()` p/ back-compat |
| `features/educacional/lib/validations.ts` | Modificar | Schemas do form "por domingo" e do gerador de mês |
| `features/educacional/lib/escala.ts` | Criar | Lógica pura: agrupar escalas por data, detectar lacunas (turma sem professor) e conflitos (membro 2x no mesmo dia), listar domingos de um mês |
| `features/educacional/components/EscalaGrade.tsx` | Criar | Grade próximos domingos × turma, com lacunas/conflitos em destaque; mobile = um bloco por domingo, uma linha por turma (leitura) |
| `features/educacional/components/EscalaDiaForm.tsx` | Criar | Substitui `EscalaForm`: escolhe data → slots de todas as turmas (Prof/Aux/Apoio), select só com voluntários habilitados na turma + aviso CAC |
| `features/educacional/components/EscalaMesGenerator.tsx` | Criar | Cria os domingos do mês em branco (escolhe mês/ano), pula datas já existentes |
| `features/educacional/components/MinhaEscala.tsx` | Criar | Voluntário vê só as próximas datas dele (mobile-first) |
| `features/educacional/components/EscalaForm.tsx` | Remover | Substituído por `EscalaDiaForm` |
| `app/(ready)/educacional/page.tsx` | Modificar | Tab Escala: split Próximos × Passados, render `EscalaGrade`, `AlertDialog` no excluir (tira `window.confirm`), `MinhaEscala` p/ persona voluntário, botões Nova/Gerar mês |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualizar entrada `/educacional` (novos componentes/queries/mutations) |

## Detalhamento das melhorias (A–E)
- **A. Grade semana × turma**: agrupar por data; dentro, uma linha por turma
  (`TURMA_OPTIONS`). Lacuna = turma sem `PROFESSOR` → destaque "sem professor".
  Conflito = mesmo `membroId` em 2 turmas no mesmo dia → badge de alerta.
- **B. Criação por domingo + gerar mês**: form parte da data e abre todas as
  turmas; `upsertEscalaDia` grava tudo. `gerarEscalaMes` cria os domingos do mês
  em branco (pula datas já existentes) — sem rodízio.
- **C. Integração com Voluntários**: selects puxam `eduVoluntarios` filtrados por
  `turmasHabilitadas` e papel; aviso se `cacValidade < data`. Fim do uso de
  `ministerio.membros` cru.
- **D. Minha Escala**: query `minhaEscala` por membro logado, próximas datas.
- **E. Ganhos rápidos**: split Próximos × Passados; `AlertDialog` no excluir;
  badges de papel via `PAPEL_VOLUNTARIO_COLORS`.

## Ordem de Implementação
1. **Backend** — `constants.ts` (normalização de papel) → `queries.ts`
   (`listEscalas` range + enriquecimento, `minhaEscala`, elegíveis) →
   `mutations.ts` (`upsertEscalaDia`, `gerarEscalaMes`). Verificar que
   `sugestaoVoluntariosRelatorio` continua ok.
2. **Lógica pura** — `lib/escala.ts` (grupos, lacunas, conflitos, domingos do
   mês) + testes Vitest.
3. **UI** — `EscalaGrade` → `EscalaDiaForm` → `EscalaMesGenerator` → `MinhaEscala`.
4. **Página** — integrar na tab Escala (split, AlertDialog, persona).
5. **DevContext** — atualizar entrada.
6. **Verificação visual** — screenshot mobile (390) + desktop da grade e do form.
