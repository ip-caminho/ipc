# Plano: Turmas + Inscricoes — MVP

## Contexto

Sistema para gerenciar turmas de estudo (novos membros, cursos, seminarios) com inscricao via link publico. Membros cadastrados tem dados pre-preenchidos; nao-membros preenchem manualmente.

**Escopo MVP**: Apenas turmas. Sem integracao com eventos (v2). Formulario simplificado (campos fixos + campos texto livre). Auth via redirect para /signin (sem OTP inline).

**Por que nao reusar PGs?** PGs sao permanentes e so aceitam membros. Turmas sao temporais, com enrollment e suporte a nao-membros.

---

## 1. Schema (5 tabelas novas)

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

**Edicao bloqueada**: campos do sistema e perguntas extras nao podem ser editados apos a primeira inscricao (evita orfanizar respostas existentes).

### `inscricoes` — Registros
```
turmaId                 # ref turmas (obrigatorio no MVP, sem eventoId)
membroId?               # ref membros (se autenticado)
dadosSistema            # { nomeCompleto, whatsapp?, email?, dataNascimento?, sexo? }
                        # WhatsApp normalizado para E.164 (+5511999991111) antes de salvar
                        # SEM CPF — dado sensivel desnecessario para inscricao
respostasExtras?        # [{perguntaId, valor}] — respostas das perguntas extras
status                  # CONFIRMADA | CANCELADA | LISTA_ESPERA
lgpdConsentimento       # boolean — obrigatorio true no form publico
criadoEm
canceladoEm?            # timestamp do cancelamento
indexes: by_turma, by_membro, by_turma_status
```

### `turmaEncontros` — Encontros/aulas
```
turmaId                 # ref turmas
data                    # YYYY-MM-DD
titulo?                 # "Aula 1 - Introducao" (opcional)
observacoes?
criadoPor?              # ref membros
criadoEm
index: by_turma
```

### `turmaPresencas` — Presenca por encontro
```
encontroId              # ref turmaEncontros
inscricaoId             # ref inscricoes
presente                # boolean
observacoes?
registradoPor?          # ref membros
index: by_encontro, by_inscricao
```

Fluxo:
- Admin/instrutor cria encontro (manual ou auto ao marcar presenca pela primeira vez)
- Tela de presenca: lista de inscritos CONFIRMADOS com toggle presente/ausente
- Resumo por inscrito: X/Y encontros (percentual de frequencia)
- Resumo por encontro: X/Y presentes

**Decisoes do MVP:**
- Auto-confirmacao (CONFIRMADA direto, LISTA_ESPERA se lotado)
- CPF removido — desnecessario para inscricao, evita risco de dados sensiveis
- `vagasOcupadas` na turma resolve race condition (incremento atomico na mutation)
- `respostasExtras` tipado como array de objetos (nao `v.any()`)
- WhatsApp normalizado para E.164 antes de dedup e armazenamento

### Maquina de estados — turma

```
ABERTA → EM_ANDAMENTO    (inicio das aulas)
ABERTA → CANCELADA        (cancelamento)
EM_ANDAMENTO → ENCERRADA  (conclusao)
EM_ANDAMENTO → CANCELADA  (cancelamento)
ENCERRADA → (final)       (nao reabrir)
CANCELADA → ABERTA        (reabrir, unica transicao reversa)
```

Apenas turmas com status ABERTA aceitam inscricoes.

### Cancelamento e vagas

- Ao cancelar inscricao: decrementar `vagasOcupadas` na turma
- Se ha inscricoes em LISTA_ESPERA: promover a mais antiga para CONFIRMADA automaticamente (incrementar `vagasOcupadas` de volta)
- Cancelamento self-service: apenas inscricoes com `membroId` (nao-membros pedem cancelamento ao admin)

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
- `convex/preferencias/rbac.ts` — ALL_PERMISSIONS + labels
- `convex/preferencias/rbacHelpers.ts` — defaults por role
- `types/auth.ts` — union type Permission

---

## 3. Backend

