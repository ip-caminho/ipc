import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getSaoPauloDateString } from "../_shared/datetime";
import { gerarDatasAulas } from "./lib/aulas";
import { FREQUENCIA_MINIMA_PADRAO } from "./lib/constants";

/**
 * Cria uma turma real a partir de um curso do catalogo, com as aulas semanais
 * ja geradas e o link publico pronto. internalMutation (padrao dos seeds):
 * `npx convex run turmas/seeds:criarTurmaDeCurso '{"cursoNome":"...","nomeTurma":"..."}'`
 *
 * Horario, local e instrutor ficam vazios de proposito — dados que so a
 * secretaria sabe. Preencher em /turmas -> a turma -> Editar.
 */
function token(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Proximo dia da semana pedido (hoje conta, se cair no dia). */
function proximoDiaSemana(diaSemana: string): string {
  const DIAS = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
  const alvo = DIAS.indexOf(diaSemana);
  const hoje = new Date(`${getSaoPauloDateString()}T12:00:00Z`);
  const deslocamento = alvo < 0 ? 0 : (alvo - hoje.getUTCDay() + 7) % 7;
  hoje.setUTCDate(hoje.getUTCDate() + deslocamento);
  return hoje.toISOString().slice(0, 10);
}

export const criarTurmaDeCurso = internalMutation({
  args: {
    cursoNome: v.string(),
    nomeTurma: v.string(),
    diaSemana: v.optional(v.string()),
  },
  handler: async (ctx, { cursoNome, nomeTurma, diaSemana }) => {
    const curso = (await ctx.db.query("cursos").collect()).find((c) => c.nome === cursoNome);
    if (!curso) return `Curso "${cursoNome}" nao encontrado.`;

    const existente = (await ctx.db.query("turmas").collect()).find((t) => t.nome === nomeTurma);
    if (existente) return `Turma "${nomeTurma}" ja existe.`;

    const dia = diaSemana ?? "DOMINGO";
    const dataInicio = proximoDiaSemana(dia);
    const agora = Date.now();

    const turmaId = await ctx.db.insert("turmas", {
      nome: nomeTurma,
      cursoId: curso._id,
      // Copia do curso, como na criacao pela tela.
      frequenciaMinima: curso.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO,
      dataInicio,
      diaSemana: dia,
      vagasOcupadas: 0,
      status: "ABERTA",
      camposSistema: ["nomeCompleto", "whatsapp", "email", "dataNascimento"],
      token: token(),
      criadoEm: agora,
    });

    const datas = gerarDatasAulas(dataInicio, dia, curso.totalAulas ?? 0);
    for (const [i, data] of datas.entries()) {
      await ctx.db.insert("turmaEncontros", {
        turmaId,
        data,
        titulo: `Aula ${i + 1}`,
        criadoEm: agora,
      });
    }

    const turma = await ctx.db.get(turmaId);
    return `Turma "${nomeTurma}" criada (${datas.length} aulas, a partir de ${dataInicio}). Link: /inscricao/${turma?.token}. Ajuste horario, local e instrutor em Editar.`;
  },
});

/**
 * Remove uma turma pelo nome, SO se estiver vazia: sem inscricao e sem presenca
 * registrada. Serve para desfazer turma criada por engano (ex: duplicata de
 * seed) sem risco de apagar historico.
 */
export const removerTurmaVazia = internalMutation({
  args: { nome: v.string() },
  handler: async (ctx, { nome }) => {
    const turma = (await ctx.db.query("turmas").collect()).find((t) => t.nome === nome);
    if (!turma) return `Turma "${nome}" nao encontrada.`;

    const inscricao = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
      .first();
    if (inscricao) return `Turma "${nome}" tem inscricao — nao removida.`;

    const aulas = await ctx.db
      .query("turmaEncontros")
      .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
      .collect();
    for (const aula of aulas) {
      const presenca = await ctx.db
        .query("turmaPresencas")
        .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", aula._id))
        .first();
      if (presenca) return `Turma "${nome}" tem presenca registrada — nao removida.`;
    }

    for (const aula of aulas) await ctx.db.delete(aula._id);
    await ctx.db.delete(turma._id);
    return `Turma "${nome}" removida (${aulas.length} aulas).`;
  },
});

/**
 * Zera as inscricoes de uma turma: apaga inscricoes, presencas ligadas a elas e
 * volta vagasOcupadas para 0. As AULAS ficam — o que se descarta e quem se
 * inscreveu, nao o calendario da turma.
 *
 * Recusa se houver certificado emitido: ali ja existe papel entregue, e apagar
 * a inscricao deixaria o certificado orfao.
 */
export const limparInscricoesDaTurma = internalMutation({
  args: { nomeTurma: v.string() },
  handler: async (ctx, { nomeTurma }) => {
    const turma = (await ctx.db.query("turmas").collect()).find((t) => t.nome === nomeTurma);
    if (!turma) return `Turma "${nomeTurma}" nao encontrada.`;

    const certificado = await ctx.db
      .query("certificados")
      .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
      .first();
    if (certificado) {
      return `Turma "${nomeTurma}" tem certificado emitido — nao mexi nas inscricoes.`;
    }

    const inscricoes = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
      .collect();

    const nomes: string[] = [];
    let presencasRemovidas = 0;

    for (const inscricao of inscricoes) {
      const presencas = await ctx.db
        .query("turmaPresencas")
        .withIndex("by_inscricao", (q) => q.eq("inscricaoId", inscricao._id))
        .collect();
      for (const p of presencas) {
        await ctx.db.delete(p._id);
        presencasRemovidas++;
      }
      nomes.push(inscricao.dadosSistema.nomeCompleto);
      await ctx.db.delete(inscricao._id);
    }

    await ctx.db.patch(turma._id, { vagasOcupadas: 0 });

    return inscricoes.length === 0
      ? `Turma "${nomeTurma}" ja estava sem inscricao.`
      : `Removidas ${inscricoes.length} inscricoes (${nomes.join(", ")}) e ${presencasRemovidas} presencas. vagasOcupadas zerado.`;
  },
});

/**
 * Formulario do Estudo de Catecumenos, transcrito do questionario que a igreja
 * ja usava no Notion. Obrigatoriedade: marquei como obrigatorias as de
 * identificacao e as de decisao; as abertas ficaram opcionais (o Notion nao
 * expoe essa marcacao no HTML publico) — ajustavel depois.
 */
const PERGUNTAS_CATECUMENOS = [
  { id: "endereco", label: "Endereço (bairro/cidade)", obrigatorio: true, tipo: "TEXTO" as const },
  {
    id: "tempo_igreja",
    label: "Há quanto tempo você frequenta a Igreja Presbiteriana do Caminho?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: ["Menos de 3 meses", "Entre 3 meses e 1 ano", "Mais de 1 ano"],
  },
  {
    id: "como_conheceu",
    label: "Como conheceu a Igreja Presbiteriana do Caminho?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: [
      "Indicação de familiares ou amigos",
      "Redes sociais ou site da igreja",
      "Conheci de outra forma",
    ],
  },
  {
    id: "estudo_anterior",
    label: "Você já participou de algum estudo bíblico ou discipulado? Se sim, qual?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "motivacao",
    label: "O que motivou você a se inscrever neste estudo?",
    ajuda: "Marque as opções que mais se aplicam",
    obrigatorio: true,
    tipo: "ESCOLHA_MULTIPLA" as const,
    opcoes: [
      "Quero conhecer mais sobre a fé cristã",
      "Desejo professar publicamente minha fé em Cristo",
      "Quero ser batizado(a)",
      "Tenho dúvidas sobre o Evangelho de Cristo e quero esclarecê-las",
      "Outro",
    ],
  },
  { id: "motivacao_outro", label: "Se outro, qual?", obrigatorio: false, tipo: "TEXTO" as const },
  {
    id: "batismo",
    label: "Você já foi batizado(a) anteriormente?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: ["Sim. Na infância.", "Sim. Na fase adulta.", "Não."],
  },
  {
    id: "outra_denominacao",
    label: "Você tem alguma experiência anterior em outra denominação cristã? Se sim, qual?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "expectativa",
    label: "O que você espera aprender e aplicar na sua vida com este estudo?",
    obrigatorio: false,
    tipo: "TEXTO_LONGO" as const,
  },
  {
    id: "compromisso",
    label: "Você se compromete a participar ativamente das leituras e discussões nos encontros?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: ["Sim", "Tentarei ao máximo", "Não sei se conseguirei acompanhar tudo"],
  },
];

