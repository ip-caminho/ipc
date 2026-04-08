# Ministérios & Educacional IPC

## Escopo

Arquitetura centralizada para gestão de ministérios da igreja (Educacional, Louvor, Som, Hospitalidade, etc.). Substitui o Notion do ministério infantil e prepara infraestrutura para qualquer ministério usar escalas, calendário e gestão de membros.

**Princípios:**
- Toda pessoa é `crmEntidades` — membro comungante, não comungante (criança batizada) ou visitante
- CBCM e antecedentes criminais são atributos da pessoa (todo voluntário precisa)
- Ministérios são configuráveis, escalas e calendário são compartilhados
- Dados específicos do educacional infantil (turma, obs médicas) ficam em tabela satélite

## Dados do Notion (primeiro consumidor — Educacional Infantil)

| Entidade | Registros | Campos principais |
|----------|-----------|-------------------|
| Crianças | 55 | nome, turma, idade, nascimento, pais, ovelhinhas (mentor), uso de imagem LGPD, obs. médicas |
| Voluntários | 35 | nome, email, telefone, turma(s), papel (Prof/Aux/Apoio), treinamento CBCM, antecedentes criminais |
| Escalas | ~4 por turma/sem | professor, auxiliar, data |
| Relatórios | ~18 por turma/sem | lição, data, tema, texto bíblico, crianças presentes, professores, história, aplicação, memorização, observações |
| Calendário | ~17/ano | atividade, data, mês, descrição |

---

## Arquitetura Integrada

```
┌─────────────────────────────────────────────────────────────┐
│  PESSOAS (crmEntidades — centralizado)                      │
│                                                             │
│  Papéis existentes: CLIENTE, LEAD, FORNECEDOR, ...          │
│  Papéis novos:                                              │
│    MEMBRO ─────────── adulto membro comungante              │
│    MEMBRO_NC ──────── criança/jovem não comungante          │
│    VISITANTE ──────── qualquer pessoa não membro            │
│                                                             │
│  Campos novos (opcionais, relevantes para membros):         │
│    cbcm ───────────── status treinamento voluntário         │
│    atestadoAntecedentes ── arquivo antecedentes criminais   │
│                                                             │
│  Tabela satélite:                                           │
│    criancaPerfil ──── dados específicos do contexto infantil │
│      turma, maeId, paiId, ovelhinhaId, usoImagem,          │
│      observacoesMedicas, mudancaTurma                       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  MINISTÉRIOS (compartilhado)                                │
│                                                             │
│  ministerios ───── Educacional Infantil, Louvor, Som, ...   │
│       │            papéis configuráveis por ministério       │
│       │            subgrupos configuráveis (turma, naipe)    │
│       │                                                     │
│       └── ministerioMembros (vínculo N:N)                   │
│            membroId → crmEntidades                          │
│            ministerioId → ministerios                       │
│            papel: "professor" | "auxiliar" | "lider" | ...  │
│            subgrupo: "3-4" | "soprano" | ...                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ESCALAS (compartilhado)                                    │
│                                                             │
│  escalas ────────── qualquer ministério, qualquer data      │
│       ministerioId, data, membros[], subgrupo               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  CALENDÁRIO (compartilhado)                                 │
│                                                             │
│  calendarioEventos ── eventos de qualquer ministério        │
│       ministerioId (opcional), data, descrição              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  EDUCACIONAL (domínio específico)                           │
│                                                             │
│  eduRelatorios ──── relatórios de aula (só educacional)     │
│       turma, lição, tema, crianças presentes, aplicação...  │
└─────────────────────────────────────────────────────────────┘
```

### Decisões de arquitetura

