# Membros (/membros)

## Visao Geral

O modulo de Membros e o nucleo do sistema IPC. Ele gerencia o cadastro completo de membros da igreja, incluindo dados pessoais, eclesiasticos, contato e endereco. A arquitetura segue o padrao de **criacao atomica**: cada membro e composto por duas entidades no banco — uma `entidade` (pessoa fisica com dados civis) e um `membro` (extensao com dados eclesiasticos e vinculo ao sistema de auth/RBAC).

O modulo suporta tres fluxos distintos de entrada de membros:
1. **Criacao administrativa** — admin/secretaria cadastra pelo formulario (`/membros/novo`)
2. **Convite por token** — gera link com token de 24h, membro preenche seus dados ao aceitar
3. **Bootstrap** — primeiro usuario do sistema cria a si mesmo como admin (setup inicial)

O acesso as paginas e protegido pelo `ModuloGuard` (verifica se o modulo "membros" esta ativo) e pelo `PermissionGate` (verifica permissoes RBAC por acao).

---

## Arquivos

### Paginas

| Arquivo | Rota | Descricao |
|---------|------|-----------|
| `app/(ready)/membros/page.tsx` | `/membros` | Listagem de membros com busca por nome/telefone |
| `app/(ready)/membros/novo/page.tsx` | `/membros/novo` | Formulario de criacao de novo membro |
| `app/(ready)/membros/[id]/page.tsx` | `/membros/:id` | Formulario de edicao de membro existente |

#### `/membros` — Listagem

- Usa `useQuery(api.membros.queries.list)` com busca debounced (300ms)
- Parametro `search` filtra por nome ou WhatsApp
- Exibe `Skeleton` durante carregamento (5 linhas)
- Botao "Novo Membro" protegido por `PermissionGate` com `membros:create`
- Toda a pagina envolvida por `ModuloGuard modulo="membros"`

#### `/membros/novo` — Criacao

- Chama `api.membros.mutations.create` com todos os campos do formulario
- Endereco e montado como objeto apenas se `logradouro` ou `cidade` foram preenchidos (evita salvar endereco vazio)
- Role padrao: `"membro"`
- Apos sucesso: toast de sucesso + redirect para `/membros`
- Apos erro: toast de erro com mensagem do backend

#### `/membros/:id` — Edicao

- Carrega membro via `api.membros.queries.getById`
- Monta `defaultValues` a partir dos dados da `entidade` e do `membro`
- Na submissao, separa os dados em `entidadeData` e `membroData` e chama `api.membros.mutations.update`
- Passa `isEditing={true}` e `entityId` para o `MembroForm`
- Exibe "Membro nao encontrado" se o ID nao existe

### Componentes

| Arquivo | Descricao |
|---------|-----------|
| `features/membros/components/MembroForm.tsx` | Formulario completo de membro (criacao e edicao) |
| `features/membros/components/MembroTable.tsx` | Tabela de listagem com TanStack Table |
| `shared/components/MembroProfilePopover.tsx` | Popover com perfil publico resumido do membro |

#### `MembroForm`

Formulario reutilizavel para criacao e edicao de membros. Props:

```typescript
interface MembroFormProps {
  defaultValues?: Partial<MembroFormValues>;
  onSubmit: (data: MembroFormValues) => Promise<void>;
  isEditing?: boolean;
  entityId?: string;
}
```

**Estrutura do formulario** — dividido em 4 secoes colapsaveis (`Collapsible`):

1. **Dados Pessoais** (aberta por padrao)
   - Foto (componente `PhotoUpload` com upload para B2 na pasta `membros/fotos`)
   - Nome Completo (obrigatorio, min 3 caracteres)
   - Apelido, CPF, RG, Data de Nascimento
   - Sexo, Estado Civil, Nacionalidade
   - Nome do Pai, Nome da Mae
   - Profissao, Formacao

2. **Contato** (aberta por padrao)
   - WhatsApp, Telefone, Email

