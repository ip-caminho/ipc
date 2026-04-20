# Dívidas técnicas

Índice vivo de débitos conhecidos. Itens com `#N` têm issue dedicada; os demais são pequenos e ficam só aqui.

## Convenções

- PR que introduz dívida **adiciona a linha** antes de mergear
- PR que quita dívida **remove a linha** e fecha a issue (`Fixes #N`)
- Itens grandes (precisam de design) viram issue com label `tech-debt`; itens pequenos (cleanup local) ficam só no índice

---

## Aba Orar (PRs #21–#25)

- **Notificar orantes via push/email quando autor publica update** — [#26](https://github.com/devandrechoi/ipc/issues/26). `pedidoOracaoIntercessores` já tem os destinatários; falta wiring. `pushSubscriptions` existe sem consumer.
- **Role formal "líder/pastor"** — [#28](https://github.com/devandrechoi/ipc/issues/28). `isLeaderMembro()` em `convex/pedidosOracao/queries.ts` reusa `pastoreio:update`/`admin` como proxy.
- **Scheduled function: auto-archive de pedidos após 30d inativos** — Convex `crons.ts` varre `pedidosOracao` com `status=ATIVO` e `ultimaAtividadeEm < now - 30d`, seta `ARQUIVADO`. Sem issue, direto.
- **Versículo rotativo na tela final da oração guiada** — hoje hardcoded `1Ts 5:17` em `features/pedidosOracao/components/GuidedPrayerComplete.tsx`. Pode virar lista e sortear ou puxar de API.
- **Seção de Testemunhos dedicada** — quando volume justificar, agrupar pedidos `RESPONDIDO` em feed separado (spec menciona isso como possível fase 2).
- **Moderação/denúncia de pedidos inadequados** — sem UI/backend hoje. Mapear quando houver caso.
- **Remover legado não importado** — `features/pedidosOracao/components/PedidoOracaoDetalhe.tsx` e `features/pedidosOracao/components/OrarExperiencia.tsx`. Zero imports. PR de cleanup quando o novo fluxo estabilizar.

## Áudios / Gravações (PRs #17–#20)

- **Campo `duracaoSegundos` em `gravacoes`** — [#29](https://github.com/devandrechoi/ipc/issues/29). Hoje deriva de `fimConteudo - inicioConteudo`, vazia sem IA. FFmpeg.wasm já roda no cliente.
- **Tela `/comunidade/busca` não existe** — `features/comunidade/components/SearchBar.tsx` linka pra ela e gera 404. Substituir por rota real ou trocar href temporariamente para `/gravacoes`.
- **Busca full-text real** — sermões/músicas/pessoas. Avaliar Typesense ou integração nativa Convex.
- **Thumbnails reais por sermão** — hoje gradient determinístico por nome da série em `features/comunidade/lib/sermonGradient.ts`. Trocar por imagem de capa se a série tiver.
- **`COMUNIDADE_SECTIONS` em `shared/constants/navigation.ts`** — código morto desde a remodelagem da Comunidade. Remover junto com `NavSectionList` se não houver outro consumer.
- **Detalhe de evento** — hoje `features/comunidade/components/EventCard.tsx` linka para `/calendario` (lista). Falta rota `/calendario/[id]`.
- **Sticky comment input em `/gravacoes/[id]`** — perdido no fix de document scroll (PR #14). Pode reintroduzir com `sticky bottom: calc(6rem + env(safe-area-inset-bottom))`.

## Boletim / Home

- **Scheduled function para reset de `boletim.isLive` após 00:30** — hoje só há safeguard frontend em `isBoletimLiveNow` em `features/dashboard/components/BoletimCard.tsx`. Sem Convex cron, flag pode ficar stale se o backend esquecer de desligar.

## PWA / Mobile

- **Offline-first + registrar service worker** — [#27](https://github.com/devandrechoi/ipc/issues/27). `public/sw.js` só tem handler de push e provavelmente nem é registrado.
- **Virtualização em listas muito longas** — `react-virtual` para `MembroTable`, lista de gravações com muitos itens etc. Inevitável quando passar de 200+ rows.
- **Avaliar DnD (@dnd-kit) em touch** — se algum fluxo virar reorder via arrastar, precisa teste de UX mobile.
- **MobileAudioPlayer vs MobileTabBar** — revisar altura combinada e spacing quando ambos aparecem.

---

## Histórico (fechadas/concluídas)

_Quando um item é resolvido, mova pra cá com link do PR fechador em vez de deletar._
