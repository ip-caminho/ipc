# Modulo: Escalas

## Visao Geral

O modulo de Escalas gerencia a distribuicao de membros em funcoes para os cultos da igreja. Inclui gestao de equipes (louvor, hospitalidade, som, multimidia), controle de disponibilidade dos membros, geracao automatica de escalas com algoritmo de distribuicao justa, e visualizacao personalizada para cada membro ver seus compromissos futuros.

A pagina principal (`/escalas`) e organizada em abas:
- **Minha Escala** — visao pessoal do membro (todos os usuarios)
- **Disponibilidade** — marcacao de indisponibilidades (todos os usuarios)
- **Gerar Escalas** — geracao automatica por equipe (admins/secretaria)
- **Equipes** — gestao de membros por funcao (admins/secretaria)

## Arquivos

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/escalas/page.tsx` | Pagina principal com abas (Tabs). Chama `garantirCultosFuturos` ao abrir para admins. |
| `features/escalas/components/MinhasEquipesTab.tsx` | Exibe escalas futuras do membro logado, agrupadas por mes, com badges coloridos por funcao. |
| `features/escalas/components/DisponibilidadeTab.tsx` | Grid de domingos ate fim do ano. Membro marca/desmarca indisponibilidade por click. Datas escaladas ficam bloqueadas (icone Lock azul). |
| `features/escalas/components/EquipesTab.tsx` | Cards por funcao (LOUVOR, HOSPITALIDADE, SOM, MULTIMIDIA). Permite add/remove membros, toggle ativo/inativo, toggle condutor (LOUVOR). Inclui dialog para criar nova equipe. |
| `features/escalas/components/GerarEscalasTab.tsx` | Grid de equipes com contagem de membros ativos, condutores, e botao para abrir `GerarEscalaDialog`. |
| `features/escalas/components/GerarEscalaDialog.tsx` | Dialog completo: selecao de periodo (4 sem, 8 sem, fim do mes, proximo mes, fim do ano), resumo de cultos/membros, preview dos cultos no periodo, execucao da geracao e exibicao de alertas (ex: sem condutor). |
| `features/escalas/components/CalendarioView.tsx` | Visao de calendario mensal. Exibe indicadores de preenchimento por culto (check verde = completo, dash amarelo = parcial). Mostra nome do pregador nos dias de culto. |
| `features/escalas/components/MembroCombobox.tsx` | Combobox reutilizavel com busca de membros. Usa Popover + Command do shadcn. Aceita `children` para itens extras (ex: "Remover", "Pregador externo"). |
| `features/escalas/hooks/useFuncoes.ts` | Hook que retorna lista de funcoes ativas (`api.escalas.funcoes.list`) e todas as funcoes (`listAll`). |
| `features/escalas/lib/constants.ts` | Constantes: `TIPO_CULTO_OPTIONS`, `HORARIO_PADRAO`, `FUNCAO_LITURGIA_OPTIONS` (com config de views, multiplo, temPassagem). Define tipo `ViewMode`. |

### Backend (Convex)

| Arquivo | Descricao |
|---------|-----------|
| `convex/escalas/queries.ts` | Queries: `listCultos` (todos com escalas), `getCultoById`, `minhasEscalas` (futuras do membro logado), `listProximosCultos`, `getBoletim` (dados completos para boletim dominical com navegacao e avisos). |
| `convex/escalas/mutations.ts` | Mutations de cultos e escalas: `garantirCultosFuturos` (cria domingos para N meses), `createCulto`, `updateCulto`, `publishCulto`/`unpublishCulto`, `deleteCulto` (cascade), `upsertEscala` (singular), `addEscala` (multipla), `removeEscala`, `updatePassagem`, `updateLouvores`. |
| `convex/escalas/equipes.ts` | Queries: `listEquipes` (agrupado por funcao), `listMinhasEquipes` (funcoes do membro logado), `getEscalasProximasPorEquipe`. Mutations: `addMembro`, `removeMembro`, `toggleAtivo`, `toggleCondutor`. |
| `convex/escalas/disponibilidade.ts` | Queries: `minhasIndisponibilidades`, `listPorData`, `minhasDatasEscaladas`. Mutations: `toggleIndisponibilidade` (verifica se ja escalado), `setIndisponibilidades` (batch). |
| `convex/escalas/funcoes.ts` | CRUD de funcoes: `list` (ativas), `listAll`, `create`, `update`, `toggle`, `seedFuncoes` (popula 7 funcoes iniciais). |
| `convex/escalas/gerarEscala.ts` | Mutation `gerarEscalaPorEquipe`: orquestra a geracao automatica. Busca cultos no periodo, membros ativos da equipe, indisponibilidades, historico de escalas. Processa culto a culto em ordem cronologica, atualizando stats progressivamente. |
| `convex/escalas/gerarEscalaHelpers.ts` | Logica pura de scoring (sem dependencias do Convex). `calcularScore`: prioriza quem serviu menos vezes (peso 1000x) e desempata por tempo desde ultima escala. `gerarEscalaParaData`: para LOUVOR, garante 1 condutor + N acompanhantes; para demais, seleciona por score. |

### Schema (tabelas)

| Tabela | Campos principais | Indices |
|--------|-------------------|---------|
| `cultos` | `data`, `tipo` (DOMINICAL/ESPECIAL), `horario`, `louvores`, `status` (RASCUNHO/PUBLICADO) | `by_data`, `by_status_data` |
| `cultoEscalas` | `cultoId`, `funcao`, `membroId?`, `nomeCustom?`, `passagemBiblica?` | `by_culto`, `by_membro`, `by_culto_funcao` |
| `equipeMembros` | `funcao`, `membroId`, `ativo`, `condutor?`, `criadoEm` | `by_funcao`, `by_membro`, `by_funcao_membro` |
| `indisponibilidades` | `membroId`, `data`, `motivo?`, `criadoEm` | `by_membro`, `by_data`, `by_membro_data` |
| `funcoes` | `slug`, `label`, `multiplo`, `temEquipe`, `temPassagem`, `views`, `qtdPorCulto?`, `ordem`, `ativo` | `by_slug` |

## Funcionalidades

### Gestao de Cultos
- **Criacao automatica**: ao abrir a pagina, admins disparam `garantirCultosFuturos` que cria cultos dominicais para os proximos 3 meses (sem duplicar existentes).
- **Criacao manual**: via input de data + botao "Adicionar" na pagina de Cultos.
- **Tipos**: DOMINICAL (horario padrao 10:00) e ESPECIAL.
- **Status**: RASCUNHO e PUBLICADO (toggle via `publishCulto`/`unpublishCulto`).
- **Exclusao**: cascade — remove todas as `cultoEscalas` associadas.

### Gestao de Equipes
- **Funcoes com equipe**: LOUVOR, HOSPITALIDADE, SOM, MULTIMIDIA (campo `temEquipe: true`).
- **Funcoes sem equipe**: ABERTURA, CONFISSAO, PREGACAO (atribuidas individualmente por culto).
- **Membros**: add/remove de membros ativos da igreja. Toggle ativo/inativo por equipe.
- **Condutor (LOUVOR)**: flag especial que distingue quem conduz o louvor vs. quem acompanha.
- **Criacao de novas equipes**: dialog que cria nova funcao com slug auto-gerado (uppercase, sem acentos).

### Disponibilidade
- **Default disponivel**: membros sao considerados disponiveis por padrao.
- **Marcacao**: toggle por domingo — click marca/desmarca indisponibilidade.
- **Bloqueio**: datas em que o membro ja esta escalado nao podem ser alteradas (exibem icone Lock azul).
- **Validacao backend**: `toggleIndisponibilidade` verifica se o membro ja esta escalado na data antes de permitir.
- **Escopo**: domingos ate o fim do ano corrente.

### Geracao Automatica de Escalas
- **Algoritmo de scoring** (`gerarEscalaHelpers.ts`):
  - `score = totalEscalas * 1000 - diasDesdeUltimaEscala`
  - Menor score = maior prioridade (quem serviu menos e/ou ha mais tempo).
  - Membro que nunca serviu recebe bonus de 9999 dias.
- **Regra especial LOUVOR**:
  - Pelo menos 1 condutor obrigatorio por culto.
  - Se nenhum condutor disponivel, gera alerta (e nao escala ninguem).
  - Slots restantes preenchidos com acompanhantes por score.
- **Processamento sequencial**: cultos processados em ordem cronologica, stats atualizados a cada culto (distribuicao progressiva evita concentrar escalas).
- **Filtros**: respeita indisponibilidades, nao duplica membro em funcoes diferentes no mesmo culto, pula cultos ja completamente preenchidos.
- **Periodos**: 4 semanas, 8 semanas, fim do mes, proximo mes, fim do ano.

### Minha Escala
- Exibe todas as escalas futuras do membro logado.
- Agrupamento por mes com cards por dia.
- Badges coloridos por funcao (LOUVOR roxo, HOSPITALIDADE ambar, SOM azul, MULTIMIDIA verde, etc.).

### Calendario (CalendarioView)
- Visao mensal com navegacao (mes anterior/proximo, botao "Hoje").
- Indicadores por dia: check verde (todas funcoes preenchidas), dash amarelo (parcial).
- Mostra nome do pregador nos domingos com culto.

## Permissoes

| Permissao | Quem tem | O que permite |
|-----------|----------|---------------|
| `escalas:read` | admin, secretaria, membro | Ver escalas de liturgia e cultos |
| `escalas:create` | admin, secretaria | Criar cultos, escalas, garantir cultos futuros |
| `escalas:update` | admin, secretaria | Editar escalas, atribuicoes, gerenciar equipes, gerar escalas automaticas |
| `escalas:delete` | admin, secretaria | Excluir cultos e escalas |

**Nota**: A gestao de funcoes (`funcoes.create`, `funcoes.update`, `funcoes.toggle`) verifica `membro.role === "admin"` diretamente, sem usar o sistema RBAC padrao.

**Self-service**: Qualquer membro autenticado pode:
- Ver suas proprias escalas (`minhasEscalas`)
- Marcar/desmarcar indisponibilidades (`toggleIndisponibilidade`)
- Ver suas equipes (`listMinhasEquipes`)

## Dependencias

### Modulos internos
- **Membros** (`convex/membros/queries.ts`): lista de membros ativos para atribuicao em equipes e escalas.
- **Avisos** (`convex/avisos/`): avisos sao exibidos no boletim junto com os dados do culto (via `getBoletim`).
- **RBAC** (`convex/preferencias/rbac.ts`, `rbacHelpers.ts`): permissoes `escalas:*`.
- **Modulos** (`ModuloGuard`): pagina protegida pelo modulo `escalas`.
- **Auth** (`PermissionsProvider`): hook `useAuth()` para checar `can("escalas:*")` no frontend.
- **Audit** (`convex/_shared/auditHelpers.ts`): log de criacao/exclusao de cultos.

### Shared
- `shared/components/auth/ModuloGuard.tsx`
- `shared/providers/PermissionsProvider.tsx`
- `convex/_shared/requirePermission.ts`
- `convex/_shared/auditHelpers.ts`

### Bibliotecas externas
- `date-fns` + `date-fns/locale/ptBR`: manipulacao e formatacao de datas
- `sonner`: notificacoes toast
- `lucide-react`: icones (Wand2, Check, X, Lock, Mic, UserPlus, ChevronLeft/Right, etc.)

## Padroes de UI

- **Layout em abas** (Tabs do shadcn) na pagina principal, com abas condicionais baseadas em permissao.
- **Cards por equipe** (grid responsivo `md:grid-cols-2`) na aba Equipes.
- **Grid de domingos** (responsivo `grid-cols-2 sm:4 md:5`) na aba Disponibilidade, com cores semanticas:
  - Verde = disponivel
  - Vermelho = indisponivel
  - Azul = escalado (bloqueado)
- **Combobox com busca** (`MembroCombobox`): Popover + Command para selecao de membros.
- **Badges coloridos por funcao** com mapeamento fixo `FUNCAO_COLORS`.
- **Dialog para geracao** com select de periodo, resumo numerico, preview scrollavel dos cultos, e feedback pos-geracao com alertas.
- **Skeleton** como loading state em todas as tabs.
- **Toast (sonner)** para feedback de todas as acoes (sucesso, erro, aviso).
- **Card dashed** para acao de adicionar (nova equipe).
- **Confirm nativo** (`window.confirm`) para exclusoes.

## Notas Tecnicas

- **`@ts-ignore Convex TS2589`**: supressao recorrente de erro de profundidade de tipo do Convex. Presente em todos os hooks de query/mutation.
- **`gerarEscalaHelpers.ts`**: logica pura sem dependencias do Convex, projetada para ser testavel com Vitest. Exporta tipos (`MembroDisponivel`, `FuncaoConfig`, `ResultadoEscala`) e funcoes (`calcularScore`, `gerarEscalaParaData`).
- **Stats progressivas**: durante a geracao automatica, o historico de escalas e atualizado em memoria a cada culto processado, garantindo distribuicao justa mesmo dentro de um unico batch.
- **Conflito entre equipes**: o algoritmo verifica se um membro ja esta escalado em outra funcao no mesmo culto antes de atribui-lo.
- **Funcoes dinamicas**: tabela `funcoes` permite criar novas funcoes sem alterar codigo. As 7 funcoes iniciais sao populadas via `seedFuncoes`.
- **`garantirCultosFuturos`**: executado com `useRef` para evitar chamadas duplicadas em re-renders. Silencia erros com `.catch(() => {})`.
- **Condutor vs. acompanhante**: distincao especifica do LOUVOR. O condutor tem prioridade absoluta na geracao automatica — sem condutor disponivel, o culto nao recebe nenhuma escala de louvor (gera alerta).
- **Navegacao do boletim**: a query `getBoletim` retorna `navegacao.anterior` e `navegacao.proximo` (datas de cultos dominicais adjacentes) para permitir navegacao temporal.
