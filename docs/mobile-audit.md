# Auditoria Mobile-First — chrMS (IPC)

Data: 2026-04-19
Escopo: UI/UX mobile. Exclui lógica Convex e validações.

## Resumo executivo

- Infra mobile está mais avançada que o esperado: Drawer (Vaul) instalado, `useIsMobile` centralizado, MobileTabBar com safe-area, PWA completo com manifest + ícones 192/512 maskable.
- **Viewport viola WCAG 2.1 AA** com `maximumScale: 1` + `userScalable: false` — correção P0, 1 linha.
- **5 forms em Dialog pesado** (LouvorForm é o pior caso com ~15 campos + preview lado a lado): candidatos diretos a ResponsiveDialog.
- **8+ Selects renderizam lista completa de membros sem search** — criar `ResponsiveSelect` (combobox com search, Drawer em mobile).
- **MembroTable sem versão mobile**; PermissionMatrix sem viabilidade mobile (Table + Popover + Tooltip por célula).
- **Tap targets < 44px**: múltiplos `h-3`/`h-3.5` em ações de Trash/Pencil e `Button size="icon"` (36px) em features de pastoreio, avisos, ministérios, gravações.
- Nenhum HoverCard e nenhum padrão óbvio `group-hover:opacity` — pontos fortes.

## 1. Componentes problemáticos

### 1.1 Dialogs candidatos a Drawer em mobile

Prioridade alta (>10 campos ou denso):

