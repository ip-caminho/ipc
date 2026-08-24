# LGPD: exclusão a pedido do titular (direito ao esquecimento)

> Status: **not-started** · Parte 2 da issue #212. Partes 1 e 3 já em produção.
> **Este documento contém decisões de política institucional** (o que a igreja
> guarda e o que descarta). Vale aprovação do conselho antes da implementação —
> serve tanto de especificação técnica quanto de resposta a um titular que pedir.

## Context

Quando uma pessoa pede que seus dados sejam removidos, hoje não existe caminho
nenhum: não há rotina, e apagar na mão é inviável — ela aparece referenciada em
mais de 60 tabelas.

O que já existe da issue #212:
- **Parte 1** (em produção): remover ou trocar um arquivo apaga o arquivo no B2,
  então o sistema parou de acumular órfão.
- **Parte 3** (em produção): varredura que compara bucket com banco e reporta
  arquivo sem dono. Hoje: zero órfãos.

Falta a parte 2, que é o pedido do titular propriamente dito.

## Princípio: anonimizar, não apagar

**Apagar a pessoa não é uma opção.** Dois motivos:

1. **Quebraria o histórico da igreja.** Escalas, presenças, inscrições e
   registros financeiros passariam a apontar para o vazio.
2. **Não apagaria o dado pessoal.** O nome e o CPF estão *copiados* em vários
   lugares (ver "Os três pontos que escapam"). Deletar a `entidade` deixaria
   essas cópias intactas — daria a aparência de exclusão sem a exclusão.

O caminho correto é **anonimizar**: manter a linha do histórico, destruir o que
identifica a pessoa. A LGPD (Art. 16) autoriza reter dado para cumprimento de
obrigação e exercício regular de direitos, e o Art. 11, II, "a" autoriza
organizações religiosas a tratarem dados dos seus membros.

## Decisões de política

### 1. O rol eclesiástico é preservado com o nome

Nome, matrícula, datas de batismo/membresia/conversão, forma de admissão e
demissão, igreja de destino e atos pastorais **permanecem legíveis**.

Justificativa: a IPB exige o rol e o livro de atas; um rol anonimizado é um rol
inútil. Na prática, se a pessoa foi transferida, a igreja de destino pede a carta
e o rol precisa registrar para onde ela foi. A obrigação continua depois que a
pessoa sai.

### 2. O conteúdo escrito pela pessoa é apagado

Pedidos de oração, comentários, atualizações e notas são **removidos**, não
anonimizados.

Justificativa: com cerca de 250 membros, anonimizar autoria não protege. Um
pedido como "orem pela cirurgia da minha mãe na quinta" identifica a pessoa mesmo
assinado como "Autor removido" — quem estava na igreja naquela semana sabe quem
é. Manteria a aparência de proteção sem entregar proteção. O valor histórico
desses textos é baixo.

### 3. O motivo da disciplina é apagado, o registro do desligamento fica

`membros.motivoDemissaoObs` (texto livre que pode descrever disciplina
eclesiástica) é **apagado**. O `motivoDemissao` (o código, ex.: `DISCIPLINA`) e a
data permanecem.

Justificativa: registrar que houve desligamento é legítimo e necessário ao rol;
manter o relato do motivo é o dado mais sensível e mais danoso do sistema.

## O que acontece com cada dado

| Dado | Ação |
|---|---|
| **Identificação** — CPF, RG, data de nascimento, sexo, estado civil, naturalidade, filiação (pai/mãe), profissão, formação | **apaga** |
| **Contato** — telefone, whatsapp, e-mail, endereço, contato de emergência | **apaga** |
| **Nome** (`nomeCompleto`, `nomeSocial`, `apelido`) | **preserva** (rol) |
| **Foto** | **apaga** (registro + arquivo no B2) |
| **Login** — `users`, `authSessions`, `authAccounts`, tokens, push subscriptions | **apaga** (encerra o acesso) |
| **Conteúdo escrito** — pedidos de oração, comentários, atualizações, notas de multimídia, motivos de indisponibilidade/ausência | **apaga** |
| **Registro pastoral** — anotações pastorais, observações de visita, `observacoesPastorais` | **apaga** |
| **Dados de criança** — observações médicas e familiares | **apaga** |
| **Rol eclesiástico** — matrícula, datas, forma de admissão/demissão, cargo, igreja de destino | **preserva** |
| **Atos pastorais** — batismo, profissão de fé, casamento, funeral (+ `livroFolha`) | **preserva** |
| **Motivo da disciplina** (`motivoDemissaoObs`) | **apaga** |
| **Carta de transferência**, **certificado CAC** (arquivos) | **apaga** do B2 |
| **Financeiro** — inscrições, recebimentos, valores, comprovantes | **preserva o registro**, **apaga o comprovante** (arquivo) e o CPF do pagante |
| **Consentimento LGPD** (`consentimentosLgpd`) | **preserva** — é a prova do próprio tratamento |
| **Auditoria** (`auditLogs`) | **preserva o registro**, **redige a PII** dentro dele |
| **Vínculos por FK** — presenças, escalas, PGs, responsáveis, empréstimos | **preserva** (apontam para a entidade anonimizada) |
| **Nomes denormalizados** — `pregadorNome`, `instrutorNome`, `doadorNome`, `membroNome` | **substitui** pelo rótulo de anonimizado |

A `entidade` recebe `status` e um marcador de anonimização com a data, para o
sistema saber que aquele registro foi tratado e não reexibir campos vazios como
"cadastro incompleto".

