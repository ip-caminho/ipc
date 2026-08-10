# Cursos, Frequência e Certificados

## Status: CONCLUIDO (10/08/2026) — PR #218

As 8 etapas foram implementadas e o backend esta em producao
(`earnest-husky-324`). Ajustes surgidos na revisao e ja incorporados:

- **Janela de inscricao** (`turmas.inscricoesDe` / `inscricoesAte`, inclusivas):
  faltava programar abertura e prazo do formulario publico. Checada no servidor
  em fuso de Sao Paulo; `duplicar` nao a carrega (ficaria no passado).
- **`frequenciaMinima` copiada** do curso na criacao da turma, em vez de
  override com cascata de fallback — congela a regra no inicio.
- **Indice `by_encontro` removido** de `turmaPresencas`: o composto
  `by_encontro_inscricao` atende os dois filtros.
- **Prazo da chamada** de 48h para 7 dias (`JANELA_CHAMADA_MS`).

## Escopo

Transformar o módulo `turmas` (hoje uma tabela única, MVP de inscrições) em gestão de
**cursos pontuais e recorrentes** — oferecidos ~2x/ano, com inscrição por link público,
aulas com chamada, e **emissão de certificado condicionada à frequência**.

Restrição de projeto que orienta todo o desenho: **o professor tem histórico de atraso e
dificuldade com tecnologia**. O trabalho dele no curso inteiro precisa caber em *um toque
por aula* + opinar no final. Todo o resto (criar curso, criar turma, gerar aulas, emitir e
imprimir certificado) é da secretaria.

## Decisões fechadas (10/08/2026)

- **`cursos` separado de `turmas`**: curso = catálogo (ementa, carga horária, nº de aulas,
  frequência mínima); turma = oferta datada (turma 1/2026, 2/2026). O enum
  `turmas.tipo` (`NOVOS_MEMBROS | CATACUMENOS | OUTRO`) fica como legado, deixa de ser usado.
- **Presença marcada pelo professor**, nunca pelo aluno — boa parte dos inscritos entra pelo
  link público e **não tem login** (`inscricoes.membroId` é opcional). Certificado baseado em
  autodeclaração não sustenta questionamento.
- **Dois estados de presença**: presente / ausente. **Sem "justificada"** — falta justificada é
  julgamento de exceção, resolvido na decisão do certificado (que permite emitir abaixo do
  mínimo). Terceiro estado implícito: *aula sem registro* (nenhum doc de presença).
- **Chamada pré-marcada como presente**: o professor desmarca só quem faltou. Turma de 20 com
  2 faltas = 2 toques. Risco de "salvar sem olhar" aceito conscientemente — a alternativa
  (20 toques) é ele não fazer, e aí não existe frequência.
- **Aulas geradas automaticamente** na criação da turma (`dataInicio` + `diaSemana` +
  `totalAulas` do curso). O professor nunca cria encontro.
- **Anotações — só dois níveis, ambos opcionais**:
  - por aula (campo único, colapsado no fim da chamada);
  - por aluno na turma (na tela de certificados, provavelmente preenchido pela secretaria).
  O nível "aluno naquela aula" foi **cortado** junto com a falta justificada, que era o que o
  sustentava (`turmaPresencas.observacoes` já existe no schema e permanece sem uso).
- **Certificado**: entregue **em mãos no último dia de aula**. Logo: HTML **imprimível em lote**
  (`page-break` por aluno), sem PDF gerado no backend, sem armazenamento no B2, sem rota de
  acesso para o aluno. Dados gravados como **snapshot** (nome, %, carga horária) — o papel
  emitido não muda quando a frequência ou o nome mudarem depois.
- **Quem emite**: apenas `turmas:manage_inscricoes` (secretaria). O professor **não** entra
  nessa tela; é consultado nos casos-limite por conversa.
- **Frequência mínima**: padrão **75%**, definida no curso e **copiada para a turma na criação**
  (congela a regra no início — mudar o curso depois não mexe em turma em andamento). Ajustável
  na tela de certificados por quem tem `turmas:manage_inscricoes`. Turmas legadas, sem o campo,
  caem em `FREQUENCIA_MINIMA_PADRAO`.
- **Descrição**: a da turma **sobrescreve** a do curso na página pública de inscrição.
- **Um certificado ativo por inscrição**: corrigir nome ou reemitir = revogar e emitir novo
  (garantido na mutation; `by_inscricao` não é índice único).
- **Anotações limitadas a `OBSERVACAO_MAX_CHARS` (500)** — vivem em documentos lidos em lista.
- **Único critério é frequência** — sem nota/avaliação.
- **Sem permissões novas**: reusa `turmas:read/create/update/delete/manage_inscricoes`
  (evita migração de RBAC).

## Modelos Afetados

