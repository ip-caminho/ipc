# Campo de data digitada

## Escopo
Unificar a inserção de data de nascimento e de datas antigas em um campo com três caixas rotuladas (Dia, Mês, Ano) e confirmação por extenso, sem risco de trocar dia e mês. Issue #326.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| Nenhuma | Só frontend; o valor continua em ISO (yyyy-mm-dd) |

## Permissões
Sem mudança. Cada tela mantém as permissões atuais.

## Impacto em Shared
- [x] Toca `shared/components/layout/DevContext.tsx` e `shared/components/ui/date-input-br.tsx`
- [x] Risco de regressão nos formulários do retiro e de turmas, que já usavam `DateInputBR`

## Riscos
Datas já gravadas invertidas não são detectáveis e não são corrigidas.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `shared/components/ui/date-input-br.tsx` | Reescrever | Três caixas, salto automático, confirmação, wrapper para React Hook Form |
| `shared/lib/utils/date.ts` | Modificar | Validação pura de dia, mês e ano |
| Formulários de nascimento e datas antigas | Modificar | Trocar calendário, campo nativo e caixa única |
| Listagens com data crua | Modificar | Exibir dd/mm/aaaa com `formatDataBR` |

## Ordem de Implementação
1. Utilitários e testes
2. Componente
3. Troca dos campos e exibições
