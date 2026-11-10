# Dashboard: hora errada no cartão Próximo culto

Issue: #341

## Escopo
O cartão "Próximo culto" do dashboard mostra uma hora inventada quando o culto não tem horário ou quando não há culto publicado. Passa a mostrar só o dia nesses casos.

## Causa
`features/dashboard/components/BoletimCard.tsx`:
- linha 51 (`fallbackLabel`): `format(nextSunday(new Date()), "EEEE',' HH'h'")` — `nextSunday` mantém a hora atual, então sai a hora de agora.
- linha 61: `format(parseISO(data), "EEEE',' HH'h'")` — `data` é só o dia (`YYYY-MM-DD`), então a hora sai 00h.

## Mudança
- Extrair a montagem do rótulo para uma função pura em `features/dashboard/lib/proximoCultoLabel.ts`:
  `proximoCultoLabel(proximoCulto: { data: string; horario: string | null } | null | undefined, hoje: Date): string`
  - com culto e `horario`: `"<dia da semana>, <horario>"` (comportamento atual);
  - com culto sem `horario`: só o dia da semana;
  - sem culto: dia da semana do próximo domingo (ou de hoje, se hoje for domingo), sem hora.
- `BoletimCard.tsx` passa a usar essa função (texto e `aria-label`).

## Modelos Afetados
Nenhum. Sem mudança no Convex.

## Permissões
Sem mudança (`escalas:read` continua controlando o cartão).

## Impacto em Shared
- [ ] Não toca arquivos sensíveis.

## Arquivos
| Arquivo | Ação |
|---|---|
| `features/dashboard/lib/proximoCultoLabel.ts` | criar |
| `features/dashboard/lib/__tests__/proximoCultoLabel.test.ts` | criar |
| `features/dashboard/components/BoletimCard.tsx` | modificar |

## Verificação
- Teste unitário cobrindo os três casos acima; em nenhum caso sem `horario` o rótulo contém dígito.
- `npx vitest run features/dashboard` passa.
- `npx eslint features/dashboard` sem erros.

## Fora do escopo
- Buscar o horário padrão do culto na configuração da igreja.
- Qualquer outra mudança no cartão (estado ao vivo, layout).
