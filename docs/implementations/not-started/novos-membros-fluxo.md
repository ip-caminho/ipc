# Fluxo de Novos Membros — revisão e implementação

> Origem: revisão do fluxo de Novos Membros a partir do questionário e da agenda que a igreja já usa
> no Notion (2º semestre de 2026). Passou por revisão adversarial contra o código antes de ser
> aprovado — as premissas derrubadas estão registradas abaixo, de propósito, para não voltarem.

## Contexto

O módulo de turmas foi construído em cima do questionário de **Catecúmenos**. Ao trazer o segundo
curso — **Estudo para Candidatos a Novos Membros** — apareceram regras que o modelo não sabe
representar, e uma diferença de natureza: o inscrito de Novos Membros **vira membro da igreja** ao ser
apresentado.

Datas que orientam: inscrição de **16/08 a 13/09**, curso de **20/09 a 29/11** (8 encontros,
domingos 08h30, 1º andar), entrevistas **06/12**, apresentação e batismo **13/12**.

Este plano passou por uma revisão adversarial contra o código, que derrubou três premissas da primeira
versão. As correções estão incorporadas e sinalizadas.

### O que a revisão encontrou

1. **Aprovação por faltas, não por percentual.** O curso aprova quem tiver "no máximo 3 faltas em 8
   encontros". O sistema só sabe `percentual >= frequenciaMinima` (`convex/turmas/lib/frequencia.ts:60`,
   a única expressão de aptidão que existe). Converter para 63% funciona por acaso do arredondamento e
   quebra se uma aula for cancelada: 3 faltas em 7 aulas dariam 57% e reprovariam alguém dentro do
   limite combinado.

2. **Os encontros não são semanais.** 20/09, 27/09, 04/10, 18/10, 25/10, 08/11, 15/11 e 29/11 — todos
   domingos de 2026, com três intervalos de 14 dias (pulam 11/10, 01/11 e 22/11). `gerarDatasAulas`
   (`convex/turmas/lib/aulas.ts:41-46`) só produz cadência fixa de 7 dias.

3. **Aula fantasma — o risco mais grave, e que a primeira versão do plano não viu.**
   `minhasTurmasInstrutor` deduz "hoje tem aula" do **dia da semana da turma**
   (`convex/turmas/queries.ts:92`), não da lista de encontros; e o `ChamadaWidget` **cria** o encontro
   ao abrir a chamada (`features/turmas/components/ChamadaWidget.tsx:94-100`), que ao salvar entra no
   denominador da frequência (`mutations.ts:508-515`). Nos domingos pulados o professor veria o card e
   materializaria uma aula que não existe. Sob percentual isso apenas dilui; **sob "máximo de 3 faltas",
   cada aula fantasma é uma falta real e reprova quem estava dentro do combinado.**

4. **`create` também gera aulas.** `convex/turmas/mutations.ts:139-147` chama `criarAulas` quando o
   curso tem `totalAulas`. Se o curso de Novos Membros receber `totalAulas: 8` antes da turma existir,
   a turma nasce com 8 domingos consecutivos errados — e `gerarAulas` passa a recusar com "Esta turma ja
   tem aulas" (`mutations.ts:178`).

5. **`registrar` não valida respostas no servidor** (`convex/turmas/mutations.ts:297-393`):
   obrigatoriedade e opções válidas são checadas só no cliente, numa mutation pública.

6. **`sexo` é opção morta** (`features/turmas/lib/constants.ts:33` versus o render em
   `app/(auth)/inscricao/[token]/page.tsx:195,209,218`), e `features/turmas/lib/validations.ts:32-36`
   divergiu do schema.

### Premissas derrubadas pela revisão

- **A inscrição de 16/08 não depende de nada disto.** `registrar` só lê a turma pelo token e a janela
  (`mutations.ts:314-334`); não toca em `turmaEncontros`. O caminho crítico é a **turma existir com o
  formulário** — não o gerador de aulas.
- **O calendário irregular já é possível hoje, sem código.** `createEncontro` aceita data e título
  livres (`mutations.ts:430-446`) e o bloco "Novo encontro" está sempre visível na aba Presença para
  quem tem `turmas:manage_inscricoes` (`app/(ready)/turmas/[id]/page.tsx:371-398`). São 8 cliques. O
  gerador por datas é conveniência, não bloqueio.
- **Criar filho pelo próprio membro foi removido de propósito** (`convex/membros/selfService.ts:229-233`):
  hoje o membro **solicita** e a secretaria aprova (`convex/membros/solicitacoes.ts:31,119` →
  `familiaHelpers.ts:120-160`). A primeira versão deste plano propunha ressuscitar a criação direta —
  seria regressão de design.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Critério | **Limite de faltas** como alternativa ao percentual. Novos Membros = máx. 3; Catecúmenos segue percentual |