| Tabela | Tipo de mudança |
|--------|-----------------|
| `cursos` (nova) | `nome`, `descricao?`, `ementa?`, `cargaHoraria?` (horas), `totalAulas?`, `frequenciaMinima` (número, default 75), `status` ATIVO/INATIVO, `criadoPor?`, `criadoEm`. Índice `by_status` |
| `certificados` (nova) | snapshot da emissão — ver abaixo |
| `turmas` | + `cursoId?` (`Id<"cursos">`), + `frequenciaMinima?` (cópia do curso na criação), + índice `by_curso`. `tipo` mantido como legado |
| `turmaEncontros` | + `presencaRegistradaEm?` (número) — denormaliza "chamada feita", evita ler presenças no widget do dashboard. `titulo` passa a receber "Aula N" na geração. `observacoes` (já existe) vira a anotação da aula |
| `inscricoes` | + `observacoesInstrutor?` (texto curto — nota do professor sobre o aluno) |
| `turmaPresencas` | **sem mudança** de schema (`presente` boolean serve para 2 estados). Troca `by_encontro` pelo composto `by_encontro_inscricao`, que atende os dois filtros (prefixo) |

```
certificados: {
  turmaId: Id<"turmas">
  inscricaoId: Id<"inscricoes">
  nomeImpresso: string          // editável na emissão; default = dadosSistema.nomeCompleto
  percentualFrequencia: number  // snapshot
  aulasPresentes: number        // snapshot
  aulasConsideradas: number     // snapshot (denominador efetivo)
  cursoNome: string             // snapshot
  turmaNome: string             // snapshot
  cargaHoraria?: number         // snapshot
  codigo: string                // identificador impresso no rodapé
  emitidoPor: Id<"membros">
  emitidoEm: number
  revogadoEm?: number
  revogadoPor?: Id<"membros">
}
índices: by_turma, by_inscricao, by_codigo
```

### Migração

`cursoId` é opcional — turmas existentes seguem funcionando sem curso (caem na frequência
mínima padrão 75%). **Sem mutation de migração**: a secretaria cadastra os cursos
("Novos membros", "Catecúmenos") e as novas turmas passam a exigir curso. Vincular turmas
antigas é opcional e manual.

## Cálculo de frequência (regra única, usada na tela e no certificado)

```
denominador = aulas da turma que:
  - têm presencaRegistradaEm != null   (aula sem chamada não vira falta de ninguém)
  - e data >= data de inscrição do aluno  (quem entrou na 3ª aula não carrega 2 faltas)
numerador   = presenças com presente == true nessas aulas
percentual  = round(numerador / denominador * 100)   // denominador 0 → sem frequência apurada
```

Corrige dois defeitos do código atual: `getPresencas` devolve `presente: p?.presente ?? false`
(aula não preenchida = falta para todos) e `getFrequenciaResumo` divide por `totalEncontros`
global (ignora a data de entrada).

## Permissões

- **Cursos**: ver `turmas:read`; criar `turmas:create`; editar `turmas:update`.
- **Chamada**: `turmas:manage_inscricoes` **ou** ser o instrutor da turma — mantém
  `requireGestaoTurma` (`convex/turmas/mutations.ts:25`) como está.
- **Certificados** (emitir, revogar, ajustar frequência mínima da turma, editar nome impresso,
  anotação sobre o aluno): `turmas:manage_inscricoes`.
- **Prazo da chamada**: 48h → **7 dias** para o instrutor; **sem prazo** para
  `turmas:manage_inscricoes` (a secretaria conserta o que o professor não fez).
- **Gates que faltam hoje** (só checam login, devolvem nome de inscritos a qualquer membro
  logado): `getById`, `listEncontros`, `getPresencas`, `getFrequenciaResumo` → exigir
  `turmas:read` ou ser o instrutor.

## Impacto em Shared

- `convex/schema.ts` — **danger zone**: 2 tabelas novas + campos opcionais (retrocompatíveis).
  Nunca em paralelo com outra feature que toque schema.
- `shared/constants/navigation.ts` — possível item "Cursos" sob `modulo: "turmas"`.
- `shared/components/layout/DevContext.tsx` — atualizar `CONTEXT_MAP` para cada página nova
  (`/cursos`, aba Certificados, rota de impressão) e para a de detalhe da turma.
- `convex/preferencias/rbac.ts` — **sem mudança** (nenhuma permissão nova).
- `features/turmas/components/ChamadaWidget.tsx` — reescrita da interação (pré-marcado,
  prazo, anotação da aula). Usado no dashboard.

## Riscos

- **Pré-marcar presença** pode virar registro automático sem conferência. Mitigação: nada é
  gravado até tocar Salvar; o botão mostra o que vai salvar ("Salvar — 18 presentes, 2 faltas");
  `registradoPor` + `presencaRegistradaEm` deixam rastro de quem/quando.
- **Certificado emitido com frequência errada** — por isso o cálculo correto e os índices são
  pré-requisito, não polimento. Snapshot + `revogadoEm` cobrem o erro humano.
- **Geração de aulas ignora feriados**: gera N aulas semanais consecutivas. A secretaria ajusta
  com `removeEncontro`/nova aula. Não tratar feriado é decisão consciente.