### `convex/turmas/queries.ts`
| Query | Auth | Descricao |
|-------|------|-----------|
| `listTipos(status?)` | required, `turmas:read` | Lista catalogo de tipos |
| `getTipoById(id)` | required, `turmas:read` | Detalhe de um tipo |
| `listTurmas(tipoId?, status?)` | required, `turmas:read` | Turmas com count inscritos |
| `getById(id)` | required, `turmas:read` | Detalhe com inscritos |
| `listInscricoes(turmaId, status?)` | required, `turmas:manage_inscricoes` | Inscricoes enriquecidas (dados pessoais so com permissao) |
| `getByToken(token)` | **publico** | Info turma + campos + vagas restantes. Nunca retorna dados de inscritos |
| `getMembroDataForPrefill()` | required | Dados da entidade do membro logado |
| `minhasInscricoes()` | required | Inscricoes ativas do membro logado |
| `listEncontros(turmaId)` | required, `turmas:read` | Encontros da turma com count presentes |
| `getPresencas(encontroId)` | required, `turmas:manage_inscricoes` | Lista inscritos com status presente/ausente |
| `getFrequenciaResumo(turmaId)` | required, `turmas:manage_inscricoes` | Resumo: % frequencia por inscrito |

### `convex/turmas/mutations.ts`
| Mutation | Permission | Descricao |
|----------|-----------|-----------|
| `createTipo` | `turmas:create` | CRUD tipo |
| `updateTipo` | `turmas:update` | |
| `removeTipo` | `turmas:delete` | Soft delete (INATIVO) |
| `create` | `turmas:create` | Cria turma + gera token + vagasOcupadas=0 |
| `update` | `turmas:update` | Atualiza campos (bloqueia edicao de camposSistema/perguntasExtras se ja tem inscricoes) |
| `updateStatus` | `turmas:update` | Transicao de status (validar maquina de estados) |
| `duplicar` | `turmas:create` | Copia campos de turma existente para nova (com nome editavel) |

### `convex/turmas/inscricoes.ts`
| Mutation | Auth | Descricao |
|----------|------|-----------|
| `registrar(token, dadosSistema, respostasExtras?, lgpdConsentimento)` | **opcional** | Inscricao publica |
| `updateInscricao(id, dadosSistema)` | `turmas:manage_inscricoes` | Admin edita dados de inscricao |
| `updateInscricaoStatus(id, status)` | `turmas:manage_inscricoes` | Mudar status |
| `cancelarMinha(id)` | self-service | Membro cancela propria inscricao (apenas se tem membroId) |
| `exportCsv(turmaId)` | `turmas:manage_inscricoes` | Retorna dados formatados para CSV |

### `convex/turmas/encontros.ts`
| Mutation | Permission | Descricao |
|----------|-----------|-----------|
| `createEncontro(turmaId, data, titulo?)` | `turmas:manage_inscricoes` | Cria encontro |
| `updateEncontro(id, data?, titulo?, observacoes?)` | `turmas:manage_inscricoes` | Edita encontro |
| `removeEncontro(id)` | `turmas:manage_inscricoes` | Remove encontro + presencas |
| `salvarPresencas(encontroId, presencas[])` | `turmas:manage_inscricoes` | Batch upsert de presencas (array de {inscricaoId, presente}) |

**Detalhe do `registrar`** (correcoes criticas aplicadas):
1. Resolve token -> turma
2. Valida status === "ABERTA"
3. Valida `lgpdConsentimento === true`
4. **Normaliza WhatsApp** para E.164 (remove espacos, hifens, adiciona +55 se necessario)
5. Valida dados contra `camposSistema` e `perguntasExtras` da turma (nao aceita campos inesperados)
6. `getAuthUserId` opcional — se logado, busca membroId + verifica duplicata (membroId+turmaId unico)
7. Para nao-membros: dedup por WhatsApp normalizado + turmaId
8. **Incremento atomico de `vagasOcupadas`** via `ctx.db.patch(turmaId, { vagasOcupadas: turma.vagasOcupadas + 1 })`
   - Se `vagas` definido e `vagasOcupadas >= vagas`: status = LISTA_ESPERA (nao incrementa)
   - Convex serializa mutations por documento, entao o patch na turma e atomico