3. **Endereco** (fechada por padrao)
   - Logradouro, Numero, Complemento, Bairro, Cidade, Estado, CEP

4. **Dados Eclesiasticos** (fechada por padrao)
   - Perfil no Sistema (role), Numero do Rol, Data da Membresia
   - Forma de Admissao, Cargo Eclesiastico
   - Data de Conversao, Data de Batismo
   - Igreja de Procedencia, CBCM

**Detalhes tecnicos:**
- Usa React Hook Form com `zodResolver` para validacao via `membroFormSchema`
- Gera UUID temporario (`crypto.randomUUID()`) para upload de foto quando e criacao (sem `entityId`)
- Helpers internos `Field` (input text) e `SelectField` (select com options) para DRY
- Componente `Section` com `Collapsible` para organizar as secoes
- Layout responsivo: grid de 1-3 colunas (`sm:grid-cols-2 lg:grid-cols-3`)

#### `MembroTable`

Tabela de listagem usando TanStack Table v8. Colunas:

| Coluna | Accessor | Descricao |
|--------|----------|-----------|
| Nome | `entidade.nomeCompleto` | Texto em negrito |
| WhatsApp | `entidade.whatsapp` | Telefone de contato |
| Cargo | `cargoEclesiastico` | Label traduzida via `CARGO_ECLESIASTICO_OPTIONS` |
| Rol | `rol` | Numero do rol de membros |
| Status | `entidade.status` | Badge colorida via `STATUS_COLORS` |
| Acoes | — | Botao de edicao (icone Pencil) que redireciona para `/membros/:id` |

Interface de dados esperada:

```typescript
interface MembroRow {
  _id: string;
  entidade: {
    _id: string;
    nomeCompleto?: string;
    whatsapp?: string;
    status: string;
    dataNascimento?: string;
  };
  cargoEclesiastico?: string;
  role: string;
  rol?: string;
}
```

#### `MembroProfilePopover`