| Plano de aulas | Plano no **curso** (títulos dos 8 encontros); ao gerar, a aula herda o título |
| Marcos finais | Entrevistas e apresentação/batismo viram **eventos no calendário** |
| Editor de perguntas na tela | **Não fazer.** As perguntas definidas bastam; aplico por comando |
| Virar membro | Desenhar agora, construir depois — reusando o que existe, inclusive o fluxo de solicitação de filho |
| Horário/datas | 08h30, 1º andar; 20/09 a 29/11; inscrição 16/08 a 13/09 |
| Obrigatoriedade | Identificação e decisões obrigatórias; abertas opcionais |

## Fase 1 — Critério de aprovação por faltas

**Schema** (`convex/schema.ts:1020-1031` e `:1040-1050`): em `cursos` e `turmas`,
`criterioAprovacao: v.optional(v.union(v.literal("PERCENTUAL"), v.literal("MAX_FALTAS")))` e
`maxFaltas: v.optional(v.number())`. Ausência = `PERCENTUAL`. Em `certificados`, somar `faltas` e
`criterioAprovacao` ao snapshot.

**Atenção (achado da revisão):** `cursos.frequenciaMinima` é `v.number()` **obrigatório**
(`schema.ts:1026`) e o Zod também exige (`validations.ts:9-13`). O `CursoFormDialog` continua enviando
um valor mesmo quando o critério é faltas — a UI mostra só o campo pertinente, mas não omite o outro.

**Cálculo** (`convex/turmas/lib/frequencia.ts`): `calcularFrequencia` recebe o critério e devolve
`faltas`; `apto` vira `criterio === "MAX_FALTAS" ? faltas <= maxFaltas : percentual >= minima`.
Mantém as exclusões do denominador (aula sem chamada; aula anterior à inscrição).

**Propagação — a lista completa, incluindo o que a revisão achou que faltava:**
- `convex/turmas/lib/resumo.ts:57,63-69` (lê da turma, devolve por aluno)
- `convex/turmas/mutations.ts:132` (cópia curso→turma na criação) e `setFrequenciaMinima`
  (`:182-200`), que ganha irmã `setCriterioAprovacao`
- `convex/cursos/mutations.ts:7-13,22,33-34,52,59` (valida o par critério+valor)
- **`convex/turmas/certificados.ts:60-93` — `emitirUm` muda de assinatura**, e com ela os dois call
  sites (`:173-184` em `emitir`, `:208-219` em `emitirAptos`)
- **`convex/turmas/certificados.ts:96-126` — a query `painel` precisa expor `criterioAprovacao` e
  `maxFaltas`**, senão a aba não tem como escrever "3 de 3 faltas permitidas"
- **`convex/turmas/seedDemo.ts:129-140` reimplementa a regra** (`percentual >= 75`) e insere em
  `certificados` direto: passaria a divergir
- `features/turmas/components/CertificadosTab.tsx:45,164,169` (badge e contagem)
- **`app/(ready)/cursos/page.tsx:94` imprime "Frequencia minima: X%" sem condicional** — um curso por
  faltas anunciaria 75% falsamente
- `app/(ready)/turmas/[id]/certificados/imprimir/page.tsx:190` (texto impresso)
- `shared/components/layout/DevContext.tsx:978-981,1001` (notas defasadas)

**Testes**: `convex/turmas/__tests__/frequencia.test.ts:116-119` (limite exato, 4 faltas reprova, aula
cancelada não muda o veredito) e `convex/__tests__/certificados.integration.test.ts:80-81,103,124,133`.

## Fase 2 — Aulas: acabar com a aula fantasma, depois datas e títulos

**Primeiro a correção (item 3 dos achados), que é de correção e não de conveniência:**
- `convex/turmas/queries.ts:92` — quando a turma **já tem aulas cadastradas**, "hoje tem aula" passa a
  ser "existe encontro com a data de hoje", não coincidência de dia da semana.
- `features/turmas/components/ChamadaWidget.tsx:94-100` — deixa de criar encontro. A chamada só abre
  para aula que existe; criar aula continua sendo ato da secretaria.

**Depois a conveniência:**
- `cursos.planoAulas: v.optional(v.array(v.object({ titulo: v.string(), detalhe: v.optional(v.string()) })))`.
- `criarAulas` (`mutations.ts:54-77`) aceita **lista de datas** além do modo semanal e nomeia cada aula
  com `planoAulas[i].titulo` (fallback "Aula N"); `gerarAulas` (`:155-180`) ganha `datas`; **e `create`
  (`:79-113,139-147`) também** — sem isso a turma nasce errada (achado 4).
