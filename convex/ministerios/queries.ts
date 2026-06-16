import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { resolveMembroNome } from "../_shared/membroResolver";

async function resolveMembroCbcm(ctx: any, membroId: any): Promise<string | null> {
  if (!membroId) return null;
  const membro = await ctx.db.get(membroId);
  if (!membro) return null;
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.cbcm ?? null;
}

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let ministerios = await ctx.db.query("ministerios").collect();

    if (args.status) {
      ministerios = ministerios.filter((m) => m.status === args.status);
    }

    return Promise.all(
      ministerios.map(async (min) => {
        const membros = await ctx.db
          .query("ministerioMembros")
          .withIndex("by_ministerio", (q) => q.eq("ministerioId", min._id))
          .collect();

        const membrosAtivos = membros.filter((m) => m.status === "ATIVO");

        return {
          ...min,
          qtdMembros: membrosAtivos.length,
        };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("ministerios") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const ministerio = await ctx.db.get(id);
    if (!ministerio) return null;

    const minMembros = await ctx.db
      .query("ministerioMembros")
      .withIndex("by_ministerio", (q) => q.eq("ministerioId", id))
      .collect();

    const membrosEnriched = await Promise.all(
      minMembros.map(async (mm) => ({
        ...mm,
        nome: await resolveMembroNome(ctx, mm.membroId),
        cbcm: await resolveMembroCbcm(ctx, mm.membroId),
      }))
    );

    return {
      ...ministerio,
      membros: membrosEnriched,
    };
  },
});

export const listByMembro = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const minMembros = await ctx.db
      .query("ministerioMembros")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();

    const ministerios = await Promise.all(
      minMembros.map(async (mm) => {
        const min = await ctx.db.get(mm.ministerioId);
        if (!min) return null;
        return {
          ...min,
          papel: mm.papel,
          subgrupos: mm.subgrupos,
        };
      })
    );

    return ministerios.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});
