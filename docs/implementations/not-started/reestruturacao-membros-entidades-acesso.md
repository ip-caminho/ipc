# Reestruturacao Membros / Entidades / Acesso

## Escopo

Separar tres conceitos hoje misturados e duplicados na UI:

- **Dados pessoais** (membro como pessoa) → `/membros`
- **Rol eclesiastico** (membro como registro IPB) → `/secretario-executivo`
- **Acesso ao sistema** (login, role, permissions) → `/admin/permissoes`

Tambem reposicionar `/entidades` (PJ/nao-pessoas), reduzir a redundancia
dos tres campos que hoje respondem "essa pessoa e membro?", e resolver a
dupla representacao de "filho" (entidade real vs texto solto).

A **leitura** ja esta correta ("perfil = obreiro pra cima", "rol = secretaria
pra cima"). Mas a **gestao de acesso** hoje NAO e toda admin-only: ativar/resetar
login e editar `role` rodam sob `membros:update` (obreiro pra cima). O escopo
inclui elevar essas acoes para admin e centraliza-las em `/admin/permissoes`.

## Diagnostico (estado atual)

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
| `entidades` | `papeis` deixa de carregar `MEMBRO`; passa a servir so PJ (FORNECEDOR, IGREJA_PARCEIRA). Sem migracao destrutiva. |
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

1. **A — Centralizar acesso em `/admin/permissoes` (admin-only)**:
   - **Ativacao de login**: mover `AcessoSection`/`AcessoPanel` de `/membros`
     para `/admin/permissoes`; elevar `gerarLink`/`resetarAcesso` (`acesso.ts`)
     de `membros:update` para admin. Consolidar com a aba "Convites" existente.
   - **Editar role**: remover o seletor de `role` do `MembroForm`; usar o
     `updateMembroRole` (ja admin-only) da aba Membros de `/admin/permissoes`.
   - **Permissions individuais**: ja estao la, admin-only. Nada a fazer.
   - Resultado: `/membros` e `/secretario-executivo` nao tocam mais acesso/role.
2. **B — Separar dominio do detalhe**: `/membros/[id]` = pessoal + familia;
   eclesiastico vive so em `/secretario-executivo/[id]`.
3. **C — Refocar `/entidades`** para PJ/nao-pessoas (fornecedores, igrejas
   parceiras); `/membros` so PF da igreja. Independente — pode paralelizar.
4. **D — Campo canonico "e membro" (corrigido, esforco baixo-medio)**:
   - `membros` (tabela) **continua sendo a fonte de verdade**. Nao se toca.
   - `vinculoIgreja` **mantido** como derivado (atalho para campanhas/cron).
   - **Parar de usar `papeis` para "e membro"**: corrigir as 2 leituras
     (`educacional/mutations.ts:427`, `entidades/queries.ts:32`) e os ~7 pontos
     de escrita que setam `papeis: ["MEMBRO"]`. `papeis` passa a servir so PJ.
   - Opcional: renomear `entidades.papeis` para acabar com a colisao com
     `ministerios.papeis`.
5. **E — Criancas e dependentes**:
   - **Documentar o criterio**: batizado na infancia → linha em `membros`
     (nao-comungante); nao batizado → so `entidades` + `criancaPerfil`. Vinculo
     sempre via `responsaveis`.
   - **Resolver a dupla representacao**: `membros.filhos` (texto) deixa de ser
     fonte — vira leitura derivada de `responsaveis` ou e eliminado. Migrar
     filhos-texto existentes para `entidades` + `responsaveis`.
   - Independente de A/B/C; pode rodar em paralelo. Faz par natural com D
     (ambos limpam representacao redundante).

## Perguntas em aberto

1. **Ativar login deixa de ser obreiro/secretaria?** Hoje obreiro+ gera link de
   acesso. Item A eleva para admin. Confirmar que isso nao trava o fluxo
   operacional (ex: secretaria que ativava membros). (Decisao do Andre.)
2. Vale renomear `entidades.papeis` (ex: `tiposEntidade`) para eliminar a
   colisao com `ministerios.papeis`, ou so limpar o valor `MEMBRO`?

### Respondidas pela investigacao
- `/admin/permissoes` ja edita acesso por-membro (role, permissions, reset,
  convites), tudo admin-only — o destino do item A ja existe.
- A "tab Acesso" de `/membros` (`AcessoSection`/`AcessoPanel`) so gerencia
  ciclo de vida do login (gerar link, WhatsApp, reset, status) — nao edita
  permissions. Edicao de `role` mora no `MembroForm`.
