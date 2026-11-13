# Textos do backend e do banco com acentuação correta (issue #362)

## Escopo
Corrigir acentos e cedilhas nos textos que chegam à tela a partir de `convex/` e do banco: rótulos e
descrições montados no backend, seeds, os documentos já gravados a partir desses seeds e as mensagens
de erro. Continua a #344 (frontend, já em produção). Só o texto exibido muda.
**Fora do escopo (os dois PRs):** chaves, slugs, enums e valores comparados; comentários de código;
nomes de variáveis; `console.log`; mensagens em inglês (`"Not authenticated"` não é traduzida);
reescrita de frase; `DevContext.tsx`; `convex/_generated/`; `app/`, `features/`, `shared/` — com uma
única exceção, `app/(ready)/admin/permissoes/page.tsx:225-229` (ver PR1, "Rótulos de voluntário").

Entrega em pilha de 2 PRs, ambos vinculados à #362:

| PR | Ramo | Base | Conteúdo |
|----|------|------|----------|
| 1 | `feature/textos-backend-rotulos` | `main` | Textos de tela e seeds + migração dos dados gravados |
| 2 | `feature/textos-backend-erros` | PR1 | Mensagens de erro + testes que comparam o texto |

Material de apoio (levantamento com `arquivo:linha`, fora do repo), em
`/tmp/claude-1000/-home-andrechoi-projects-ipc/25dd5eff-7892-4a94-be83-346f4668110b/scratchpad/f362/`:
`levantamento.md`, `erros.tsv`, `textos_visiveis_3arq.tsv`, `campos_sem_acento.tsv`.
As listas vieram de uma varredura por lista de palavras e **têm lacunas** (ex.: não marcaram
"Diretorio", "Repertorio", "extraidos", "Lider", "estara"). Cada arquivo tocado é relido por inteiro.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `funcoes` | Dado: `label` de até 3 documentos (migração). Schema não muda |
| `modulos` | Dado: `label` e `descricao` de até 14 documentos (migração). Schema não muda |
| `ministerios` | Dado: `nome` (1) e `descricao` (5) de até 5 documentos (migração). Schema não muda |
| `multimidiaChecklistTemplate` | Dado: `item` de até 5 dos 7 documentos (migração). Schema não muda |
| `multimidiaChecklist` | Nenhuma: as cópias por culto ficam como estão (histórico) |

Confirmado no código: as quatro tabelas gravam o texto do seed e os seeds só inserem, nunca atualizam
(`convex/escalas/funcoes.ts:123-136`, `convex/modulos/mutations.ts:8-21` insere `MODULOS_INICIAIS`
inteiro, `convex/ministerios/mutations.ts:155-180`, `convex/multimidia/mutations.ts:143-168` só insere
com a tabela vazia). Por isso corrigir o seed não corrige produção.
`convex/schema.ts` não é tocado (sem índice novo: as quatro tabelas são pequenas e fixas).

## Permissões
Nenhum gate muda. A migração é `internalMutation` (só roda por `npx convex run`). As chaves de
permissão (`"gravacoes:read"` etc.) e as chaves de `VOLUNTEER_PERMISSION_SETS` não mudam.

## Impacto em Shared
- [x] Toca `convex/preferencias/rbac.ts` e `convex/preferencias/rbacHelpers.ts` (zona de perigo):
  só literais de exibição no PR1 e mensagens de erro no PR2. Os dois PRs são sequenciais (pilha),
  nunca em paralelo com outra feature que mexa nesses arquivos.
- [x] Toca `convex/_shared/requirePermission.ts:68,106` no PR2 (`"Sem permissao"`, usado por quase
  todos os módulos e por 3 testes).
- [x] Toca uma tela, `app/(ready)/admin/permissoes/page.tsx:225-229`, só nos argumentos de `.replace`
  que casam o rótulo de voluntário (sem query, mutation ou componente novo; `CONTEXT_MAP` não muda).
- [ ] Não toca `convex/schema.ts`, `convex/auth/*`, `types/auth.ts`, `FileUpload.tsx`, `DevContext.tsx`.

## PR1 — Rótulos e textos de tela (`feature/textos-backend-rotulos`)

