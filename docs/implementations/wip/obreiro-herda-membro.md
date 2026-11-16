# Obreiro herda as permissões do papel membro (issue #370)

## Escopo
O papel `obreiro` passa a ter, sempre, tudo o que o papel `membro` tem: as permissões efetivas de um obreiro são as dele unidas às do papel membro lidas do banco. A união é calculada na leitura, em todo ponto que resolve permissão (backend e contexto do frontend), e nunca é gravada. Motivo: um obreiro não consegue ouvir o sermão porque o papel dele não tem `gravacoes:read`, que o membro tem.

Modificação de lógica de RBAC. Sem tabela nova, sem página nova, sem migração.

## Termos
- **Linha do papel**: documento de `rolePermissions` de um papel (`role`, `permissions[]`), lido pelo índice `by_role`.
- **Snapshot**: `membro.permissions[]` não vazio. Hoje substitui a linha do papel daquele membro.
- **Base**: a lista que cada ponto já calcula hoje (snapshot, senão linha do papel, senão o fallback daquele ponto). Este PRD não altera o cálculo da base.
- **Herdadas**: permissões da linha do papel `membro`. Se a linha não existe, `INITIAL_ROLE_PERMISSIONS.membro`. Linha existente com lista vazia vale como vazia (não cai na constante).

## Regra
```
efetivas(M) = base(M)                      se M.role ≠ "obreiro" ou base contém "*"
efetivas(M) = base(M) ∪ herdadas           se M.role = "obreiro"
```
Vale com ou sem snapshot: obreiro com snapshot fica com snapshot ∪ herdadas (o snapshot continua substituindo só a linha do próprio papel obreiro). Herdadas nunca são gravadas no snapshot nem na linha do obreiro, mesmo princípio de `convex/_shared/eduVoluntarioPerms.ts`.

## Onde a regra mora
Três funções. O papel que herda é nomeado em um único lugar, `inheritsFromMembro`.

| Função | Arquivo | Contrato |
|--------|---------|----------|
| `inheritsFromMembro(role)` | `convex/preferencias/rbacHelpers.ts` | `role === "obreiro"`. Único lugar que nomeia o papel que herda |
| `mergeMembroInheritance(role, base, membroRolePermsFromDb)` | `convex/preferencias/rbacHelpers.ts` | Pura. Devolve a própria `base` se o papel não herda ou se `base` contém `"*"`. Senão devolve a união sem duplicatas, `base` primeiro. `membroRolePermsFromDb` `undefined` → `INITIAL_ROLE_PERMISSIONS.membro`. Não muta os argumentos |
| `withMembroInheritance(ctx, role, base)` | `convex/_shared/requirePermission.ts` (exportada) | Assíncrona. Se o papel não herda ou `base` contém `"*"`, devolve `base` sem ler o banco. Senão lê `rolePermissions` com `.withIndex("by_role", q => q.eq("role", "membro")).first()` e devolve `mergeMembroInheritance(role, base, linha?.permissions)` |

As puras ficam em `rbacHelpers.ts` porque o frontend já importa desse arquivo (`PermissionsProvider.tsx:7`) e ele não pode depender do runtime do Convex. A assíncrona fica em `requirePermission.ts`, ao lado de `loadAuthAndPerms`.

Custo no Convex: uma leitura indexada a mais, de um documento pequeno (a linha do membro, 5 permissões na constante), só quando o papel é obreiro. Para os demais papéis, nenhuma leitura a mais. Em query reativa aberta por obreiro, a linha do membro entra no conjunto de leitura: a query reexecuta quando o admin edita o papel membro, o que é raro. Leitura sob demanda (só quando a base nega) foi descartada: economiza um documento pequeno e espalha a regra por `allows` e pelo laço de `requireAnyPermission`.

## Pontos de aplicação
Em cada ponto a mudança é embrulhar a base já calculada. O cálculo da base, o fallback e o tratamento de snapshot de cada ponto ficam como estão.