| Decisão | Justificativa |
|---------|---------------|
| Criança = `crmEntidades` + `criancaPerfil` | Criança é pessoa de primeira classe. Membro não comungante ou visitante. Aparece no Radar, tem histórico. Dados infantis (turma, médico) ficam em tabela satélite — padrão igual a `crmFuncionarios` para empregados. |
| CBCM + antecedentes em `crmEntidades` | São atributos da PESSOA, não do ministério. Sarah cursou CBCM uma vez — vale pro Louvor e pro Educacional. Campos opcionais, null para não-membros. |
| Ministério = tabela configurável | Amanhã criam "Jovens" ou "Casais" sem código novo. Papéis e subgrupos são arrays configuráveis. |
| Escala = compartilhada | Mesma tela, mesmo padrão. Filtro por ministério. |
| `eduRelatorios` = específico | Relatório de aula é exclusivo do educacional. Outros ministérios terão seus próprios domínios quando necessário. |

---

## Modelos Afetados

| Tabela | Tipo | Descrição |
|--------|------|-----------|
| `crmEntidades` | MODIFICAR | Papéis novos (MEMBRO, MEMBRO_NC, VISITANTE) + campos cbcm, atestadoAntecedentes |
| `criancaPerfil` | CRIAR | Tabela satélite 1:1 com dados do contexto infantil |
| `ministerios` | CRIAR | Ministérios da igreja |
| `ministerioMembros` | CRIAR | Vínculo N:N membro↔ministério |
| `escalas` | CRIAR | Escala unificada |
| `calendarioEventos` | CRIAR | Calendário compartilhado |
| `eduRelatorios` | CRIAR | Relatórios de aula (educacional) |
| `convex/schema.ts` | MODIFICAR | Adicionar 5 tabelas + campos em crmEntidades |
| `convex/preferencias/rbac.ts` | MODIFICAR | Adicionar permissões |
| `side-bar.tsx` | MODIFICAR | Seção "Igreja" no menu |

## Impacto em Shared

- [x] `schema.ts` — adicionar 5 tabelas + 2 campos opcionais em crmEntidades
- [x] `rbac.ts` — ~10 permissões novas
- [x] `side-bar.tsx` — seção "Igreja"
- [x] CRM forms/validations — adicionar papéis MEMBRO, MEMBRO_NC, VISITANTE
- [x] Risco de regressão: **baixo** — campos novos são opcionais, papéis novos não afetam existentes

---

## Schema Convex

### `crmEntidades` — campos novos (adicionar ao schema existente)

```ts
// Campos novos (opcionais — relevantes quando papel = MEMBRO/MEMBRO_NC)
cbcm: v.optional(v.string()),
// "nao_iniciado" | "cursando" | "cursando_seminario" | "equivalente"
// | "themelios" | "seminario" | "concluido"
atestadoAntecedentes: v.optional(v.string()), // URL do arquivo (Backblaze)

// Papéis novos (adicionar às opções existentes):
// "MEMBRO" — membro comungante (adulto)
// "MEMBRO_NC" — membro não comungante (criança batizada / jovem)
// "VISITANTE" — qualquer pessoa não membro
```

### `criancaPerfil` (tabela satélite 1:1)

```ts
criancaPerfil: defineTable({
  entidadeId: v.id("crmEntidades"), // vínculo com a pessoa
  turma: v.string(), // "0-2" | "3-4" | "5-6" | "7-8" | "9-10"
  // Vínculos familiares
  maeId: v.optional(v.id("crmEntidades")),
  maeNome: v.optional(v.string()),
  paiId: v.optional(v.id("crmEntidades")),
  paiNome: v.optional(v.string()),
  // Mentor espiritual
  ovelhinhaId: v.optional(v.id("crmEntidades")),
  ovelhinhaNome: v.optional(v.string()),
  // Compliance
  usoImagem: v.string(), // "nao_assinado" | "nao_autorizado" | "autorizado"
  // Observações
  observacoesMedicas: v.optional(v.string()),
  observacoesFamilia: v.optional(v.string()),
  // Controle de turma
  mudancaTurma: v.optional(v.string()), // "1_sem_2026" | "2_sem_2026"
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_entidade", ["entidadeId"])
  .index("by_turma", ["turma"])
  .index("by_mae", ["maeId"])
  .index("by_pai", ["paiId"]),
```

### `ministerios`

