# Mobile Audit — Findings fora de escopo

Anotações descobertas durante a auditoria mobile-first que NÃO fazem parte do escopo atual (UI/UX mobile) mas merecem tratamento futuro.

## PWA offline-first

[public/sw.js](../public/sw.js) só trata push notifications. Não há cache offline, nem registro no cliente (`navigator.serviceWorker.register`). Tratamento proposto:

- Instalar Serwist ou Workbox
- Estratégia stale-while-revalidate para assets estáticos
- Network-first para queries Convex
- Fallback offline page

## Virtualização em listas longas

Selects e Comboboxes de membros podem renderizar 500+ itens. Mesmo com ResponsiveSelect + search, para igrejas grandes valeria virtualizar via `@tanstack/react-virtual`.

## Drag-and-drop em touch

`@dnd-kit/core` já instalado. Confirmar UX em touch (long-press, visual feedback, auto-scroll) nas features que usam DnD.

## MobileAudioPlayer vs MobileTabBar spacing

Altura atual: TabBar 68px + Player 56px = 124px fixo antes da safe-area. Em telas pequenas (iPhone SE) isso come ~20% da viewport. Avaliar redução de altura ou colapso do player.

## Header perfil/logout em mobile

[Header.tsx](../shared/components/layout/Header.tsx) é `hidden md:flex`. Mobile não tem acesso ao dropdown de perfil/logout fora da sidebar recolhida (que nem aparece em mobile). MobileHeader vai resolver — item 3.8 do plano.

## PermissionMatrix

Por ora bloqueada em mobile com aviso. Se admin começar a gerenciar permissões pelo celular, reconsiderar versão stack-por-membro.

## Scheduled function para resetar `boletim.isLive`

`getLiveStatus` calcula `isLive` server-side a partir do relógio + `isDomingoWindowBrasil` (sábado ≥18h ou domingo inteiro). No frontend, [BoletimCard.tsx](../features/dashboard/components/BoletimCard.tsx) aplica um segundo filtro (`isBoletimLiveNow`) que só aceita entre 08:00 e 00:30 — salvaguarda contra estado "Ao vivo" às 3h da manhã.

**Dívida:** se no futuro introduzirmos uma flag manual no schema (`cultos.liveOverride` ou similar), vai faltar um cron/scheduled function no Convex para resetar essa flag automaticamente após 00:30. Hoje isso não existe, então a flag hipotética ficaria "ligada" para sempre até alguém desligar manualmente. Tratamento proposto:

- `ctx.scheduler.runAt` dentro da mutation que liga a flag, para desligar às 00:30 do dia seguinte
- Ou cron function em `convex/crons.ts` que roda todo dia 00:31 e zera flags stale

Enquanto isso, o helper frontend é suficiente.

## Ambiguidade de entrada de perfil

Hoje o usuário mobile tem duas entradas para áreas pessoais/administrativas:

1. Avatar no `MobileHeader` (canto superior direito) → `/meu-perfil` + logout + tema
2. Aba "Gestão" no `MobileTabBar` → rota administrativa (quando `hasAnyRole(ELEVATED_ROLES)`)

Se ambos são destinos distintos (pessoal vs. sistema), ícones comunicam isso bem — OK. Mas vale um passe de UX writing para confirmar que nenhum usuário confunde. Não é blocker; rever quando tiver tracking de cliques.
