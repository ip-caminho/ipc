# Modulo: Admin Modulos

## Visao Geral

Pagina administrativa para ativar e desativar funcionalidades (modulos) do sistema. Cada modulo representa uma area funcional da aplicacao (Membros, Diretorio, Gravacoes, etc.) e pode ser ligado ou desligado por um administrador. Modulos desativados ficam inacessiveis para todos os usuarios — as paginas protegidas por `ModuloGuard` redirecionam para a home.

Rota: `/admin/modulos`

## Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `app/(ready)/admin/modulos/page.tsx` | Pagina de gerenciamento de modulos |
| `convex/modulos/queries.ts` | Queries `listModulos` e `listModulosAtivos` |
| `convex/modulos/mutations.ts` | Mutations `seedModulos` e `toggleModulo` |
| `shared/components/auth/RoleGate.tsx` | `AdminGate` — guard de role admin |
| `shared/components/auth/ModuloGuard.tsx` | Guard que consome `listModulosAtivos` para proteger paginas |

## Funcionalidades

### Listagem de Modulos
- Grid responsivo de cards: 1 coluna (mobile), 2 colunas (sm), 3 colunas (lg).
- Cada card exibe:
  - **Label** do modulo (titulo)
  - **Descricao** breve
  - **Switch** (toggle) para ativar/desativar
- Modulos desativados recebem `opacity-60`.
- Ordenados por campo `ordem` (definido no seed).
- Estados de loading ("Carregando...") e vazio (com instrucao de seed).

### Toggle de Modulo
- Clicar no Switch chama `api.modulos.mutations.toggleModulo({ slug })`.
- Feedback via toast: `"{label} ativado"` ou `"{label} desativado"`.
- Erro tratado com toast de erro.

### Seed de Modulos
- A mutation `seedModulos` popula a tabela `modulos` com os dados iniciais (idempotente — nao recria se ja existir).
- Deve ser executada manualmente: `npx convex run modulos.mutations:seedModulos`.
- Instrucao exibida na UI quando nao ha modulos cadastrados.

### Modulos Disponiveis (MODULOS_INICIAIS)

| Slug | Label | Descricao | Ativo Padrao | Ordem |
|------|-------|-----------|:------------:|:-----:|
| `membros` | Membros | Cadastro e gestao de membros | Sim | 1 |
| `diretorio` | Diretorio | Diretorio de contatos | Sim | 2 |
| `entidades` | Entidades | Gestao de entidades (PF/PJ) | Sim | 3 |
| `escalas` | Cultos | Escalas e liturgia dos cultos | Nao | 4 |
| `boletim` | Boletim | Boletim dominical | Nao | 5 |
| `gravacoes` | Gravacoes | Gravacoes de sermoes e estudos | Nao | 6 |
| `pequenos-grupos` | Pequenos Grupos | Gestao de pequenos grupos | Nao | 7 |
| `pedidos-oracao` | Pedidos de Oracao | Pedidos de oracao da comunidade | Nao | 8 |
| `pastoreio` | Pastoreio | Acompanhamento pastoral | Nao | 9 |
| `ministerios` | Ministerios | Gestao de ministerios da igreja | Nao | 10 |
| `calendario` | Calendario | Calendario de eventos da igreja | Nao | 11 |
| `educacional` | Educacional Infantil | Gestao das turmas e criancas | Nao | 12 |

### Queries (Backend)

| Query | Descricao |
|-------|-----------|
| `listModulos` | Lista todos os modulos ordenados por `ordem`. Apenas para admin — retorna `[]` para outros roles. |
| `listModulosAtivos` | Lista slugs dos modulos ativos (campo `ativo === true`). Acessivel a qualquer usuario autenticado. Consumida pelo `ModuloGuard`. |

### Mutations (Backend)

| Mutation | Descricao |
|----------|-----------|
| `seedModulos` | Insere modulos iniciais na tabela (idempotente via check `by_slug`). Nao requer autenticacao. |
| `toggleModulo` | Alterna `ativo` do modulo. Requer admin (verifica `membro.role === "admin"`). Busca por slug com indice `by_slug`. |

## Permissoes

- **Acesso a pagina**: Protegido por `AdminGate` — apenas role `"admin"`.
- **Query `listModulos`**: Verifica admin no backend, retorna array vazio para nao-admin.
- **Mutation `toggleModulo`**: Verifica admin no backend, lanca erro `"Apenas admin pode alterar modulos"`.
- **Query `listModulosAtivos`**: Acessivel a todos os usuarios autenticados (necessario para o `ModuloGuard` funcionar em qualquer pagina).
- **Mutation `seedModulos`**: Sem verificacao de autenticacao (destina-se a execucao via CLI).

## Dependencias

- `@shared/components/ui/*` — Card, CardContent, CardDescription, CardHeader, CardTitle, Switch (shadcn/ui)
- `lucide-react` — LayoutGrid (icone do titulo)
- `sonner` — toasts de feedback
- `@shared/components/auth/RoleGate` — `AdminGate`
- `@convex-dev/auth/server` — `getAuthUserId` para autenticacao no backend

## Padroes de UI

- **Grid de cards** responsivo com Switch inline no header do card.
- Cards com `CardHeader` contendo titulo, descricao e switch alinhados horizontalmente (`flex-row justify-between`).
- **Opacidade reduzida** (60%) para modulos desativados — feedback visual imediato.
- Icone `LayoutGrid` no titulo da pagina.
- Mensagem de estado vazio com instrucao de CLI (`npx convex run modulos.mutations:seedModulos`) em tag `<code>`.

## Notas Tecnicas

- A tabela `modulos` usa indice `by_slug` para busca rapida por slug.
- O campo `ordem` permite reordenacao futura sem alterar dados existentes.
- 3 modulos sao ativados por padrao no seed (membros, diretorio, entidades) — representam funcionalidades core.
- Os demais 9 modulos comecam desativados e podem ser habilitados conforme necessidade da igreja.
- `ModuloGuard` (usado nas paginas protegidas) consulta `listModulosAtivos` e redireciona para `/` se o modulo nao estiver na lista de ativos.
- O slug do modulo deve coincidir exatamente com o parametro passado ao `ModuloGuard` em cada pagina (ex: `"diretorio"`, `"entidades"`, `"gravacoes"`).
- `seedModulos` nao tem guard de autenticacao por design — e esperado rodar via CLI durante setup inicial (`npx convex run`).
- A query `listModulos` retorna todos os modulos (ativos e inativos) para o admin poder gerenciar; `listModulosAtivos` retorna apenas slugs dos ativos para o guard.