```ts
ministerios: defineTable({
  nome: v.string(), // "Educacional Infantil", "Louvor", "Som"
  descricao: v.optional(v.string()),
  icone: v.optional(v.string()), // nome do ícone lucide
  cor: v.optional(v.string()), // cor do badge
  papeis: v.array(v.string()), // ["professor","auxiliar","apoio"]
  subgrupos: v.optional(v.array(v.string())), // ["3-4","5-6","7-8","9-10"]
  status: v.string(), // "ativo" | "inativo"
  createdAt: v.number(),
})
  .index("by_status", ["status"]),
```

### `ministerioMembros`

```ts
ministerioMembros: defineTable({
  ministerioId: v.id("ministerios"),
  membroId: v.id("crmEntidades"),
  membroNome: v.optional(v.string()), // denormalizado
  papel: v.string(), // definido pelo ministério: "professor" | "lider" | "musico"
  subgrupo: v.optional(v.string()), // "3-4" | "soprano"
  status: v.string(), // "ativo" | "inativo"
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_ministerio", ["ministerioId"])
  .index("by_membro", ["membroId"])
  .index("by_ministerio_membro", ["ministerioId", "membroId"])
  .index("by_ministerio_subgrupo", ["ministerioId", "subgrupo"]),
```

### `escalas`

```ts
escalas: defineTable({
  ministerioId: v.id("ministerios"),
  ministerioNome: v.optional(v.string()),
  data: v.string(), // "YYYY-MM-DD"
  subgrupo: v.optional(v.string()), // "3-4" | "banda A"
  membros: v.array(v.object({
    membroId: v.id("crmEntidades"),
    membroNome: v.string(),
    papel: v.string(),
  })),
  observacoes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_ministerio", ["ministerioId"])
  .index("by_data", ["data"])
  .index("by_ministerio_data", ["ministerioId", "data"]),
```

### `calendarioEventos`

```ts
calendarioEventos: defineTable({
  titulo: v.string(),
  data: v.string(), // "YYYY-MM-DD"
  dataFim: v.optional(v.string()),
  ministerioId: v.optional(v.id("ministerios")), // null = evento geral
  ministerioNome: v.optional(v.string()),
  descricao: v.optional(v.string()),
  concluido: v.optional(v.boolean()),
  createdAt: v.number(),
})
  .index("by_data", ["data"])
  .index("by_ministerio", ["ministerioId"]),
```

### `eduRelatorios` (domínio específico)

```ts
eduRelatorios: defineTable({
  turma: v.string(), // "3-4" | "5-6" | "7-8" | "9-10"
  licao: v.string(),
  data: v.string(), // "YYYY-MM-DD"
  tema: v.optional(v.string()),
  textoBase: v.optional(v.string()),
  // Presença
  criancasIds: v.optional(v.array(v.id("crmEntidades"))),
  criancasNomes: v.optional(v.array(v.string())),
  professores: v.optional(v.string()),
  visitantes: v.optional(v.string()),
  // Conteúdo da aula
  historia: v.optional(v.string()),
  aplicacao: v.optional(v.string()),
  memorizacao: v.optional(v.string()),
  licaoCasa: v.optional(v.string()),
  observacoes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_turma", ["turma"])
  .index("by_data", ["data"])
  .index("by_turma_data", ["turma", "data"]),
```

---

## Permissões RBAC

### Compartilhadas

```ts
"ministerios:read",
"ministerios:manage",
"escalas:read",
"escalas:manage",
"calendario:read",
"calendario:manage",
"criancas:read",
"criancas:manage",
```

### Educacional

```ts
"educacional:relatorios:read",
"educacional:relatorios:write",
```

| Permissão | Quem | O que permite |
|-----------|------|---------------|
| `ministerios:read` | Membros de ministério | Ver ministérios e participantes |
| `ministerios:manage` | Coordenadores / Admin | CRUD ministérios, vincular membros |
| `escalas:read` | Membros | Ver escalas |
| `escalas:manage` | Coordenadores | Montar escalas |
| `calendario:read` | Todos | Ver eventos |
| `calendario:manage` | Coordenadores / Admin | CRUD eventos |
| `criancas:read` | Vol. educacional | Ver crianças e perfil |
| `criancas:manage` | Coord. educacional | CRUD crianças + perfil |
| `educacional:relatorios:read` | Vol. educacional | Ver relatórios |
| `educacional:relatorios:write` | Professores | Preencher relatório |

