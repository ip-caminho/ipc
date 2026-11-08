# Mesa de som no iPhone: zonas guiadas

## Escopo
Abaixo de 640 px, o simulador mostra a mesa por partes (Tela, Faders, Atrás, Rack), em tamanho de dedo, em vez de espremer a mesa inteira. A parte acompanha o passo da lição. Do iPad para cima nada muda. Issue #321.

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| — | Nenhuma (página sem Convex) |

## Permissoes
- Rota pública, sem login, como antes.

## Impacto em Shared
- [x] Toca arquivos sensíveis? `shared/components/layout/DevContext.tsx` (entrada do simulador).
- [ ] Risco de regressão: só `/treinamento/mesa-de-som`.

## Decisões
- Tela ↔ Faders trocam sozinhas com o passo (estado só de interface). Atrás e Rack mudam `s.vista`; quando o passo pede, a aba pulsa e o voluntário toca nela.
- Escolha manual de Tela/Faders vale até o passo mudar (derivado, sem efeito).
- FADER BANK vira seletor acima das tiras; 4 tiras visíveis com rolagem lateral; MAIN fixo. A etiqueta de cada tira mostra número do fader, canal e nome, porque a tela não está à vista.
- Lições e "A conferir" num Drawer; mapa do salão num Drawer pela aba Salão; níveis das caixas fixos acima das abas.
- Um só layout no DOM (`useCelular`), para não duplicar ids de porta e alvo.

## Arquivos
| Arquivo | Acao |
|---------|------|
| `features/mesaSom/lib/zonas.ts` (+ teste) | Criado |
| `features/mesaSom/hooks/useCelular.ts` | Criado |
| `features/mesaSom/components/MesaCelular.tsx`, `FadersCelular.tsx`, `MiniMapaMesa.tsx` | Criados |
| `features/mesaSom/components/PainelSuperior.tsx` | Exporta `Tira`, `FendaUsb`, `PlacaHome`, `dadosDaTira` |
| `features/mesaSom/components/MesaSimulador.tsx` | Escolhe o layout |
| `features/mesaSom/components/mesa.module.css` | Estilos `cel-*` e `gaveta` |
| `app/(public)/treinamento/mesa-de-som/page.tsx` | Passa as fontes para os Drawers |

## Fora do escopo
Celular deitado (cai no layout largo atual).
