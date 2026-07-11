# Educacional — Aba Resumo + Turmas com chips + polimento

## Escopo
Melhorar a página `/educacional`: nova aba **Resumo** (cockpit do coordenador),
aba **Turmas** com chips de filtro + contagem e agrupamento por turma, e
polimento (ícone distinto da Escala). **Sem alteração de backend** — o Resumo é
computado no client a partir de queries já existentes.

## Modelos Afetados
Nenhum. Somente frontend.

## Permissões
- Resumo/Turmas: `criancas:read` (crianças/aniversários), `educacional:read`
  (escala/voluntários), `voluntarios_edu:read` (tile de voluntários — só aparece
  com a permissão).

## Dados (tudo client-side, sem query nova)
- Crianças total + por turma: `listCriancas` (passa a buscar todas; filtro e
  contagem no client — consistência entre chips e grid).
- Próximo domingo (lacunas): `dias` de `lib/escala.ts` (já derivado de `listEscalas`).
- Aniversariantes da semana: `proximosAniversarios` (novo fetch na página; conta
  `diasAteAniversario <= 7`).
- Voluntários total + CAC a vencer: `voluntariosParaEscala` (já buscado; conta
  `cacValidade <= hoje+30`).

## Impacto em Shared
- [x] `DevContext.tsx` — atualizar entrada (novos componentes, aba Resumo).
- [ ] Não toca schema/rbac/FileUpload.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `features/educacional/components/EducacionalResumo.tsx` | Criar | Tiles clicáveis: crianças (+ por turma), próximo domingo (lacunas), aniversariantes da semana, voluntários (+ CAC a vencer). Cada tile navega para a aba |
| `features/educacional/components/TurmaFilterChips.tsx` | Criar | Chips "Todas"+turmas com contagem (tap ≥44px, cor da turma), substitui o Select |
| `app/(ready)/educacional/page.tsx` | Modificar | Tabs controladas com default "resumo"; busca todas as crianças + filtro/contagem/agrupamento client-side; fetch `proximosAniversarios`; ícone distinto p/ Escala (CalendarCheck) |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualizar entrada `/educacional` |

## Ordem de Implementação
1. `TurmaFilterChips` + `EducacionalResumo` (componentes puros de apresentação).
2. Página: Tabs controladas, aba Resumo, refatorar Turmas (chips + agrupamento).
3. Polimento de ícone.
4. DevContext.
5. Verificação: lint, tsc, build, screenshots (pós-deploy).