## Os três pontos que escapam de um delete ingênuo

Estes são o motivo de a rotina não poder ser um `db.delete` em cascata.

**1. `auditLogs` guarda cópias literais de PII.** Os campos `from`/`to` registram
o valor **antes e depois** de cada edição — ou seja, contêm cópias históricas de
CPF, RG, telefone, endereço e nome. Nenhum delete por chave estrangeira alcança
isso. Precisa ser redigido campo a campo, mantendo o registro da ação (quem
mudou o quê, quando) sem o valor.

**2. Nomes denormalizados espalhados.** `gravacoes.pregadorNome`,
`turmas.instrutorNome`, `exemplares.doadorNome` e `membroNome` dentro dos arrays
de participantes de inscrição. Todos sobrevivem à anonimização da entidade e
continuam exibindo o nome na interface.

**3. Quartos referenciam participante por posição.**
`quartosRetiro.ocupantes[].participanteIndex` aponta para o índice no array
`participantes`. **Remover um participante corrompe a alocação de quartos de
todos os seguintes.** A anonimização tem de ser feita no lugar, preservando a
posição.

## Limitação conhecida: transcrições de IA

`gravacoesIA.transcricao` e `gravacoes.iaAvisos[].contatoNome` guardam nomes
ditos em voz alta no culto (aniversariantes, enfermos, pedidos). **Não têm
vínculo nenhum com a pessoa** — nenhuma rotina de exclusão por id os alcança, e
varrer texto por nome geraria falso positivo em cima de nome comum.

Isto fica **fora do escopo** e deve ser informado ao titular. Se virar
preocupação real, a saída é política de retenção: descartar transcrição após N
meses, já que seu valor é operacional e de curto prazo.

## Escopo da entrega

**Rotina interna via CLI, sem interface.** É operação irreversível e rara; o
padrão do projeto para esse tipo de coisa (migração, reset, varredura) é
`internalAction` executada por quem tem acesso ao deployment.

```
npx convex run lgpd/exclusao:anonimizarTitular '{"entidadeId":"...","dryRun":true}'
npx convex run lgpd/exclusao:anonimizarTitular '{"entidadeId":"..."}'
```

`dryRun` obrigatório antes: relata exatamente o que será apagado, anonimizado e
preservado, sem escrever nada. Serve de conferência e de comprovante para o
titular.

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---|---|---|
| `convex/lgpd/exclusao.ts` | criar | `internalAction` que orquestra (precisa de action por causa do delete no B2) |
| `convex/lgpd/exclusaoDb.ts` | criar | mutations/queries do V8: anonimizar entidade, apagar conteúdo, redigir auditoria, limpar denormalizados |
| `convex/lgpd/index.ts` | modificar | já tem `revogar` consentimento; expor o novo fluxo junto |
| `convex/files/orfaos.ts` | reusar | `urlsDoDocumento` já sabe achar todo arquivo de um documento |
| `docs/features/lgpd.md` | criar | o que é apagado e preservado, em linguagem para o titular |

## Ordem de implementação

1. **Levantamento por pessoa** (`dryRun`): dado o `entidadeId`, listar tudo que
   será tocado, sem escrever. É a base para conferir antes de qualquer escrita.
2. **Arquivos no B2**: reusar `urlsDoDocumento` + `deleteFile` para foto, carta,
   certificado, comprovantes e multimídia.
3. **Anonimização da entidade e do membro**: limpar identificação e contato,
   preservar rol.
4. **Conteúdo escrito**: apagar pedidos, comentários, notas, anotações pastorais.
5. **Denormalizados**: substituir os `*Nome` (usar os índices existentes por
   `pregadorId`, `instrutorId`, `doadorId`; nas inscrições, varrer por
   `membroId` dentro dos arrays).
6. **Auditoria**: redigir `from`/`to` dos logs da pessoa.
7. **Autenticação**: apagar sessões, contas e o `users`, encerrando o acesso.
8. **Relatório final**: o que foi feito, para arquivar como comprovante.

## Verificação

- **Equivalência do dryRun**: o que o relatório diz que vai tocar é exatamente o
  que a execução toca.
- **Busca por resíduo**: depois de anonimizar uma pessoa de teste, procurar o
  nome e o CPF antigos em todas as tabelas — inclusive `auditLogs` e os campos
  denormalizados. O resultado tem de ser zero.
- **Integridade do histórico**: escalas, presenças e inscricões continuam
  válidas; a alocação de quartos do retiro continua apontando para as pessoas
  certas (teste específico para o índice posicional).
- **Acesso encerrado**: a pessoa não consegue mais logar.
- **Arquivos**: varredura da parte 3 acusa zero órfãos depois da exclusão.
- **Rol intacto**: nome, matrícula e datas seguem legíveis.

## Decisões em aberto

1. **Quem executa?** Hoje o desenho é CLI (quem tem acesso ao deployment). Se a
   secretaria precisar fazer sozinha, vira uma tela com dupla confirmação — mais
   trabalho e mais risco de acionamento acidental.
2. **Prazo de retenção do financeiro.** O registro de pagamento fica
   indefinidamente? A prática contábil sugere 5 anos; depois disso poderia ser
   descartado por rotina.
3. **Pessoa que nunca foi membro** (visitante que só se inscreveu num retiro):
   não tem rol a preservar. Anonimizar do mesmo jeito, ou apagar de fato o
   registro de inscrição?
