# Modulo: Educacional Infantil

## Visao Geral

O modulo Educacional Infantil gerencia as criancas da igreja, organizadas por faixas etarias (turmas), seus responsaveis, escalas de professores e relatorios de presenca semanais. Possui um widget de dashboard para pais verem informacoes das criancas e proxima escala.

**Rota principal**: `/educacional`
**Nao possui rota de detalhe com URL propria** — detalhe e renderizado inline via estado local.

## Arquivos

### Frontend (Pages)

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/educacional/page.tsx` | Pagina principal com 3 abas (Turmas, Escala, Relatorios). Gerencia criacao/edicao de criancas, relatorios e escalas |

### Frontend (Components)

| Arquivo | Descricao |
|---------|-----------|
| `features/educacional/components/CriancaCard.tsx` | Card compacto — nome, turma (badge colorido por faixa), idade calculada, status de uso de imagem, responsaveis |
| `features/educacional/components/CriancaDetalhe.tsx` | Tela de detalhe completa — dados pessoais, ovelhinha, observacoes medicas/familia, lista de responsaveis com tipo/whatsapp, historico de presencas (ultimas 10) |
| `features/educacional/components/CriancaForm.tsx` | Dialog para criar/editar crianca — nome, data nascimento, sexo, turma, uso de imagem, observacoes medicas e da familia |
| `features/educacional/components/EscalaForm.tsx` | Dialog para criar escala — data, turma (subgrupo), membros do ministerio com papel (Professor/Auxiliar), observacoes. Usa `useFieldArray` para lista dinamica |
| `features/educacional/components/RelatorioForm.tsx` | Dialog para criar relatorio de presenca — turma, data, professores (texto livre), lista de criancas da turma com checkbox de presenca |
| `features/educacional/components/EducacionalPaisWidget.tsx` | Widget para dashboard — mostra criancas do usuario logado (via tabela `responsaveis`), turma e proxima escala com professores |

### Frontend (Lib)

| Arquivo | Descricao |
|---------|-----------|
| `features/educacional/lib/constants.ts` | Turmas (`0-2`, `3-4`, `5-6`, `7-8`, `9-10`) com cores, opcoes de uso de imagem, tipos de responsavel, papeis de escala |
| `features/educacional/lib/validations.ts` | Schemas Zod 4: `criancaFormSchema`, `relatorioFormSchema`, `escalaFormSchema` |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/educacional/queries.ts` | Queries: `listCriancas`, `getCrianca`, `listRelatorios`, `getRelatorio`, `listEscalas`, `dashboardPais` |
| `convex/educacional/mutations.ts` | Mutations: `createCrianca`, `updateCrianca`, `removeCrianca`, `addResponsavel`, `removeResponsavel`, `createRelatorio`, `createEscala`, `removeEscala`, `seedCriancas` |

### Schema (tabelas em `convex/schema.ts`)

| Tabela | Campos principais | Indices |
|--------|-------------------|---------|
| `criancaPerfil` | `entidadeId`, `turma`, `usoImagem` (AUTORIZADO/NAO_AUTORIZADO/PENDENTE), `observacoesMedicas?`, `observacoesFamilia?`, `ovelhinhaId?`, `criadoEm`, `atualizadoEm?` | `by_entidade`, `by_turma` |
| `responsaveis` | `criancaEntidadeId`, `responsavelEntidadeId`, `tipo` (MAE/PAI/AVO/TUTOR/RESPONSAVEL), `principal`, `criadoEm` | `by_crianca`, `by_responsavel` |
| `eduRelatorios` | `turma`, `data` (YYYY-MM-DD), `professores` (texto livre), `observacoes?`, `criadoEm` | `by_turma`, `by_data`, `by_turma_data` |
| `eduPresencas` | `relatorioId`, `criancaEntidadeId` | `by_relatorio`, `by_crianca` |
| `ministerioEscalas` | `ministerioId`, `data`, `subgrupo?`, `membros[]` (membroId + papel), `observacoes?`, `criadoEm` | `by_ministerio`, `by_data`, `by_ministerio_data` |

## Funcionalidades

### Tab: Turmas (Criancas)

#### Listagem de Criancas
- Query `listCriancas` retorna criancas com filtro opcional por turma
- Enriquece cada perfil com: nome da entidade, data de nascimento, sexo, responsaveis (nome + tipo), ovelhinha
- **Controle de acesso a dados sensiveis**: `observacoesMedicas` so e retornada se o usuario tem `criancas:manage`
- Grid responsivo (1/2/3 colunas) de `CriancaCard`

