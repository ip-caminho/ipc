import { internalMutation } from "../_generated/server";
import { FREQUENCIA_MINIMA_PADRAO } from "../turmas/lib/constants";

/**
 * Catalogo inicial de cursos. internalMutation (padrao dos seeds do projeto):
 * roda por `npx convex run cursos/seeds:seedCursosIniciais`.
 *
 * Idempotente: pula o que ja existe pelo nome. Carga horaria e total de aulas
 * ficam VAZIOS de proposito — nao sao dados que eu possa inventar, e o total de
 * aulas gera os encontros da turma automaticamente. Preencher em /cursos.
 */
const CURSOS = ["Curso de Novos Membros", "Catecumenos"];

export const seedCursosIniciais = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existentes = new Set((await ctx.db.query("cursos").collect()).map((c) => c.nome));
    const criados: string[] = [];

    for (const nome of CURSOS) {
      if (existentes.has(nome)) continue;
      await ctx.db.insert("cursos", {
        nome,
        frequenciaMinima: FREQUENCIA_MINIMA_PADRAO,
        status: "ATIVO",
        criadoEm: Date.now(),
      });
      criados.push(nome);
    }

    return criados.length
      ? `Cursos criados: ${criados.join(", ")}. Defina carga horaria e total de aulas em /cursos.`
      : "Nada a fazer: os cursos ja existem.";
  },
});