const APRESENTACAO_CATECUMENOS =
  "Seja bem-vindo(a)! Este questionário tem o propósito de conhecer melhor os participantes " +
  "interessados no Estudo de Catecúmenos, um curso voltado para aqueles que desejam aprender " +
  "sobre a fé cristã, professar publicamente sua fé e receber o batismo. Ao enviar este " +
  "formulário, confirmo meu interesse em participar e estou ciente dos compromissos envolvidos.";

export const aplicarFormularioCatecumenos = internalMutation({
  args: { nomeTurma: v.string() },
  handler: async (ctx, { nomeTurma }) => {
    const turma = (await ctx.db.query("turmas").collect()).find((t) => t.nome === nomeTurma);
    if (!turma) return `Turma "${nomeTurma}" nao encontrada.`;

    const inscricao = await ctx.db
      .query("inscricoes")
      .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
      .first();
    if (inscricao) {
      // Mudar o formulario com inscricao feita orfanizaria respostas ja
      // enviadas — a mesma regra que a tela aplica.
      return `Turma "${nomeTurma}" ja tem inscricao — nao alterei o formulario.`;
    }

    await ctx.db.patch(turma._id, {
      descricao: APRESENTACAO_CATECUMENOS,
      local: turma.local || "Na Igreja, 1º andar",
      camposSistema: ["nomeCompleto", "whatsapp", "email", "dataNascimento"],
      perguntasExtras: PERGUNTAS_CATECUMENOS,
    });

    return `Formulario aplicado em "${nomeTurma}": 4 campos do sistema + ${PERGUNTAS_CATECUMENOS.length} perguntas.`;
  },
});