- [features/louvor/components/LouvorForm.tsx:93](../features/louvor/components/LouvorForm.tsx#L93) — PIOR CASO, grid col-2 com ChordSheet preview + 4 Selects de tom em col-4
- [features/turmas/components/TurmaFormDialog.tsx:75](../features/turmas/components/TurmaFormDialog.tsx#L75) — ~15 campos + Select instrutor (lista completa)
- [features/educacional/components/RelatorioForm.tsx:79](../features/educacional/components/RelatorioForm.tsx#L79) — checkbox list interna com double-scroll
- [features/educacional/components/EscalaForm.tsx:77](../features/educacional/components/EscalaForm.tsx#L77) — FieldArray dinâmico de membros

Prioridade média:

- [features/pequenosGrupos/components/PGForm.tsx:73](../features/pequenosGrupos/components/PGForm.tsx#L73) — 3 Selects de membros
- [features/tarefas/components/TarefaForm.tsx:91](../features/tarefas/components/TarefaForm.tsx#L91) — Select responsável
- [features/ministerios/components/MinisterioForm.tsx:92](../features/ministerios/components/MinisterioForm.tsx#L92) — textareas + papéis/subgrupos dinâmicos
- [features/biblioteca/components/EmprestimoForm.tsx:65](../features/biblioteca/components/EmprestimoForm.tsx#L65) — Select exemplar + Select membro
- [features/pastoreio/components/VisitaForm.tsx:71](../features/pastoreio/components/VisitaForm.tsx#L71) — 2 Selects de membros

Referências positivas:

- [features/dashboard/components/AniversariantesCard.tsx:95](../features/dashboard/components/AniversariantesCard.tsx#L95) — PassadosDrawer bem implementado
- [features/escalas/components/LouvorOrdemSection.tsx:9](../features/escalas/components/LouvorOrdemSection.tsx#L9) — Sheet lateral
- [features/escalas/components/CultosMobileView.tsx](../features/escalas/components/CultosMobileView.tsx) — mobile-first puro (645 linhas, zero `md:`)

### 1.2 Selects/Comboboxes com listas longas

Select shadcn renderizando lista completa de membros sem search/virtualização:

- [features/turmas/components/TurmaFormDialog.tsx:157](../features/turmas/components/TurmaFormDialog.tsx#L157)
- [features/tarefas/components/TarefaForm.tsx:144](../features/tarefas/components/TarefaForm.tsx#L144)
- [features/biblioteca/components/EmprestimoForm.tsx:96](../features/biblioteca/components/EmprestimoForm.tsx#L96)
- [features/pequenosGrupos/components/PGForm.tsx:98](../features/pequenosGrupos/components/PGForm.tsx#L98) — 2×
- [features/pastoreio/components/VisitaForm.tsx:80](../features/pastoreio/components/VisitaForm.tsx#L80) — 2×

Combobox com search mas trigger pequeno:

- [features/escalas/components/MembroCombobox.tsx:40](../features/escalas/components/MembroCombobox.tsx#L40) — `h-8 text-xs px-1.5`

### 1.3 Popovers problemáticos

- [features/preferencias/components/PermissionMatrix.tsx:25](../features/preferencias/components/PermissionMatrix.tsx#L25) — Table + Popover + Tooltip por célula (inutilizável em mobile)
- [features/gravacoes/components/BibleBookFilter.tsx:41](../features/gravacoes/components/BibleBookFilter.tsx#L41) — Popover com grid de 66 livros

### 1.4 Hover-only actions

Nenhum HoverCard. Nenhum padrão `opacity-0 group-hover:opacity-100` ou `hidden group-hover:block` encontrado. Ações em cards estão sempre visíveis.

### 1.5 Tables

- [features/membros/components/MembroTable.tsx:92](../features/membros/components/MembroTable.tsx#L92) — 5 colunas sem fallback mobile
- [features/preferencias/components/PermissionMatrix.tsx](../features/preferencias/components/PermissionMatrix.tsx) — matriz N×M

### 1.6 Tooltips em ícones sem fallback

- [features/gravacoes/components/BibleBookFilter.tsx:100](../features/gravacoes/components/BibleBookFilter.tsx#L100) — nome do livro só via Tooltip

### 1.7 Tap targets < 44px

Icons `h-3`/`h-3.5` sem padding compensatório:

- [features/pedidosOracao/components/PedidoOracaoDetalhe.tsx:100](../features/pedidosOracao/components/PedidoOracaoDetalhe.tsx#L100), [:190](../features/pedidosOracao/components/PedidoOracaoDetalhe.tsx#L190)
- [features/gravacoes/components/Comentarios.tsx:18](../features/gravacoes/components/Comentarios.tsx#L18)
- [features/ministerios/components/MinisterioDetalhe.tsx:109](../features/ministerios/components/MinisterioDetalhe.tsx#L109)
- [features/pastoreio/components/VisitaCard.tsx:57](../features/pastoreio/components/VisitaCard.tsx#L57)
- [features/pastoreio/components/AnotacaoCard.tsx:26](../features/pastoreio/components/AnotacaoCard.tsx#L26)
- [features/avisos/components/AvisosSection.tsx:54-55](../features/avisos/components/AvisosSection.tsx#L54-L55)
- [features/pequenosGrupos/components/PGEncontros.tsx:124-125](../features/pequenosGrupos/components/PGEncontros.tsx#L124-L125)
- [features/escalas/components/LouvorOrdemSection.tsx:14](../features/escalas/components/LouvorOrdemSection.tsx#L14)

`Button size="icon"` (36px, default shadcn) em ações críticas: MembroTable, MinisterioDetalhe, MinisterioForm, PedidoOracaoDetalhe, VisitaCard, AnotacaoCard, EscalaForm.

Exemplo positivo: [features/louvor/components/LouvorDetalhe.tsx:44-51](../features/louvor/components/LouvorDetalhe.tsx#L44-L51) aplica `min-h-[44px] min-w-[44px]`.

## 2. Navegação

- MobileTabBar em [shared/components/layout/MobileTabBar.tsx](../shared/components/layout/MobileTabBar.tsx) — z-index 56, `md:hidden`, dinâmica com roles + BOLETIM_TAB aos domingos
- Safe area: `pb-[env(safe-area-inset-bottom)]` aplicado em MobileTabBar, MobileAudioPlayer, PlayerAwareMain
- Bottom padding de listas: `calc(6rem + env(safe-area-inset-bottom, 0px))` cobre TabBar (68px) + Player (56px)
- Header [shared/components/layout/Header.tsx](../shared/components/layout/Header.tsx) é `hidden md:flex` — sem equivalente mobile para dropdown de perfil/logout

## 3. PWA

- [public/manifest.json](../public/manifest.json) completo: standalone, orientation portrait, ícones 192/512 com `purpose: "any maskable"`, apple-touch-icon, theme-color `#1a1a1a`
- [public/sw.js](../public/sw.js) só com push notifications — sem cache offline-first, sem Workbox/Serwist
- Sem evidência de `navigator.serviceWorker.register()` — sw.js pode não estar sendo registrado
- Viewport em [app/layout.tsx:36-43](../app/layout.tsx#L36-L43) com `maximumScale: 1` + `userScalable: false` — viola WCAG 2.1 AA

## 4. Tailwind

- Tailwind v4, config inline via `@theme` em [app/globals.css](../app/globals.css)
- Breakpoints defaults (`md: 768px` split mobile/desktop)
- Inputs/textareas com `text-base md:text-sm` — 16px em mobile evita auto-zoom iOS
- `tailwindcss-safe-area` não instalado; safe-area via `env()` manual

## Matriz de priorização

| # | Item | Impacto | Esforço | Prioridade |
|---|------|---------|---------|------------|
| 1 | Viewport WCAG fix | 5 | 1 | P0 |
| 2 | ResponsiveDialog + LouvorForm | 5 | 3 | P0 |
| 3 | ResponsiveSelect em 6+ forms | 5 | 3 | P0 |
| 4 | MembroTable → cards mobile | 5 | 2 | P0 |
| 5 | Tier 1 forms → ResponsiveDialog | 4 | 2 | P1 |
| 6 | Tap targets 44px | 4 | 2 | P1 |
| 7 | tailwindcss-safe-area | 3 | 1 | P1 |
| 8 | PermissionMatrix bloqueio mobile | 2 | 1 | P2 |
| 9 | Tier 2 forms → ResponsiveDialog | 3 | 2 | P2 |
| 10 | MobileHeader | 3 | 2 | P2 |
| 11 | BibleBookFilter bottom sheet | 3 | 2 | P2 |
| 12 | Service worker registration | 2 | 3 | fora escopo UI |

## Findings fora de escopo

Ver [docs/mobile-audit-findings.md](./mobile-audit-findings.md).
