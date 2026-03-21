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

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let pgs = await ctx.db.query("pequenosGrupos").collect();

    if (args.status) {
      pgs = pgs.filter((pg) => pg.status === args.status);
    }

    return Promise.all(
      pgs.map(async (pg) => {
        const membros = await ctx.db
          .query("pgMembros")
          .withIndex("by_pg", (q) => q.eq("pgId", pg._id))
          .collect();

        return {
          ...pg,
          liderNome: await resolveMembroNome(ctx, pg.liderId),
          coliderNome: pg.coliderId
            ? await resolveMembroNome(ctx, pg.coliderId)
            : null,
          qtdMembros: membros.length,
        };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("pequenosGrupos") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const pg = await ctx.db.get(id);
    if (!pg) return null;

    const pgMembros = await ctx.db
      .query("pgMembros")
      .withIndex("by_pg", (q) => q.eq("pgId", id))
      .collect();

    const membrosEnriched = await Promise.all(
      pgMembros.map(async (pm) => ({
        ...pm,
        nome: await resolveMembroNome(ctx, pm.membroId),
      }))
    );

    return {
      ...pg,
      liderNome: await resolveMembroNome(ctx, pg.liderId),
      coliderNome: pg.coliderId
        ? await resolveMembroNome(ctx, pg.coliderId)
        : null,
      membros: membrosEnriched,
    };
  },
});

export const listAllWithMembros = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const pgs = await ctx.db.query("pequenosGrupos").collect();
    const activePgs = pgs.filter((pg) => pg.status === "ATIVO");

    // Todos os vinculos existentes
    const allPgMembros = await ctx.db.query("pgMembros").collect();
    const membrosComPg = new Set(allPgMembros.map((pm) => pm.membroId));

    // PGs com membros enriquecidos
    const pgsWithMembros = await Promise.all(
      activePgs.map(async (pg) => {
        const pgMembros = allPgMembros.filter((pm) => pm.pgId === pg._id);

        const membrosEnriched = await Promise.all(
          pgMembros.map(async (pm) => ({
            _id: pm._id,
            membroId: pm.membroId,
            nome: await resolveMembroNome(ctx, pm.membroId),
          }))
        );

        return {
          _id: pg._id,
          nome: pg.nome,
          membros: membrosEnriched,
        };
      })
    );

    // Membros ativos sem PG
    const todosMembros = await ctx.db.query("membros").collect();
    const semGrupo = await Promise.all(
      todosMembros
        .filter((m) => !membrosComPg.has(m._id))
        .map(async (m) => {
          const entidade = await ctx.db.get(m.entidadeId);
          if (!entidade || entidade.status !== "ATIVO") return null;
          return {
            membroId: m._id,
            nome: entidade.nomeCompleto || "",
          };
        })
    );

    return {
      pgs: pgsWithMembros,
      semGrupo: semGrupo.filter(
        (m): m is NonNullable<typeof m> => m !== null
      ),
    };
  },
});

export const listByMembro = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const pgMembros = await ctx.db
      .query("pgMembros")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();

    const pgs = await Promise.all(
      pgMembros.map(async (pm) => {
        const pg = await ctx.db.get(pm.pgId);
        if (!pg) return null;
        return {
          ...pg,
          liderNome: await resolveMembroNome(ctx, pg.liderId),
        };
      })
    );

    return pgs.filter((pg): pg is NonNullable<typeof pg> => pg !== null);
  },
});
