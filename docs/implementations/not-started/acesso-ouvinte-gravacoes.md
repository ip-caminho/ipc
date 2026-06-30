# Acesso Ouvinte — Gravações para Não-Membros

## Escopo
Permitir que o admin conceda acesso a uma pessoa **que não é membro** da igreja,
restrito a **ouvir as gravações das pregações**. O acesso não dá direito a
nenhuma outra área do sistema, e a pessoa **não entra no Rol de membros** (IPB)
nem em contagens, aniversariantes, exports ou estatísticas eclesiásticas.

## Abordagem recomendada
Reaproveitar a infra existente (`entidades` + `membros` + `membroConvites` +
RBAC), introduzindo um **novo role `ouvinte`** com uma única permissão
(`gravacoes:read`). É a opção de menor esforço e sem nova tabela — alinhada ao
monólito modular. O ponto sensível é **excluir `role: "ouvinte"` de todas as
listagens de membros**, para não poluir o Rol.

Alternativa descartada: tabela `usuariosExternos` separada — desacopla melhor
mas duplica auth, status-check e UI de gestão. Over-engineering para o caso.

## Decisões fixadas
- **Modelagem**: role `ouvinte` reusando `entidades`+`membros` (não tabela separada).
- **Acesso expira no início de cada ano**: todos os ouvintes vencem na virada do
  ano (`acessoExpiraEm` = 31/12 23:59 do ano corrente). No começo do ano o admin
  **renova** quem segue ativo. Requer campo `acessoExpiraEm` + checagem no gate de
  permissão + UI para renovar.
- **Aviso de expiração**: notificar **15 dias antes** do vencimento (≈16/12) —
  admin e/ou ouvinte.
- **Role exibido na UI**: "Ouvinte" (slug interno `ouvinte`).
- **Sem CPF**: ouvinte criado sem CPF; acesso só via link gerado pelo admin (não
  pelo fluxo telefone+5 dígitos do CPF).
- **Escopo**: ouvinte vê **todas** as gravações publicadas (mesma lista dos membros).

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `entidades` | Nenhuma estrutural — registro PF com `status: ATIVO`, sem CPF obrigatório |
| `membros` | **Adicionar** `acessoExpiraEm: v.optional(v.number())` (timestamp da virada do ano — validade do ouvinte). Registro com `role: "ouvinte"`, `permissions` herdadas do role |
| `membroConvites` | Nenhuma — reusa fluxo `gerarLink` (`origem: "link"`) |
| RBAC (`INITIAL_ROLE_PERMISSIONS`) | Adicionar entrada `ouvinte: ["gravacoes:read"]` |

Migração mínima de schema: novo campo opcional `acessoExpiraEm` em `membros`
(toca `convex/schema.ts` — arquivo sensível). Demais mudanças são em código.

## Permissões
- **Quem cria o acesso**: admin / secretaria (quem tem `membros:create` +
  `membros:update` para gerar o link).
- **Quem usa**: a pessoa externa, com role `ouvinte` → apenas `gravacoes:read`.
- **O que o ouvinte vê na UI**: somente o item "Gravações/Ouvir" na navegação
  (demais itens já filtram por `can(permission)` em `AppSidebar`, então caem fora
  naturalmente). Home deve redirecioná-lo para `/gravacoes`.

## Fluxo de uso
1. Admin abre tela de criação de ouvinte → informa **nome + WhatsApp** (CPF
   opcional/ausente).
2. Backend cria atomicamente `entidade` (PF, `status: ATIVO`) + `membro`
   (`role: "ouvinte"`).
3. Admin gera link de acesso (`acesso.gerarLink`) → `/ativar/<token>` (7 dias).
4. Pessoa abre o link, cria senha (Password provider), `concluirAtivacao`
   vincula `userId`.
5. `getUserPermissionContext` retorna contexto com role `ouvinte` (status ATIVO
   passa no gate). Pessoa acessa só `/gravacoes`.

> `gerarLink` exige telefone/WhatsApp cadastrado (`telefoneDoMembro`) e
> `status === "ATIVO"` — ambos garantidos no passo 2.

## Impacto em Shared
- [x] Toca arquivos sensíveis:
  - `convex/preferencias/rbacHelpers.ts` — novo role `ouvinte` (RISCO ALTO por
    convenção, mas mudança é aditiva e isolada).
  - `convex/membros/queries.ts` — **filtrar `role !== "ouvinte"`** em todas as
    listas do Rol/contagens.
  - `shared/constants/navigation.ts` / `AppSidebar.tsx` — garantir que ouvinte
    veja só Gravações (provavelmente já coberto por `can()`; validar).
  - `convex/membros/acesso.ts` — `concluirAtivacao` força `onboardingCompleto:
    false`. Decidir se ouvinte **pula onboarding** (recomendado: pular → vai
    direto pra `/gravacoes`).
