# Controle de tentativas no Primeiro acesso

## Escopo
Aplicar à verificação do "Primeiro acesso" (`verificarAcessoDireto`) o mesmo controle de tentativas que já protege "Esqueci minha senha", reaproveitando o mecanismo existente. Issue #348.

Fora do escopo: os dados pedidos no Primeiro acesso, a forma como o cadastro é localizado e o caso de telefone compartilhado.

## Modelos Afetados
| Tabela | Tipo de Mudança |
|--------|-----------------|
| `recuperacaoTentativas` | Sem mudança de schema — passa a guardar também os contadores do primeiro acesso |
| `membroConvites` | Sem mudança — o convite continua sendo criado só no acerto |

## Permissões
- Rota pública, sem papel.
- Nenhuma permissão nova e nenhum elemento novo de UI.

## Decisões de desenho

### 1. Mecanismo único, em módulo próprio
Extrair de `convex/membros/recuperarSenha.ts` para `convex/membros/tentativas.ts` o que hoje está embutido em `solicitarRecuperacao`:

| Função | Origem em `recuperarSenha.ts` | Papel |
|--------|-------------------------------|-------|
| `lerTentativas(ctx, origens, agora)` | :136-154 e `chaveDeTentativa` (:52-60) | Lê um contador por origem (índice `by_chave`, `.unique()`) e devolve `{ contadores, bloqueado }` |
| `registrarFalha(ctx, contadores, agora)` | :170-182 | Cria, incrementa ou reinicia cada contador |
| `zerarTentativas(ctx, contadores)` | :186-188 | Apaga os contadores existentes |

- As constantes de limite e de janela vão junto e passam a existir em um só lugar; `limparExpirados` importa a janela de lá.
- `solicitarRecuperacao` chama as três funções com **as mesmas strings de origem de hoje** e na mesma ordem. É movimentação de código, sem mudança de comportamento: a prova é o arquivo de testes da recuperação passar sem nenhuma edição.
- O módulo novo só tem funções auxiliares (nenhuma `query`/`mutation` exportada) e não usa `.filter()` nem `collect()`.

### 2. Falha gravada exige retorno, não `throw`
Um `throw` em mutation desfaz todas as escritas, inclusive a gravação da falha. Por isso `verificarAcessoDireto` passa a **retornar um status** em todos os desfechos posteriores à leitura dos contadores, como `solicitarRecuperacao` já faz:

```ts
type ResultadoAcessoDireto =
  | { status: "ok"; token: string }
  | { status: "nao_confere" | "bloqueado" | "inativo" | "ja_ativado" };
```

Sequência do handler, preservando a ordem atual das checagens:
1. Formato do CPF inválido → continua `throw new ConvexError(...)` (`acesso.ts:86-88`). Acontece antes de qualquer leitura ou escrita e não conta como tentativa.
2. `lerTentativas`; se bloqueado → `{ status: "bloqueado" }`, sem buscar o cadastro e sem escrever.
3. Cadastro não encontrado ou CPF não confere (`acesso.ts:104`, `:108`) → `registrarFalha` e `nao_confere`.
4. Cadastro não ativo (`:110`) → `zerarTentativas` e `inativo`. Fica antes da busca do membro, como hoje, para a mensagem desse caso não mudar.
5. Cadastro sem membro (`:118`) → `registrarFalha` e `nao_confere`.
6. `zerarTentativas`; depois `ja_ativado` (`:120`) ou criação do convite e `{ status: "ok", token }`.

`inativo` e `ja_ativado` são retorno, e não `throw`, porque a zeragem é uma escrita e seria desfeita.

### 3. Contadores próprios do fluxo
Mesma tabela, mesmo limite, mesma janela e mesma limpeza diária, com contadores próprios do primeiro acesso, sem alterar os da recuperação. Assim `solicitarRecuperacao` não muda de comportamento e os registros já existentes em produção continuam válidos.

A contagem segue o modelo da recuperação, com um contador para cada dado informado. As chaves usam os valores já normalizados pelo handler (`alvoDigits`, `acesso.ts:93`, e `prefix`, `acesso.ts:85`), nunca o texto digitado.

### 4. Contrato com a tela de signin
`handlePrimeiroAcesso` (`app/(auth)/signin/page.tsx:89-105`) passa a mapear o status:

| Status | Texto exibido | Situação |
|--------|---------------|----------|
| `ok` | — (redireciona para `/ativar/<token>`) | igual |
| `nao_confere` | "Telefone ou CPF nao conferem" | texto igual ao atual |
| `inativo` | "Cadastro nao esta ativo. Procure a secretaria." | texto igual ao atual |
| `ja_ativado` | "Acesso ja ativado. Entre com sua senha." | texto igual ao atual |
| `bloqueado` | "Muitas tentativas. Tente de novo mais tarde ou procure a secretaria." | novo, sem citar o tempo |

- Os três textos existentes saem de `verificarAcessoDireto` e passam a morar na tela, copiados sem alteração. O texto de cadastro não ativo continua também em `concluirAtivacao` (`acesso.ts:204`), que não muda.
- Todo status diferente de `ok` precisa de `setLoading(false)`: hoje o reset só existe no `catch` (`signin/page.tsx:103`) e o botão ficaria preso em "Verificando...". Seguir `app/(auth)/esqueci-senha/page.tsx:91`.
- O `catch` atual permanece para o erro de formato do CPF e para falha inesperada.
- A caixa de erro inline (`:188-192`) não muda.

