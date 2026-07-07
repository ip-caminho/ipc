# Reestruturacao Membros / Entidades / Acesso

## Escopo

Separar tres conceitos hoje misturados e duplicados na UI:

- **Dados pessoais** (membro como pessoa) → `/membros`
- **Rol eclesiastico** (membro como registro IPB) → `/secretario-executivo`
- **Acesso ao sistema** (login, role, permissions) → `/admin/permissoes`

Tambem reposicionar `/entidades` (PJ/nao-pessoas), reduzir a redundancia
dos tres campos que hoje respondem "essa pessoa e membro?", e resolver a
dupla representacao de "filho" (entidade real vs texto solto).

## Status de execucao (2026-07-07)

O main avancou ~116 commits durante o planejamento e resolveu A e B por conta
propria (por outro caminho). Estado atual:

| Item | Estado | Nota |
|------|--------|------|
| **A** — centralizar acesso | ABANDONADO | Main criou a pagina `/admin/acesso` (AcessoPanel) + a permissao granular `acesso:manage`, e `/membros` deixou de existir. PR #127 (tentativa admin-only) fechado — `acesso:manage` foi concedido a pastor/secretaria/presbitero, decisao deliberada do main, oposta ao "admin-only" pedido. |
| **B** — separar detalhe pessoal/eclesiastico | FEITO PELO MAIN | `/membros` consolidado em `/secretario-executivo` (lista + detalhe). |
| **C** — `/entidades` so PJ | FEITO | PR #142 (`feature/entidades-pj`): lista e cadastro so PJ (fornecedores/parceiros). |
| **D** — `papeis` para de marcar "membro" | PENDENTE | Remapeado 2026-07-07 (ver Ordem, item D). Cresceu com educacional/retiro. |
| **E** — criancas / "filho" duplicado | PENDENTE (remapeado) | `membros.filhos` quase morto (so 2 leitores); eliminavel com baixo risco. Resolve o DEPENDENTE do D. |

O diagnostico abaixo e do planejamento original (pre-main); onde divergir do
estado atual, o quadro acima prevalece.

## Diagnostico (planejamento original)

### Duplicacao de detalhe
`/membros/[id]` e `/secretario-executivo/[id]` mostram o mesmo membro com
campos eclesiasticos sobrepostos. O usuario nao sabe onde editar o que.

### `membros` mistura dois dominios
| Dominio | Campos |
|---------|--------|
| Auth/sistema | `userId`, `role`, `permissions`, `onboardingCompleto` |
| Rol eclesial | `formaAdmissao`, `cargoEclesiastico`, `dataBatismo`, `numeroMatricula`, `igrejaProcedencia` |

### "Acesso" espalhado em tres lugares (com guards inconsistentes)
A gestao de quem loga e com que poder esta fatiada:

| O que | Onde (UI) | Backend | Guard hoje |
|-------|-----------|---------|------------|
| Ativar/resetar login (gerar link, WhatsApp, reset) | `AcessoPanel.tsx` (`/membros`), `AcessoSection.tsx` (`/membros/[id]`) | `convex/membros/acesso.ts` (`gerarLink`, `resetarAcesso`, `getStatusAcesso`) | `membros:update` (obreiro+) ❌ |
| Editar `role` do membro | `MembroForm` (secao "Dados Eclesiasticos") | `convex/preferencias/rbac.ts:597` `updateMembroRole` | misto — form sob `membros:update` ❌ |
| Permissions individuais + role + convites | `/admin/permissoes` (abas Membros/Convites) | `rbac.ts` `setMembroPermission`, `updateMembroRole`, `syncMembroWithRole` | `requireAdmin` ✅ |

`/admin/permissoes` **ja faz** gestao por-membro (muda role, concede/revoga
permissions, reseta ao padrao, gera convites) — tudo admin-only. O destino do
item A ja existe; falta migrar a ativacao de login pra la e elevar os guards.

### Crianca: modelo OK, mas "filho" tem duas representacoes
O esqueleto ja comporta crianca: e uma `entidades` (PF) e, **se batizada na
infancia** (`convex/membros/eclesiastico.ts:723`), ganha tambem linha em
`membros` como nao-comungante. Nao batizada = so `entidades` + `criancaPerfil`.
Vinculo com pai/mae/avo/tutor fica em `responsaveis` (tipado).

