import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const meuMembroId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    return membro?._id ?? null;
  },
});

export const listSalas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("salas")
      .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
      .collect();
  },
});

export const listReservas = query({
  args: {
    salaId: v.optional(v.id("salas")),
    data: v.string(),
  },
  handler: async (ctx, { salaId, data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let reservas;
    if (salaId) {
      reservas = await ctx.db
        .query("reservas")
        .withIndex("by_sala_data", (q) => q.eq("salaId", salaId).eq("data", data))
        .collect();
    } else {
      reservas = await ctx.db
        .query("reservas")
        .withIndex("by_data", (q) => q.eq("data", data))
        .collect();
    }

    const ativas = reservas.filter((r) => r.status === "ATIVA");

    return Promise.all(
      ativas.map(async (r) => {
        const membro = await ctx.db.get(r.membroId);
        const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
        const sala = await ctx.db.get(r.salaId);
        return {
          ...r,
          membroNome: entidade?.nomeCompleto ?? "",
          salaNome: sala?.nome ?? "",
        };
      })
    );
  },
});

export const minhasReservas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const hoje = new Date().toISOString().split("T")[0];
    const reservas = await ctx.db
      .query("reservas")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    const futuras = reservas.filter((r) => r.data >= hoje && r.status === "ATIVA");

    return Promise.all(
      futuras
        .sort((a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio))
        .map(async (r) => {
          const sala = await ctx.db.get(r.salaId);
          return { ...r, salaNome: sala?.nome ?? "" };
        })
    );
  },
});
