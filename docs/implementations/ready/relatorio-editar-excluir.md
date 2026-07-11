# Relatórios: editar e excluir

## Escopo
Permitir editar e excluir relatórios do educacional pela UI (antes: sem edição
explícita e sem exclusão nenhuma).

## Decisões
- **Editar**: botão no `RelatorioDetalhe` abre o `RelatorioForm` pré-preenchido.
  Turma+data ficam travadas (são a identidade do upsert `createRelatorio`;
  mudá-las criaria duplicado). Sem backend novo — reusa o upsert existente.
- **Excluir**: nova mutation `removeRelatorio` (cascade em `eduPresencas`),
  `AlertDialog` de confirmação.
- Ambos gated por `educacional:write`. Auditoria: `removeRelatorio` grava
  audit log DELETE.

## Modelos Afetados
Nenhuma mudança de schema. `removeRelatorio` apaga `eduRelatorios` + `eduPresencas`.

## Arquivos
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/educacional/mutations.ts` | Modificar | `removeRelatorio` (cascade presenças + audit) |
| `features/educacional/components/RelatorioForm.tsx` | Modificar | props `defaultValues`/`isEditing`; reset ao abrir; trava turma+data; título/botão dinâmicos |
| `features/educacional/components/RelatorioDetalhe.tsx` | Modificar | botões Editar/Excluir (props `canWrite`/`onEdit`/`onDelete`) |
| `app/(ready)/educacional/page.tsx` | Modificar | estados edição/exclusão, handlers, AlertDialog, wiring |
| `shared/components/layout/DevContext.tsx` | Modificar | mutation + nota |

## Verificação
- `convex codegen` OK · `tsc --noEmit` 0 erros · `npm run lint` 0 erros
- `npm test` 31 testes educacional verdes · `npm run build` OK
- Requer `convex deploy` (nova mutation).