- [x] Risco de regressão: **Rol de membros** + módulos que listam membros
  (pastoreio, pequenos-grupos, tarefas, cron de paradeiro). Ver **Auditoria de
  vazamento** abaixo — 11 pontos concretos a corrigir, 2 a preservar.

## Auditoria de vazamento (revisão pré-implementação)
Varredura do código real. O ouvinte é um registro `membros` real → vaza em todo
`ctx.db.query("membros")` que não filtre por role. **Estratégia robusta**: criar
helper central `excluirOuvintes(membros)` em `convex/membros/_helpers` e aplicá-lo
em toda listagem de Rol, + **teste de regressão** que falha se uma query de Rol
retornar ouvinte. Filtro espalhado sem helper é frágil — qualquer query nova
futura volta a vazar.

### DEVE excluir o ouvinte
| Local | Função | Linha |
|-------|--------|-------|
| `convex/membros/queries.ts` | `list()` | ~13 |
| `convex/membros/queries.ts` | `birthdaysThisMonth()` | ~122 |
| `convex/membros/queries.ts` | `birthdaysThisWeek()` | ~193 |
| `convex/membros/eclesiastico.ts` | `montarLinhasSecretario()` (tabela do Rol) | ~276 |
| `convex/membros/eclesiastico.ts` | `getResumoSecretario()` (contagens) | ~408 |
| `convex/membros/cadastroVivo.ts` | `getRegistryVitality()` (métricas) | ~38 |
| `convex/pastoreio/queries.ts` | `listMembrosResumo()` | ~330 |
| `convex/pequenos-grupos/queries.ts` | select de membros do PG | ~114 |
| `convex/cron/paradeiroIgnorado.ts` | `run()` (não marcar ouvinte) | ~21 |
| `features/tarefas/components/TarefaForm.tsx` | select de responsável (usa `membros.queries.list`) | ~46 |
| `convex/gravacoes/queries.ts` | filtro por `pregadorId` (ouvinte não é pregador) | ~21 |

> Mesmo módulos hoje **ocultos** (pastoreio, pequenos-grupos, tarefas — ver
> [[project_modulos_foco]]) devem ser corrigidos: a query existe e volta a vazar
> se o módulo for reativado. Corrigir agora, não depois.

### NÃO deve excluir (necessário — não filtrar por engano)
| Local | Por quê |
|-------|---------|
| `convex/membros/queries.ts` `getByUserId()` (~226) | É como o próprio ouvinte se identifica no app |
| `convex/preferencias/rbac.ts` `getUserPermissionContext()` (~251) | Carrega o contexto do próprio ouvinte logado |

### Avaliar (decisão de produto, não bug)
- `convex/membros/acesso.ts` `getAcessosOverview()` (~337) — visão de "acessos"
  pode legitimamente querer mostrar ouvintes; decidir se conta junto ou em seção
  separada.
- `convex/preferencias/rbac.ts` `getAllMembrosWithPermissions()` (~355) — matriz
  admin de permissões; admin talvez queira gerenciar o ouvinte ali.
- `convex/debug.ts` (~36) — ferramenta de debug admin; baixa prioridade.

## Riscos
- **Vazamento no Rol** (principal): mitigar com helper central + teste de
  regressão (ver auditoria acima). 11 pontos a corrigir, 2 a preservar.
- **Onboarding obrigatório**: `concluirAtivacao` força `onboardingCompleto: false`
  (`convex/membros/acesso.ts:212`, confirmado) → ouvinte cairia no wizard
  `/bem-vindo` pedindo dados de membro. Bypass: se role `ouvinte`, marcar
  `onboardingCompleto: true` na ativação.
- **Redirect pós-login** (confirmado): `middleware.ts:~57` manda todo autenticado
  para `/dashboard`, sem checar permissão no servidor. Ouvinte não tem permissão
  de dashboard. Mitigar: redirecionar ouvinte → `/gravacoes` (no middleware via
  role, ou no próprio `/dashboard` com fallback gracioso). Garantir que nenhuma
  query do dashboard exploda para quem não tem `membros:read`.
- **Expiração**: `getUserPermissionContext` (`rbac.ts:265` nega se status≠ATIVO)
  precisa também negar quando `acessoExpiraEm < now`. Backend (query/mutation
  Convex) pode ler o relógio do servidor normalmente.
- **Escalonamento de permissão**: `ouvinte` só `gravacoes:read` — sem wildcard,
  sem `membros:*`. Validar no teste de RBAC.