9. Insert inscricao + audit log

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
    TurmaDetalhe.tsx          # Detalhe com tabs (info, inscricoes, presenca, link)
    InscricoesList.tsx        # Lista de inscricoes com status badges + edicao inline
    InscricaoEditDialog.tsx   # Dialog para admin editar dados de inscricao
    ShareLinkDialog.tsx       # Dialog com link copiavel
    ExportCsvButton.tsx       # Botao export CSV
    EncontrosList.tsx         # Lista de encontros com count presentes
    PresencaSheet.tsx         # Tela de presenca: toggles por inscrito
    FrequenciaResumo.tsx      # Resumo de frequencia por inscrito (% + grafico simples)
  lib/
    constants.ts              # CAMPOS_SISTEMA_OPTIONS, STATUS_OPTIONS, DIA_SEMANA_OPTIONS, STATUS_TRANSITIONS
    validations.ts            # Zod schemas
    phoneUtils.ts             # normalizeWhatsApp (E.164)

features/inscricao/
  components/
    InscricaoPublicForm.tsx   # Formulario publico (campos fixos renderizados)
    InscricaoSuccess.tsx      # Tela de confirmacao
    JaInscrito.tsx            # Tela quando membro ja esta inscrito (dados + opcao cancelar)
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
- Lista com: nome, whatsapp, status badge, data, respostas extras
- Filtro por status (tabs ou select)
- Acao "Editar" por inscricao (abre dialog com dados editaveis)
- Botao "Exportar CSV" no topo
- Sem paginacao no MVP (turmas de igreja raramente passam de 50 inscritos)

### Pagina publica: `/inscricao/[token]`
- Layout `(auth)` — centralizado, sem sidebar, **mobile-first**
- Header: nome da turma, tipo, datas, horario, local, descricao
- Vagas: mostrar quantidade restante apenas quando < 5 vagas
- Banner: "Ja tem cadastro no sistema da IPC? [Fazer login] para agilizar" -> redirect para `/signin?returnUrl=/inscricao/[token]`
- Apos login, volta para a pagina. `useConvexAuth()` detecta sessao -> query `getMembroDataForPrefill` -> pre-fill campos sistema como read-only
- **Ja inscrito**: se membro logado ja tem inscricao nesta turma, mostrar `JaInscrito` (dados + opcao cancelar) em vez do form
- Se nao logado: todos os campos editaveis
- Checkbox LGPD: "Concordo com o uso dos meus dados para gestao desta turma" (obrigatorio)
- Submit -> `registrar` mutation
- Sucesso: `InscricaoSuccess` com resumo (nome da turma, dados preenchidos, status)
  - Se LISTA_ESPERA: mensagem clara "Voce esta na lista de espera. Entraremos em contato quando houver vaga."

**Redirect auth** (simples, sem risco):
- Middleware ja existe e nao bloqueia `/inscricao/[token]` (rota sob (auth))
- Apos signin, `router.push(returnUrl)` volta para a pagina de inscricao
- `ConvexAuthNextjsProvider` esta no root layout, entao auth funciona em toda a app

**Referencia**: `app/(auth)/convite/[token]/page.tsx`

### Minhas inscricoes
- Secao no perfil do membro (`/meu-perfil`) ou card no dashboard
- Lista inscricoes ativas com: nome da turma, data, status, botao "Cancelar"
- Query: `minhasInscricoes()`

---

## 5. Modulo + Sidebar + DevContext

- Seed: `{ slug: "turmas", label: "Turmas", descricao: "Turmas e cursos", ativo: false, ordem: 13 }`
- Sidebar secao **Comunidade**: "Turmas" com icone `GraduationCap`, permissao `turmas:read`, modulo `turmas`
- Admin sidebar secao **Gestao**: "Tipos de Turma"
- DevContext: entradas para `/turmas`, `/turmas/[id]`, `/admin/turmas`, `/inscricao/[token]`
- `resolveRoute()`: patterns `/turmas/[id]`, `/inscricao/[id]`