### Texto no código (só o valor exibido)
| Arquivo | O que muda | O que não muda |
|---------|------------|----------------|
| `convex/escalas/funcoes.ts:7,8,14` | `label`: Confissão, Pregação, Multimídia | `slug` |
| `convex/modulos/constants.ts:9-29` | `label` e `descricao` | `slug`, `MODULOS_SLUGS` |
| `convex/ministerios/mutations.ts:160-164` | `nome` "Multimídia" e as 5 `descricao` | `papeis` |
| `convex/membros/completeness.ts:55,61,65` | `label` | `key` (`:54` `"endereco"` etc.) |
| `convex/preferencias/rbac.ts:69-156` | valores do mapa de `getPermissionLabel` | chaves de permissão |
| `convex/preferencias/rbac.ts:161-189` | texto devolvido por `getPermissionModule` | argumento de `startsWith` |
| `convex/preferencias/rbac.ts:191-277` | valores de `getPermissionDescription` | chaves de permissão |
| `convex/preferencias/rbacHelpers.ts:191,217,224,230` | `label`: "Voluntário …" e "Líder Biblioteca" | chaves (`voluntario_louvor`…) e `permissions` |
| `app/(ready)/admin/permissoes/page.tsx:225-229` | 1º argumento dos `.replace` de "Voluntário " e "Líder " | os substitutos (`""`, `"L."`) e os outros dois `.replace` |
| `convex/multimidia/mutations.ts:150-158` | 5 dos 7 itens do modelo de checklist | `:154` e `:155`, que já estão certos |
| `convex/turmas/seeds.ts:389-394,396-399,402,408,412,420,441-447` | `NM_DESCRICAO`, `NM_EMENTA`, títulos de `NM_PLANO`, `NM_APRESENTACAO` | `id`, nomes de turma e curso, `:654-655` (ver exceções) |
| `convex/turmas/seedDemo.ts:447,454,465,501,507` | `label` das perguntas e respostas de texto livre | `opcoes`, `motivos`/`valores` (ver exceções) |
| `convex/ausencias/mutations.ts:129-130` | `title` e a parte literal do `body` ("estará ausente") | placeholders |

Os três textos de `rbac.ts` só existem no código (únicas chamadas em `rbac.ts:362-364`); o módulo é
usado como chave de agrupamento só em memória (`PermissionMatrix.tsx:81-82`), então mudar é seguro
desde que cada nome de módulo fique idêntico em todas as linhas que o devolvem (ex.: as 5 de
"Educacional Infantil" não mudam). As mensagens de erro de `rbac.ts` ficam para o PR2.

### Rótulos de voluntário: os dois lados mudam juntos
O rótulo de `rbacHelpers.ts` é lido por código: `app/(ready)/admin/permissoes/page.tsx:225-229` monta o
selo curto com `vs.label.replace("Voluntario ", "").replace("Lider ", "L.")`. Se só o backend mudar, o
selo passa a mostrar o nome inteiro. No mesmo commit dos 4 rótulos, os dois argumentos de busca viram
`"Voluntário "` e `"Líder "`. O selo continua curto e igual ao de hoje ("Louvor", "Multimídia",
"Biblioteca", "L.Biblioteca"), agora acentuado. É a única linha fora de `convex/` nesta pilha e vai
citada no corpo do PR.