---

## Telas

### Módulo: Ministérios (compartilhado)

#### 1. Ministérios (`/ministerios`)
- Lista de ministérios ativos com badge contagem de membros
- Form criar/editar: nome, papéis, subgrupos
- Clicar → detalhe com membros

#### 2. Detalhe Ministério (`/ministerios/[id]`)
- Lista de membros com papel, subgrupo, status CBCM
- "Adicionar membro" → buscar `crmEntidades` (MEMBRO)
- Editar papel, subgrupo
- Alerta visual se CBCM não concluído

#### 3. Escalas (`/escalas`)
- Filtro: ministério + mês
- Tabela: data, subgrupo, membros escalados
- Form: data + subgrupo + multi-select membros do ministério

#### 4. Calendário (`/calendario`)
- Lista por mês, filtro por ministério ou "Todos"
- Form: título, data, ministério, descrição
- Checkbox concluído

### Módulo: Crianças (educacional)

#### 5. Crianças (`/criancas`)
- Tabela: nome, turma, idade, pais, autorização imagem
- Filtros: turma, status autorização
- Form: dados da entidade + perfil infantil (turma, pais via busca, ovelhinhas, obs médicas, autorização imagem)
- Badges: autorização (verde/amarelo/vermelho), alerta médico

### Módulo: Educacional (específico)

#### 6. Relatórios (`/educacional/relatorios`)
- Tabs por turma
- Tabela: lição, data, tema, qtd presentes
- Form: lição, data, tema, texto bíblico, multi-select crianças da turma, professores, conteúdo da aula
- View mode: relatório completo

---

## Sidebar

```ts
{
  label: "Igreja",
  items: [
    { title: "Ministérios", url: "/ministerios", icon: Users, permission: "ministerios:read" },
    { title: "Escalas", url: "/escalas", icon: CalendarDays, permission: "escalas:read" },
    { title: "Crianças", url: "/criancas", icon: Baby, permission: "criancas:read" },
    { title: "Calendário", url: "/calendario", icon: Calendar, permission: "calendario:read" },
    { title: "Relatórios Edu", url: "/educacional/relatorios", icon: ClipboardList, permission: "educacional:relatorios:read" },
  ],
},
```

---

## Arquivos a Criar/Modificar

### Backend

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | MODIFICAR | 5 tabelas novas + 2 campos em crmEntidades |
| `convex/preferencias/rbac.ts` | MODIFICAR | ~10 permissões |
| `convex/_testing/ministerios/queries.ts` | CRIAR | Ministérios, membros, escalas, calendário |
| `convex/_testing/ministerios/mutations.ts` | CRIAR | CRUD compartilhado |
| `convex/_testing/educacional/queries.ts` | CRIAR | Crianças (perfil), relatórios |
| `convex/_testing/educacional/mutations.ts` | CRIAR | CRUD educacional |