O problema e a **dupla representacao de "filho"**:
- **Forma boa**: crianca = `entidades` + `responsaveis` (vinculo real e tipado).
- **Forma solta**: `membros.filhos` (`schema.ts:165`) = array de texto
  `{nome, dataNascimento}` na ficha do pai. Nao e entidade, sem CPF, nao pode
  ser batizado nem virar membro. Se cadastrarem o filho como texto e depois ele
  for batizado, vira pessoa duplicada (uma entidade nova, sem ligacao ao texto).

### Tres formas de dizer "e membro"
Levantamento de leituras que decidem "e membro?":

| Campo | Leituras que decidem | Natureza |
|-------|----------------------|----------|
| `papeis.includes("MEMBRO")` | 2 lugares | Redundante, quase nao lido |
| `vinculoIgreja === "MEMBRO"` | 5 lugares (campanhas, cron) | **Derivado** de `membros` + status |
| Tabela `membros` (tem linha?) | centenas | **Fonte de verdade** (RBAC, login, auditoria) |

Surpresas do mapeamento:
- **Colisao de nome**: `entidades.papeis` (estado: MEMBRO/DEPENDENTE) vs
  `ministerios.papeis` (funcao: Coordenador/Professor). Mesmo nome, semanticas
  diferentes.
- **Escritas grudadas**: batismo (`convex/membros/eclesiastico.ts:582`) seta
  `papeis` e `vinculoIgreja` na mesma linha. So nao divergem porque alguem
  lembrou de atualizar as duas — fragil por design.

## Permissoes

Estado atual em `convex/preferencias/rbacHelpers.ts` (`INITIAL_ROLE_PERMISSIONS`):

| Permissao | Roles que ja tem | Avaliacao |
|-----------|------------------|-----------|
| `membros:read` | obreiro, presbitero, secretaria, pastor (nao `membro`) | "obreiro pra cima" ✅ ja correto |
| `rol:read` / `rol:update` | secretaria, pastor, secretario-executivo | "secretaria pra cima" ✅ ja correto |
| permissions/role via `/admin/permissoes` | `admin` (wildcard) via `rbac.ts:248` | admin-only ✅ ja correto |
| ativar/resetar login (`acesso.ts`) | `membros:update` (obreiro+) | ❌ **deve virar admin** |
| editar `role` no `MembroForm` | `membros:update` (obreiro+) | ❌ **remover do form; so via `/admin/permissoes`** |

Gates atuais confirmados:
- `app/(ready)/membros/page.tsx` → `membros:read` / `membros:update` / `membros:create`
- `app/(ready)/membros/[id]/page.tsx:167` → `AcessoSection` sob `membros:update`
- `app/(ready)/secretario-executivo/page.tsx:117` → `AnyPermissionGate ["rol:read","rol:update"]`
- `/admin/permissoes` → `AdminGate` + `requireAdmin` em todas as mutations

## Modelos Afetados

| Tabela | Tipo de Mudanca |
|--------|-----------------|
| `entidades` | `papeis` deixa de carregar `MEMBRO` (e possivelmente `DEPENDENTE` — ver decisao em aberto); passa a servir so PJ (FORNECEDOR, IGREJA_PARCEIRA). Requer backfill de limpeza dos dados legados que ja tem "MEMBRO". |
| `membros` | Nenhuma mudanca de schema. Tab "Acesso" da UI sai do detalhe; gestao migra para `/admin/permissoes`. |
| `vinculoIgreja` (campo) | Mantido como derivado. Sem mudanca. |
| `membros.filhos` (campo) | Deixa de ser fonte. Vira atalho derivado de `responsaveis` ou e eliminado. Toda crianca = uma `entidade`. |
| `criancaPerfil`, `responsaveis` | Sem mudanca de schema. `responsaveis` vira o vinculo canonico filho↔responsavel. |

## Impacto em Shared

- [x] Toca arquivos sensiveis?
  - `convex/schema.ts` — apenas se renomear/limpar `papeis` (item D). Coordenar.
  - `shared/components/layout/DevContext.tsx` — atualizar entradas das paginas alteradas.
  - `AppSidebar.tsx` — possivel ajuste de navegacao (entidades).
- [x] Risco de regressao: Membros, Secretario-Executivo, Entidades, Campanhas
  (mensageria le `vinculoIgreja`), Educacional (le `papeis`).

## Riscos

- Item D (limpar `papeis`) toca escritas em batismo/self-service/import —
  testar fluxo de batismo (adulto e infantil) apos a mudanca.
- Item A muda QUEM pode ativar login: hoje obreiro/secretaria conseguem gerar
  link de acesso; ao elevar para admin, confirmar que o fluxo operacional da
  igreja nao depende de nao-admins ativarem membros. (Decisao do Andre.)