Componente compartilhado usado em outros modulos (ex: escalas, pequenos grupos) para exibir um popover com perfil resumido ao clicar no nome de um membro. Usa a query `getPublicProfile` que retorna apenas dados publicos: nome, apelido, foto, WhatsApp, cargo eclesiastico, data de nascimento, profissao, bairro/cidade, data de membresia, nome do conjuge, filhos e nome do pequeno grupo.

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/membros/mutations.ts` | Mutations de CRUD (create, update, updateStatus) |
| `convex/membros/queries.ts` | Queries (list, getById, getPublicProfile, birthdays, getByUserId) |
| `convex/membros/selfService.ts` | Self-service: membro edita seu proprio perfil |
| `convex/membros/selfServiceHelpers.ts` | Helpers puros para filtragem de campos self-service |
| `convex/membros/convites.ts` | Sistema de convites por token |
| `convex/membros/bootstrap.ts` | Setup inicial do primeiro admin |

#### Mutations (`mutations.ts`)

**`create`** — Criacao atomica de entidade + membro
- Requer autenticacao (`getAuthUserId`)
- Cria registro em `entidades` (tipo PF, papel MEMBRO, status ATIVO) com todos os dados pessoais
- Cria registro em `membros` com dados eclesiasticos e `entidadeId`
- Role padrao: `"membro"`
- Gera audit log de acao `CREATE` na tabela `membros`
- Aceita campos opcionais de familia: `conjugeId` (referencia a `entidades`) e `filhos` (array de objetos)

**`update`** — Atualizacao separada de entidade e membro
- Recebe `id` do membro, `entidadeData` (opcional) e `membroData` (opcional)
- Para cada parte atualizada, faz snapshot antes/depois e gera audit logs de campo (`FIELD_CHANGE`)
- Usa `ctx.db.patch` para atualizacao parcial

**`updateStatus`** — Alteracao de status do membro
- Status validos: `ATIVO`, `INATIVO`, `TRANSFERIDO`, `FALECIDO`, `DESLIGADO`
- Altera o status na tabela `entidades` (nao no membro)
- Gera audit logs de campo para a mudanca

#### Queries (`queries.ts`)

**`list`** — Listagem com filtros
- Parametros opcionais: `search`, `cargoEclesiastico`, `status`
- Faz join manual: busca todos os membros, resolve a entidade de cada um via `ctx.db.get`
- Filtro de status padrao: apenas `ATIVO` (quando `status` nao e passado)
- Busca por `search`: filtra por `nomeCompleto` ou `whatsapp` (case-insensitive, substring match)

**`getById`** — Detalhe de um membro
- Retorna membro + entidade completa (join manual)
- Retorna `null` se nao encontrado

**`getPublicProfile`** — Perfil publico para popover
- Retorna dados limitados: nome, apelido, foto, WhatsApp, cargo, nascimento, profissao, bairro/cidade, data membresia
- Resolve nome do conjuge (se `conjugeId` existir e conjuge estiver ATIVO)
- Resolve nome do pequeno grupo (via tabela `pgMembros`)
- Retorna `null` se entidade nao existir ou nao estiver ATIVA

**`birthdaysThisMonth`** — Aniversariantes do mes
- Filtra membros ATIVOS com `dataNascimento` cujo mes coincide com o mes atual
- Ordena por dia do mes (crescente)

**`birthdaysThisWeek`** — Aniversariantes da semana
- Filtra membros ATIVOS com aniversario nos proximos 6 dias
- Usado no dashboard da pagina inicial

**`getByUserId`** — Busca membro pelo userId autenticado
- Usado pelo sistema de auth para resolver o membro logado
- Busca pelo index `by_user_id`

#### Self-Service (`selfService.ts` + `selfServiceHelpers.ts`)

**`getMyProfile`** — Query que retorna o perfil do membro logado (membro + entidade)

**`updateMyProfile`** — Mutation para o membro editar seu proprio perfil
- Verificacao de ownership: `membro.userId === userId`
- Filtra campos via `filterSelfServiceFields` — apenas 6 campos sao permitidos:
  - `telefone`, `email`, `endereco`, `profissao`, `formacao`, `foto`
- Campos bloqueados (nao editaveis pelo membro): `cpf`, `rg`, `nomeCompleto`, `role`, `permissions`, `status`, `dataNascimento`
- Gera audit log das mudancas

#### Convites (`convites.ts`)

**`generateInvite`** — Gera token de convite
- Token: 32 bytes aleatorios (64 caracteres hex)
- Validade: 24 horas
- Registra quem criou (`criadoPor`) e role padrao (`"membro"`)

**`getByToken`** — Consulta convite por token
- Retorna `{ ...convite, expired: true/false }`
- Expired se status != PENDENTE ou se `expiraEm < Date.now()`

**`acceptInvite`** — Aceita convite e cria membro
- Valida token (existencia, status PENDENTE, nao expirado)
- Cria entidade + membro atomicamente (mesma logica do `create`)
- Marca convite como ACEITO e salva dados preenchidos

#### Bootstrap (`bootstrap.ts`)

**`bootstrapAdmin`** — Criacao do primeiro admin
- So funciona se nao existir nenhum membro no banco
- Cria entidade + membro com `role: "admin"` e vincula ao `userId` logado
- Faz seed das permissoes de roles (admin, secretaria, membro) na tabela `rolePermissions`

### Validacoes e Constantes

#### `features/membros/lib/validations.ts`

Schema Zod 4 do formulario de membro (`membroFormSchema`):

- **Campo obrigatorio**: `nomeCompleto` (min 3 caracteres)
- **Todos os demais campos sao opcionais**
- **Enums validados**:
  - `sexo`: `"M"` | `"F"`
  - `estadoCivil`: `"SOLTEIRO"` | `"CASADO"` | `"DIVORCIADO"` | `"VIUVO"` | `"UNIAO_ESTAVEL"`
  - `formacao`: `"FUNDAMENTAL"` | `"MEDIO"` | `"SUPERIOR"` | `"POS_GRADUACAO"` | `"MESTRADO"` | `"DOUTORADO"`
  - `formaAdmissao`: `"BATISMO"` | `"PROFISSAO_FE"` | `"TRANSFERENCIA"` | `"JURISDICAO"`
  - `cargoEclesiastico`: `"MEMBRO_COMUNGANTE"` | `"MEMBRO_NAO_COMUNGANTE"` | `"DIACONO"` | `"PRESBITERO"` | `"PASTOR"`
  - `cbcm`: `"NAO_INICIADO"` | `"CURSANDO"` | `"CONCLUIDO"`
- **Email**: aceita string vazia (campo limpo) ou email valido (`z.email().optional().or(z.literal(""))`)
- **Tipo exportado**: `MembroFormValues = z.infer<typeof membroFormSchema>`

#### `features/membros/lib/constants.ts`

Constantes de opcoes para selects e mapeamentos visuais:

| Constante | Descricao |
|-----------|-----------|
| `STATUS_OPTIONS` | Status da entidade: ATIVO, INATIVO, TRANSFERIDO, FALECIDO, DESLIGADO |
| `CARGO_ECLESIASTICO_OPTIONS` | Membro Comungante, Nao Comungante, Diacono, Presbitero, Pastor |
| `FORMA_ADMISSAO_OPTIONS` | Batismo, Profissao de Fe, Transferencia, Jurisdicao |
| `SEXO_OPTIONS` | Masculino (M), Feminino (F) |
| `ESTADO_CIVIL_OPTIONS` | Solteiro, Casado, Divorciado, Viuvo, Uniao Estavel |
| `FORMACAO_OPTIONS` | Fundamental, Medio, Superior, Pos-Graduacao, Mestrado, Doutorado |
| `PAPEL_OPTIONS` | Papeis da entidade: Membro, Visitante, Contato, Fornecedor, Igreja Parceira |
| `ROLE_OPTIONS` | Perfis no sistema: Administrador, Secretaria, Membro |
| `CBCM_OPTIONS` | Curso Basico de Conhecimento Ministerial: Nao Iniciado, Cursando, Concluido |
| `STATUS_COLORS` | Mapeamento de status para classes CSS de cores (Badge) |

---

## Funcionalidades

### 1. CRUD Completo de Membros
- **Criar**: admin/secretaria cadastra membro pelo formulario com dados pessoais, contato, endereco e dados eclesiasticos
- **Listar**: tabela com busca por nome/WhatsApp, filtro padrao por status ATIVO
- **Editar**: formulario pre-preenchido com dados atuais do membro
- **Alterar status**: mutation dedicada para mudar status (ATIVO/INATIVO/TRANSFERIDO/FALECIDO/DESLIGADO)

### 2. Criacao Atomica (Entidade + Membro)
Ao criar um membro, duas tabelas sao populadas na mesma mutation:
- `entidades`: dados civis (PF), contato, endereco, compliance
- `membros`: dados eclesiasticos, role, vinculo com auth

Isso garante consistencia — nao existe membro sem entidade.

### 3. Upload de Foto
- Componente `PhotoUpload` integrado ao formulario
- Upload direto para Backblaze B2 via presigned URL
- Pasta: `membros/fotos/{entityId}_{timestamp}`
- Na criacao, usa UUID temporario ate a entidade ser salva

### 4. Self-Service
Membros com permissao `membros:self_service` podem editar seus proprios dados, limitados a:
- Telefone, email, endereco, profissao, formacao, foto

Campos administrativos (CPF, RG, nome, role, status) sao bloqueados via `filterSelfServiceFields`.

### 5. Sistema de Convites
- Admin gera token de convite (valido por 24h)
- Pessoa acessa link com token e preenche dados minimos (nome, WhatsApp)
- Ao aceitar, entidade + membro sao criados atomicamente
- Convite marcado como ACEITO com dados preenchidos

### 6. Bootstrap do Primeiro Admin
- Ao acessar o sistema pela primeira vez (sem membros no banco)
- Usuario autenticado se auto-cadastra como admin
- Seed automatico das permissoes de roles

### 7. Aniversariantes
- `birthdaysThisMonth`: lista membros ativos com aniversario no mes corrente, ordenados por dia
- `birthdaysThisWeek`: lista membros ativos com aniversario nos proximos 6 dias
- Usado no dashboard principal

### 8. Perfil Publico (Popover)
- `getPublicProfile` retorna dados limitados para exibicao em outros modulos
- Resolve relacionamentos: conjuge (nome) e pequeno grupo (nome)
- Exibido via `MembroProfilePopover` (Avatar + Badge de cargo + WhatsApp)

### 9. Busca e Filtragem
- Busca client-side com debounce de 300ms (evita chamadas excessivas)
- Filtros disponiveis na query: `search`, `cargoEclesiastico`, `status`
- Filtro padrao: apenas membros ATIVOS

### 10. Auditoria Completa
- Criacao: audit log `CREATE` na tabela `membros`
- Edicao: audit log `FIELD_CHANGE` para cada campo alterado (entidade e membro)
- Status: audit log `FIELD_CHANGE` para mudanca de status
- Campos sensitiveis (CPF, RG) sao mascarados nos logs (ex: `***.456.789-**`)

---

## Permissoes

O modulo de membros usa 5 permissoes RBAC:

| Permissao | Descricao | Admin | Secretaria | Membro |
|-----------|-----------|-------|------------|--------|
| `membros:read` | Ver lista e detalhes de membros | * | Sim | Nao |
| `membros:create` | Criar novos membros | * | Sim | Nao |
| `membros:update` | Editar dados de membros | * | Sim | Nao |
| `membros:delete` | Excluir membros | * | Nao | Nao |
| `membros:self_service` | Editar proprio perfil (campos limitados) | * | Nao | Sim |

**Notas:**
- Admin tem permissao wildcard (`*`) — acesso total
- Secretaria tem read/create/update mas nao delete
- Membro so tem self-service (editar proprio perfil com campos restritos)
- Permissoes sao customizaveis por membro individual via painel de RBAC

### Verificacoes no Frontend

- **Pagina `/membros`**: envolvida por `ModuloGuard modulo="membros"` (redireciona para `/` se modulo desativado)
- **Botao "Novo Membro"**: protegido por `PermissionGate permission="membros:create"`
- **Tabela de edicao**: botao de editar visivel para todos (a protecao e na mutation do backend)

### Verificacoes no Backend

- Todas as mutations exigem autenticacao (`getAuthUserId`)
- `updateMyProfile` verifica ownership (`membro.userId === userId`)
- `filterSelfServiceFields` impede que o membro edite campos administrativos
- Convites: validacao de token + expiracao + status PENDENTE
- Bootstrap: so funciona se nao existir nenhum membro

---

## Dependencias entre Modulos

### Tabelas do Schema

O modulo Membros toca duas tabelas principais:
- **`entidades`** — tabela polimorfica base (PF/PJ). Indexes: `by_tipo`, `by_status`, `by_whatsapp`, `by_cpf`, `by_cnpj`
- **`membros`** — extensao com dados eclesiasticos e auth. Indexes: `by_entidade`, `by_user_id`, `by_role`

Tabelas auxiliares:
- **`membroConvites`** — tokens de convite. Indexes: `by_token`, `by_status`
- **`auditLogs`** — logs de auditoria (compartilhado com todos os modulos)
- **`rolePermissions`** — permissoes por role (compartilhado com RBAC)

### Modulos que Dependem de Membros

O `membroId` (tipo `Id<"membros">`) e referenciado em diversas tabelas de outros modulos:

| Modulo | Tabela | Campo | Descricao |
|--------|--------|-------|-----------|
| Gravacoes | `gravacoes` | `pregadorId` | Pregador da gravacao |
| Gravacoes | `gravacoes` | `iaProcessadoPor` | Quem processou com IA |
| Gravacoes | `comentariosGravacao` | `membroId` | Autor do comentario |
| Gravacoes | `reacoesGravacao` | `membroId` | Quem reagiu |
| Gravacoes | `escutasGravacao` | `membroId` | Quem escutou |
| Escalas | `cultoEscalas` | `membroId` | Membro escalado |
| Escalas | `equipeMembros` | `membroId` | Membro da equipe |
| Escalas | `indisponibilidades` | `membroId` | Indisponibilidade do membro |
| Pequenos Grupos | `pequenosGrupos` | `liderId`, `coliderId` | Lider/co-lider do PG |
| Pequenos Grupos | `pgMembros` | `membroId` | Membro do PG |
| Pastoreio | `visitasPastorais` | `membroId`, `visitanteId` | Visitado e visitante |
| Pastoreio | `anotacoesPastorais` | `membroId`, `autorId` | Alvo e autor da anotacao |
| Pedidos de Oracao | `pedidosOracao` | `membroId` | Quem pediu |
| Pedidos de Oracao | `pedidoOracaoComentarios` | `membroId` | Quem comentou |
| Pedidos de Oracao | `pedidoOracaoIntercessores` | `membroId` | Quem ora |
| Ministerios | `ministerioMembros` | `membroId` | Membro do ministerio |
| Ministerios | `ministerioEscalas` | `membros[].membroId` | Escalados no ministerio |
| Educacional | `criancaPerfil` | `ovelhinhaId` | Ovelhinha responsavel |
| Avisos | `avisos` | `criadoPor` | Quem criou o aviso |
| Notificacoes | `sysNotifications` | `destinatarioId` | Destinatario |
| Notificacoes | `sysNotificationReads` | `membroId` | Quem leu |
| Convites | `membroConvites` | `criadoPor` | Quem gerou o convite |

### Shared Files Tocados

- `convex/schema.ts` — define tabelas `entidades`, `membros`, `membroConvites`
- `convex/preferencias/rbac.ts` — permissoes `membros:*` e query `getUserPermissionContext`
- `convex/preferencias/rbacHelpers.ts` — defaults de permissoes por role
- `convex/_shared/auditHelpers.ts` — funcoes de auditoria usadas nas mutations
- `types/auth.ts` — tipos `Role`, `Permission`, `AuthContext`
- `shared/components/auth/PermissionGate.tsx` — gate de UI por permissao
- `shared/components/auth/ModuloGuard.tsx` — guard de modulo ativo
- `shared/components/MembroProfilePopover.tsx` — popover de perfil publico
- `shared/files/components/PhotoUpload.tsx` — upload de foto de membro

---

## Padroes de UI

### Componentes shadcn/ui Utilizados

- `Button` — acoes (criar, salvar, editar)
- `Input` — campos de texto
- `Label` — labels de campos
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — container do formulario
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — campos de selecao
- `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` — secoes colapsaveis do formulario
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` — tabela de listagem
- `Badge` — status do membro com cores
- `Skeleton` — loading states
- `Avatar`, `AvatarFallback`, `AvatarImage` — foto no popover
- `Popover`, `PopoverContent`, `PopoverTrigger` — popover de perfil

