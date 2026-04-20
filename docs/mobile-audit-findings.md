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
