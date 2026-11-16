# Todo mundo tem sempre o que o papel membro tem (issue #372)

## Escopo
A herança que hoje vale só para o obreiro (#370/#371, `docs/implementations/ready/obreiro-herda-membro.md`) vira a regra geral: as permissões efetivas de qualquer pessoa são a base dela (snapshot individual, senão a linha do papel) unidas às do papel `membro` lidas do banco. Motivo: o secretário executivo não ouve gravações porque o papel dele não tem `gravacoes:read`, que o membro tem.

Decisões do usuário (16/11/2026):
1. Todos os papéis herdam, inclusive com snapshot individual.
2. Vale também para quem tem papel `membro` com snapshot: snapshot ∪ linha do membro. Membro sem snapshot não ganha leitura extra.
3. Com "sempre", o admin não pode tirar de ninguém uma permissão que o papel membro tem.

É a generalização de uma regra pronta: muda o predicado e, para ele saber se há snapshot, a assinatura das três funções exportadas (`inheritsFromMembro`, `mergeMembroInheritance`, `withMembroInheritance`) e da local `isInheritedPermission`; por consequência, as chamadas. Sem tabela nova, sem página nova, sem query nova, sem migração.

## Regra
```
efetivas(P) = base(P)               se P é admin, ou base contém "*", ou P tem papel membro sem snapshot
efetivas(P) = base(P) ∪ herdadas    nos demais casos (inclui papel membro com snapshot)
```
`base` e `herdadas` são as do PRD anterior (herdadas = linha `membro` de `rolePermissions`, senão `INITIAL_ROLE_PERMISSIONS.membro`). Snapshot = `membro.permissions` não vazio, a mesma definição de `resolvePermissions`. No membro sem snapshot a base já é a linha do membro: o helper devolve a base antes de ler.

## Assinaturas
`convex/preferencias/rbacHelpers.ts:268-291`:
```ts
export function inheritsFromMembro(role: string, hasSnapshot: boolean): boolean {
  if (role === "admin") return false;
  return role !== "membro" || hasSnapshot;
}

export function mergeMembroInheritance(
  role: string,
  base: string[],
  membroRolePermsFromDb: string[] | undefined,
  hasSnapshot: boolean
): string[]  // usa inheritsFromMembro(role, hasSnapshot); o resto do corpo não muda
```
`convex/_shared/requirePermission.ts:21-32` passa a receber o membro no lugar do papel:
```ts
export async function withMembroInheritance(
  ctx: any,
  membro: { role: string; permissions?: string[] },
  base: string[]
): Promise<string[]> {
  const hasSnapshot = (membro.permissions?.length ?? 0) > 0;
  if (!inheritsFromMembro(membro.role, hasSnapshot) || base.includes("*")) return base;
  // leitura da linha do membro: igual a hoje
  return mergeMembroInheritance(membro.role, base, membroRole?.permissions, hasSnapshot);
}
```
- **Predicado negativo, sem lista de papéis**: papel novo ou legado herda sem ninguém lembrar de cadastrá-lo. `hasSnapshot` é obrigatório, sem valor padrão, para o compilador cobrar cada chamada.
- **Admin fica de fora pelo nome**, e não só pelo `*`: `pastoreio`, `tarefas`, `educacional` e `getUserPermissionContext` não tratam admin antes do helper. Excluir pelo nome garante zero leitura e zero mudança para admin mesmo se a base chegar sem `*`.
- **Receber o membro, e não um booleano**, nos 11 pontos do backend: o helper calcula o snapshot sozinho e nenhum chamador erra a conta.

| Chamada | Passa a ser |
|---------|-------------|
| Os 11 `withMembroInheritance(ctx, membro.role, …)`: `requirePermission.ts:53`, `pedidosOracao/queries.ts:28`, `pedidosOracao/mutations.ts:116`, `gravacoes/ai.ts:243`, `pastoreio/queries.ts:22`, `pastoreio/mutations.ts:22`, `educacional/queries.ts:26`, `tarefas/queries.ts:35`, `tarefas/mutations.ts:22`, `audit/queries.ts:65`, `preferencias/rbac.ts:330` | Segundo argumento `membro` |
| `rbac.ts:439-443`, `getAllMembrosWithPermissions` | Quarto argumento: `m.permissions` não vazio (o mesmo valor de `hasCustomPermissions`, `:451`) |
| `rbac.ts:552`, guarda de `setMembroPermission` | `inheritsFromMembro(membro.role, true)`, que vale para todo mundo menos admin. Tirar de alguém uma permissão que o membro tem nunca tem efeito: se sobra snapshot, a união devolve; se a lista esvazia (`:577-580` grava `[]`, que conta como sem snapshot), a base volta à linha do papel, que herda ou é a própria linha do membro |
| `rbac.ts:1011`, `applyVolunteerSet` | `inheritsFromMembro(membro.role, true)`, pelo mesmo motivo |
| `PermissionsProvider.tsx:78-82`, simulação | Quarto argumento `false`: simula o papel, sem snapshot |
| `PermissionMatrix.tsx:255`, `rolePermsMap` | Quarto argumento `false` |
| `PermissionMatrix.tsx:67-73`, `isInheritedPermission` | Ganha o parâmetro `hasSnapshot`. Colunas por papel (`:410`, `:544`) passam `false`; popover por membro (`:206`, `:209`) passa `true` |
| `page.tsx:109`, aba Membros | `inheritsFromMembro(role, true)` |

Com `true`, o predicado vale para todo mundo menos admin: é o que trava a remoção por pessoa. Com `false`, vale para todo papel menos membro e admin: é o que trava as colunas da matriz e mantém a coluna Membro editável, porque ela é a fonte.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `rolePermissions` | Sem mudança de schema nem de dados. A linha `membro` passa a ser lida (índice `by_role`) para todo papel diferente de membro e admin, e para membro com snapshot |
| `membros` | Sem mudança. O snapshot continua guardando só permissões próprias |

**Migração de dados: não há.** A união é calculada na leitura e vale a partir do deploy. Nenhuma linha de papel e nenhum snapshot precisa ser regravado. Não rodar `syncRolePermissionsFromCode` (sobrescreve o que o admin editou). `INITIAL_ROLE_PERMISSIONS` não muda.

## Permissões
- Em produção (lido em 16/11/2026): a `secretaria` passa a ter `pedidos_oracao:create`; a única pessoa de papel membro com snapshot sem `louvor:read` passa a ter. O `secretario_executivo` passaria a ter `gravacoes:read`, `pedidos_oracao:create` e `louvor:read`. `presbitero` e `pastor` já têm tudo; `obreiro` já herdava.
- Pessoas por papel em produção (16/11/2026): membro 219 (1 com snapshot); presbitero 5 (2 com snapshot, já completos); obreiro, pastor, secretaria e admin 1 cada, sem snapshot. Ninguém com `secretario_executivo` nem com o papel antigo `comunicacao`.
- Admin e membro sem snapshot: sem mudança.
- A herança só entrega o que o papel de menor acesso já tem; não há escalada.
- `/admin/permissoes` continua restrita a admin.

## Bandwidth
Leitura extra por resolução de permissão, nos 11 pontos do backend:

| Quem acessa | Pessoas em produção | Hoje | Depois |
|-------------|---------------------|------|--------|
| Admin | 1 | 0 | 0 |
| Papel membro sem snapshot | 218 | 0 | 0 |
| Papel membro com snapshot | 1 | 0 | +1 |
| Obreiro | 1 | +1 | +1 |
| Presbitero, pastor e secretaria | 7 | 0 | +1 |

- A leitura é sempre a mesma: `rolePermissions` por `by_role` = `"membro"`, `.first()`, um documento de cerca de 0,2 KB (6 permissões em produção), sem varredura. Função que chama `requirePermission` N vezes paga N.
- `setMembroPermission` em remoção e `applyVolunteerSet` com `apply: false` passam a ler a linha do membro para qualquer alvo (hoje, só alvo obreiro). São mutations de admin, raras.
- `getAllMembrosWithPermissions` continua com uma leitura da linha do membro antes do laço. O frontend não ganha query.
- Reatividade: a linha do membro entra no conjunto de leitura das queries de quem paga a leitura; ela só é escrita quando o admin edita a coluna Membro.

Aceitável porque a leitura extra passa a valer para 8 pessoas (1 membro com snapshot, 5 presbíteros, 1 pastor e 1 secretaria), e para elas a checagem, que já lê dois documentos (o do membro e a linha do próprio papel), passa a ler um terceiro, pequeno e por índice. Os 218 membros sem snapshot e o admin continuam em 0; o obreiro já pagava.

Alternativas descartadas:
- Gravar a união na linha de cada papel: zeraria a leitura, mas não alcança snapshots, que é o defeito relatado.
- Reaproveitar, para papel membro com snapshot, a linha que o chamador acabou de ler (é a mesma): economiza cerca de 0,2 KB por checagem de 1 pessoa e custa um quarto argumento nos 11 pontos.

## Efeitos colaterais conferidos
1. **Guarda de `setMembroPermission`** (`rbac.ts:552-559`): passa a recusar a remoção de permissão herdada de qualquer pessoa, inclusive de papel membro com ou sem snapshot (admin já é barrado em `:547`). É a decisão 3. A mensagem de `:556` cita o obreiro e precisa generalizar.
2. **`applyVolunteerSet` com `apply: false`** (`rbac.ts:1011-1018`): para qualquer alvo, permissão do conjunto que também é herdada não sai do snapshot. Sem efeito prático hoje: nenhuma permissão dos 8 conjuntos de `VOLUNTEER_PERMISSION_SETS` está na linha do membro em produção.
3. **Matriz por papel**: as permissões do Membro aparecem marcadas e travadas ("Herdada do papel Membro") nas 5 colunas além de Membro, no desktop e no mobile. A coluna Membro continua editável. O contador do cabeçalho e a coluna "Personalizado" já comparam efetivo com efetivo. Não existe coluna admin (`VISIBLE_ROLES`).
4. **Popover por membro na matriz e aba Membros**: Checkbox e Switch de permissão herdada ficam desabilitados para toda pessoa listada, inclusive de papel membro. As duas listas não trazem admin (`getAllMembrosWithPermissions` pula admins).
5. **Simulação de papel**: "Simular como" qualquer papel une com a entrada `membro`; simular Membro continua igual. O seletor não oferece admin (`page.tsx:539`).
6. **Papel antigo `comunicacao`**: a linha continua no banco, não aparece na matriz e não pode ser concedida por convite (`convex/membros/convites.ts:9`). Pelo predicado negativo, quem tivesse esse papel herdaria do membro; hoje não há ninguém.
7. **Snapshots**: quem tem snapshot sem alguma permissão do membro volta a tê-la no deploy (decisões 1 e 2).

## Impacto em Shared
- [x] `convex/preferencias/rbacHelpers.ts` e `convex/preferencias/rbac.ts`: zonas de perigo de `worktree-parallel.md`.
- [x] `convex/_shared/requirePermission.ts`: base de toda checagem de acesso do backend; muda a assinatura de `withMembroInheritance`.
- [x] `shared/components/layout/DevContext.tsx`: uma nota.
- [x] `CLAUDE.md`: linha RBAC (decisão do usuário).
- [ ] `convex/schema.ts`, `types/auth.ts`, `convex/auth/*`: sem mudança.
- Risco de regressão: todo módulo que checa permissão, só no sentido de liberar. Medido em cópia descartável com este desenho aplicado: dos 786 testes da suíte quebram 7, em 3 arquivos, todos listados em "Testes"; o `tsc` só acusa as 8 chamadas de `rbacHelpers.test.ts` com a assinatura antiga; o lint dos arquivos alterados fica com 0 erros.

## Riscos
- Ampliação permanente: tudo que o admin der ao papel membro chega a todo mundo, e não há como negar a uma pessoa algo que o membro tem.
- Chamada esquecida pode não aparecer no `tsc`: na maioria dos pontos do backend `membro` é `any`, então `membro.role` no lugar de `membro` compila e, em execução, faz todo membro sem snapshot pagar a leitura extra. O critério 5 cobre.
- Deploy: push no main publica só o frontend; o backend precisa de `npx convex deploy` em produção, com OK explícito do André. O acesso vem do backend. O frontend embute o mesmo predicado (matriz e simulação); a ordem entre os dois não importa, porque nenhuma query muda de formato.
- Fallbacks diferentes entre os pontos (`?? []` em `requirePermission.ts`, constante em `resolvePermissions`) continuam como estão.

## Arquivos a Criar/Modificar
Nenhum arquivo novo. Em arquivo sem acento (`CLAUDE.md`, `docs/modules/admin-permissoes.md`, `DevContext.tsx`), manter o estilo do arquivo.

| Arquivo:linha | Ação |
|---------------|------|
| `convex/preferencias/rbacHelpers.ts:268-291` | Predicado, docstrings e quarto parâmetro de `mergeMembroInheritance`. O comentário de `:98` continua correto |
| `convex/_shared/requirePermission.ts:15-32`, `:53` | Assinatura nova; tirar "(hoje só o obreiro)" de `:16`; chamada |
| `convex/pedidosOracao/queries.ts`, `convex/pedidosOracao/mutations.ts`, `convex/gravacoes/ai.ts`, `convex/pastoreio/queries.ts`, `convex/pastoreio/mutations.ts`, `convex/educacional/queries.ts`, `convex/tarefas/queries.ts`, `convex/tarefas/mutations.ts`, `convex/audit/queries.ts` | Uma troca em cada: `membro.role` por `membro` |
| `convex/preferencias/rbac.ts` | Chamadas de `:330`, `:439-443`, `:552` e `:1011`. Comentários de `:329`, `:423`, `:549-551` e `:1010` sem citar obreiro; o de `:549-551` explica a guarda pelo motivo da tabela de chamadas, sem dizer que a remoção sempre deixa snapshot. Mensagem de `:556`: `"Permissão herdada do papel Membro: não pode ser removida"` |
| `features/preferencias/components/PermissionMatrix.tsx` | `isInheritedPermission` e suas 4 chamadas; `:255`; comentário de `:250` |
| `shared/providers/PermissionsProvider.tsx:73-82` | Quarto argumento; comentário de `:73` |
| `app/(ready)/admin/permissoes/page.tsx:81`, `:109` | Comentário; segundo argumento |
| `shared/components/layout/DevContext.tsx:385` | Nota de `/admin/permissoes`: "Toda pessoa tem sempre as permissoes do papel Membro (uniao calculada na leitura, nunca gravada); na matriz aparecem marcadas e travadas nas colunas alem de Membro e no popover por membro (\"Herdada do papel Membro\")" |
| `CLAUDE.md:43` | Trocar "Sem heranca — permissoes explicitas, exceto o **obreiro**, que tem sempre tudo o que o papel membro tem (inclusive com permissoes personalizadas)." por "Permissoes explicitas por papel, com uma heranca: **todo mundo tem sempre tudo o que o papel membro tem** (inclusive com permissoes personalizadas; admin ja tem `*`). Papel novo herda sem configuracao." O resto da linha fica |
| `docs/modules/admin-permissoes.md:5`, `:83`, `:138` | Generalizar as três frases que citam só o obreiro: toda pessoa herda do papel membro, com ou sem permissões personalizadas; `setMembroPermission` recusa remover herdada de qualquer pessoa |
| `convex/preferencias/__tests__/rbacHelpers.test.ts`, `convex/preferencias/__tests__/rbac.integration.test.ts`, `convex/__tests__/obreiroHerdaMembro.integration.test.ts` | Ver "Testes". O terceiro mantém o nome |

Ficam como estão: `docs/plano-geral.md:89` ("Sem herança", plano histórico da fase de 3 papéis) e os PRDs em `docs/implementations/ready/`.

## Testes
**Unitários** — `rbacHelpers.test.ts`
- U2 (reescrever): com `hasSnapshot` `false`, `inheritsFromMembro` é `true` para obreiro, presbitero, pastor, secretaria, secretario_executivo, `comunicacao` e `papel_inexistente`, e `false` para membro e admin. Com `true`, é `true` também para membro e continua `false` para admin.
- U6 (inverter): presbitero e secretario_executivo, base `["membros:read"]`, linha do membro `["gravacoes:read"]`, sem snapshot → `toEqual(["membros:read", "gravacoes:read"])`. Admin com base `["membros:read"]`, com e sem snapshot → devolve a própria base (`toBe`).
- U9 (novo): membro, base `["membros:self_service"]`, linha do membro `["louvor:read"]`. Sem snapshot → devolve a própria base (`toBe`). Com snapshot → `toEqual(["membros:self_service", "louvor:read"])`.
- U3, U4, U5, U7 e U8: só acrescentar o quarto argumento `false`.

**Contexto** — `rbac.integration.test.ts` (comparar listas ordenadas, como o C2)
- `:88` "retorna permissões customizadas do membro quando existem": membro com snapshot de 4 e sem linha do membro passa a vir com 7 (a herança cai na constante). Semear a linha do membro `["membros:self_service", "gravacoes:read"]` e manter `toHaveLength(4)`.
- `:102` "retorna permissões do DB quando rolePermissions existe": semear também a linha do membro `["gravacoes:read"]` e esperar exatamente `diretorio:read`, `gravacoes:read`, `membros:read`.
- C6 (inverter): linha do membro `["gravacoes:read", "pedidos_oracao:create"]`. Presbitero com linha `["membros:read"]` → exatamente as três. Secretario_executivo sem linha própria → contém `gravacoes:read`, `pedidos_oracao:create` e `rol:read` (da constante dele).
- C7 (inverter): o presbitero com linha `["membros:read"]` vem com as três permissões do caso e `hasCustomPermissions` `false`. Acrescentar um membro com snapshot `["membros:self_service"]` → vem com as três (a dele e as duas da linha do membro) e `hasCustomPermissions` `true`.
- C10 (novo): secretaria com snapshot `["membros:read"]`, linha do membro `["pedidos_oracao:create"]` → exatamente as duas.
- C11 (novo, o caso de produção): membro com snapshot `["membros:self_service", "gravacoes:read"]`, linha do membro `["membros:self_service", "gravacoes:read", "louvor:read"]` → exatamente as três.
- C12 (novo): linhas presbitero `["membros:read"]` e membro `["gravacoes:read", "calendario:read"]`. `setMembroPermission` removendo `gravacoes:read` rejeita (`/herdada/i`) para um presbitero sem snapshot e para um membro sem snapshot, e os dois seguem sem snapshot. Em um membro com snapshot `["gravacoes:read", "louvor:create"]`, remover `louvor:create` funciona e grava `["gravacoes:read"]`.
- C13 (novo): `applyVolunteerSet` com `voluntario_biblioteca` e `apply: false`, linha do membro `["membros:self_service", "biblioteca:read"]`. Secretario_executivo sem snapshot, com linha `["membros:read", "biblioteca:read"]` → grava `["membros:read", "biblioteca:read"]`. Membro com snapshot `["membros:self_service", "biblioteca:read", "biblioteca:create"]` → grava `["membros:self_service", "biblioteca:read"]`.
- C1 a C5, C8, C9 e o teste de admin (`:120`) não mudam.

**Gate** — `obreiroHerdaMembro.integration.test.ts`
- G5 (inverter): presbitero com linha `["membros:read"]` e linha do membro `["gravacoes:read"]` → `getById` devolve a gravação e `list` a inclui.
- G6 (novo, o caso da issue): secretario_executivo com linha `["membros:read", "rol:read"]` e linha do membro `["gravacoes:read"]` → `getById` devolve a gravação e `list` a inclui. Em `origin/main` lança "Sem permissao".
- G7 (novo): secretario_executivo sem nenhuma linha no banco → `getById` devolve a gravação.
- G8 (novo): membro com o snapshot e a linha do C11 → `api.louvor.queries.list({})` devolve `[]`. Em `origin/main` lança "Sem permissao".
- G9 (novo): membro sem snapshot e sem nenhuma linha no banco → `getById` rejeita com "Sem permissao" e `list` devolve `[]`. Falha se o helper unir (e portanto ler) para membro sem snapshot.
- P11 (novo): secretaria com snapshot `["membros:read"]` e linha do membro `["pedidos_oracao:create"]` → `api.pastoreio.mutations.createPedidoOracao({ descricao })` devolve o id.
- G1 a G4 e P2 a P10 não mudam.

**Leitura** — mesmo arquivo, chamando `withMembroInheritance` direto com um `ctx` falso em que `db.query` é um `vi.fn()` que devolve `{ withIndex: () => ({ first: async () => ({ permissions }) }) }`. Conferido na cópia descartável que o import e o `ctx` falso funcionam nesse arquivo.
- L1: `{ role: "membro" }` e `{ role: "membro", permissions: [] }` → devolve a própria base (`toBe`) e `db.query` não é chamado.
- L2: `{ role: "admin", permissions: ["membros:read"] }` com base sem `*` → devolve a própria base e `db.query` não é chamado.
- L3: `{ role: "membro", permissions: ["membros:self_service"] }`, linha `["louvor:read"]` → devolve as duas e `db.query` é chamado uma vez, com `"rolePermissions"`.
- L4: `{ role: "secretario_executivo" }`, base `["rol:read"]`, linha `["gravacoes:read"]` → devolve as duas e `db.query` é chamado uma vez.

## Critérios de verificação (locais)
1. Passa:
   ```bash
   npx vitest run convex/preferencias/__tests__/rbacHelpers.test.ts convex/preferencias/__tests__/rbac.integration.test.ts convex/__tests__/obreiroHerdaMembro.integration.test.ts
   ```
2. `npm run lint` termina com 0 erros.
3. `npx tsc --noEmit` termina com 0 erros.
4. Nenhum texto continua dizendo que só o obreiro herda. Saída vazia esperada (hoje lista 19 linhas):
   ```bash
   grep -nE "só o obreiro|só ao obreiro|só para obreiro|exceto o \*\*obreiro|exceto o obreiro|exceto obreiro|de um obreiro|Obreiro herda|o obreiro herda|\`obreiro\` herda|o obreiro inclui|por obreiro|obreiro fora das|presbitero não herda|executivo não herdam" CLAUDE.md docs/modules/admin-permissoes.md shared/components/layout/DevContext.tsx shared/providers/PermissionsProvider.tsx features/preferencias/components/PermissionMatrix.tsx "app/(ready)/admin/permissoes/page.tsx" convex/_shared/requirePermission.ts convex/preferencias/rbac.ts convex/preferencias/rbacHelpers.ts convex/preferencias/__tests__/rbacHelpers.test.ts convex/preferencias/__tests__/rbac.integration.test.ts convex/__tests__/obreiroHerdaMembro.integration.test.ts
   ```
5. Nenhuma chamada do backend continua passando o papel no lugar do membro. Saída vazia esperada (hoje lista 11 arquivos):
   ```bash
   grep -rlPzo "withMembroInheritance\(\s*ctx,\s*membro\.role" convex --include=*.ts
   ```
6. Fora dos testes, o backend só muda nos 12 arquivos da tabela: `git diff $(git merge-base origin/main HEAD) --name-only -- convex ':!*__tests__*'` lista `rbacHelpers.ts`, `rbac.ts`, `requirePermission.ts` e os 9 arquivos de chamada.
7. `npm test` passa inteiro antes de abrir a PR, e de novo depois do rebase, antes de integrar (`worktree-rebase.md`, passo 5). O repositório não tem CI (não há `.github/`; o `.husky/pre-commit` só roda `lint-staged`), então é esta rodada que exercita os testes que já existem e passam pelos 9 arquivos de chamada: `mural`, `gravacoesIA`, `gravacoesLouvorPermissao`, `segurancaEndpoints` e `leiturasSemAuth`.

Durante o trabalho rodam só os três arquivos de teste do critério 1; a suíte completa é o critério 7.

Conferência depois do deploy (não é critério local, a tela exige login de admin): em `/admin/permissoes`, as permissões do Membro aparecem marcadas e travadas nas 5 outras colunas, em 390px e em 1280px, e a coluna Membro segue editável; no popover por membro de uma permissão do Membro, todos aparecem marcados e travados; com "Simular como… Sec. Executivo", `/gravacoes` abre a lista. A simulação não prova o backend: nela muda apenas o `can()` do navegador e as queries rodam como admin. O que prova o backend (`npx convex deploy`): na linha `louvor:read` da matriz, coluna "Personalizado" (`PermissionMatrix.tsx:126-130`), a pessoa de papel membro com snapshot aparece hoje riscada (tem ≠ tem pelo papel) e deixa de aparecer depois do deploy, porque o dado vem de `getAllMembrosWithPermissions`.

## Ordem de Implementação
1. `npm install` no worktree (não há `node_modules`; o `.env.local` já está lá). Mover este PRD para `docs/implementations/wip/`.
2. `rbacHelpers.ts`: predicado e `mergeMembroInheritance`; casos U.
3. `requirePermission.ts`: `withMembroInheritance`; depois as outras 10 chamadas; casos L, G e P11.
4. `rbac.ts`: `getAllMembrosWithPermissions`, as duas guardas, mensagem e comentários; `:88`, `:102` e casos C.
5. `PermissionsProvider.tsx`, `PermissionMatrix.tsx` e `page.tsx`.
6. `DevContext.tsx:385`, `docs/modules/admin-permissoes.md` e `CLAUDE.md:43`.
7. Critérios 1 a 7; mover este PRD para `docs/implementations/ready/`.