### Icones (Lucide)

- `Plus` — botao "Novo Membro"
- `Search` — icone na barra de busca
- `Pencil` — botao de editar na tabela
- `ChevronDown` — indicador de secao colapsavel
- `Phone` — icone de telefone no popover

### Padroes de Layout

- **Listagem**: header com titulo + botao de acao, barra de busca, tabela com loading skeleton
- **Formulario**: `max-w-4xl` com Card. Secoes colapsaveis em grid responsivo (1/2/3 colunas)
- **Loading**: `Skeleton` com dimensoes proporcionais ao conteudo final
- **Feedback**: toasts via Sonner (`toast.success`, `toast.error`)
- **Cores de status**: verde (ATIVO), cinza (INATIVO), azul (TRANSFERIDO), cinza escuro (FALECIDO), vermelho (DESLIGADO)

---

## Notas Tecnicas

### Modelo de Dados: Entidade + Membro

O sistema usa uma **tabela polimorfica `entidades`** que pode representar PF ou PJ. Membros sao uma extensao de entidades PF. Essa separacao permite:
- Reutilizar dados civis em outros contextos (ex: fornecedores, igrejas parceiras)
- Manter dados eclesiasticos e de auth separados dos dados civis
- Fazer join manual nas queries (nao ha join nativo no Convex)