- Possivel redundancia: `acesso.ts` (gerarLink) vs aba "Convites" de
  `/admin/permissoes` — ambos geram link de primeiro acesso. Consolidar.
- Colisao de nome `papeis` pode confundir futura manutencao — considerar rename.

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `features/membros/components/AcessoSection.tsx`, `AcessoPanel.tsx` | Remover/Mover | Ativar/resetar login sai de `/membros` |
| `features/membros/components/MembroForm.tsx` | Modificar | Remover o seletor de `role` (vai pra `/admin/permissoes`) |
| `convex/membros/acesso.ts` | Modificar | Elevar `gerarLink`/`resetarAcesso` de `membros:update` para admin |
| `app/(ready)/admin/permissoes/` (aba Membros/Convites) | Modificar | Acolher ativacao de login por-membro |
| `features/membros/` (detalhe) | Modificar | Detalhe = so pessoal + familia |
| `features/secretarioExecutivo/` | Manter/Ajustar | Unica casa dos campos eclesiasticos |
| `app/(ready)/entidades/`, `features/entidades/` | Modificar | Refocar para PJ/nao-pessoas + filtro |
| `convex/educacional/mutations.ts:427` | Modificar | Parar de decidir "membro" por `papeis` |
| `convex/entidades/queries.ts:32` | Modificar | Idem |
| `convex/membros/eclesiastico.ts`, `selfService.ts`, `mutations.ts`, `convites.ts`, `import.ts` | Modificar | Escritas que setam `papeis: ["MEMBRO"]` |
| `shared/components/layout/DevContext.tsx` | Modificar | Atualizar CONTEXT_MAP das paginas tocadas |

## Ordem de Implementacao

1. **A — ABANDONADO.** Main resolveu por outro caminho (`/admin/acesso` +
   `acesso:manage`; `/membros` extinto). PR #127 fechado. Ver Status.
2. **B — FEITO PELO MAIN.** `/membros` consolidado em `/secretario-executivo`.
3. **C — FEITO.** `/entidades` refocado em PJ (PR #142).
4. **D — Parar de usar `papeis` para "e membro" (remapeado 2026-07-07)**:
   - `membros` (tabela) **continua a fonte de verdade**; `vinculoIgreja` segue
     derivado (backfill em `convex/migration/vinculoIgreja.ts`). Nao se tocam.
     Nenhum RBAC/cron/campanha le `papeis` para membresia (cron e campanhas ja
     usam `vinculoIgreja`).
   - **Leituras que decidem "e membro" por `papeis`: so 2** —
     `convex/entidades/queries.ts:32` (filtro generico por papel) e
     `convex/educacional/mutations.ts:561` (migracao one-off).
   - **Escritas de `papeis` cresceram de ~7 para ~14** (modulos novos):
     - MEMBRO/promocao (~8): `membros/mutations.ts:56`, `convites.ts:76`,
       `bootstrap.ts:41`, `import.ts:28`, `importFormNovos.ts:63`,
       `eclesiastico.ts:541`, `importRetiro.ts:162`, `importRetiro.ts:239`.
     - DEPENDENTE (~5): `eclesiastico.ts:682`, `selfService.ts:372`,
       `importRetiro.ts:334`, `educacional/mutations.ts:38`, `:527`.
     - Saneamento: `educacional/mutations.ts:565` (migrateCriancasPapel).
     - Passthrough: `entidades/mutations.ts:38` (validador aceita qualquer string).
   - **Plano**: parar de escrever "MEMBRO" em `papeis` nas escritas de promocao
     (mantendo `insert("membros")` + `vinculoIgreja`); migrar o filtro de
     `queries.ts:32` para `vinculoIgreja`/`membros`; endurecer o validador de
     `entidades/mutations.ts` (rejeitar MEMBRO/DEPENDENTE); backfill de limpeza
     (estender `migrateCriancasPapel` para as entidades legadas com "MEMBRO").
   - **`DEPENDENTE` — RESOLVIDO (pelo remapeamento do E)**: `vinculoIgreja:
     "NAO_MEMBRO"` ja e setado em paralelo com `papeis:["DEPENDENTE"]` em todo
     insert (hoje redundante). E "e dependente/crianca" ja e DERIVAVEL de "sem
     linha em `membros` + tem `responsaveis` apontando" (como
     `eclesiastico.ts:309` montarLinhasSecretario ja calcula, sem olhar
     `papeis`). Logo tirar DEPENDENTE de `papeis` e seguro; `vinculoIgreja` +
     `responsaveis` cobrem. Revisar os `.filter(p!=="DEPENDENTE")` em
     `eclesiastico.ts:539`, `importRetiro.ts:160,237`, e a migracao
     `educacional/mutations.ts:561` (MEMBRO→DEPENDENTE).
   - Esforco reavaliado: **medio** — as ~14 escritas + backfill de limpeza.