- **Schema**: `membros.role` é `v.string()` aberto (não union) → adicionar
  `"ouvinte"` não quebra o schema; só o union TS em `types/auth.ts` precisa
  incluir. `acessoExpiraEm` é `v.optional` → aditivo, sem migração de dados.
- **Navegação**: confirmado que todos os itens de `navigation.ts` têm
  `permission`/`modulo` → ouvinte com só `gravacoes:read` vê apenas Gravações.
  Sem item órfão sem permission. (Baixo risco, só validar.)

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | Modificar | Campo `acessoExpiraEm: v.optional(v.number())` em `membros` |
| `convex/preferencias/rbacHelpers.ts` | Modificar | Adicionar `ouvinte: ["gravacoes:read"]` em `INITIAL_ROLE_PERMISSIONS` |
| `convex/preferencias/rbac.ts` | Modificar | `getUserPermissionContext`: negar se `acessoExpiraEm` vencido |
| `types/auth.ts` | Modificar | Adicionar `"ouvinte"` ao union de roles |
| `convex/membros/ouvinte.ts` | Criar | Mutations `criarOuvinte` (entidade+membro atômico, role ouvinte, `acessoExpiraEm`) e `renovarAcessoOuvinte` |
| `convex/membros/_helpers.ts` (ou existente) | Criar/Modificar | Helper central `excluirOuvintes()` reusado em todas as listagens de Rol |
| `convex/membros/queries.ts` | Modificar | `list`, `birthdaysThisMonth`, `birthdaysThisWeek` → `excluirOuvintes()` |
| `convex/membros/eclesiastico.ts` | Modificar | `montarLinhasSecretario`, `getResumoSecretario` → excluir ouvinte |
| `convex/membros/cadastroVivo.ts` | Modificar | `getRegistryVitality` → excluir ouvinte |
| `convex/pastoreio/queries.ts` | Modificar | `listMembrosResumo` → excluir ouvinte |
| `convex/pequenos-grupos/queries.ts` | Modificar | select de membros → excluir ouvinte |
| `convex/cron/paradeiroIgnorado.ts` | Modificar | não marcar ouvinte como paradeiro |
| `convex/gravacoes/queries.ts` | Verificar | filtro `pregadorId` não deve aceitar ouvinte |
| `convex/membros/acesso.ts` | Modificar | `concluirAtivacao`: `onboardingCompleto: true` se role `ouvinte` |
| `middleware.ts` | Modificar | Redirecionar ouvinte → `/gravacoes` (em vez de `/dashboard`) |
| `app/(ready)/dashboard/...` | Verificar | Fallback gracioso se ouvinte cair no dashboard (queries não explodem) |
| UI admin (tela de gestão de acessos) | Criar | Form "Conceder acesso a ouvinte" + gerar link + renovar + indicador de validade (reusa `gerarLink`) |
| `convex/crons.ts` (ou messaging) | Criar/Modificar | Aviso de expiração 15 dias antes do vencimento (admin e/ou ouvinte) |
| `convex/membros/__tests__/ouvinte.test.ts` | Criar | Teste de regressão: ouvinte fora do Rol/contagens; ouvinte só `gravacoes:read`; gate de expiração |
| `shared/components/layout/DevContext.tsx` | Modificar | Registrar a nova página (regra do projeto) |

## Ordem de Implementação
1. **Schema + RBAC**: campo `acessoExpiraEm` em `membros`; role `ouvinte`
   (`rbacHelpers.ts` + `types/auth.ts`).
2. **Gate de expiração**: `getUserPermissionContext` nega ouvinte vencido.
3. **Backend criação/renovação**: `criarOuvinte` + `renovarAcessoOuvinte`.
4. **Helper + filtros de exclusão**: `excluirOuvintes()` aplicado nos 11 pontos da
   auditoria + teste de regressão "ouvinte fora do Rol".
5. **Onboarding/redirect**: `onboardingCompleto: true` na ativação do ouvinte;
   `middleware.ts` redireciona ouvinte → `/gravacoes`; dashboard com fallback.
6. **UI admin**: tela/form para conceder acesso + gerar link + renovar +
   indicador de validade.
7. **Aviso de expiração**: cron diário que dispara aviso 15 dias antes do
   vencimento.
8. **DevContext + lint + testes**.
9. Verificação visual mobile da tela de criação (regra `mobile-ux`).

## Decisões respondidas
- **Validade**: expira na **virada do ano** (todo início de ano o admin renova).
  `acessoExpiraEm` = 31/12 23:59 do ano corrente.
- **CPF**: ouvinte criado **sem CPF**; acesso só via link gerado pelo admin.
- **Role na UI**: "Ouvinte" (slug `ouvinte`).
- **Aviso**: **15 dias antes** do vencimento (cron + canal WhatsApp/UI).

## Perguntas em aberto
Nenhuma — escopo fechado.
