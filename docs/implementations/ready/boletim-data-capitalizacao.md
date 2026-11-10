# Boletim: data com maiúscula em todas as palavras

Issue: #351

## Escopo
A classe `capitalize` em `features/boletim/components/BoletimContent.tsx:211` deixa a data como "15 De Novembro De 2026".

## Mudança
Remover `capitalize`. O formato já começa com o dia em número, então não há primeira letra a ajustar: a data sai "15 de novembro de 2026".

## Modelos Afetados
Nenhum.

## Permissões
Sem mudança.

## Impacto em Shared
Não toca arquivos sensíveis.

## Riscos
Nenhum: só classe de estilo.
