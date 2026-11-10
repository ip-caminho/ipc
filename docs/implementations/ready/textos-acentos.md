# Textos da interface com acentuação correta (issue #344)

## Escopo
Corrigir acentos e cedilhas em todo texto visível ao usuário em `app/`, `features/` e `shared/`
(rótulos, títulos, placeholders, toasts, `aria-label`, mensagens Zod, `confirm`). Só o texto exibido
muda: nenhuma chave, enum, `value`, nome de campo, rota ou dado gravado. Bug de texto, sem feature nova.
**Fora do escopo (todos os PRs):** `shared/components/layout/DevContext.tsx` (188 ocorrências, notas
internas), `convex/`, testes, `shared/components/ui/`, comentários de código, nomes de variáveis.

## Modelos Afetados e Permissões
Nenhuma tabela (sem schema, migração ou escrita de dado). Nenhum gate de permissão é tocado.

## Impacto em Shared
- [x] Toca `shared/` no PR4 (exceto DevContext e `ui/`), só literais de texto; em `FileUpload.tsx` e
  `navigation.ts`, `href` e `permission` não mudam. Não toca `convex/schema.ts`, RBAC nem `types/auth.ts`.

## Riscos — texto que parece rótulo mas é valor
Regra geral: na dúvida, é valor. Só troca o literal que termina na tela e não é lido por código.
Nunca editar o lado direito de `value:`/`value=`, `key`, `slug`, `id`, `name`, `htmlFor`, `href`,
chave de objeto, item de `z.enum`, argumento de `===`/`includes`/`startsWith`/`case`, parser do nuqs.

**A. Não trocar; fica como está e é citado no PR (dado gravado ou casado por código)**
- `features/louvor/lib/constants.ts:9,12,17` — tags `adoracao`, `pascoa`, `contemporaneo`: gravadas em
  `louvores.tags` e filtradas por igualdade exata (`convex/louvor/queries.ts:20`). Trocar divide a tag em duas.
- `features/louvor/components/LouvorForm.tsx:187`, `app/(ready)/gravacoes/[id]/admin/page.tsx:179` — exemplos de tags; idem.
- `app/(ready)/meu-perfil/page.tsx:573` e `features/membros/components/GuidedProfileFlow.tsx:264` —
  nacionalidades (`Japones(a)`, `Chines(a)`, `Portugues(a)`, `Frances(a)`) gravadas como texto em `entidades.nacionalidade`.
- `shared/bible/data/books.ts:26-99` (`aliases` como `genesis`, `joao`) e `features/louvor/lib/chordpro.ts:25`
  (`refrao`, `pre-refrao`) — formas sem acento de propósito, para casar o que o usuário digita.

**B. Já acentuado, mas é chave: não "padronizar" nem mexer**
- Separadores de louvor gravados em `cultos.louvores` como `---Abertura|Confissão|Ceia|Oferta`:
  `features/escalas/components/LouvorOrdemSection.tsx:22-27,348-351`,
  `features/boletim/components/BoletimContent.tsx:278-279,288,330,350`,
  `app/(ready)/proximo-domingo/page.tsx:160-161,197`.

**C. Par chave + rótulo: muda só o `label` (ou o valor do mapa), a chave fica**
- `features/membros/lib/constants.ts:19-25,29-33,38,40,59-60,65,67,77,92,98,100` (ex.: `PROFISSAO_FE` →
  "Profissão de Fé"); os enums de `features/membros/lib/validations.ts:40-43` não mudam.
- `app/(auth)/signin/page.tsx:31-33` — chaves `nao_confere`/`ja_ativado` vêm do backend; só a mensagem muda.
- `app/(ready)/gravacoes/nova/page.tsx:28-31`, `features/gravacoes/components/IaProgressPanel.tsx:33`, `IaResultadoDisplay.tsx:78`
  (`value="transcricao"`), `app/(ready)/calendario/page.tsx:59` (`"mes"`, nuqs), `features/tarefas/lib/constants.ts:18,21,22`.
- Funções da escala: `"PREGACAO"`/`"CONFISSAO"` em `BoletimContent.tsx:194` (`e.funcao === funcao`),
  `app/(ready)/cultos/page.tsx:163,504-505`, `features/escalas/components/CultosMobileView.tsx:231`.
- `features/educacional/components/ProximosAniversarios.tsx:35-38` — `titulo` é comparado na linha 122
  (`=== "Hoje"`); "Este mes" pode mudar. Os dois lados de uma comparação mudam juntos ou não mudam.

**D. Texto que vem do backend ou do banco: não se resolve nestes PRs**
- "Confissao", "Pregacao", "Multimidia" do Planejamento de cultos (exemplos da issue) são o campo `label`
  da tabela `funcoes` (seed em `convex/escalas/funcoes.ts:7,8,14`), exibido em `cultos/page.tsx:344,509` e
  `CultosMobileView.tsx:564`. O frontend já tem o rótulo certo em `features/escalas/lib/constants.ts:15-16,20`.
- `convex/membros/completeness.ts:55,61,65`, `convex/preferencias/rbac.ts:106-107,172`, `convex/modulos/constants.ts:22,27`
  e cerca de 210 `throw new Error` sem acento que chegam ao usuário via `toast.error(error.message)`.

## Arquivos a Criar/Modificar
| PR | Onde | Linhas na varredura* |
|----|------|------|
| 1 cadastro | `features/{membros,secretarioExecutivo,onboarding,preferencias}`, `app/(ready)/{membros,meu-perfil}`, `app/(auth)` | ~130 |
| 2 culto | `features/{gravacoes,louvor,escalas,boletim,calendario,dashboard}` e rotas `gravacoes, louvor, escalas, cultos, calendario, proximo-domingo, dashboard` | ~74 |
| 3 ensino e cuidado | `features/{educacional,turmas,pastoreio,pequenosGrupos,biblioteca,salas,pedidosOracao}` e rotas | ~116 |
| 4 restante | demais features, `app/(public)`, `app/(ready)/admin` e demais rotas, `shared/` | ~37 |

\* 357 linhas por regex, com falsos positivos (`gravacao.titulo`) e negativos ("Como e conhecido"): cada PR
relê os arquivos do seu módulo. Nenhum arquivo novo; `CONTEXT_MAP` do DevContext não muda.

## Ordem de Implementação
1. PRs empilhados 1 → 2 → 3 → 4, um commit por módulo, cada um vinculado à #344.
2. Em cada PR, antes de abrir:
   - `npm run lint` e `npx vitest run` nas pastas tocadas que têm teste (hoje nenhum afirma texto de interface);
   - diff só de acentuação: toda linha alterada é igual à original depois de remover acentos, e nenhuma
     cai nos padrões proibidos da regra geral. Conferência visual fica para depois do merge (sem preview de branch).
3. No topo da pilha, uma vez: `npm test` completo e `npx tsc --noEmit`.
4. Corpo de cada PR traz a seção "Ficou de fora", com `arquivo:linha` e motivo: os itens A e D do módulo,
   o DevContext e qualquer string nova em que houve dúvida entre rótulo e valor.

## Perguntas em aberto
1. Rótulos da tabela `funcoes`: corrigir dado e seed em `convex/` num PR à parte, ou mapear por `slug` no frontend?
2. Textos sem acento vindos de `convex/` (item D): abrir issue própria ou a #344 fecha sem eles?
3. Tags de louvor e nacionalidades (item A): manter sem acento ou migrar o dado gravado em outra issue?