/** Inventario das turmas: quanto dado cada uma tem, antes de apagar nada. */
export const inventarioTurmas = internalQuery({
  args: {},
  handler: async (ctx) => {
    const turmas = await ctx.db.query("turmas").collect();
    return await Promise.all(
      turmas.map(async (t) => {
        const inscricoes = await ctx.db
          .query("inscricoes")
          .withIndex("by_turma", (q) => q.eq("turmaId", t._id))
          .collect();
        const aulas = await ctx.db
          .query("turmaEncontros")
          .withIndex("by_turma", (q) => q.eq("turmaId", t._id))
          .collect();
        let presencas = 0;
        for (const a of aulas) {
          presencas += (
            await ctx.db
              .query("turmaPresencas")
              .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", a._id))
              .collect()
          ).length;
        }
        const certificados = await ctx.db
          .query("certificados")
          .withIndex("by_turma", (q) => q.eq("turmaId", t._id))
          .collect();
        return {
          nome: t.nome,
          status: t.status,
          dataInicio: t.dataInicio,
          inscricoes: inscricoes.length,
          aulas: aulas.length,
          presencas,
          certificados: certificados.length,
        };
      })
    );
  },
});

/**
 * Apaga turmas, mantendo as listadas em `manter` (por nome). Devolve o que
 * removeu, incluindo os nomes dos inscritos — sem isso a limpeza seria cega e
 * nao restaria registro de quem havia ali.
 *
 * Recusa turma com certificado emitido: papel entregue nao se apaga sem decisao
 * explicita.
 */
export const removerTurmasExceto = internalMutation({
  args: { manter: v.array(v.string()) },
  handler: async (ctx, { manter }) => {
    const turmas = await ctx.db.query("turmas").collect();
    const relatorio: string[] = [];
    const preservadas: string[] = [];

    for (const turma of turmas) {
      if (manter.includes(turma.nome)) {
        preservadas.push(turma.nome);
        continue;
      }

      const certificado = await ctx.db
        .query("certificados")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .first();
      if (certificado) {
        relatorio.push(`MANTIDA "${turma.nome}": tem certificado emitido`);
        continue;
      }

      const aulas = await ctx.db
        .query("turmaEncontros")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();
      let presencas = 0;
      for (const aula of aulas) {
        const ps = await ctx.db
          .query("turmaPresencas")
          .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", aula._id))
          .collect();
        for (const p of ps) {
          await ctx.db.delete(p._id);
          presencas++;
        }
        await ctx.db.delete(aula._id);
      }

      const inscricoes = await ctx.db
        .query("inscricoes")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();
      const nomes = inscricoes.map((i) => i.dadosSistema.nomeCompleto);
      for (const i of inscricoes) await ctx.db.delete(i._id);

      await ctx.db.delete(turma._id);
      relatorio.push(
        `REMOVIDA "${turma.nome}": ${aulas.length} aulas, ${presencas} presencas, ` +
          `${inscricoes.length} inscricoes${nomes.length ? ` (${nomes.join(", ")})` : ""}`
      );
    }

    return {
      preservadas,
      acoes: relatorio,
    };
  },
});

