import { internalMutation } from "../_generated/server";
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
