# Expansão do Educacional Infantil

## Escopo

Expandir o módulo `educacional` (já existente) para cobrir: visão 360° das crianças
(aniversários, transição de turma, ovelhinhas), cadastro de voluntários (CAC/CBCM/
certificado/papel/turmas), registro completo de lições, calendário do departamento e
visões contextuais para pais/professores. Entrega **faseada**, começando pela Fase 1.

## Decisões fechadas (07/2026)

- **Voluntário = membro já cadastrado** (nunca externo; referencia `membros`/`entidades`, não cria entidade nova).
- **Lição é registro único**: "memorização" é apenas o campo `passagemMemorizar`; tema, textos-base, aplicação, história, lição de casa, observações internas, professores e visitantes ficam todos no mesmo registro (expansão de `eduRelatorios`). **Não** haverá tabela `eduMemorizacao`.
- **Ovelhinha mantém o modelo atual**: `criancaPerfil.ovelhinhaId` = pessoa (membro) que cuida da criança de perto. **Sem** introduzir o termo "pastorzinho". Adiciona-se apenas a marcação de quem é *apto a ser ovelhinha* para popular o select.
- **Visitantes** = lista de nomes em texto livre (não vira cadastro de criança).
- **Departamento no calendário** = ministério "Educacional" já existente (reusa `ministerioId`, filtro pronto). Sem tabela nova de departamento.

## O que já existe (base a reaproveitar)

- `criancaPerfil` (turma, `usoImagem` AUTORIZADO/NAO_AUTORIZADO/PENDENTE, `ovelhinhaId`, obs médicas/família), `responsaveis`, `eduRelatorios` + `eduPresencas`, `ministerioEscalas`.
- Derivação de turma por idade: `turmaFromDataNascimento` (`convex/membros/selfService.ts:428`).
- CBCM reutilizável: `features/membros/lib/constants.ts:97` (`CBCM_OPTIONS`).
- Upload B2: módulo `shared/files/` (`FileUpload` + `useFileUpload`).
- Calendário com filtro por ministério: `app/(ready)/calendario/page.tsx` + `convex/calendario/queries.ts`.
- RBAC: `criancas:read`, `criancas:manage`, `educacional:read`, `educacional:write`; set `voluntario_educacional`.

## Modelos Afetados

| Tabela | Tipo de Mudança | Fase |
|--------|-----------------|------|
| `eduOvelhinhas` (nova) | `membroId`, `criadoEm` — lista de membros aptos a ovelhinha | 1 |
| `criancaPerfil` | leitura enriquecida (aniversário, próxima turma, data de transição) — sem novo campo | 1 |
| `eduVoluntarios` (nova) | perfil de voluntário educacional (ver Fase 2) | 2 |
| `eduRelatorios` | +`numero`, `tema`, `textosBase[]`, `passagemMemorizar`, `historia`, `aplicacao`, `licaoDeCasa`, `observacoesInternas`, `visitantes[]` (todos opcionais) | 3 |
| `calendarioEventos` | sem mudança de schema (reusa `ministerioId`) | 4 |

## Permissões

- **Usar (gerir)**: `criancas:manage` (crianças/ovelhinhas), `educacional:write` (lições/escalas), nova `voluntarios_edu:manage` (Fase 2).
- **Ver**: `criancas:read`, `educacional:read`; pais via `dashboardPais` (ownership); professores via `useProfessorTurmas`.
- Novas permissões (Fase 2): `voluntarios_edu:read`, `voluntarios_edu:manage` — registrar em `ALL_PERMISSIONS`, labels/descrições/módulo em `rbac.ts`, conceder em `INITIAL_ROLE_PERMISSIONS` + migração idempotente.

## Impacto em Shared

- `convex/schema.ts` — **danger zone**: adições de tabela/campos opcionais (retrocompatíveis). Nunca em paralelo com outra feature que toque schema.
- `shared/constants/navigation.ts` — possíveis novos itens sob `modulo:"educacional"`.
- `convex/preferencias/rbac.ts` + `rbacHelpers.ts` — só na Fase 2 (novas permissões de voluntário).
- `shared/files/*` — Fase 2 (upload de certificado CAC).
- `shared/components/layout/DevContext.tsx` — atualizar `CONTEXT_MAP` a cada página tocada.
- Risco de regressão: `selfService.ts`/`FamiliaSection.tsx` compartilham a lógica de turma — extrair `turmaFromDataNascimento` para lib compartilhada em vez de duplicar.