// ===== Novos Membros — 2o semestre de 2026 =====
//
// Transcrito da agenda que a igreja divulga (Notion + grupo). Duas coisas
// especificas deste curso, e o motivo das fases anteriores:
//  - aprova por "no maximo 3 faltas nos 8 encontros", nao por percentual
//  - os 8 domingos pulam tres datas (11/10, 01/11, 22/11), entao as aulas
//    precisam vir de lista explicita

const NM_DESCRICAO =
  "O curso tem como proposito apresentar os fundamentos biblicos que sustentam " +
  "nossa identidade como igreja presbiteriana, segundo os principios da Escritura " +
  "Sagrada. Ao longo dos encontros, estudaremos a Epistola de Paulo aos Efesios e o " +
  "livro Recriados Pela Graca, do pastor Bernardo Cho, buscando compreender como o " +
  "poder da ressurreicao de Cristo molda a vida, a comunhao e o testemunho da Igreja.";

const NM_EMENTA =
  "Material: Biblia Sagrada e Recriados Pela Graca (Bernardo Cho). Leitura previa do " +
  "capitulo correspondente a cada encontro. Limite de 3 faltas para conclusao. Apos o " +
  "curso: entrevista com os presbiteros e apresentacao dos novos membros com batismo.";

const NM_PLANO = [
  { titulo: "Introducao: Paulo e a Igreja de Efeso", detalhe: "p. 9" },
  {
    titulo: "Mais ricos do que pensamos · Ponto, ponto, ponto",
    detalhe: "caps. 1-2 (p. 31 e 49) — Efesios 1.1-14 e 1.15-23",
  },
  {
    titulo: "Poemas a partir de ruinas · Um povo de shalom",
    detalhe: "caps. 3-4 (p. 61 e 73) — Efesios 2.1-10 e 2.11-22",
  },
  {
    titulo: "O misterio pelo qual vale a pena sofrer · Cheios da plenitude de Deus",
    detalhe: "caps. 5-6 (p. 85 e 99) — Efesios 3.1-13 e 3.14-21",
  },
  {
    titulo: "Unidade · Imitadores de Deus",
    detalhe: "caps. 7-8 (p. 109 e 131) — Efesios 4.1-16 e 4.17—5.2",
  },
  {
    titulo: "Separacao das obras das trevas · Unidade no casamento",
    detalhe: "caps. 9-10 (p. 145 e 159) — Efesios 5.1-20 e 5.15-33",
  },
  {
    titulo: "Unidade no lar · Permanecendo firmes no evangelho",
    detalhe: "caps. 11-12 (p. 177 e 187) — Efesios 6.1-9 e 6.10-24",
  },
  { titulo: "Conversa sobre a IPB", detalhe: undefined },
];

const NM_DATAS = [
  "2026-09-20",
  "2026-09-27",
  "2026-10-04",
  "2026-10-18",
  "2026-10-25",
  "2026-11-08",
  "2026-11-15",
  "2026-11-29",
];

const NM_APRESENTACAO =
  "Seja bem-vindo(a)! Este questionario tem o proposito de conhecer melhor os " +
  "participantes interessados no Estudo para Candidatos a Novos Membros, um curso " +
  "voltado para aqueles que desejam integrar oficialmente a Igreja Presbiteriana do " +
  "Caminho. Ao enviar este formulario, voce demonstra interesse em participar e esta " +
  "ciente dos compromissos envolvidos, incluindo o limite de 3 faltas e a entrevista " +
  "final com os presbiteros.";