### Join Manual nas Queries

O Convex nao suporta joins nativos. Todas as queries que precisam de dados da entidade fazem:
```typescript
const membros = await ctx.db.query("membros").collect();
const results = await Promise.all(
  membros.map(async (m) => {
    const entidade = await ctx.db.get(m.entidadeId);
    return entidade ? { ...m, entidade } : null;
  })
);
```
Isso e performatico para volumes moderados (centenas de membros) mas pode precisar de otimizacao (paginacao, indexes) para milhares.

### Filtragem no Backend vs Frontend

A busca por texto (`search`) e feita no backend apos o join — toda a tabela de membros e carregada, entidades resolvidas, e entao filtradas. A busca e case-insensitive e por substring. O debounce no frontend (300ms) reduz o numero de chamadas.

### Endereco como Objeto Aninhado

O endereco e armazenado como objeto no campo `endereco` da entidade:
```typescript
endereco: {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}
```
No formulario, os campos sao "flattened" (logradouro, numero, etc. como campos separados do form). A reconstrucao do objeto acontece nas paginas de criacao/edicao antes de enviar ao backend.

### UUID Temporario para Upload de Foto

Na criacao de novo membro, o `entityId` ainda nao existe. O `MembroForm` gera um UUID temporario via `crypto.randomUUID()` e o usa como identificador para o upload da foto. O `useRef` garante que o UUID persiste entre re-renders.