#### Detalhe da Crianca
- Query `getCrianca` retorna perfil completo com responsaveis (incluindo whatsapp) e historico de presencas (ultimas 20)
- Exibe: nome, turma (badge colorido), nascimento com idade calculada, sexo, uso de imagem, ovelhinha, observacoes
- Card de responsaveis: nome, tipo (badge), indicador de principal, whatsapp
- Card de presencas: ultimas 10 presencas com data e turma

#### CRUD de Crianca
- **Criar** (`createCrianca`): Cria entidade (PF, papel MEMBRO, status ATIVO) + `criancaPerfil` atomicamente. Opcionalmente cria responsaveis
- **Editar** (`updateCrianca`): Atualiza entidade (nome, nascimento, sexo) e perfil (turma, uso imagem, observacoes) separadamente
- **Excluir** (`removeCrianca`): Remove responsaveis + presencas + perfil em cascade. Marca entidade como INATIVO (soft delete na entidade)

#### Calculo de Idade
- Funcao `calcularIdade` calcula idade em anos ou meses (< 1 ano) a partir da data de nascimento
- Duplicada em `CriancaCard.tsx` e `CriancaDetalhe.tsx`

### Tab: Escala

#### Listagem de Escalas
- Busca o ministerio "Educacional" pelo nome (via `ministerios.queries.list`)
- Query `listEscalas` retorna escalas do ministerio filtradas por data, enriquecidas com nomes dos membros
- Ordenadas por data ascendente
- Exibidas em grid (1/2 colunas) com data formatada (dd/MM/yyyy + dia da semana), turma (badge colorido), membros com papel

#### Criar Escala
- `EscalaForm` usa `useFieldArray` para lista dinamica de membros
- Busca membros do ministerio Educacional via `ministerios.queries.getById`
- Campos: data, turma (subgrupo), membros (Select membro + Select papel Professor/Auxiliar), observacoes

#### Excluir Escala
- Botao "Excluir" com `confirm()` nativo

### Tab: Relatorios

#### Listagem de Relatorios
- Query `listRelatorios` com filtros opcionais (turma, dataInicio, dataFim)
- Conta presencas por relatorio (`totalPresentes`)
- Ordenados por data descendente
- Cards com data, turma (badge), total de presentes (badge outline), professores

#### Criar Relatorio
- `RelatorioForm` carrega criancas da turma selecionada
- Checklist de presenca com `Checkbox` do shadcn/ui
- Validacao de unicidade turma+data no backend
- Insere `eduRelatorios` + N registros em `eduPresencas` (um por crianca presente)

### Dashboard de Pais (`EducacionalPaisWidget`)
- Query `dashboardPais` identifica o usuario logado como responsavel via tabela `responsaveis`
- Para cada crianca, busca a proxima escala (data >= hoje) da turma correspondente
- Retorna `null` se o usuario nao e responsavel de nenhuma crianca
- Widget exibe: nome da crianca, turma, proxima aula com professores

### Gestao de Responsaveis
- **Adicionar** (`addResponsavel`): Vincula entidade responsavel a entidade crianca. Valida duplicata
- **Remover** (`removeResponsavel`): Deleta registro
- **Tipos**: MAE, PAI, AVO, TUTOR, RESPONSAVEL
- **UI**: Exibida no detalhe da crianca (leitura apenas) — formulario de adicao nao esta implementado na UI

### Seed de Criancas
- Mutation `seedCriancas` insere 55 criancas reais (dados do Notion)
- Organiza por turma (0-2, 3-4, 5-6, 7-8, 9-10)
- Cria entidade + `criancaPerfil` para cada. Ovelhinha salva como texto em `observacoesFamilia`
- Verifica se ja existem criancas antes de executar (previne duplicatas)

## Permissoes

| Permissao | Descricao | Onde e verificada |
|-----------|-----------|-------------------|
| `criancas:read` | Ver nome e turma das criancas | `can()` no client para condicionar query; `getAuthContext().can()` nas queries `listCriancas` e `getCrianca` |
| `criancas:manage` | Gerenciar perfis completos (inclui obs medicas) | `PermissionGate` no botao "Nova Crianca"; `can()` nos botoes Editar/Excluir; `requirePermission` nas mutations; controla visibilidade de `observacoesMedicas` nas queries |
| `educacional:read` | Ver relatorios e escalas | `can()` para condicionar tabs Escala/Relatorios e queries; `getAuthContext().can()` nas queries `listRelatorios`, `listEscalas` |
| `educacional:write` | Criar/editar relatorios e escalas | `PermissionGate` nos botoes Nova Escala/Novo Relatorio; `requirePermission` nas mutations `createRelatorio`, `createEscala`, `removeEscala` |

