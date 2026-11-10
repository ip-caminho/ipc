# Próximo domingo: Pregação duplicada e data com maiúsculas erradas

Issue: #343

## Escopo
Em `/proximo-domingo`, corrigir o cartão "Pregação" que aparece duas vezes quando a ordem de louvores não tem separadores, e a data que sai como "15 De Novembro De 2026".

## Causa
`app/(ready)/proximo-domingo/page.tsx`:
- linhas 225–231: bloco "Pregação no final se não foi inserida" adiciona a pregação;
- linhas 233–246: bloco "Fallback sem separadores" adiciona Abertura, Confissão e Pregação de novo no início.
  Sem separadores, os dois blocos rodam e a pregação entra duas vezes (com a mesma `key`).
- linha 148: classe `capitalize` põe maiúscula em todas as palavras da data.

## Mudança
- O bloco "Pregação no final" só roda quando há separadores (`louvores.some(l => l.startsWith("---"))`). Sem separadores, só o fallback adiciona Abertura, Confissão e Pregação.
- Data: trocar `capitalize` por `first-letter:uppercase` (só a primeira letra da frase).

## Modelos Afetados
Nenhum.

## Permissões
Sem mudança.

## Impacto em Shared
- [ ] Não toca arquivos sensíveis.

## Arquivos
| Arquivo | Ação |
|---|---|
| `app/(ready)/proximo-domingo/page.tsx` | modificar |

Sem mudança de queries, mutations ou componentes da página, então o `CONTEXT_MAP` do `DevContext.tsx` não muda.

## Verificação
- Sem separadores e com as três escalas: Abertura, Confissão de Fé e Pregação uma vez cada, nessa ordem, antes das músicas.
- Com separadores: Pregação antes de "Ceia"/"Oferta"; sem esses separadores, no final. Igual a hoje.
- Sem separadores e sem escala de pregação: nenhum cartão de pregação.
- Data: "Domingo, 15 de novembro de 2026".
- `npx eslint "app/(ready)/proximo-domingo/page.tsx"` sem erros novos.

## Fora do escopo
- Extrair a montagem da ordem do culto para outro arquivo.
- Tipar os `any` existentes da página.