- **Bandwidth**: `listTurmas` e `listTurmasAbertas` fazem `.collect()` da tabela inteira e
  filtram status em memória, com `by_status` existente e sem uso; `salvarPresencas` re-coleta as
  presenças **dentro** do loop (O(N²)); `minhasTurmasInstrutor` varre encontros + inscrições +
  presenças de cada turma numa query reativa. Corrigir junto — o módulo vai ganhar volume e o
  projeto está acima do limite do plano Convex.
- `listTurmasAbertas` é **pública sem auth** e hoje lê a tabela inteira.

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `convex/schema.ts` | modificar | `cursos`, `certificados`, campos e índices novos |
| `convex/cursos/queries.ts` | criar | `list`, `getById` (com `by_status`) |
| `convex/cursos/mutations.ts` | criar | `create`, `update`, `toggleStatus` |
| `convex/turmas/mutations.ts` | modificar | `create` aceita `cursoId` e chama geração de aulas; `gerarAulas`; `setFrequenciaMinima`; `salvarPresencas` (índice composto, `presencaRegistradaEm`, anotação da aula); `setObservacoesInstrutor` |
| `convex/turmas/certificados.ts` | criar | `emitir`, `emitirLote`, `revogar`, `listByTurma` |
| `convex/turmas/queries.ts` | modificar | `listTurmas`/`listTurmasAbertas` via índice; `getPresencas` devolve `registrado`; `getFrequenciaResumo` com a regra nova; gates de permissão; `minhasTurmasInstrutor` usa `presencaRegistradaEm` |
| `convex/turmas/lib/frequencia.ts` | criar | cálculo único compartilhado entre tela e emissão |
| `app/(ready)/cursos/page.tsx` | criar | CRUD de cursos (lista + dialog) |
| `app/(ready)/turmas/[id]/page.tsx` | modificar | aba **Certificados**; aulas geradas; anotação da aula |
| `app/(ready)/turmas/[id]/certificados/imprimir/page.tsx` | criar | impressão em lote, `page-break-after`, CSS `@media print` |
| `features/turmas/components/ChamadaWidget.tsx` | modificar | pré-marcado, prazo 7 dias, uma coluna, tap target ≥44px |
| `features/turmas/components/CertificadosTab.tsx` | criar | %, apto/abaixo, nome editável, anotação, emitir/emitir aptos |
| `features/turmas/components/CursoFormDialog.tsx` | criar | form do curso (frequência mínima default 75) |
| `features/turmas/components/TurmaFormDialog.tsx` | modificar | select de curso |
| `features/turmas/lib/constants.ts` | modificar | `FREQUENCIA_MINIMA_PADRAO = 75`, status de curso |
| `shared/constants/navigation.ts` | modificar | item "Cursos" |
| `shared/components/layout/DevContext.tsx` | modificar | `CONTEXT_MAP` das páginas tocadas |
| `convex/turmas/__tests__/frequencia.test.ts` | criar | Vitest: aula sem chamada, entrada tardia, denominador 0, corte de 75% |

## Ordem de Implementação

1. **Schema + índices** — `cursos`, `certificados`, campos novos, `by_encontro_inscricao`,
   `by_curso`. Isolado, nada em paralelo.
2. **Correções de leitura** — `listTurmas`/`listTurmasAbertas` por índice, `salvarPresencas`
   sem O(N²), gates de permissão nas queries. Pré-requisito das etapas seguintes.
3. **CRUD de cursos** — tela + queries/mutations.
4. **Turma vinculada a curso + geração de aulas** — `TurmaFormDialog` e `gerarAulas`.
5. **Chamada de baixo atrito** — `ChamadaWidget` pré-marcado, prazo 7 dias,
   `presencaRegistradaEm`, anotação da aula. Screenshot a 390px antes de entregar
   (`scripts/screenshot-auth.sh`), conforme `.claude/rules/mobile-ux.md`.
6. **Frequência** — `lib/frequencia.ts` + testes + `getFrequenciaResumo`.
7. **Certificados** — emissão com snapshot, aba na turma, ajuste da frequência mínima,
   impressão em lote (validar em papel A4 antes de fechar).
8. **DevContext, `npm run lint`, `npm test`.**

## Fora de Escopo (registrado para depois)

- **Lembrete ao professor** que não marcou presença (WhatsApp/push). Confirmado como
  necessidade futura — hoje o card só fica no dashboard durante os 7 dias.
- Página pública `/certificado/<codigo>` para verificação por terceiros (o `codigo` já é
  gravado, então entra depois sem retrabalho).
- Acesso do aluno à própria frequência (exigiria token por inscrição ou o magic link de
  `docs/implementations/wip/acesso-magic-link.md`) — dispensado porque a entrega do
  certificado é presencial.
- Efeito de "turma encerrada" no rol (profissão de fé / comungante) — segue manual.
- Convergência com o módulo educacional infantil (`licoes`/`eduPresencas`), que mantém
  presença própria.
- Tratamento de feriados na geração de aulas; nota/avaliação; certificado em PDF.