**Nota sobre separacao de permissoes**: `criancas:read` e `criancas:manage` controlam o acesso aos dados das criancas. `educacional:read` e `educacional:write` controlam escalas e relatorios. Isso permite que um professor veja criancas mas nao gerencie perfis, por exemplo.

## Dependencias

### Dependencias internas
- **Modulo Ministerios**: Busca ministerio "Educacional" por nome para vincular escalas. Se nao encontrado, aba de escalas exibe mensagem orientando criar o ministerio
- **`ModuloGuard`**: Verifica se modulo "educacional" esta ativo
- **`PermissionGate`** / **`useAuth`**: Controle de permissoes no client
- **`requirePermission`**: Verificacao de permissao no backend
- **`createActionAuditLog`**: Auditoria em create/update/delete de criancas e relatorios
- **`resolvePermissions`** (`rbacHelpers`): Usado internamente no `getAuthContext` das queries

### Tabelas referenciadas
- `entidades`: Dados pessoais (nomeCompleto, dataNascimento, sexo, whatsapp)
- `membros`: Vinculo membro-entidade para resolucao de nomes e ovelhinha
- `ministerios` / `ministerioEscalas`: Escalas do educacional
- `rolePermissions`: Resolucao de permissoes por role

## Padroes de UI

- **Tabs**: shadcn/ui `Tabs` com 3 abas (Turmas, Escala, Relatorios). Abas Escala e Relatorios condicionadas por `educacional:read`
- **Filtro de turma**: `Select` com opcoes de turma na aba Turmas
- **Cards compactos**: `CriancaCard` com layout horizontal, badges de turma e uso de imagem
- **Cores por turma**: Rosa (0-2), Roxo (3-4), Azul (5-6), Verde (7-8), Laranja (9-10)
- **Cores de uso de imagem**: Verde (autorizado), Vermelho (nao autorizado), Amarelo (pendente)
- **Checklist de presenca**: `Checkbox` do shadcn/ui em lista scrollavel (max-h-48) no `RelatorioForm`
- **Field array dinamico**: `EscalaForm` usa `useFieldArray` do React Hook Form para lista de membros com +/- botoes
- **Navegacao inline**: Detalhe da crianca renderizado na mesma pagina via `selectedEntidadeId` (sem rota propria)

## Notas Tecnicas

- **Modelo de dados**: Crianca e uma entidade (PF) com perfil separado (`criancaPerfil`). Responsaveis sao vinculados via tabela `responsaveis` que liga duas entidades
- **Observacoes medicas protegidas**: O campo `observacoesMedicas` so e retornado pelo backend se o usuario tem `criancas:manage`. Usuarios com apenas `criancas:read` recebem `undefined`
- **Ovelhinha**: Membro da igreja designado como mentor espiritual da crianca. Armazenado como `ovelhinhaId` (ref a `membros`). No seed, salvo como texto em `observacoesFamilia`
- **Escalas via ministerioEscalas**: As escalas do educacional reutilizam a tabela `ministerioEscalas` do modulo de Ministerios, vinculadas ao ministerio "Educacional Infantil" encontrado por nome
- **Unicidade de relatorio**: Backend valida que nao pode existir dois relatorios para mesma turma+data (indice `by_turma_data`)
- **Dashboard de pais**: Query `dashboardPais` percorre a cadeia userId -> membros -> entidades -> responsaveis -> criancas -> escalas. Retorna `null` se nao encontrar relacao, fazendo o widget nao renderizar
- **Funcao duplicada**: `calcularIdade` esta duplicada em `CriancaCard.tsx` e `CriancaDetalhe.tsx` — candidata a extracao para `lib/`
- **Cascade no delete**: `removeCrianca` deleta responsaveis e presencas antes de deletar o perfil. A entidade e marcada INATIVO (nao deletada)
- **Seed com dados reais**: 55 criancas com nomes reais, turmas e datas de nascimento importados do Notion. Inclui mapeamento de ovelhinhas por nome
- **@ts-ignore**: Usado na query de ministerios para suprimir TS2589
- **Audit trail**: `createCrianca`, `updateCrianca`, `removeCrianca` e `createRelatorio` geram logs de auditoria. Escalas nao geram audit log
