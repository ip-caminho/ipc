import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
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

/**
 * Remove um curso pelo nome, mas SO se ele estiver vazio (sem descricao,
 * ementa, carga horaria, total de aulas) e sem nenhuma turma vinculada. Serve
 * para desfazer um seed duplicado sem risco de apagar catalogo real.
 */
export const removerCursoVazio = internalMutation({
  args: { nome: v.string() },
  handler: async (ctx, { nome }) => {
    const curso = (await ctx.db.query("cursos").collect()).find((c) => c.nome === nome);
    if (!curso) return `Curso "${nome}" nao encontrado.`;

    if (curso.descricao || curso.ementa || curso.cargaHoraria || curso.totalAulas) {
      return `Curso "${nome}" tem conteudo preenchido — nao removido.`;
    }

    const turma = await ctx.db
      .query("turmas")
      .withIndex("by_curso", (q) => q.eq("cursoId", curso._id))
      .first();
    if (turma) return `Curso "${nome}" tem turma vinculada — nao removido.`;

    await ctx.db.delete(curso._id);
    return `Curso "${nome}" removido.`;
  },
});

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