## Impacto em Shared
- [x] `shared/components/layout/DevContext.tsx`: atualizar as entradas `/signin` e `/esqueci-senha` (arquivo novo e nota sobre o controle de tentativas).
- [ ] `convex/schema.ts`: sem mudança.
- [ ] `convex/auth/*`, `convex/crons.ts`: sem mudança (a limpeza diária já cobre a tabela inteira).
- Risco de regressão: "Esqueci minha senha" (código movido) e ativação de acesso pela tela de login.

## Riscos
- **Regressão na recuperação de senha** ao mover o código. Mitigação: testes existentes de `recuperarSenha` sem edição.
- **Contrato da mutation muda.** Tela antiga sobre backend novo redireciona para um link de ativação inválido em todo desfecho que não seja `ok` (`signin/page.tsx:97-98`). Tela nova sobre backend antigo recebe resposta sem `status` e o acerto não redireciona. Mitigação: seguir a ordem de publicação abaixo, sem intervalo entre os passos.
- **Pessoa legítima bloqueada por erros de terceiros.** Aqui o risco é maior que na recuperação, porque um dos dados contados não é exclusivo de uma pessoa. Aceito; a mensagem orienta a procurar a secretaria.

## Arquivos a Criar/Modificar
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/membros/tentativas.ts` | Criar | Constantes e as três funções do mecanismo |
| `convex/_generated/api.d.ts` | Modificar | Gerado pelo codegen ao criar o módulo novo; é versionado |
| `convex/membros/recuperarSenha.ts` | Modificar | Usa o módulo novo; remove o código movido |
| `convex/membros/acesso.ts` | Modificar | `verificarAcessoDireto` com controle de tentativas e retorno por status |
| `app/(auth)/signin/page.tsx` | Modificar | Mapeia status para mensagem e libera o botão |
| `convex/membros/__tests__/acesso.integration.test.ts` | Modificar | Ajusta casos existentes e cobre os novos |
| `shared/components/layout/DevContext.tsx` | Modificar | Entradas `/signin` e `/esqueci-senha` |

### Testes existentes que mudam (`acesso.integration.test.ts`)
- `:53` e `:74` (acerto): passam a conferir `status: "ok"` antes de usar o token.
- `:100` (CPF incorreto): de `rejects.toThrow` para retorno `nao_confere`.
- `:124` (acesso já ativado): de `rejects.toMatchObject` para retorno `ja_ativado`.
- `:112` (formato do CPF): não muda.

### Testes novos (mesmo arquivo)
Os laços usam o limite importado de `tentativas.ts`, sem número escrito no teste; a passagem do tempo é simulada regravando `janelaInicio`, como em `recuperarSenha.integration.test.ts:114-120`.
1. Erros repetidos levam a `bloqueado`, mesmo informando depois os dados certos, e nenhum convite é criado.
2. Vencida a janela, os dados certos voltam a gerar token.
3. Acerto antes do limite apaga os contadores do fluxo.
4. A contagem acumula quando só um dos dados muda entre as tentativas e quando o mesmo telefone é digitado em formatos diferentes.
5. Cadastro não ativo com dados certos retorna `inativo`, com e sem membro vinculado (hoje sem cobertura).
6. Os dois fluxos não interferem um no outro, nos dois sentidos. Para isso `seedMembroSemAcesso` (`:14-35`) passa a aceitar `dataNascimento`: sem ele `solicitarRecuperacao` só devolve `nao_confere`; com ele, o esperado para esse membro é `primeiro_acesso`. Na outra direção, criar antes os registros da recuperação e conferir que continuam na tabela.

## Ordem de Implementação
1. Criar `tentativas.ts` e trocar o trecho de `recuperarSenha.ts` pelas chamadas; rodar os testes da recuperação.
2. Alterar `verificarAcessoDireto`.
3. Ajustar e ampliar `acesso.integration.test.ts`.
4. Alterar `signin/page.tsx`.
5. Atualizar `DevContext.tsx`.
6. Publicação, nesta ordem: rebase sobre `origin/main`; OK do André; `npx convex deploy` a partir do ramo atualizado; merge.

## Critérios de verificação
Os diffs abaixo são contra `origin/main`, depois de `git fetch origin main`.
- [ ] `npx vitest run convex/membros/__tests__/acesso.integration.test.ts convex/membros/__tests__/recuperarSenha.integration.test.ts` passa.
- [ ] `git diff origin/main...HEAD -- convex/membros/__tests__/recuperarSenha.integration.test.ts` sai vazio.
- [ ] `git diff origin/main...HEAD -- convex/schema.ts convex/crons.ts` sai vazio.
- [ ] As constantes de limite e janela são declaradas apenas em `convex/membros/tentativas.ts`, e `chaveDeTentativa` não existe mais em `recuperarSenha.ts`.
- [ ] `convex/membros/tentativas.ts` não contém `.filter(` nem `.collect(`.
- [ ] Em `verificarAcessoDireto`, nenhum `throw` ocorre depois de `lerTentativas`.
- [ ] Os três textos existentes aparecem em `signin/page.tsx` idênticos aos que estavam em `verificarAcessoDireto`.
- [ ] Em `handlePrimeiroAcesso`, todo caminho que não redireciona chama `setLoading(false)`.
- [ ] `npm run lint` passa.
- [ ] Screenshot a 390px da aba "Primeiro acesso" com a mensagem de bloqueio, o texto cabendo na caixa de erro e o botão liberado. Ambiente: frontend local sem bypass, Convex de desenvolvimento e telefone inventado. Nunca provocar o bloqueio em produção.
- [ ] Fora das constantes em `tentativas.ts`, nenhum arquivo alterado, mensagem de commit ou texto do PR cita o valor do limite ou da janela, nem descreve como a contagem é feita.
