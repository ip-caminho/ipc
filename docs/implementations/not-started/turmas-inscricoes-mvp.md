# Plano: Turmas + Inscricoes — MVP

## Contexto

Sistema para gerenciar turmas de estudo (novos membros, cursos, seminarios) com inscricao via link publico. Membros cadastrados tem dados pre-preenchidos; nao-membros preenchem manualmente.

**Escopo MVP**: Apenas turmas. Sem integracao com eventos (v2). Formulario simplificado (campos fixos + campos texto livre). Auth via redirect para /signin (sem OTP inline).

**Por que nao reusar PGs?** PGs sao permanentes e so aceitam membros. Turmas sao temporais, com enrollment e suporte a nao-membros.

---

## 1. Schema (3 tabelas novas)

### `tiposTurma` — Catalogo de tipos
```
nome                    # "Curso de Novos Membros"
descricao?
status                  # ATIVO | INATIVO
criadoEm
index: by_status
```
Sem template no MVP. Para recriar turma similar, usar **"Duplicar turma"** (copia campos de uma turma existente).

### `turmas` — Instancias
```
nome                    # "Novos Membros - Turma 1/2026"
tipoTurmaId             # ref tiposTurma
instrutorId?            # ref membros
instrutorNome?          # texto para instrutores externos
descricao?
dataInicio              # YYYY-MM-DD
dataFim?                # YYYY-MM-DD
diaSemana?              # "SEGUNDA".."DOMINGO"
horario?                # "19:30"
local?
vagas?                  # null = ilimitado
vagasOcupadas           # contador atomico (default 0) — resolve race condition
status                  # ABERTA | EM_ANDAMENTO | ENCERRADA | CANCELADA

# Formulario simplificado
camposSistema           # string[] — quais campos do sistema pedir (ex: ["whatsapp", "email"])
perguntasExtras?        # [{id, label, obrigatorio}] — campos texto livre adicionais

token?                  # token unico para link publico
criadoPor?              # ref membros
criadoEm
indexes: by_tipo, by_status, by_token
```

**Campos do sistema disponiveis** (constante frontend, mapeiam para entidade):
- `nomeCompleto` (sempre incluso, sempre obrigatorio)
- `whatsapp`, `email`, `cpf`, `dataNascimento`, `sexo`

**Perguntas extras**: apenas tipo TEXTO (input simples). Cada uma tem id (UUID), label, e flag obrigatorio. Suficiente para "igreja anterior", "como ficou sabendo", etc. Form builder completo fica para v2.

### `inscricoes` — Registros
```
turmaId                 # ref turmas (obrigatorio no MVP, sem eventoId)
membroId?               # ref membros (se autenticado)
dadosSistema            # { nomeCompleto, whatsapp?, email?, dataNascimento?, sexo? }
                        # SEM CPF — dado sensivel desnecessario para inscricao
respostasExtras?        # [{perguntaId, valor}] — respostas das perguntas extras
status                  # CONFIRMADA | CANCELADA | LISTA_ESPERA
criadoEm
indexes: by_turma, by_membro, by_turma_status
```

**Decisoes do MVP:**
- Auto-confirmacao (CONFIRMADA direto, LISTA_ESPERA se lotado)
- CPF removido — desnecessario para inscricao, evita risco de dados sensiveis
- `vagasOcupadas` na turma resolve race condition (incremento atomico na mutation)
- `respostasExtras` tipado como array de objetos (nao `v.any()`)

**Arquivo**: `convex/schema.ts`

---

## 2. RBAC

### Novas permissoes:
- `turmas:read`, `turmas:create`, `turmas:update`, `turmas:delete`, `turmas:manage_inscricoes`

### Distribuicao:
- **admin**: `*`
- **secretaria**: `turmas:read`, `turmas:create`, `turmas:update`, `turmas:manage_inscricoes`
- **membro**: `turmas:read`

### Arquivos:
- `convex/preferencias/rbac.ts`
- `convex/preferencias/rbacHelpers.ts`
- `types/auth.ts`

---

## 3. Backend

### `convex/turmas/queries.ts`
| Query | Auth | Descricao |
|-------|------|-----------|
| `listTipos(status?)` | required, `turmas:read` | Lista catalogo de tipos |
| `getTipoById(id)` | required, `turmas:read` | Detalhe de um tipo |
| `listTurmas(tipoId?, status?)` | required, `turmas:read` | Turmas com count inscritos |
| `getById(id)` | required, `turmas:read` | Detalhe com inscritos |
| `listInscricoes(turmaId, status?)` | required, `turmas:manage_inscricoes` | Inscricoes enriquecidas |
| `getByToken(token)` | **publico** | Info turma + campos + vagas restantes (vagas - vagasOcupadas) |
| `getMembroDataForPrefill()` | required | Dados da entidade do membro logado |

