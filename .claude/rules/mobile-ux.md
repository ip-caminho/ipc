# Mobile UX — convenções e fluxo de verificação visual

Objetivo: reduzir as idas-e-vindas até a UI mobile ficar boa. O gargalo não é
"qual design system" (shadcn/ui já cobre mobile) — é o **loop de feedback**.
Esta rule ataca os dois lados: convenções que evitam o problema na origem +
um fluxo onde o agente vê o resultado sozinho antes de entregar.

## 1. Convenções (mobile-first)

Escrever o layout **base = mobile**; adicionar `md:`/`lg:` para o desktop.
Nunca o contrário (desktop-first vira "conserto" e gera várias voltas).

- **Tabela larga editável → cards no mobile.** Tabelas com 3+ colunas de
  inputs/selects não cabem em 390px. Padrão: `hidden md:block` na `<Table>` +
  `md:hidden` numa lista de cards. Ver `SecretarioExecutivoTabela.tsx`.
- **Card mobile = leitura.** Edição inline (selects, date pickers, drawers)
  fica só no desktop. No mobile, o card inteiro é `Link` para a tela de
  detalhe, onde se edita. Menos toques, sem campos espremidos.
- **Formulário longo → `Drawer`** (bottom sheet, vaul — já vem no shadcn) em
  vez de `Dialog` no mobile. Dialog espremido em 390px é ruim.
- **Tap target ≥ 44px.** Botões de ação `h-10`/`h-11` no mobile; ícones de 16px
  soltos são difíceis de acertar com o dedo.
- **Filtros/ações que quebram linha**: no mobile preferir ícones compactos ou
  um menu, em vez de vários botões com texto lado a lado.
- **Largura**: nada de `min-w` fixo grande sem `overflow` controlado; testar a
  360–390px.

Ao converter uma nova tela, reaproveitar o padrão tabela↔card existente. Se o
padrão se repetir em 3+ telas, extrair um componente `ResponsiveList`.

## 2. Verificação visual com agent-browser (o agente vê sozinho)

CLI instalado globalmente (`agent-browser`). Sempre que mexer em UI, tirar
screenshot mobile **antes** de entregar e iterar até ficar bom.

```bash
# viewport mobile (iPhone ~390x844)
agent-browser set viewport 390 844
# ou: agent-browser set device "iPhone 15 Pro"

agent-browser open <url>
agent-browser wait 2500
# IMPORTANTE: o daemon resolve paths no cwd dele — usar path ABSOLUTO
agent-browser screenshot /caminho/absoluto/shot.png
```

Depois ler o PNG com a tool Read (renderiza a imagem) e avaliar. Comparar
mobile (390) vs desktop (`set viewport 1280 900`) na mesma mudança.

### Páginas atrás de auth — helper pronto
A maioria das telas exige login (papel admin). Usar `scripts/screenshot-auth.sh`:

```bash
scripts/screenshot-auth.sh /secretario-executivo tmp/rol-mobile.png 390 844
scripts/screenshot-auth.sh /secretario-executivo tmp/rol-desktop.png 1280 900
# preview de branch (slug do team da igreja na Vercel):
SCREENSHOT_BASE_URL=https://ipc-git-<branch>-<team-slug>.vercel.app \
  scripts/screenshot-auth.sh /membros tmp/membros.png
```

- Loga via aba "Entrar" (telefone+senha) e navega até a rota.
- Credenciais saem de `.env.local` (gitignored): `SCREENSHOT_PHONE` e
  `SCREENSHOT_PASSWORD` — conta admin do André. NUNCA commitar essas vars.
- Base padrão = prod (dados reais). O bypass local (`NEXT_PUBLIC_AUTH_BYPASS_MODE`)
  cria usuário sem papel, então não serve para telas admin — por isso prod/preview.
- Depois, ler o PNG com a tool Read e avaliar.

## 3. Preview deploys (revisar antes do main)

O projeto Vercel é git-connected — **todo push de branch gera um preview
automático**. Não publicar UI direto no main pra revisar; usar a branch.

- URL do preview: `https://ipc-git-<branch-slug>-<team-slug>.vercel.app`
  (branch slug = nome da branch com `/`→`-`). A URL exata também sai via Vercel
  MCP (`list_deployments`) ou no PR.
- ATENÇÃO: previews têm Vercel Authentication ligada → respondem **401** para
  acesso headless (agent-browser/curl). Para checar preview automaticamente,
  configurar "Protection Bypass for Automation" (segredo) e enviar header
  `x-vercel-protection-bypass: <segredo>` no agent-browser (`--headers`). Sem
  isso, o agent-browser só verifica **prod** (após merge); previews servem para
  revisão manual do André (logado na Vercel).
- Fluxo: trabalhar na branch → `git push origin <branch>` → Vercel builda
  preview → agente abre no agent-browser (mobile) e/ou manda a URL pro André
  revisar no celular → só depois `merge --ff-only` no main.

Vercel (conta institucional da igreja desde 06/2026; projeto antigo na conta
pessoal foi descontinuado):
- prod: `https://ipc-pi-ten.vercel.app`
- repo: `ip-caminho/ipc` (GitHub da igreja; org `ipcdocaminho` reservada para
  quando houver plano Pro)

## Checklist ao mexer em UI
- [ ] Layout base mobile; desktop via `md:`/`lg:`
- [ ] Screenshot a 390px (agent-browser) revisado antes de entregar
- [ ] Tap targets ≥ 44px
- [ ] Tabela editável vira card de leitura no mobile
- [ ] Se possível, revisar no preview da branch antes do main