## Riscos

- Turma é *snapshot* no cadastro (não recalcula com a idade). A Fase 1 apenas **exibe** a divergência ("muda de turma em…"); recálculo/migração automática é decisão à parte (não incluída).
- Select de ovelhinha sem marcação de aptos listaria todos os membros — por isso `eduOvelhinhas`.
- `eduRelatorios` cresce em bytes por lição; manter campos de texto no próprio doc é aceitável (leitura sob demanda, não em lista reativa ampla).

## Ordem de Implementação (fases)

1. **Crianças 360°** — aniversários, transição de turma, ovelhinhas (aptos + vínculo no form), label uso de imagem.
2. **Voluntários** — `eduVoluntarios` (CAC, turmas habilitadas, CBCM, papel Aux/Prof/Apoio, upload certificado CAC), permissões novas.
3. **Registro de lições** — expandir `eduRelatorios` + form/telas de planejar e registrar lição.
4. **Calendário do departamento** — visão embutida filtrada pelo ministério Educacional + histórico + toggle para o calendário geral.
5. **Visões pais/professores** — relatórios/lições exibidos por contexto na home (estende `EducacionalPaisWidget` + persona professor).

---

## Fase 1 — Crianças 360° (detalhe)

### Objetivo
Enriquecer a visão das crianças com aniversário, previsão de mudança de turma e gestão
de ovelhinhas, ajustando o rótulo de uso de imagem. Máximo reaproveitamento do que existe.

### Gaps a fechar
1. **Aniversário**: exibir data + idade em card/detalhe e uma lista de "próximos aniversários".
2. **Quando vai mudar de turma**: derivar da data de nascimento (próxima borda etária 3/5/7/9/11 anos → data = nascimento + N anos) e exibir; sinalizar quando a turma-snapshot diverge da turma-por-idade.
3. **Ovelhinhas**: marcar membros *aptos* (`eduOvelhinhas`) e permitir escolher a ovelhinha no `CriancaForm` (hoje o form não edita `ovelhinhaId`).
4. **Uso de imagem**: rótulo `PENDENTE` → "Não assinado" na UI (constante), mantendo o valor no banco.

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | + tabela `eduOvelhinhas { membroId, criadoEm }`, índice `by_membro` |
| `convex/educacional/queries.ts` | Modificar | `listOvelhinhasAptas`; enriquecer `listCriancas`/`getCrianca` com `aniversario`, `proximaTurma`, `dataTransicaoTurma`; query `proximosAniversarios` |
| `convex/educacional/mutations.ts` | Modificar | `addOvelhinhaApta` / `removeOvelhinhaApta`; `updateCrianca` já patcha `ovelhinhaId` |
| `features/educacional/lib/constants.ts` | Modificar | Rótulo uso de imagem `PENDENTE` → "Não assinado" |
| `features/educacional/lib/idade.ts` | Criar | Extrair `calcularIdade` (hoje duplicado) + `proximaTransicaoTurma(dataNascimento)` (reusa cortes de `turmaFromDataNascimento`) |
| `features/educacional/components/CriancaForm.tsx` | Modificar | Select de ovelhinha (opções = aptos) |
| `features/educacional/components/CriancaCard.tsx` | Modificar | Usar `lib/idade`; badge/linha "muda de turma em …"; aniversário |
| `features/educacional/components/CriancaDetalhe.tsx` | Modificar | Usar `lib/idade`; bloco aniversário + transição de turma |
| `features/educacional/components/OvelhinhasManager.tsx` | Criar | Gerir lista de membros aptos a ovelhinha |
| `app/(ready)/educacional/page.tsx` | Modificar | Card/aba "Próximos aniversários"; entrada para gerir ovelhinhas (sob `criancas:manage`) |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualizar entrada do educacional |

### Ordem
1. Schema `eduOvelhinhas` + `lib/idade.ts` (base).
2. Queries/mutations (aptos + enriquecimento de crianças).
3. UI: form (ovelhinha), card/detalhe (aniversário/transição), manager de aptos, próximos aniversários.
4. `lint` + `test` + screenshot mobile (390px) antes de integrar.

## Perguntas em aberto (Fase 1)
- Lista de "próximos aniversários" é do **departamento inteiro** ou por **turma**? (default: departamento, com filtro de turma opcional)
- "Muda de turma" deve gerar apenas **exibição** ou também um **alerta/lista de pendências** para o coordenador reenquadrar? (default: exibição + lista de divergências, sem mover automático)