const NM_PERGUNTAS = [
  { id: "endereco", label: "Endereço (bairro/cidade)", obrigatorio: true, tipo: "TEXTO" as const },
  {
    id: "tempo_igreja",
    label: "Há quanto tempo você frequenta a Igreja Presbiteriana do Caminho?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: ["Menos de 3 meses", "Entre 3 meses e 1 ano", "Mais de 1 ano"],
  },
  {
    id: "como_conheceu",
    label: "Como conheceu a Igreja Presbiteriana do Caminho?",
    ajuda: "Marque as opções que mais se aplicam",
    obrigatorio: true,
    tipo: "ESCOLHA_MULTIPLA" as const,
    opcoes: [
      "Indicação de familiares ou amigos",
      "Redes sociais ou site da igreja",
      "Evento especial da igreja",
      "Outro",
    ],
  },
  { id: "como_conheceu_outro", label: "Se outro:", obrigatorio: false, tipo: "TEXTO" as const },
  {
    id: "estudo_anterior",
    label: "Você já participou de algum estudo bíblico ou discipulado? Se sim, qual?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "estado_civil",
    label: "Seu estado civil",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: [
      "Solteiro(a)",
      "Namorando",
      "Noivo(a)",
      "Casado(a) no civil e religioso",
      "Casado(a) apenas no civil",
      "Casado(a) apenas no religioso",
      "Vivo em união estável (sem casamento no civil ou religioso)",
      "Divorciado(a)",
      "Viúvo(a)",
    ],
  },
  {
    id: "casamento_data",
    label: "Noivo(a) com data marcada para o casamento? Quando?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "conjuge_participa",
    label:
      "Caso você seja casado(a) ou viva em união estável, seu cônjuge/parceiro(a) também participará do estudo?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "motivacao",
    label: "O que motivou você a se inscrever neste estudo?",
    ajuda: "Marque as opções que mais se aplicam",
    obrigatorio: true,
    tipo: "ESCOLHA_MULTIPLA" as const,
    opcoes: [
      "Já sou cristão e venho de outra denominação",
      "Fiz o estudo de catecúmenos e desejo tornar-me membro da igreja",
      "Quero aprender mais sobre a Igreja Presbiteriana e sua doutrina",
      "Desejo me envolver mais com a igreja local",
      "Outros",
    ],
  },
  { id: "motivacao_outro", label: "Outro motivo:", obrigatorio: false, tipo: "TEXTO" as const },
  {
    id: "batismo",
    label: "Você já foi batizado(a)?",
    obrigatorio: true,
    tipo: "ESCOLHA_MULTIPLA" as const,
    opcoes: ["Sim. Na infância", "Sim. Na fase adulta.", "Não."],
  },
  {
    id: "profissao_fe",
    label: "Você já professou publicamente sua fé em Cristo? Se sim, em qual igreja?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "outra_denominacao",
    label: "Você tem alguma experiência anterior em outra denominação cristã? Se sim, qual?",
    obrigatorio: false,
    tipo: "TEXTO" as const,
  },
  {
    id: "expectativa",
    label: "O que você espera aprender e aplicar na sua vida com este estudo?",
    obrigatorio: false,
    tipo: "TEXTO_LONGO" as const,
  },
  {
    id: "compromisso",
    label:
      "Você se compromete a participar ativamente das leituras e discussões nos encontros, respeitando o limite máximo de 3 faltas para a conclusão do curso?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: ["Sim", "Tentarei ao máximo", "Não sei se conseguirei acompanhar tudo"],
  },
  {
    id: "ciente_entrevista",
    label:
      "Você está ciente de que, após a conclusão do curso, participará de uma entrevista com os presbíteros da Igreja para ser conhecido e conhecer melhor a Igreja?",
    obrigatorio: true,
    tipo: "ESCOLHA_UNICA" as const,
    opcoes: ["Sim, estou ciente e concordo."],
  },
];

/** Atualiza o curso de Novos Membros com a agenda e a regra do 2o semestre. */
export const configurarCursoNovosMembros = internalMutation({
  args: { nomeCurso: v.optional(v.string()) },
  handler: async (ctx, { nomeCurso }) => {
    const alvo = nomeCurso ?? "Curso de Novos Membros";
    const curso = (await ctx.db.query("cursos").collect()).find((c) => c.nome === alvo);
    if (!curso) return `Curso "${alvo}" nao encontrado.`;

    await ctx.db.patch(curso._id, {
      descricao: NM_DESCRICAO,
      ementa: NM_EMENTA,
      planoAulas: NM_PLANO,
      totalAulas: NM_PLANO.length,
      criterioAprovacao: "MAX_FALTAS",
      maxFaltas: 3,
    });

    return `Curso "${alvo}" configurado: ${NM_PLANO.length} encontros no plano, aprovacao por no maximo 3 faltas.`;
  },
});

/**
 * Cria a turma de Novos Membros do 2o semestre: 8 datas explicitas (o calendario
 * pula 11/10, 01/11 e 22/11), janela de inscricao de 16/08 a 13/09, e o
 * formulario com as 17 perguntas.
 */