**Arquivos**:
- `convex/modulos/mutations.ts` — seed
- `shared/components/layout/AppSidebar.tsx` — menu secao Comunidade
- `shared/components/layout/MobileTabBar.tsx` — drawerSections
- `shared/components/layout/DevContext.tsx` — contexto

---

## 6. Fases de Implementacao

### Fase 1: Schema + Backend
1. Tabelas em `convex/schema.ts` (tiposTurma, turmas, inscricoes, turmaEncontros, turmaPresencas)
2. RBAC em `rbac.ts`, `rbacHelpers.ts`, `types/auth.ts`
3. `convex/turmas/queries.ts` + `mutations.ts` + `inscricoes.ts` + `encontros.ts`
4. Seed do modulo

### Fase 2: Frontend Admin + Turmas
5. `features/turmas/lib/constants.ts` + `validations.ts` + `phoneUtils.ts`
6. `TipoTurmaForm.tsx` + `TipoTurmaList.tsx` -> pagina admin
7. `TurmaForm.tsx` + `TurmaCard.tsx` -> pagina turmas
8. `TurmaDetalhe.tsx` com tabs + `InscricoesList.tsx` + `InscricaoEditDialog.tsx` + `ShareLinkDialog.tsx` + `ExportCsvButton.tsx`

### Fase 3: Inscricao Publica
9. `InscricaoPublicForm.tsx` + `InscricaoSuccess.tsx` + `JaInscrito.tsx`
10. `app/(auth)/inscricao/[token]/page.tsx` com redirect auth + LGPD
11. Sidebar + DevContext + Minhas inscricoes

### Fase 4: Presenca
12. `EncontrosList.tsx` + `PresencaSheet.tsx` + `FrequenciaResumo.tsx`
13. Tab "Presenca" no `TurmaDetalhe` — criar encontro, marcar presenca, ver resumo

---

## 7. Verificacao

- [ ] Criar tipo de turma, criar turma com campos sistema + perguntas extras
- [ ] Gerar link, abrir em aba anonima, preencher e submeter
- [ ] Verificar dedup por WhatsApp normalizado (rejeitar segunda inscricao)
- [ ] Logar como membro, abrir link, verificar pre-fill dos dados
- [ ] Logar como membro ja inscrito, verificar tela "Ja inscrito"
- [ ] Verificar controle de vagas atomico (LISTA_ESPERA quando lotado)
- [ ] Cancelar inscricao e verificar que vaga e liberada + LISTA_ESPERA promovido
- [ ] Admin edita dados de inscricao individual
- [ ] Export CSV funciona
- [ ] Gerenciar inscricoes (visualizar dados, mudar status)
- [ ] Duplicar turma existente
- [ ] Verificar transicoes de status da turma (maquina de estados)
- [ ] Verificar permissoes RBAC (membro nao pode criar/gerenciar)
- [ ] Verificar que getByToken nao retorna dados de inscritos
- [ ] Checkbox LGPD obrigatorio
- [ ] Cancelamento self-service so funciona com membroId
- [ ] ModuloGuard funciona quando modulo desativado
- [ ] Token rejeitado quando turma.status != ABERTA
- [ ] Mobile-first na pagina publica
- [ ] Criar encontro e marcar presenca
- [ ] Verificar resumo de frequencia por inscrito (X/Y encontros)
- [ ] Remover encontro remove presencas associadas

---

## Arquivos criticos (danger zones)
- `convex/schema.ts` — 5 tabelas novas
- `convex/preferencias/rbac.ts` — novas permissoes
- `convex/preferencias/rbacHelpers.ts` — defaults por role
- `types/auth.ts` — union type

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
- [ ] Notificacao WhatsApp apos inscricao
- [ ] Rate limiting no endpoint publico
