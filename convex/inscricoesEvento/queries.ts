import { query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";

// Queries do lado admin (chrMS autenticado, RBAC site_publico:manage).

// Lista todas as inscrições de evento (gestão). Volume baixo.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "site_publico:manage");
    const docs = await ctx.db.query("inscricoesEvento").collect();
    return docs
      .sort((a, b) => b.criadoEm - a.criadoEm)
      .map((i) => ({
        _id: i._id,
        slug: i.slug,
        titulo: i.titulo,
        ativa: i.ativa,
        dataLimite: i.dataLimite,
        vagas: i.vagas,
        vagasOcupadas: i.vagasOcupadas,
        criadoEm: i.criadoEm,
      }));
  },
});

export const getById = query({
  args: { id: v.id("inscricoesEvento") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "site_publico:manage");
    return await ctx.db.get(id);
  },
});

// Respostas de uma inscrição (tabela admin + base do export CSV).
export const listarRespostas = query({
  args: { inscricaoId: v.id("inscricoesEvento") },
  handler: async (ctx, { inscricaoId }) => {
    await requirePermission(ctx, "site_publico:manage");
    const respostas = await ctx.db
      .query("respostasInscricaoEvento")
      .withIndex("by_inscricao", (q) => q.eq("inscricaoId", inscricaoId))
      .collect();
    return respostas
      .sort((a, b) => a.criadoEm - b.criadoEm)
      .map((r) => ({
        _id: r._id,
        membroId: r.membroId ?? null,
        dadosSistema: r.dadosSistema ?? {},
        dadosCustom: (r.dadosCustom ?? {}) as Record<string, unknown>,
        status: r.status,
        criadoEm: r.criadoEm,
      }));
  },
});