### `convex/turmas/mutations.ts`
| Mutation | Permission | Descricao |
|----------|-----------|-----------|
| `createTipo` | `turmas:create` | CRUD tipo |
| `updateTipo` | `turmas:update` | |
| `removeTipo` | `turmas:delete` | Soft delete (INATIVO) |
| `create` | `turmas:create` | Cria turma + gera token + vagasOcupadas=0 |
| `update` | `turmas:update` | Atualiza campos (bloqueia edicao de camposSistema/perguntasExtras se ja tem inscricoes) |
| `updateStatus` | `turmas:update` | Transicao de status |
| `duplicar` | `turmas:create` | Copia campos de turma existente para nova (com nome editavel) |

### `convex/turmas/inscricoes.ts`
| Mutation | Auth | Descricao |
|----------|------|-----------|
| `registrar(token, dadosSistema, respostasExtras?)` | **opcional** | Inscricao publica |
| `updateInscricaoStatus(id, status)` | `turmas:manage_inscricoes` | Mudar status |
| `cancelarMinha(id)` | self-service | Membro cancela propria inscricao |

**Detalhe do `registrar`** (correcoes criticas aplicadas):
1. Resolve token -> turma
2. Valida status === "ABERTA"
3. Valida dados contra `camposSistema` e `perguntasExtras` da turma (nao aceita campos inesperados)
4. `getAuthUserId` opcional — se logado, busca membroId + verifica duplicata (membroId+turmaId unico)
5. **Incremento atomico de `vagasOcupadas`** via `ctx.db.patch(turmaId, { vagasOcupadas: turma.vagasOcupadas + 1 })`
   - Se `vagas` definido e `vagasOcupadas >= vagas`: status = LISTA_ESPERA (nao incrementa)
   - Convex serializa mutations por documento, entao o patch na turma e atomico
6. Insert inscricao + audit log
7. Para nao-membros: dedup simples — rejeita se ja existe inscricao com mesmo `dadosSistema.whatsapp` + `turmaId`

**Token**: gerado com `crypto.getRandomValues(new Uint8Array(32))` (256 bits). Token so funciona quando turma.status === "ABERTA".

**Referencia**: `convex/membros/convites.ts`

---

## 4. Frontend

### Estrutura de arquivos
```
features/turmas/
  components/
    TipoTurmaForm.tsx        # Dialog CRUD tipo (simples: nome, descricao)
    TipoTurmaList.tsx         # Lista de tipos
    TurmaForm.tsx             # Form de turma (campos fixos + perguntasExtras builder simples)
    TurmaCard.tsx             # Card para grid
    TurmaDetalhe.tsx          # Detalhe com tabs (info, inscricoes, link)
    InscricoesList.tsx        # Lista simples de inscricoes com status badges
    ShareLinkDialog.tsx       # Dialog com link copiavel
  lib/
    constants.ts              # CAMPOS_SISTEMA_OPTIONS, STATUS_OPTIONS, DIA_SEMANA_OPTIONS
    validations.ts            # Zod schemas

features/inscricao/
  components/
    InscricaoPublicForm.tsx   # Formulario publico (campos fixos renderizados)
    InscricaoSuccess.tsx      # Tela de confirmacao
```

### Paginas
```
app/(ready)/turmas/page.tsx              # Grid de turmas + filtros por status
app/(ready)/turmas/[id]/page.tsx         # Detalhe (tabs: info, inscricoes, link)
app/(ready)/admin/turmas/page.tsx        # CRUD tipos de turma

app/(auth)/inscricao/[token]/page.tsx    # Pagina publica de inscricao
```

### `TurmaForm.tsx`
- Campos fixos: nome, tipoTurmaId (select), instrutorId/instrutorNome, dataInicio, dataFim, diaSemana, horario, local, vagas, descricao
- Secao "Campos do sistema": checkboxes dos CAMPOS_SISTEMA_OPTIONS (whatsapp, email, etc) + toggle obrigatorio. `nomeCompleto` sempre incluso.
- Secao "Perguntas extras": botao "Adicionar pergunta" -> input de label + toggle obrigatorio + botao remover. Apenas texto.
- Botao "Duplicar turma" no `TurmaDetalhe` abre `TurmaForm` pre-preenchido com dados da turma original (nome limpo)

### `InscricoesList.tsx`
- Lista simples (nao TanStack Table) — Card ou linhas com: nome, whatsapp, status badge, data
- Filtro por status (tabs ou select)
- Sem paginacao no MVP (turmas de igreja raramente passam de 50 inscritos)

