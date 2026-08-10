# Permissao propria para o Retiro (`retiro:manage`)

## Escopo

Separar a gestao do Retiro da gestao de inscricoes genericas de evento, hoje
coladas na mesma chave `inscricoes:manage`. Passa a existir `retiro:manage`,
cobrindo as telas `/admin/retiro*`, o backend `convex/retiro/*` e os
comprovantes de pagamento do retiro no B2.

Motivacao: nao ha como hoje dar acesso ao Retiro sem entregar junto o cadastro
de inscricoes genericas e as respostas de todos os formularios do site.

## Modelos Afetados

| Tabela | Tipo de Mudanca |
|--------|-----------------|
| `rolePermissions` | Novo valor em `permissions[]` (via migracao) |
| `membros` | Novo valor em `permissions[]` para grants individuais (via migracao) |

Nenhuma alteracao em `convex/schema.ts` — `permissions` ja e `string[]`.

## Permissoes

- **Nova**: `retiro:manage` — "Gerenciar Retiro". Modulo `Retiro`.
- **Quem passa a ter por padrao**: `admin` (wildcard), `pastor`, `secretaria`,
  `secretario_executivo` — exatamente quem tem `inscricoes:manage` hoje, para
  ninguem perder acesso no deploy.
- **Quem pode ver a UI**: item "Retiro" no menu de Secretaria passa a exigir
  `retiro:manage`.
- `inscricoes:manage` continua existindo e passa a valer somente para
  `/admin/inscricoes` (inscricoes genericas de evento).

### Decisao: uma chave, nao duas

Avaliada a separacao `retiro:manage` + `retiro:financeiro` (comprovantes
bancarios em separado, por LGPD). Decidido por chave unica: quem gerencia o
retiro tambem cuida dos recebimentos. Se no futuro houver voluntario de retiro
que nao deva ver comprovante, a divisao natural e extrair `retiro:financeiro`
de `convex/files/authz.ts` + `FinanceiroSection`.

## Impacto em Shared

- [x] Toca arquivos sensiveis: `convex/preferencias/rbac.ts`,
      `convex/preferencias/rbacHelpers.ts`, `types/auth.ts`,
      `convex/files/authz.ts`, `shared/constants/navigation.ts`,
      `shared/components/layout/DevContext.tsx`
- [x] Risco de regressao: qualquer feature com upload — `files/authz.ts` e o
      mapa compartilhado. Mudanca e aditiva (troca de chave em 2 pastas do
      retiro), nao mexe nas demais pastas.

## Riscos

1. **Perda de acesso no deploy** — o maior. Papeis e membros no banco carregam
   um snapshot de `permissions[]`; trocar a chave no codigo sem migrar tira o
   Retiro da secretaria. Mitigado por `grantRetiroManage`, idempotente, a
   rodar logo apos o deploy do backend.
2. **Comprovantes ja no B2** — as URLs assinadas de `retiro-comprovantes`
   passam a exigir `retiro:manage`. Quem tinha acesso continua tendo apos a
   migracao; sem ela, comprovante antigo fica inacessivel na UI.
3. **`acampamento-comprovantes` (legado)** — pasta do acampamento antigo. Segue
   em `inscricoes:manage`; nao ha fluxo novo de upload ali.

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `types/auth.ts` | Modificar | Adiciona `retiro:manage` ao union |
| `convex/preferencias/rbacHelpers.ts` | Modificar | `retiro:manage` em pastor, secretaria, secretario_executivo |
| `convex/preferencias/rbac.ts` | Modificar | ALL_PERMISSIONS, label, descricao, modulo `Retiro`, migracao `grantRetiroManage` |
| `convex/retiro/queries.ts` | Modificar | `requirePermission` -> `retiro:manage` |
| `convex/retiro/mutations.ts` | Modificar | idem |
| `convex/retiro/quartos.ts` | Modificar | idem |
| `convex/files/authz.ts` | Modificar | `retiro-comprovantes` (upload + leitura) -> `retiro:manage` |
| `app/(ready)/admin/retiro/page.tsx` | Modificar | `PermissionGate` |
| `app/(ready)/admin/retiro/[id]/page.tsx` | Modificar | `PermissionGate` |
| `app/(ready)/admin/retiro/[id]/quartos/page.tsx` | Modificar | `PermissionGate` |
| `shared/constants/navigation.ts` | Modificar | Item "Retiro" |
| `shared/components/layout/DevContext.tsx` | Modificar | Notas das paginas do retiro |

## Ordem de Implementacao

1. `types/auth.ts` + `rbacHelpers.ts` (defaults do codigo)
2. `rbac.ts`: lista, label/descricao/modulo e a migracao
3. Backend do retiro (`queries`, `mutations`, `quartos`) e `files/authz.ts`
4. Frontend (paginas, navegacao, DevContext)
5. `npm run lint` + `npm test`
6. Deploy do backend (`npx convex deploy`) e so entao
   `npx convex run preferencias/rbac:grantRetiroManage --prod`

## Pos-deploy

Liberar o membro que precisa so do Retiro em `/admin/permissoes` ->
"Gerenciar Retiro" -> coluna Personalizado -> marcar a pessoa. Sem trocar o
papel dela.