- UI: o bloco de gerar aulas hoje só renderiza com zero aulas (`page.tsx:404`); a alternativa "informar
  as datas" precisa de ponto de entrada que funcione com aulas já criadas.
- Seeds que inserem `titulo: "Aula N"` direto, fora do helper: `convex/turmas/seeds.ts:62-69`,
  `convex/turmas/seedDemo.ts:102,277,362,472`.
- Teste que fixa o fallback: `convex/__tests__/cursosTurmas.integration.test.ts:107-112`; falta caso de
  `datas` em `:150-190`.

## Fase 3 — Correções do formulário público

- **Validar no servidor** (`registrar`, `mutations.ts:297-393`): obrigatórias presentes e valores
  dentro das `opcoes`.
- **Sincronizar** `features/turmas/lib/validations.ts:32-36` com o schema (`tipo`, `opcoes`, `ajuda`).
- **Resolver o `sexo`**: renderizar no formulário público (o dado serve ao cadastro) ou remover de
  `CAMPOS_SISTEMA_OPTIONS`.

## Fase 4 — Marcos no calendário

`criarEventosDaTurma` em `convex/turmas/mutations.ts`, recebendo `[{ titulo, data }]` e inserindo em
`calendarioEventos` (`tipo: "evento"`), reaproveitando `convex/calendario/mutations.ts:6-28`.

Padrão de permissão do repo, conforme a revisão: `requirePermission("turmas:update")` +
`checkPermission("calendario:create")` — como em `mutations.ts:33` e `certificados.ts:100`.
`requireAnyPermission` é **OU**, não serve aqui. Na prática `secretaria` e `pastor` já têm as duas
(`rbacHelpers.ts:38,121,140`), então a degradação é salvaguarda, não caso comum.

Eventos desta turma: **06/12 entrevistas** e **13/12 apresentação e batismo**, com `publicadoNoSite`
desmarcado.

## Fase 5 — Dados reais (2º semestre de 2026)

**Depende da Fase 1** (os campos de critério) **e da Fase 2** (datas explícitas) — a primeira versão do
plano errou a ordem aqui.

Curso **"Curso de Novos Membros"** (atualizar o que existe, não criar outro): descrição nova, critério
`MAX_FALTAS` com `maxFaltas: 3`, e o plano dos 8 encontros:

| # | Tema | Detalhe |
|---|---|---|
| 1 | Introdução: Paulo e a Igreja de Éfeso | p. 9 |
| 2 | Mais ricos do que pensamos · Ponto, ponto, ponto | caps. 1-2 (p. 31, 49) — Ef 1.1-14 e 1.15-23 |
| 3 | Poemas a partir de ruínas · Um povo de shalom | caps. 3-4 (p. 61, 73) — Ef 2.1-10 e 2.11-22 |
| 4 | O mistério pelo qual vale a pena sofrer · Cheios da plenitude de Deus | caps. 5-6 (p. 85, 99) — Ef 3.1-13 e 3.14-21 |
| 5 | Unidade · Imitadores de Deus | caps. 7-8 (p. 109, 131) — Ef 4.1-16 e 4.17—5.2 |
| 6 | Separação das obras das trevas · Todos sujeitos a Cristo: casamento | caps. 9-10 (p. 145, 159) — Ef 5.1-20 e 5.15-33 |
| 7 | Todos sujeitos a Cristo: lar · Permanecendo firmes no evangelho | caps. 11-12 (p. 177, 187) — Ef 6.1-9 e 6.10-24 |
| 8 | Conversa sobre a IPB | — |

Turma **"Novos Membros 2/2026"**: domingos 08h30, 1º andar, as 8 datas explícitas, janela de
**16/08 a 13/09**, e as **17 perguntas** do Notion — três de escolha múltipla ("como conheceu", "o que
motivou", "já foi batizado"), estado civil com 9 opções, e as duas confirmações finais (limite de 3
faltas e entrevista com os presbíteros). Aplicadas por `internalMutation`, como no Catecúmenos.

**Contorno se o código atrasar:** a inscrição pode abrir sem nenhuma das fases. Basta a turma existir
com o formulário (`internalMutation`, sem `totalAulas` no curso, para não auto-gerar aulas erradas) e as
8 aulas entrarem depois pelo bloco "Novo encontro". Isso protege a data de 16/08.

## Fase 6 — De inscrito a membro, e o primeiro acesso

