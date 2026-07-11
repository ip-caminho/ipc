# Relatório da turma no WhatsApp

## Escopo
Compartilhar o relatório (lição) da turma como mensagem de WhatsApp formatada,
para o responsável enviar semanalmente no grupo dos pais. **Sem backend novo** —
os dados já existem em `eduRelatorios`.

## Decisões
- Título = "Lição N — <tema>" (sem campo/schema novo; tema entra no título, não
  repete linha "Tema").
- Conteúdo: título, data, professores, texto base, história, aplicação, lição de
  casa. **Exclui** presença (LGPD), observações internas e visitantes.
- Compartilhamento: share nativo (mobile → escolhe o grupo) com fallback `wa.me`.
- Botão no `RelatorioDetalhe` + atalho (ícone) no card da lista.

## Arquivos
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `features/educacional/lib/relatorioWhatsApp.ts` | Criar | `formatRelatorioWhatsApp` (puro) + `shareRelatorioWhatsApp` (share/wa.me) |
| `features/educacional/lib/__tests__/relatorioWhatsApp.test.ts` | Criar | 8 testes do formatador |
| `features/educacional/components/RelatorioDetalhe.tsx` | Modificar | Botão "Compartilhar no WhatsApp" |
| `app/(ready)/educacional/page.tsx` | Modificar | Atalho no card (busca `getRelatorio` sob demanda via `useConvex`) |
| `shared/components/layout/DevContext.tsx` | Modificar | Nota da feature |

## Verificação
- `tsc --noEmit` 0 erros (getRelatorio precisou de `// @ts-ignore Convex TS2589`)
- `npm run lint` 0 erros
- `npm test` 31 testes educacional verdes (8 novos)
- `npm run build` OK