### Checagem de acesso (backend) — `withMembroInheritance`
| # | Arquivo:linha | Função | Mudança |
|---|---------------|--------|---------|
| 1 | `convex/_shared/requirePermission.ts:27-29` | `loadAuthAndPerms` | `perms` = `withMembroInheritance(ctx, membro.role, base)`. Cobre `requirePermission`, `checkPermission`, `requireAnyPermission` e `currentUserHasPermission`; é o ponto que libera as gravações (`convex/gravacoes/queries.ts:29`, `:136`, `:168`, `:209` e `convex/gravacoes/avisosLeituras.ts:14`). O fallback `?? []` do papel próprio não muda |
| 2 | `convex/pedidosOracao/queries.ts:24-26` | `isLeaderMembro` | Idem sobre `perms` |
| 3 | `convex/pedidosOracao/mutations.ts:112-114` | `updateStatus` | Idem sobre `perms` |
| 4 | `convex/gravacoes/ai.ts:243` | `startProcessing` | `perms` = `withMembroInheritance(ctx, membro.role, rolePerms?.permissions ?? [])`. O "ou" com o snapshot (`:234-236`) não muda |
| 5 | `convex/pastoreio/queries.ts:21-25` | `getAuthContext` | Embrulhar o resultado de `resolvePermissions` |
| 6 | `convex/pastoreio/mutations.ts:22-26` | `getAuthContextWithPerms` | Idem |
| 7 | `convex/educacional/queries.ts:25-29` | `getAuthContext` | Idem, antes do `mergeDerived` de `:31` |
| 8 | `convex/tarefas/queries.ts:34-38` | `requireAuthWithPerms` | Idem |
| 9 | `convex/tarefas/mutations.ts:21-25` | `requireAuth` | Idem |
| 10 | `convex/audit/queries.ts:64-68` | `checkAuditRead` | Idem |

### Contexto do frontend
| # | Arquivo:linha | Função | Mudança |
|---|---------------|--------|---------|
| 11 | `convex/preferencias/rbac.ts:322-326` | `getUserPermissionContext` | `basePerms` = `withMembroInheritance(ctx, membro.role, resolvePermissions(...))`, antes do `mergeDerived` de `:328`. Alimenta o `can()` do usuário real |
| 12 | `convex/preferencias/rbac.ts:410-422` | `getAllMembrosWithPermissions` | Ler a linha do membro uma vez, antes do laço, e aplicar `mergeMembroInheritance` (pura) em `:422`. Não chamar a assíncrona dentro do laço (seria uma leitura por obreiro). Formato do retorno não muda; `hasCustomPermissions` não muda |
| 13 | `shared/providers/PermissionsProvider.tsx:69-72` | simulação de papel | Ver "Tela e simulação" |
| 14 | `features/preferencias/components/PermissionMatrix.tsx:224-229` | `rolePermsMap` | Ver "Tela e simulação" |
| 15 | `app/(ready)/admin/permissoes/page.tsx:251-256` e `:325-328` | `MembrosTab` | Ver "Tela e simulação" |