### Pagina publica: `/inscricao/[token]`
- Layout `(auth)` — centralizado, sem sidebar
- Header: nome da turma, tipo, datas, horario, local, descricao, vagas restantes
- Banner: "Ja tem cadastro no sistema da IPC? [Fazer login] para agilizar" -> redirect para `/signin?returnUrl=/inscricao/[token]`
- Apos login, volta para a pagina. `useConvexAuth()` detecta sessao -> query `getMembroDataForPrefill` -> pre-fill campos sistema como read-only
- Se nao logado: todos os campos editaveis
- Submit -> `registrar` mutation
- Sucesso: `InscricaoSuccess` com resumo (nome da turma, dados preenchidos, status)

**Redirect auth** (simples, sem risco):
- Middleware ja existe e nao bloqueia `/inscricao/[token]` (rota sob (auth))
- Apos signin, `router.push(returnUrl)` volta para a pagina de inscricao
- `ConvexAuthNextjsProvider` esta no root layout, entao auth funciona em toda a app

**Referencia**: `app/(auth)/convite/[token]/page.tsx`

---

## 5. Modulo + Sidebar + DevContext

- Seed: `{ slug: "turmas", label: "Turmas", descricao: "Turmas e cursos", ativo: false, ordem: 13 }`
- Sidebar: "Turmas" com icone `GraduationCap`, permissao `turmas:read`, modulo `turmas`
- Admin sidebar: "Tipos de Turma" sob secao admin
- DevContext: entradas para `/turmas`, `/turmas/[id]`, `/admin/turmas`
- `resolveRoute()`: pattern `/turmas/[id]`

**Arquivos**:
- `convex/modulos/mutations.ts` — seed
- `shared/components/layout/AppSidebar.tsx` — menu
- `shared/components/layout/DevContext.tsx` — contexto

---

## 6. Fases de Implementacao

### Fase 1: Schema + Backend (~2 dias)
1. Tabelas em `convex/schema.ts` (tiposTurma, turmas, inscricoes)
2. RBAC em `rbac.ts`, `rbacHelpers.ts`, `types/auth.ts`
3. `convex/turmas/queries.ts` + `mutations.ts` + `inscricoes.ts`
4. Seed do modulo

### Fase 2: Frontend Admin + Turmas (~2 dias)
5. `features/turmas/lib/constants.ts` + `validations.ts`
6. `TipoTurmaForm.tsx` + `TipoTurmaList.tsx` -> pagina admin
7. `TurmaForm.tsx` + `TurmaCard.tsx` -> pagina turmas
8. `TurmaDetalhe.tsx` com tabs + `InscricoesList.tsx` + `ShareLinkDialog.tsx`

### Fase 3: Inscricao Publica (~1-2 dias)
9. `InscricaoPublicForm.tsx` + `InscricaoSuccess.tsx`
10. `app/(auth)/inscricao/[token]/page.tsx` com redirect auth
11. Sidebar + DevContext

---

## 7. Verificacao

- [ ] Criar tipo de turma, criar turma com campos sistema + perguntas extras
- [ ] Gerar link, abrir em aba anonima, preencher e submeter
- [ ] Verificar dedup por whatsapp (rejeitar segunda inscricao)
- [ ] Logar como membro, abrir link, verificar pre-fill dos dados
- [ ] Verificar controle de vagas atomico (LISTA_ESPERA quando lotado)
- [ ] Gerenciar inscricoes (visualizar dados, mudar status)
- [ ] Duplicar turma existente
- [ ] Verificar permissoes RBAC (membro nao pode criar/gerenciar)
- [ ] ModuloGuard funciona quando modulo desativado
- [ ] Token rejeitado quando turma.status != ABERTA

---

## Arquivos criticos (danger zones)
- `convex/schema.ts` — 3 tabelas novas
- `convex/preferencias/rbac.ts` — novas permissoes
- `convex/preferencias/rbacHelpers.ts` — defaults por role
- `types/auth.ts` — union type
- `shared/components/layout/AppSidebar.tsx` — menu
- `shared/components/layout/DevContext.tsx` — contexto dev

## Arquivos de referencia
- `convex/membros/convites.ts` — token, query publica, mutation atomica
- `app/(auth)/convite/[token]/page.tsx` — pagina publica sob layout (auth)
- `features/pequenosGrupos/components/PGForm.tsx` — form RHF + Zod + shadcn Dialog
- `app/(auth)/signin/page.tsx` — fluxo auth (returnUrl)

## v2 (fora do escopo MVP)
- [ ] Integracao com eventos do calendario
- [ ] Form builder completo (tipos: SELECAO, MULTIPLA_ESCOLHA, NUMERO, DATA, BOOLEANO)
- [ ] Templates em tiposTurma (formulario + defaults)
- [ ] OTP inline na pagina de inscricao
- [ ] Export CSV
- [ ] Notificacao WhatsApp apos inscricao