### Mascaramento de CPF/RG no Audit

O sistema de auditoria mascara automaticamente campos sensiveis nos logs:
- CPF: `***.456.789-**` (mostra apenas os digitos centrais)
- RG: `***34567**` (mascara inicio e fim)

Isso e feito pelo `maskSensitiveValue` em `auditHelpers.ts`.

### Testes

O modulo possui tres niveis de testes:

1. **Testes unitarios de validacao** (`features/membros/lib/__tests__/validations.test.ts`)
   - Valida schema minimo (apenas nome)
   - Rejeita nome curto e ausente
   - Valida todos os enums (sexo, estadoCivil, formacao, formaAdmissao, cargoEclesiastico)
   - Valida email (valido, vazio, invalido)

2. **Testes unitarios de self-service** (`convex/membros/__tests__/selfServiceHelpers.test.ts`)
   - Verifica campos permitidos e bloqueados
   - Testa filtragem de payloads mistos
   - Retorna null para payloads sem campos validos

3. **Testes de integracao** (`convex/membros/__tests__/mutations.integration.test.ts`)
   - Criacao atomica (entidade + membro na mesma mutation)
   - Role padrao "membro"
   - Audit log de criacao
   - Falha sem autenticacao
   - Update de entidade com audit logs
   - Update de membro
   - Alteracao de status

### Limitacoes Conhecidas

- **Sem paginacao**: a query `list` carrega todos os membros de uma vez. Funciona para igrejas de porte medio mas pode ser lento para igrejas com milhares de membros.
- **Sem validacao de CPF/CNPJ**: o schema aceita qualquer string para CPF e RG. Nao ha validacao de digitos verificadores.
- **Sem delete**: nao existe mutation de exclusao de membro. A inativacao e feita via `updateStatus`.
- **Join N+1**: cada membro na listagem gera uma consulta adicional para buscar a entidade. O Convex otimiza isso internamente mas e um ponto de atencao.
- **Filtro de status hardcoded**: quando nenhum status e passado, a query retorna apenas ATIVO. Nao ha UI para filtrar por outros status na listagem.
