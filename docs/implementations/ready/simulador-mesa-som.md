# Simulador da mesa de som (issue #314)

## Escopo
Rota `/treinamento/mesa-de-som`, sem login: mesa Yamaha DM3 interativa para voluntários treinarem cabos, ligar e desligar, mute, cada caixa, gravação no pendrive, presets, banda e retornos. Inclui modo livre.

## Modelos Afetados
| Tabela | Tipo de Mudanca |
|--------|-----------------|
| Nenhuma | Roda só no navegador, sem Convex |

## Permissoes
Publica. Fora do menu e do sitemap, com `noindex`. Nao mostra dado de pessoa.

## Impacto em Shared
- [x] `middleware.ts` (rota publica)
- [x] `shared/components/layout/DevContext.tsx`
- [ ] Nao toca `schema.ts`, RBAC nem `FileUpload.tsx`

## Instalacao reproduzida
- Mesa liga ao rack por 1 cabo de rede no Dante PRIMARY. Microfones entram no rack. Rack e caixas ja ficam ligados.
- PA = MAIN; Mon 1-3 = Mix 1-3; Rear 1-2 = Mix 4-5.
- Canal 1 = pastor; canal 2 = sem fio. Os outros canais e os niveis dos presets sao exemplos.
- Mapa inteiro em `features/mesaSom/lib/config.ts`.

## Decisoes
- Logica em TS puro (`simulador.ts`, `licoes.ts`), testada sem navegador.
- Som e so visual: mapa do salao e mistura de cada caixa. Sinal simulado.
- CSS Module proprio: a mesa e desenho, nao tela de sistema. Botoes da pagina usam shadcn/ui por cima.
- Licao atual na URL (`?licao=`); licoes concluidas em `localStorage`.
- Sem logo nem imagem da Yamaha.

## Riscos
Pontos a conferir na mesa real estao listados na propria pagina. O mais caro: se baixar ou mutar o MAIN corta a gravacao.

## Fora do Escopo
Audio real; registro de quem concluiu; link no menu; EQ, compressor, efeitos, ganho e +48V.