### Frontend

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/(testing)/ministerios/page.tsx` | CRIAR | Lista ministérios |
| `app/(testing)/ministerios/[id]/page.tsx` | CRIAR | Detalhe + membros |
| `app/(testing)/escalas/page.tsx` | CRIAR | Escalas unificadas |
| `app/(testing)/calendario/page.tsx` | CRIAR | Calendário |
| `app/(testing)/criancas/page.tsx` | CRIAR | Gestão crianças |
| `app/(testing)/educacional/relatorios/page.tsx` | CRIAR | Relatórios |
| `features/ministerios/` | CRIAR | Componentes + hooks + lib |
| `features/educacional/` | CRIAR | Componentes + hooks + lib |
| `shared/components/layout/side-bar.tsx` | MODIFICAR | Seção "Igreja" |

### CRM (ajustes para novos papéis)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `features/crm/lib/constants.ts` | MODIFICAR | Adicionar MEMBRO, MEMBRO_NC, VISITANTE |
| `features/crm/lib/validations.ts` | MODIFICAR | Incluir novos papéis no schema |

---

## Ordem de Implementação

### Fase 1 — Schema + RBAC + Constantes
1. Adicionar 5 tabelas em `schema.ts` + campos cbcm/atestado em crmEntidades
2. Adicionar permissões em `rbac.ts`
3. Adicionar papéis MEMBRO, MEMBRO_NC, VISITANTE ao CRM
4. Criar `features/ministerios/lib/constants.ts`
5. Criar `features/educacional/lib/constants.ts`
6. Schemas Zod em ambos módulos

### Fase 2 — Ministérios + Membros (fundação)
7. Backend: CRUD ministérios + ministerioMembros
8. Frontend: lista ministérios + vincular membros
9. Seed: criar "Educacional Infantil" com subgrupos ["0-2","3-4","5-6","7-8","9-10"] e papéis ["professor","auxiliar","apoio"]

### Fase 3 — Escalas + Calendário (compartilhado)
10. Backend: CRUD escalas + calendário
11. Frontend: escalas com filtro por ministério
12. Frontend: calendário com filtro por ministério

### Fase 4 — Crianças
13. Backend: CRUD crianças (entidade + criancaPerfil)
14. Frontend: lista + form com busca de pais em crmEntidades
15. Upload autorização imagem (`@shared/files`)

### Fase 5 — Relatórios Educacional
16. Backend: CRUD relatórios com multi-select crianças
17. Frontend: tabs por turma + form + view mode

### Fase 6 — CBCM + Antecedentes
18. UI para campo CBCM no form de entidades (quando papel MEMBRO)
19. Upload antecedentes criminais (`@shared/files`)
20. Badge/alerta de CBCM na lista de membros do ministério

### Fase 7 — Navegação + Polish
21. Seção "Igreja" no sidebar
22. Integrar crianças e membros no Radar Search

### Fase 8 — Migração de Dados
23. Script: importar 55 crianças como crmEntidades (MEMBRO_NC) + criancaPerfil
24. Script: importar 35 voluntários como crmEntidades (MEMBRO) + ministerioMembros
25. Script: importar escalas, relatórios, calendário

---

## Cenários de Uso

### "Sarah toca no louvor E dá aula no infantil"
- 1 registro `crmEntidades` (papel: MEMBRO, cbcm: "concluido")
- 2 registros `ministerioMembros`:
  - Louvor → papel: "musicista"
  - Educacional Infantil → papel: "professora", subgrupo: "7-8"
- Aparece na escala de ambos

### "Noah é filho da Sarah, turma 7-8, alergia a amendoim"
- 1 registro `crmEntidades` (papel: MEMBRO_NC, nome: Noah)
- 1 registro `criancaPerfil` (turma: "7-8", maeId: Sarah, usoImagem: "autorizado", obsMedicas: "alergia a amendoim")
- Multi-select no relatório da turma 7-8

### "Visitante trouxe o filho pra aula"
- 1 registro `crmEntidades` pai (papel: VISITANTE)
- 1 registro `crmEntidades` filho (papel: VISITANTE)
- 1 registro `criancaPerfil` (turma: "5-6")
- Se tornar membro → só muda o papel, dados preservados

### "Novo voluntário quer servir — CBCM obrigatório"
- Coordenador tenta vincular membro ao ministério
- UI mostra alerta: "CBCM: Não iniciado"
- Pode vincular mesmo assim (aviso, não bloqueio) — acompanhamento

### "Novo ministério de Jovens"
- Criar em `ministerios`: papéis ["lider","auxiliar"], sem subgrupos
- Vincular membros → já podem ser escalados
- Zero código novo

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| `schema.ts` é shared danger zone | Implementar em período sem outras features tocando schema |
| Campos novos em `crmEntidades` | Opcionais — não quebram forms existentes. Validação só quando papel = MEMBRO |
| Papéis novos no CRM | Adicionar em constants/validations, forms existentes já usam config dinâmica |
| Upload antecedentes | Usar `@shared/files` (Backblaze B2) |
| Mudança nomenclatura 2027 | `subgrupos` é array configurável no ministério, edita sem código |
| Volume pequeno (~100 registros) | Convex direto, sem Typesense |