Construir entre 29/11 e 13/12.

**Efetivação.** Existe e não deve ser reescrito: `tornarMembro` (`convex/membros/eclesiastico.ts:525`)
e `updateEclesiastico` (`:64`, whitelist em `:40-61`, exige `rol:update` ou `membros:update`). A
inscrição já tem onde guardar o vínculo: **`inscricoes.membroId`** (`schema.ts:1095`).

**Correção da revisão:** `tornarMembro` insere `MEMBRO_NAO_COMUNGANTE` (`:543-546`), o que deriva
`NAO_COMUNGANTE` (`tipoRolHelpers.ts:65`) e cai no **Rol Separado** (`eclesiastico.ts:36-37`). Para o
adulto que fez profissão de fé, é obrigatório complementar com `updateEclesiastico`:
`cargoEclesiastico: "MEMBRO_COMUNGANTE"`, `formaAdmissao` (BATISMO / PROFISSAO_FE / TRANSFERENCIA,
derivada do que a pessoa respondeu), `dataMembresia`, e `dataBatismo`/`igrejaProcedencia` quando
couber. `entidades.status` precisa estar `ATIVO`.

Falta a ponte inscrição → entidade (inscrições não criam `entidades`): um passo **"Efetivar novos
membros"** na turma encerrada — por pessoa, vincular a entidade existente (ela costuma já estar na base
como visitante) ou criar nova a partir de `dadosSistema` e das respostas.

**Não reaproveitar** `convex/membros/importFormNovos.ts` (lotes do Tally por CLI, dedupe por CPF, nada
chamável da tela).

**Primeiro acesso.** Praticamente pronto: `convex/membros/convites.ts` + `/convite/[token]` para a
credencial; `onboarding.ts:6,44` + `membros.onboardingCompleto`; `completeness.ts:40`
(`REQUIRED_FIELDS` já cobra CPF, endereço completo, nacionalidade, contato de emergência — exatamente o
que falta no inscrito); `cadastroVivo.ts:6` com `ProfileCompletenessCard` e `ProfileNudgeDialog` no
dashboard; `selfService.ts` para perfil e família.

**Filhos: usar o fluxo que existe.** O membro **solicita** o cadastro do filho
(`solicitacoes.ts:31`) e a secretaria aprova (`:119` → `familiaHelpers.ts:120-160`, que cria a entidade,
o vínculo em `responsaveis` e a linha em `membros` quando batizado). A criação direta pelo self-service
foi removida de propósito — não ressuscitar.

Assim CPF e endereço estruturado não entram no formulário público (o MVP tirou CPF de propósito): são
preenchidos pela própria pessoa no primeiro acesso, quando ela já é membro.

## Verificação

- **Medir o baseline de lint antes de começar** e anotar no PR: a revisão notou, com razão, que os
  números que venho citando (46 erros / 1216 warnings) não estão registrados em nenhum lugar do repo.
- `npx tsc --noEmit`, `npm test`, `npm run build`, e `npx convex codegen` (que é o que valida nome de
  índice e remoção de campo de verdade).
- Testes novos: critério por faltas (limite exato, acima, aula cancelada); `create` e `gerarAulas` com
  datas explícitas herdando títulos; **aula fantasma** (turma com aulas cadastradas não oferece chamada
  em dia sem encontro); `registrar` recusando obrigatória ausente e opção inválida.
- Visual: o formulário público não exige login — subir a turma no ambiente de dev e conferir a 390px no
  navegador.
- Fim a fim em produção: inscrever pelo link, ver a resposta na aba Inscrições e no painel do instrutor,
  marcar chamada, conferir "3 de 3 faltas permitidas" na aba Certificados.

## Fora de escopo

- **Pagamento do livro** (R$ 30,00, sufixo ",02" para a tesouraria identificar): segue pelo grupo de
  WhatsApp. O módulo de retiro já tem upload de comprovante e usa o mesmo truque (",03").
- **Publicar os marcos na agenda pública**: fica como um clique, desmarcado por padrão.

## Ordem de execução

1. **Fase 2, parte da aula fantasma** — é correção, e sem ela o critério por faltas fica perigoso.
2. **Fase 1** (critério por faltas).
3. **Fase 2, resto** (datas explícitas, plano, títulos) e **Fase 3** (correções do formulário).
4. **Fase 5** (dados reais) — depende de 1 e 2. Se atrasar, usar o contorno e abrir a inscrição no prazo.
5. **Fase 4** (marcos no calendário).
6. **Fase 6** (efetivação + primeiro acesso), entre 29/11 e 13/12.