### Exceções: parece texto, mas é valor (não muda; vai para "Ficou de fora")
- `convex/turmas/seeds.ts:654-655` — títulos dos marcos ("Periodo de entrevistas…", "Apresentacao dos
  Novos Membros e Batismo"): entram na chave da dedupe `${data}|${titulo}` (`:658-665`) contra
  `calendarioEventos`. Acentuar faria o seed duplicar o evento já gravado.
- `convex/turmas/seedDemo.ts:458-459` (`opcoes`) e `:500,506,512` (`motivos`/`valores`): a resposta é
  validada contra `Set(opcoes)` em `convex/turmas/mutations.ts:485`; são valores.
- Regra para o resto dos seeds de turmas: se o literal entra em comparação, dedupe ou validação, é
  valor. Na dúvida, não troca e fica registrado com `arquivo:linha`.

### Dedupe do seed de ministérios
`convex/ministerios/mutations.ts:171` compara `m.nome === seed.nome`. Com o seed em "Multimídia", um
banco ainda com "Multimidia" ganharia um ministério duplicado. A comparação passa a ignorar acentos
dos dois lados (normalização NFD local, sem helper novo em `_shared`), e o `collect()` sai de dentro
do laço (uma leitura só).

### Migração de dados
- Arquivo novo `convex/migration/textosAcentos.ts`, `export const run = internalMutation({ args: { dryRun: v.optional(v.boolean()) } })`,
  no molde de `convex/migration/vinculoIgreja.ts:19` (`convex/gravacoes/migrations.ts` serve de
  referência para o comentário "rodar após o deploy" + comando).
- **Padrão `dryRun = true`** (diferente do molde, que usa `false`): chamar sem argumento só conta. Só
  grava com `{"dryRun":false}` explícito.
- A migração fica no código depois de rodar em produção, como as demais do repo.
- Mapa explícito antigo → novo no próprio arquivo, por tabela e campo, com os textos antigos copiados
  de `git show main:<arquivo>` (não importar dos seeds: depois do PR1 eles já têm o texto novo):
  - `funcoes.label` — 3 pares, aplicados por `slug` (índice `by_slug`);
  - `modulos.label` e `modulos.descricao` — por `slug` (índice `by_slug`);
  - `ministerios.nome` e `ministerios.descricao` — um `collect()` da tabela (não há índice por nome);
  - `multimidiaChecklistTemplate.item` — 5 pares, um `collect()` da tabela (7 linhas, sem índice:
    `convex/schema.ts:1361-1365`). As cópias em `multimidiaChecklist` **não** são lidas nem escritas;
  - seeds de turmas já gravados (textos antigos de `git show origin/main:convex/turmas/seeds.ts`):
    curso "Curso de Novos Membros" (`descricao`, `ementa`, `planoAulas[].titulo`, 4 títulos),
    turma "Novos Membros 2/2026" (`descricao`) e `turmaEncontros.titulo` (copiado do plano).
    Curso localizado por `by_status` (ATIVO, depois INATIVO), turma por `by_curso` e encontros por
    `by_turma`, todos com `take`, sem `.filter()`. `planoAulas[].detalhe` (6 textos com "Efesios") e `turmaEncontros.observacoes` (cópia do detalhe) entram com a mesma regra; `titulo` e `observacoes` do mesmo encontro contam como um documento.
- Regra: troca **só** quando o valor gravado é exatamente o texto antigo. Texto editado pelo admin,
  já corrigido ou diferente em qualquer caractere fica como está. `slug` nunca é escrito.
- Idempotente por construção: a segunda execução não encontra texto antigo.
- Retorno: `{ dryRun, funcoes, modulos, ministerios, checklistTemplate, cursos, turmas, turmaEncontros }`, cada um com o número de documentos alterados
  (ou que seriam alterados, em `dryRun`). Sem `ctx.db.patch` quando `dryRun` é `true`.
- Sem audit log: correção técnica de grafia, feita por função interna sem usuário.

Comandos:
```bash
# dev (durante o PR1); sem argumento também só conta
npx convex run migration/textosAcentos:run '{"dryRun":true}'
npx convex run migration/textosAcentos:run '{"dryRun":false}'
# produção: só depois do deploy do backend e com OK explícito do André
npx convex run migration/textosAcentos:run '{"dryRun":true}' --prod
npx convex run migration/textosAcentos:run '{"dryRun":false}' --prod
```
Contagem esperada num banco semeado e nunca editado: `funcoes` 3, `modulos` 14, `ministerios` 5,
`checklistTemplate` 5, `cursos` 1, `turmas` 1, `turmaEncontros` até 4 (os 4 títulos acentuados do plano).
Em produção pode ser menor (texto editado ou módulo ausente); número maior que esse é erro.

### Teste
`convex/__tests__/textosAcentosMigracao.integration.test.ts` (convex-test), sete casos:
1. texto exatamente igual ao antigo é trocado, nas sete tabelas, e o `slug` continua igual;
2. texto editado (ex.: `funcoes.label` "Pregação da Palavra", `ministerios.descricao` própria) não muda;
3. segunda execução devolve zero em todas as tabelas;
4. `dryRun: true` e chamada sem argumento devolvem as contagens e não gravam;
5. um documento de `multimidiaChecklist` com o texto antigo continua igual depois da migração.
Mais dois casos para o seed: com "Multimidia" já gravado, `seedMinisterios` não insere outro; rodado duas vezes, termina com 5 ministérios.
Casos de turmas: troca exata de curso, turma e encontros; texto editado não muda; `dryRun` confere todas as tabelas, inclusive que `modulos` e o item do checklist não mudaram.
`convex/__tests__/seedsInternal.integration.test.ts` roda `seedModulos` de verdade (`:45`), mas não
compara texto; não muda.

## PR2 — Mensagens de erro (`feature/textos-backend-erros`)

- Lista de partida: `erros.tsv` (272 `throw new Error`/`ConvexError` com palavra marcada, de 448).
  Maiores concentrações: `turmas/mutations.ts` (30), `membros/eclesiastico.ts` (26),
  `biblioteca/mutations.ts` (15), `educacional/mutations.ts` (14).
- Regra única: **só acentuação**. Não reescrever, não trocar pontuação, não traduzir inglês
  (`"Gravacao not found"` em `gravacoes/mutations.ts:52` ganha só o acento da palavra em português).
- Ficam como estão: placeholders `${...}` (`${mes}`, `${ex.codigo}`, `${livro.titulo}`), o trecho que
  vem do banco em `turmas/mutations.ts:478` (`${pergunta.label}`) e falsos positivos da lista
  ("ja"/"esta" em frase que já está certa). `public/inscricoesEvento.ts:201-209` já está acentuado:
  nada muda ali.
- A mesma mensagem repetida em vários arquivos muda em todos (ex.: "Sem permissão",
  "Membro não encontrado"); conferir com grep da forma antiga ao final.
- Testes que comparam texto mudam no mesmo commit da mensagem. Lista completa no `levantamento.md`
  seção 4; os que quebram com certeza:
  `convex/membros/__tests__/mutations.integration.test.ts:95,247,269`,
  `convex/membros/__tests__/acesso.integration.test.ts:430,454,483`,
  `convex/gravacoes/__tests__/cascadeDelete.integration.test.ts:227`,
  `convex/__tests__/convitesPermissao.integration.test.ts:71,83`,
  `convex/__tests__/inscricoesEventoExcluir.integration.test.ts:112`,
  `convex/__tests__/bibliotecaImportacao.integration.test.ts:256,262`,
  `convex/__tests__/certificados.integration.test.ts:418,453`,
  `convex/__tests__/cursosTurmas.integration.test.ts:241,411,496,515`,
  `convex/files/__tests__/urls.test.ts:56`.
  Em `cursosTurmas.integration.test.ts:483` o texto vem do `label` do fixture (`:447`): não muda.
  No teste também só entra acento, dentro da string ou regex comparada.
- Um commit por pasta de `convex/` (ou grupo de pastas pequenas), cada um com seus testes.

## Riscos
- **Texto que é valor.** Regra herdada da #344: na dúvida, é valor e não muda. Nunca editar `slug`,
  `key`, `id`, chave de objeto, chave de permissão, item de `v.literal`/`v.union`, nem argumento de
  `===`, `includes`, `startsWith`, `case`. Riscos A–D em `docs/implementations/ready/textos-acentos.md`.
- **Nome de ministério lido por código.** `app/(ready)/educacional/page.tsx:150` e
  `features/educacional/hooks/useProfessorTurmas.ts:16` acham o ministério por
  `nome.toLowerCase().includes("educacional")`. "Educacional Infantil" não muda; só "Multimidia" muda
  e nenhum código o procura pelo nome.
- **Rótulo de voluntário casado por `.replace` no frontend** (`admin/permissoes/page.tsx:225-229`):
  backend e tela mudam no mesmo commit; o selo curto é conferido no navegador.
- **Títulos de marco e opções de formulário nos seeds de turmas** são valor (dedupe e validação): ver
  "Exceções" no PR1.
- **Nomes de turma e curso em seeds são chave** (`t.nome === TURMA_NOME` em `convex/turmas/seedDemo.ts`
  e `convex/turmas/seeds.ts`, `c.nome ===` em `convex/cursos/seeds.ts:23`): não mudam.
- **Ordem em produção.** Código antes do dado: merge da pilha → `npx convex deploy` manual a partir
  do `main` atualizado (push no `main` só publica o frontend) → migração com `dryRun` → conferir
  contagens → migração para valer. Deploy e migração `--prod` só com OK explícito do André. Entre o
  deploy e a migração a tela mostra o texto antigo do banco, sem erro.
- **Frontend comparando mensagem.** O levantamento não achou nenhum (`shared/lib/utils/convexError.ts`
  só extrai o texto). O implementador confirma antes de trocar:
  `grep -rnE "message\)?\s*(\.includes|\.startsWith|===|\.match|\.test)" app features shared`.
  Se aparecer comparação, os dois lados mudam juntos ou a mensagem fica como está e vai para "Ficou de fora".
- **Volume do PR2** (cerca de 270 linhas em mais de 50 arquivos): o script de diff só-acento é a
  defesa contra frase alterada por engano.
- **`rbac.ts`/`rbacHelpers.ts`** são zona de perigo para trabalho paralelo: não abrir outro ramo
  nesses arquivos enquanto a pilha estiver aberta.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/migration/textosAcentos.ts` | Criar (PR1) | Migração com `dryRun` e mapa antigo → novo |
| `convex/__tests__/textosAcentosMigracao.integration.test.ts` | Criar (PR1) | Migração e dedupe do seed |
| Arquivos da tabela do PR1 | Modificar (PR1) | Só literais de exibição; dedupe em `ministerios/mutations.ts:171` |
| `app/(ready)/admin/permissoes/page.tsx` | Modificar (PR1) | Só `:226-227`, argumentos de busca dos `.replace` |
| Arquivos de `convex/` listados em `erros.tsv` | Modificar (PR2) | Só acento nas mensagens |
| Testes listados no PR2 | Modificar (PR2) | Acompanham a mensagem |
| `docs/implementations/` | Mover | `not-started` → `wip` ao começar, → `ready` ao concluir |

## Ordem de Implementação
1. PR1: textos no código (um commit por módulo) → dedupe do seed → migração + teste → rodar a
   migração em dev → conferência no navegador.
2. PR2 sobre o PR1: grep de comparação no frontend → mensagens e testes, pasta por pasta.
3. Corpo de cada PR traz a seção "Ficou de fora" com `arquivo:linha` e motivo.
4. Depois do merge (André): `npx convex deploy`, migração `--prod` com `dryRun`, depois para valer.

## Critérios de Verificação
Em cada PR:
- `npm run lint` sem erro.
- `npx tsc --noEmit` sem erro.
- `npx vitest run <arquivos de teste tocados ou novos>` passando.
- Script de diff só-acento sem erro: adaptar
  `/tmp/claude-1000/-home-andrechoi-projects-ipc/25dd5eff-7892-4a94-be83-346f4668110b/scratchpad/verifica_acentos.py`
  trocando os caminhos do `git diff` por `convex` (no PR1, também `app/(ready)/admin/permissoes/page.tsx`) e rodar `python3 -I <script> <base>` (base `origin/main`
  no PR1, o ramo do PR1 no PR2). Toda linha alterada tem de ser igual à original sem os acentos.
  No PR1, o arquivo novo de migração, o teste novo e o trecho da dedupe aparecem como erro de hunk:
  são as únicas exceções aceitas e vão citadas no PR. Cada `ALERTA` (linha com `===`, `slug:`, `key:`,
  `id:`, `startsWith(`) é conferido à mão; em `getPermissionModule` e nos seeds o alerta é esperado.
- `git diff <base>...HEAD -- convex | grep -E "^[-+].*(slug|key):"`: em cada par, o valor de
  `slug`/`key` é idêntico antes e depois.

Só no PR1:
- Migração em dev: `dryRun` mostra as contagens esperadas (até 3 / 14 / 5 / 5 / 1 / 1 / 4); a execução real devolve os
  mesmos números; nova execução devolve zero.
- Navegador, local (`npm run dev`, depois da migração em dev), a 390px e a 1280px:
  - planejamento de cultos (`/cultos`): rótulos "Confissão", "Pregação", "Multimídia";
  - escalas, aba de equipes (`features/escalas/components/EquipesTab.tsx:83` exibe `funcao.label`):
    "Multimídia" acentuado;
  - matriz de permissões (`/admin/permissoes`): grupos, rótulos e descrições acentuados, e nenhum
    grupo duplicado ou dividido;
  - selos de voluntário na lista de `/admin/permissoes`: continuam curtos ("Louvor", "Multimídia",
    "Biblioteca", "L.Biblioteca"), sem "Voluntário"/"Líder" por extenso;
  - card de completude do perfil no dashboard: "Endereço", "Contato de emergência", "Profissão".

Só no PR2:
- `grep -rnE "throw new (Error|ConvexError)" convex | grep -vE "__tests__|_generated"` relido contra
  `erros.tsv`: o que sobrou sem acento está em "Ficou de fora" com motivo.

No topo da pilha, uma vez: `npm test` completo, `npm run lint` e `npx tsc --noEmit`.

## Perguntas em aberto
Nenhuma. Decidido depois da primeira versão: o modelo de checklist de multimídia entra na migração
(só `multimidiaChecklistTemplate`, troca exata) e a migração permanece no código.