export const criarTurmaNovosMembros2026 = internalMutation({
  args: { nomeTurma: v.optional(v.string()) },
  handler: async (ctx, { nomeTurma }) => {
    const nome = nomeTurma ?? "Novos Membros 2/2026";
    if ((await ctx.db.query("turmas").collect()).some((t) => t.nome === nome)) {
      return `Turma "${nome}" ja existe.`;
    }
    const curso = (await ctx.db.query("cursos").collect()).find(
      (c) => c.nome === "Curso de Novos Membros"
    );
    if (!curso) return "Curso de Novos Membros nao encontrado — rode configurarCursoNovosMembros.";

    const agora = Date.now();
    const turmaId = await ctx.db.insert("turmas", {
      nome,
      cursoId: curso._id,
      // Copia da regra do curso, como faz a criacao pela tela.
      frequenciaMinima: curso.frequenciaMinima,
      criterioAprovacao: curso.criterioAprovacao,
      maxFaltas: curso.maxFaltas,
      descricao: NM_APRESENTACAO,
      dataInicio: NM_DATAS[0],
      dataFim: NM_DATAS[NM_DATAS.length - 1],
      diaSemana: "DOMINGO",
      horario: "08:30",
      local: "1º andar da igreja",
      inscricoesDe: "2026-08-16",
      inscricoesAte: "2026-09-13",
      vagasOcupadas: 0,
      status: "ABERTA",
      camposSistema: ["nomeCompleto", "whatsapp", "email", "dataNascimento"],
      perguntasExtras: NM_PERGUNTAS,
      token: token(),
      criadoEm: agora,
    });

    // Aulas nas datas exatas, com o titulo do plano do curso.
    for (const [i, data] of NM_DATAS.entries()) {
      const doPlano = curso.planoAulas?.[i];
      await ctx.db.insert("turmaEncontros", {
        turmaId,
        data,
        titulo: doPlano?.titulo ?? `Aula ${i + 1}`,
        observacoes: doPlano?.detalhe,
        criadoEm: agora,
      });
    }

    const turma = await ctx.db.get(turmaId);
    return `Turma "${nome}" criada: ${NM_DATAS.length} aulas (20/09 a 29/11), inscricao de 16/08 a 13/09, ${NM_PERGUNTAS.length} perguntas. Link: /inscricao/${turma?.token}`;
  },
});

/** Marcos de dezembro da turma de Novos Membros, no calendario da igreja. */
export const criarMarcosNovosMembros2026 = internalMutation({
  args: { nomeTurma: v.optional(v.string()) },
  handler: async (ctx, { nomeTurma }) => {
    const nome = nomeTurma ?? "Novos Membros 2/2026";
    const turma = (await ctx.db.query("turmas").collect()).find((t) => t.nome === nome);
    if (!turma) return `Turma "${nome}" nao encontrada.`;

    const marcos = [
      { titulo: "Periodo de entrevistas com os candidatos", data: "2026-12-06" },
      { titulo: "Apresentacao dos Novos Membros e Batismo", data: "2026-12-13" },
    ];

    const existentes = new Set(
      (await ctx.db.query("calendarioEventos").collect()).map((e) => `${e.data}|${e.titulo}`)
    );

    const criados: string[] = [];
    for (const marco of marcos) {
      const titulo = `${marco.titulo} — ${turma.nome}`;
      if (existentes.has(`${marco.data}|${titulo}`)) continue;
      await ctx.db.insert("calendarioEventos", {
        titulo,
        data: marco.data,
        descricao: `Marco da turma ${turma.nome}.`,
        tipo: "evento",
        publicadoNoSite: false,
        criadoEm: Date.now(),
      });
      criados.push(`${marco.data} ${titulo}`);
    }

    return criados.length ? `Criados: ${criados.join(" | ")}` : "Marcos ja estavam no calendario.";
  },
});

/** Liga/desliga a divulgacao de uma turma no site publico. */
export const definirPublicacaoNoSite = internalMutation({
  args: { nomeTurma: v.string(), publicar: v.boolean() },
  handler: async (ctx, { nomeTurma, publicar }) => {
    const turma = (await ctx.db.query("turmas").collect()).find((t) => t.nome === nomeTurma);
    if (!turma) return `Turma "${nomeTurma}" nao encontrada.`;
    await ctx.db.patch(turma._id, { publicarNoSite: publicar });
    return `Turma "${nomeTurma}": divulgacao no site ${publicar ? "ligada" : "desligada"}.`;
  },
});