### Não muda (decisão)
- `getAllRolesWithPermissions` (`rbac.ts:369-395`): continua devolvendo a lista própria de cada papel. `handleRoleToggle` (`PermissionMatrix.tsx:245-271`) grava a lista inteira do papel a partir de `roleData.permissions`; se a query devolvesse a união, qualquer clique na coluna Obreiro copiaria as permissões do membro para a linha do obreiro. O frontend calcula a união com a função pura, usando a entrada `membro` da mesma resposta.
- `resolvePermissions` (`rbacHelpers.ts:255-264`): assinatura e comportamento iguais.
- Base da primeira cópia do snapshot em `setMembroPermission` (`rbac.ts:517-527`) e em `applyVolunteerSet` (`rbac.ts:944-953`): continua partindo só do papel próprio.
- `listRolePermissions` (`rbac.ts:437`), `updateRolePermissions` (`:482`), `updateMembroRole` (`:977`), `syncMembroWithRole` (`:996`).
- Seed e migrações: `seedRolePermissions` (`rbac.ts:463`), `syncRolePermissionsFromCode` e as `add*`/`grant*` (`rbac.ts:544-902`), `convex/membros/bootstrap.ts`, `convex/preferencias/migrations.ts`.
- Rótulos e descrições de permissão (PRs #365 e #366 mexem neles).

## Constante
`INITIAL_ROLE_PERMISSIONS.obreiro` (`rbacHelpers.ts:89-100`) ganha `"gravacoes:read"`, por coerência com o fallback. Não é o que garante o acesso: quem garante é a união em tempo de leitura.

## Tela `/admin/permissoes` e simulação
Objetivo único: o admin não pode ver um obreiro sem uma permissão que ele de fato tem, nem conseguir um clique que parece funcionar e não muda nada.

1. **Simulação de papel** (`PermissionsProvider.tsx:69-72`). Ao simular, `permissions` = `mergeMembroInheritance(impersonatedRole, dbPerms ?? INITIAL_ROLE_PERMISSIONS[impersonatedRole] ?? [], membroDbPerms)`, com `membroDbPerms` = entrada `membro` de `rolesPerms` (`undefined` enquanto carrega, o que cai na constante). O caminho do usuário real (`data.permissions`) não muda: já chega com a herança pelo ponto 11.
2. **Matriz de papéis** (`PermissionMatrix.tsx`).
   - `rolePermsMap` (`:224-229`) passa a guardar o conjunto efetivo: `mergeMembroInheritance(r.role, r.permissions, permissõesDaEntradaMembro)`. Com isso o contador do cabeçalho (`:353-355`) e a coluna "Personalizado" (`:110-114`, `:384-391`) comparam efetivo com efetivo, e nenhum obreiro aparece como personalizado só por causa da herança.
   - Uma permissão é herdada na coluna Obreiro quando `inheritsFromMembro(role)` e a entrada `membro` do mapa a contém. Nesse caso o checkbox do papel fica marcado e desabilitado, com `title="Herdada do papel Membro"`, nos dois lugares em que é renderizado (mobile `:397-403`, desktop `:514-518`). No mobile, onde `title` não aparece, uma linha `text-xs text-muted-foreground` com o mesmo texto abaixo do rótulo (`:405-414`).
   - No popover de membros (`:183-189`), o checkbox de um membro obreiro para uma permissão herdada também fica desabilitado.
   - `handleRoleToggle` (`:245-271`) deixa de depender do mapa efetivo. Hoje `newPermissions` já sai de `roleData.permissions` (`:259-261`), mas `wasChecked` e `newValue` saem de `rolePermsMap` (`:247-249`), que passa a ser efetivo. Mudança: localizar `roleData` antes (hoje em `:253`) e calcular `wasChecked` com `roleData.permissions.includes(permissionKey)`. Assim a gravação da linha do papel usa só a lista própria, e não fica correta apenas porque o checkbox herdado está desabilitado.
   - Marcar ou desmarcar algo na coluna Membro reflete na coluna Obreiro pela reatividade das queries; não há código extra para isso.
3. **Aba Membros** (`app/(ready)/admin/permissoes/page.tsx`, `MembrosTab` em `:76`). `m.permissions` chega efetivo pelo ponto 12, e os dois controles dos conjuntos de voluntário chamam `setMembroPermission` com `hasPermission: false` ao desmarcar: o Checkbox do popover desktop (`:251-256`) e o Switch do Drawer mobile (`:325-328`). Esses conjuntos têm permissões que o papel membro pode ter no banco (`biblioteca:read`, `pequenos_grupos:read`, `educacional:read`, `criancas:read`, em `rbacHelpers.ts:189-249`); se tiver, o obreiro aparece com o item marcado e desmarcar não muda nada.
   - `MembrosTab` passa a ler `getAllRolesWithPermissions`, a mesma query que `PermissionsProvider.tsx:23-26` já mantém aberta para o admin (6 leituras indexadas pequenas). O `Skeleton` de `:98` espera também essa query.
   - Uma permissão é herdada para o membro `m` quando `inheritsFromMembro(m.role)` e a entrada `membro` dessa resposta a contém. Nesse caso o Checkbox (`:251-256`) e o Switch (`:325-328`) ficam desabilitados. No Checkbox, `title="Herdada do papel Membro"`; no Drawer, o mesmo texto em `text-xs text-muted-foreground` junto ao nome da permissão.
4. **Guarda em `setMembroPermission`** (`rbac.ts:503-537`). Quando `hasPermission` é `false`, o alvo tem papel que herda e a permissão está nas herdadas (linha do membro, senão a constante), a mutation lança erro ("Permissão herdada do papel Membro: não pode ser removida de um obreiro") e não grava. A linha do membro só é lida nesse caso (remoção em alvo obreiro). Sem a guarda, a remoção criaria um snapshot idêntico ao papel, congelaria o obreiro fora das mudanças futuras do papel dele e a permissão continuaria valendo. Segue a convenção do arquivo (`throw new Error`); os dois chamadores já mostram `toast.error`. Em produção o Convex troca a mensagem por um texto genérico, aceitável porque os três controles que chegam à guarda (popover da matriz e os dois da aba Membros) ficam desabilitados; a guarda protege o dado em chamada direta e na corrida entre a tela aberta e uma edição do papel membro.

Nada além disso: sem coluna nova, sem selo novo, sem mudança no seletor "Simular como".

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `rolePermissions` | Sem mudança de schema nem de dados. A linha `membro` passa a ser lida (índice `by_role`, já existente em `convex/schema.ts:428`) também quando o papel de quem acessa é obreiro |
| `membros` | Sem mudança. O snapshot continua guardando só permissões próprias |

## Migração de dados
Não há. A herança é calculada na leitura, então vale a partir do deploy do backend para todo obreiro, exista ou não linha do obreiro no banco, com ou sem snapshot. Não rodar `syncRolePermissionsFromCode`: ela sobrescreve todas as linhas de papel com as constantes do código e apagaria o que o admin editou na tela.

O acesso efetivo depende de a linha do membro em produção conter `gravacoes:read`. Produção não foi lida. Indício de que contém: membros ouvem as gravações hoje e `requirePermission.ts` não tem fallback para a constante.

## Permissões
- Quem ganha acesso: papel `obreiro`, a tudo que o papel `membro` tiver no banco. Pelas constantes atuais, a única permissão nova é `gravacoes:read`; as outras quatro do membro o obreiro já tem.
- Demais papéis (membro, presbítero, pastor, secretaria, secretário executivo, admin): sem mudança.
- `/admin/permissoes` continua restrita a admin.

## Impacto em Shared
- [x] `convex/preferencias/rbacHelpers.ts` e `convex/preferencias/rbac.ts`: zonas de perigo de `worktree-parallel.md`. Os PRs em rascunho #365 e #366 alteram textos nesses arquivos; conflito de rebase provável e trivial.
- [x] `convex/_shared/requirePermission.ts`: base de toda checagem de acesso do backend.
- [x] `shared/components/layout/DevContext.tsx`: uma nota (ver abaixo).
- [ ] `convex/schema.ts`, `types/auth.ts`, `convex/auth/*`: sem mudança.
- Risco de regressão: todo módulo que checa permissão. Mitigação: para papel diferente de obreiro os helpers devolvem a mesma lista, sem leitura a mais.

## Riscos
- A ampliação é deliberada e permanente: tudo que o admin der ao papel membro chega a todos os obreiros, inclusive os com snapshot, e não há como negar a um obreiro algo que o membro tem. Um obreiro cujo snapshot hoje não tem uma permissão do membro volta a tê-la no deploy.
- Os fallbacks continuam diferentes entre os pontos (`?? []` em `requirePermission.ts`, constante em `resolvePermissions`). Unificar muda o comportamento de todos os papéis e fica fora desta issue. Só a parte herdada tem fallback uniforme (`INITIAL_ROLE_PERMISSIONS.membro`).
- `getAllMembrosWithPermissions` segue sem aplicar as permissões derivadas do educacional (`mergeDerived`). Já era assim; fora do escopo.
- Deploy: push no main publica só o frontend. O backend precisa de `npx convex deploy` em produção, com OK explícito do André. A ordem entre frontend e backend não importa: nenhuma query muda de formato, e a correção do problema relatado vem inteira do backend.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/preferencias/rbacHelpers.ts` | Modificar | `gravacoes:read` no obreiro; `inheritsFromMembro`; `mergeMembroInheritance` |
| `convex/_shared/requirePermission.ts` | Modificar | `withMembroInheritance`; ponto 1 |
| `convex/pedidosOracao/queries.ts`, `convex/pedidosOracao/mutations.ts`, `convex/gravacoes/ai.ts`, `convex/pastoreio/queries.ts`, `convex/pastoreio/mutations.ts`, `convex/educacional/queries.ts`, `convex/tarefas/queries.ts`, `convex/tarefas/mutations.ts`, `convex/audit/queries.ts` | Modificar | Pontos 2 a 10: um import e uma chamada em cada |
| `convex/preferencias/rbac.ts` | Modificar | Pontos 11 e 12; guarda em `setMembroPermission` |
| `shared/providers/PermissionsProvider.tsx` | Modificar | Ponto 13 |
| `features/preferencias/components/PermissionMatrix.tsx` | Modificar | Ponto 14; checkboxes herdados desabilitados; `wasChecked` pela lista própria |
| `app/(ready)/admin/permissoes/page.tsx` | Modificar | Ponto 15: `MembrosTab` lê `getAllRolesWithPermissions` e desabilita Checkbox e Switch de permissão herdada |
| `convex/preferencias/__tests__/rbacHelpers.test.ts` | Modificar | Casos U1 a U8 |
| `convex/preferencias/__tests__/rbac.integration.test.ts` | Modificar | Casos C1 a C8 |
| `convex/__tests__/obreiroHerdaMembro.integration.test.ts` | Criar | Casos G1 a G5 e P2 a P10 |
| `shared/components/layout/DevContext.tsx` | Modificar | Uma linha em `notas` da entrada `/admin/permissoes` (`:381-386`): obreiro herda as permissões do papel Membro; na matriz aparecem marcadas e travadas. Nenhuma página, query ou mutation nova |
| `docs/modules/admin-permissoes.md` | Modificar | Uma frase em "Resolução de Permissões" (`:77-81`) registrando a exceção do obreiro. Corrigir as duas frases que hoje negam herança: `:5` ("sem heranca") e `:136` ("O sistema nao tem heranca de roles") |

## Testes
Não há infraestrutura de teste de componente no projeto; a lógica do frontend é a função pura, coberta pelos casos U.

**Unitários** — `convex/preferencias/__tests__/rbacHelpers.test.ts`
- U1: `INITIAL_ROLE_PERMISSIONS.obreiro` contém `gravacoes:read`.
- U2: `inheritsFromMembro` é `true` só para `"obreiro"`; `false` para membro, presbitero, pastor, secretaria, secretario_executivo, admin e papel inexistente.
- U3: obreiro, base `["membros:read"]`, linha do membro `["gravacoes:read", "membros:read"]` → `["membros:read", "gravacoes:read"]` (sem duplicata, base primeiro).
- U4: obreiro, linha do membro `undefined` → base ∪ `INITIAL_ROLE_PERMISSIONS.membro`.
- U5: obreiro, linha do membro `[]` → igual à base.
- U6: presbitero e secretario_executivo com linha do membro `["gravacoes:read"]` → devolve a própria base (`toBe`).
- U7: base `["*"]` com papel obreiro → devolve a própria base (`toBe`).
- U8: os arrays de entrada não são mutados.

**Integração do contexto** — `convex/preferencias/__tests__/rbac.integration.test.ts`
- C1 (regressão da constante; não prova a herança): obreiro sem nenhuma linha no banco → `getUserPermissionContext` contém `gravacoes:read` e `tarefas:read`. Passa só com U1, porque sem linha a base já é `INITIAL_ROLE_PERMISSIONS.obreiro` (`rbacHelpers.ts:263`). Quem prova a união são C2 a C5; o fallback das herdadas é o C3.
- C2: linha do obreiro `["membros:read"]` (sem `gravacoes:read`) e linha do membro `["gravacoes:read", "biblioteca:read"]` → exatamente essas três.
- C3: linha do obreiro `["membros:read"]` e nenhuma linha do membro → contém `membros:read` e todas as de `INITIAL_ROLE_PERMISSIONS.membro`.
- C4: obreiro com snapshot `["tarefas:read"]`, linha do obreiro `["membros:read"]`, linha do membro `["gravacoes:read"]` → contém `tarefas:read` e `gravacoes:read`; não contém `membros:read`.
- C5: linha do obreiro `["membros:read"]` e linha do membro `["gravacoes:read"]` → o obreiro não tem `biblioteca:read`. Depois de um admin chamar `updateRolePermissions({ role: "membro", permissions: ["gravacoes:read", "biblioteca:read"] })`, o obreiro passa a ter.
- C6: presbitero com linha `["membros:read"]` e linha do membro `["gravacoes:read"]` → `toEqual(["membros:read"])`. Secretario_executivo sem linha própria e a mesma linha do membro → não contém `gravacoes:read`.
- C7: `getAllMembrosWithPermissions` como admin, com as linhas de C2 → o obreiro vem com as três permissões; um presbitero com linha `["membros:read"]` vem só com a dele.
- C8: `setMembroPermission` como admin, linha do membro com `gravacoes:read`: remover `gravacoes:read` de um obreiro sem snapshot rejeita e o obreiro continua sem snapshot (`permissions` `undefined` ou `[]`); remover `membros:read` (não herdada) do mesmo obreiro funciona e grava o snapshot.
- O teste existente "retorna permissões do DB quando rolePermissions existe" (secretaria, `toEqual` exato) deve continuar passando sem alteração.

**Integração do gate** — `convex/__tests__/obreiroHerdaMembro.integration.test.ts`, com `seedUser` e `as` de `convex/__tests__/helpers.ts` e uma gravação semeada; exercita `requirePermission` por `api.gravacoes.queries.getById` e `checkPermission` por `api.gravacoes.queries.list`.
- G1: obreiro sem nenhuma linha no banco → `getById` devolve a gravação e `list` a inclui. Em `origin/main` este caso lança "Sem permissao".
- G2: linha do obreiro `["membros:read"]` e linha do membro `["gravacoes:read"]` → `getById` devolve a gravação.
- G3: obreiro com snapshot `["tarefas:read"]` e linha do membro `["gravacoes:read"]` → `getById` devolve a gravação.
- G4: linha do obreiro `["membros:read"]` e linha do membro `["membros:self_service"]` → `getById` rejeita e `list` devolve `[]` (a herança segue o banco, não a constante). Depois de um admin chamar `updateRolePermissions` pondo `gravacoes:read` no papel membro, `getById` devolve a gravação.
- G5: presbitero com linha `["membros:read"]` e linha do membro `["gravacoes:read"]` → `getById` rejeita e `list` devolve `[]`.

**Um caso por ponto 2 a 10** — mesmo arquivo. Os casos G só exercitam o ponto 1, e nenhum dos pontos 2 a 10 checa `gravacoes:read`; sem estes casos, um embrulho esquecido ou errado em qualquer um dos 9 arquivos passaria. Preparo comum: obreiro sem snapshot, linha do obreiro `["membros:read"]`, linha do membro com a única permissão da tabela (que o obreiro não tem). Cada caso falha se o embrulho daquele ponto faltar.

| Caso | Ponto | Linha do membro | Chamada como obreiro | Esperado |
|------|-------|-----------------|----------------------|----------|
| P2 | `pedidosOracao/queries.ts` | `["pastoreio:update"]` | `api.pedidosOracao.queries.listMuralRequests({})`, com um pedido de outro autor em `scope: "leaders"` | Devolve o pedido |
| P3 | `pedidosOracao/mutations.ts` | `["pastoreio:update"]` | `api.pedidosOracao.mutations.updateStatus({ id, status: "RESPONDIDO" })` em pedido de outro autor | O pedido fica `RESPONDIDO` |
| P4 | `gravacoes/ai.ts` | `["gravacoes:process_ai"]` | `api.gravacoes.ai.startProcessing({ id })` em gravação com `iaStatus: "TRANSCREVENDO"` | Rejeita com "Processamento ja em andamento", a checagem seguinte ao gate (`:252-254`). Sem a herança a mensagem é "Sem permissao para processar com IA" |
| P5 | `pastoreio/queries.ts` | `["pastoreio:read"]` | `api.pastoreio.queries.listVisitas({})`, com uma visita semeada | Devolve a visita |
| P6 | `pastoreio/mutations.ts` | `["pedidos_oracao:create"]` | `api.pastoreio.mutations.createPedidoOracao({ descricao })` | Devolve o id |
| P7 | `educacional/queries.ts` | `["criancas:manage"]` | `api.educacional.queries.listMembrosParaOvelhinha({})` | Lista não vazia (o próprio obreiro é membro ativo) |
| P8 | `tarefas/queries.ts` | `["tarefas:read"]` | `api.tarefas.queries.list({ filtro: "TODAS" })`, com uma tarefa de outro membro | Devolve a tarefa |
| P9 | `tarefas/mutations.ts` | `["tarefas:create"]` | `api.tarefas.mutations.create({ titulo, prioridade: "MEDIA", responsavelId })` | Devolve o id |
| P10 | `audit/queries.ts` | `["audit:read"]` | `api.audit.queries.list({})`, com um `auditLogs` semeado | Devolve o log |

Sementes de pedido e de tarefa já existem como modelo em `convex/pedidosOracao/__tests__/mural.integration.test.ts:24-39` e `convex/tarefas/__tests__/contadorComentarios.integration.test.ts:24-35`.

## Critérios de verificação (locais)
1. `npx vitest run convex/preferencias/__tests__/rbacHelpers.test.ts` passa.
2. `npx vitest run convex/preferencias/__tests__/rbac.integration.test.ts` passa.
3. `npx vitest run convex/__tests__/obreiroHerdaMembro.integration.test.ts` passa.
4. Os testes que já existem e passam pelos arquivos alterados continuam passando, sem edição:
   ```bash
   npx vitest run convex/pedidosOracao/__tests__/mural.integration.test.ts convex/gravacoes/__tests__/gravacoesIA.integration.test.ts convex/gravacoes/__tests__/share.integration.test.ts convex/__tests__/gravacoesLouvorPermissao.integration.test.ts convex/__tests__/convitesPermissao.integration.test.ts convex/__tests__/entidadesPermissao.integration.test.ts convex/__tests__/multimidiaBibliotecaPermissao.integration.test.ts convex/__tests__/turmasPermissao.integration.test.ts convex/__tests__/segurancaEndpoints.integration.test.ts convex/__tests__/leiturasSemAuth.integration.test.ts
   ```
   `mural` chama `pedidosOracao/queries.ts` e `mutations.ts` (pontos 2 e 3); `gravacoesIA` e `gravacoesLouvorPermissao` chamam `gravacoes/ai.ts`; os demais são os testes de gate que passam por `requirePermission.ts`. `pastoreio`, `educacional`, `tarefas` (queries e mutations) e `audit` não têm teste próprio hoje: ficam cobertos só pelos casos P.
5. `npm run lint` passa.
6. Todos os pontos do backend chamam o helper. O padrão exige a chamada, não só o import; o comportamento de cada ponto é provado pelos casos G e P. Saída vazia esperada:
   ```bash
   grep -L "await withMembroInheritance(" convex/_shared/requirePermission.ts convex/pedidosOracao/queries.ts convex/pedidosOracao/mutations.ts convex/gravacoes/ai.ts convex/pastoreio/queries.ts convex/pastoreio/mutations.ts convex/educacional/queries.ts convex/tarefas/queries.ts convex/tarefas/mutations.ts convex/audit/queries.ts convex/preferencias/rbac.ts
   ```
7. Nenhum leitor de `rolePermissions` ficou de fora. O comando abaixo deve listar só os 11 arquivos do item 6 mais `convex/membros/bootstrap.ts` e `convex/preferencias/migrations.ts` (seed e migração, sem checagem de acesso):
   ```bash
   grep -rl 'query("rolePermissions")' convex --include=*.ts | grep -v "__tests__\|_generated"
   ```
8. O frontend usa as funções puras. Cada comando deve listar os dois arquivos:
   ```bash
   grep -l "mergeMembroInheritance" shared/providers/PermissionsProvider.tsx features/preferencias/components/PermissionMatrix.tsx
   grep -l "inheritsFromMembro" features/preferencias/components/PermissionMatrix.tsx "app/(ready)/admin/permissoes/page.tsx"
   ```

Durante o trabalho rodam só os arquivos de teste dos critérios 1 a 4 e o lint. A suíte completa (`npm test`) roda uma vez na integração, como manda `worktree-rebase.md`.

Conferência visual (não é critério local: a tela exige login de admin e o `scripts/screenshot-auth.sh` aponta para produção): depois do deploy, em `/admin/permissoes`, aba Papéis, as permissões do Membro aparecem marcadas e travadas na coluna Obreiro, em 390px e em 1280px; com "Simular como… Obreiro", `/gravacoes` abre a lista.

## Ordem de Implementação
1. `rbacHelpers.ts`: constante e as duas funções puras; casos U.
2. `requirePermission.ts`: `withMembroInheritance` e ponto 1; casos G.
3. Pontos 2 a 10; casos P.
4. `rbac.ts`: pontos 11 e 12 e a guarda; casos C.
5. `PermissionsProvider.tsx`, `PermissionMatrix.tsx` e `page.tsx` (pontos 13 a 15).
6. Nota no DevContext e correções em `docs/modules/admin-permissoes.md`.
7. Critérios 1 a 8; mover este PRD para `docs/implementations/wip/` ao começar e para `ready/` ao concluir.

## Perguntas em aberto
1. `secretario_executivo` também não tem `gravacoes:read` na constante (`rbacHelpers.ts:161-183`), então provavelmente tem o mesmo problema de não ouvir o sermão. Fica fora desta issue (escopo: só obreiro). Abrir outra issue?
2. `CLAUDE.md:43` registra "Sem herança — permissões explícitas". Atualizar a frase para citar a exceção do obreiro?