5. **E — Criancas e dependentes (remapeado 2026-07-07)**:
   - **`membros.filhos` esta praticamente morto**: 1 escrita
     (`membros/mutations.ts:43,93`, sem UI que a alimente) e 2 leituras reais —
     `membros/queries.ts:105` (getPublicProfile → diretorio) e
     `pastoreio/queries.ts:261` (getMembroPerfil, merge com `responsaveis`). Toda
     a UI de familia moderna (getFamily, getMyFamily, listParaSecretario,
     educacional) ja usa `responsaveis`.
   - **`responsaveis` e o vinculo canonico** (filho↔pai, tipado); `criancaPerfil`
     e so a ficha do departamento infantil (≤10 anos, uso de imagem), sem dedup.
   - **Criterio membro-crianca** (bem documentado no codigo):
     `batismoInfantil`/`batizadoNestaIgreja` → linha em `membros`
     (MEMBRO_NAO_COMUNGANTE) + `vinculoIgreja MEMBRO`; senao → so `entidades`
     (DEPENDENTE) + `responsaveis` (+ `criancaPerfil` se ≤10). Fluxos:
     `eclesiastico.ts:662` adicionarFilhoAdmin, `selfService.ts:333`
     adicionarFilho, `eclesiastico.ts:506` tornarMembro (promocao).
   - **Duplicatas sao problema real**: `importRetiro.ts:181` fundirDuplicata
     funde entidade duplicata na canonica (responsaveis, DOB, criancaPerfil,
     membros). O import do retiro gera crianca colidindo com entidade existente.
   - **Unico conflito das 2 representacoes**: `pastoreio/queries.ts:243`
     getMembroPerfil faz merge `responsaveis` + `membros.filhos` SEM dedup → a
     mesma crianca pode aparecer duas vezes.
   - **Plano**: eliminar `membros.filhos` — ajustar os 2 leitores para derivar de
     `responsaveis`; remover o arg/insert `filhos` de `mutations.create`; remover
     do schema (`schema.ts:165`). Antes, migrar eventuais filhos-texto legados
     para `entidades`+`responsaveis`. **Baixo risco** (array legado quase sem
     consumidor).
   - **Verificado em prod (2026-07-07, `earnest-husky-324`)**: `membros.filhos`
     esta VAZIO — o campo nao aparece no schema inferido dos dados reais (zero
     registros com filhos populado). Eliminar o campo nao perde dado algum; os
     filhos cadastrados na UI vivem em `entidades`+`responsaveis` (tabela com
     dados). Nem migracao de legado e necessaria.
   - Faz par natural com D (ambos limpam representacao redundante) e resolve a
     questao do DEPENDENTE do D.

## Decisoes tomadas

- **Ativar login e admin-only.** Confirmado pelo Andre. Item A eleva
  `gerarLink`/`resetarAcesso` (`acesso.ts`) de `membros:update` para admin;
  obreiro/secretaria deixam de poder ativar membros.

## Perguntas em aberto

1. Vale renomear `entidades.papeis` (ex: `tiposEntidade`) para eliminar a
   colisao com `ministerios.papeis`, ou so limpar o valor `MEMBRO`?

### Respondidas pela investigacao
- **`DEPENDENTE` (item D) — RESOLVIDO:** destino = `vinculoIgreja: "NAO_MEMBRO"`
  (ja setado em paralelo em todo insert) + condicao "e dependente" derivavel de
  `membros`+`responsaveis`. `criancaPerfil` nao serve como marcador universal
  (so infantil ≤10). Tirar DEPENDENTE de `papeis` e seguro. Ver item E.
- `/admin/permissoes` ja edita acesso por-membro (role, permissions, reset,
  convites), tudo admin-only — o destino do item A ja existe.
- A "tab Acesso" de `/membros` (`AcessoSection`/`AcessoPanel`) so gerencia
  ciclo de vida do login (gerar link, WhatsApp, reset, status) — nao edita
  permissions. Edicao de `role` mora no `MembroForm`.
