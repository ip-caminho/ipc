import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function resolveMembroNome(ctx: any, membroId: any): Promise<string> {
  if (!membroId) return "";
  const membro = await ctx.db.get(membroId);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.nomeCompleto || "";
}

export const getPainelCulto = query({
  args: { cultoId: v.id("cultos") },
  handler: async (ctx, { cultoId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const culto = await ctx.db.get(cultoId);
    if (!culto) return null;

    // Escalas
    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    const escalasEnriched = await Promise.all(
      escalas.map(async (e) => ({
        ...e,
        membroNome: e.membroId
          ? await resolveMembroNome(ctx, e.membroId)
          : e.nomeCustom || "",
      }))
    );

    // Louvores do culto
    const cultoLouvores = await ctx.db
      .query("cultoLouvores")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    const louvoresEnriched = await Promise.all(
      cultoLouvores
        .sort((a, b) => a.ordem - b.ordem)
        .map(async (cl) => {
          let louvor = null;
          if (cl.louvorId) {
            louvor = await ctx.db.get(cl.louvorId);
          }
          return {
            ...cl,
            titulo: louvor?.titulo || cl.tituloLegado || "",
            conteudo: louvor?.conteudo,
            tomOriginal: louvor?.tom,
          };
        })
    );

    // Avisos ativos para a data do culto. Indice corta dataInicio <= data;
    // dataFim (optional) nao e coberto pelo indice — filtrado em memoria.
    const avisos = await ctx.db
      .query("avisos")
      .withIndex("by_dataInicio", (q: any) => q.lte("dataInicio", culto.data))
      .collect();
    const avisosValidos = avisos.filter((a) => !a.dataFim || a.dataFim >= culto.data);

    // Arquivos
    const arquivos = await ctx.db
      .query("multimidiaArquivos")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    // Checklist
    const checklist = await ctx.db
      .query("multimidiaChecklist")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    // Notas
    const notas = await ctx.db
      .query("multimidiaNotas")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    const notasEnriched = await Promise.all(
      notas.map(async (n) => ({
        ...n,
        autorNome: await resolveMembroNome(ctx, n.membroId),
      }))
    );

    return {
      culto,
      escalas: escalasEnriched,
      louvores: louvoresEnriched,
      avisos: avisosValidos,
      arquivos,
      checklist: checklist.sort((a, b) => a.ordem - b.ordem),
      notas: notasEnriched.sort((a, b) => a.criadoEm - b.criadoEm),
    };
  },
});

export const listArquivos = query({
  args: { cultoId: v.id("cultos") },
  handler: async (ctx, { cultoId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const arquivos = await ctx.db
      .query("multimidiaArquivos")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .collect();

    return Promise.all(
      arquivos.map(async (a) => ({
        ...a,
        enviadoPorNome: await resolveMembroNome(ctx, a.enviadoPor),
      }))
    );
  },
});

export const getChecklistTemplate = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const templates = await ctx.db.query("multimidiaChecklistTemplate").collect();
    return templates.filter((t) => t.ativo).sort((a, b) => a.ordem - b.ordem);
  },
});
