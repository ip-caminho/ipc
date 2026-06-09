import { query, mutation } from "../_generated/server";
import { getSaoPauloDateString } from "../_shared/datetime";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";

export const listEquipes = query({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("equipeMembros").collect();

    // Agrupar por funcao
    const grouped: Record<string, typeof allMembers> = {};
    for (const em of allMembers) {
      if (!grouped[em.funcao]) grouped[em.funcao] = [];
      grouped[em.funcao].push(em);
    }

    // Resolver nomes
    const result: Record<string, Array<{
      _id: string;
      membroId: string;
      ativo: boolean;
      condutor?: boolean;
      instrumentos?: string[];
      nomeCompleto: string;
      foto?: string;
    }>> = {};

    for (const [funcao, members] of Object.entries(grouped)) {
      result[funcao] = await Promise.all(
        members.map(async (em) => {
          const membro = await ctx.db.get(em.membroId);
          const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
          return {
            _id: em._id,
            membroId: em.membroId,
            ativo: em.ativo,
            condutor: em.condutor,
            instrumentos: em.instrumentos,
            nomeCompleto: entidade?.nomeCompleto || "",
            foto: entidade?.foto,
          };
        })
      );
    }

    return result;
  },
});

export const listMinhasEquipes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const equipes = await ctx.db
      .query("equipeMembros")
      .withIndex("by_membro", (q: any) => q.eq("membroId", membro._id))
      .collect();

    return equipes
      .filter((e) => e.ativo)
      .map((e) => e.funcao);
  },
});

// Para cada equipe do membro logado, retorna os próximos cultos com as atribuições da função
export const getEscalasProximasPorEquipe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const equipes = await ctx.db
      .query("equipeMembros")
      .withIndex("by_membro", (q: any) => q.eq("membroId", membro._id))
      .collect();

    const minhasFuncoes = equipes.filter((e) => e.ativo).map((e) => e.funcao);
    if (minhasFuncoes.length === 0) return [];

    const today = getSaoPauloDateString();
    const cultos = await ctx.db.query("cultos").order("asc").collect();
    const proximosCultos = cultos.filter((c) => c.data >= today).slice(0, 8);

    const result: Array<{
      funcao: string;
      cultos: Array<{
        cultoId: string;
        data: string;
        horario?: string;
        atribuidos: Array<{ membroId: string; nomeCompleto: string }>;
      }>;
    }> = [];

    for (const funcao of minhasFuncoes) {
      const cultosComEscala = await Promise.all(
        proximosCultos.map(async (culto) => {
          const escalas = await ctx.db
            .query("cultoEscalas")
            .withIndex("by_culto_funcao", (q: any) =>
              q.eq("cultoId", culto._id).eq("funcao", funcao)
            )
            .collect();

          const atribuidos = await Promise.all(
            escalas
              .filter((e) => e.membroId)
              .map(async (e) => {
                const m = await ctx.db.get(e.membroId!);
                const ent = m ? await ctx.db.get(m.entidadeId) : null;
                return {
                  membroId: e.membroId!,
                  nomeCompleto: ent?.nomeCompleto || "",
                };
              })
          );

          return {
            cultoId: culto._id,
            data: culto.data,
            horario: culto.horario,
            atribuidos,
          };
        })
      );

      result.push({ funcao, cultos: cultosComEscala });
    }

    return result;
  },
});

export const addMembro = mutation({
  args: {
    funcao: v.string(),
    membroId: v.id("membros"),
  },
  handler: async (ctx, { funcao, membroId }) => {
    await requirePermission(ctx, "escalas:update");

    // Verificar duplicata
    const existing = await ctx.db
      .query("equipeMembros")
      .withIndex("by_funcao_membro", (q: any) =>
        q.eq("funcao", funcao).eq("membroId", membroId)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("equipeMembros", {
      funcao,
      membroId,
      ativo: true,
      criadoEm: Date.now(),
    });
  },
});

export const removeMembro = mutation({
  args: { id: v.id("equipeMembros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:update");
    const em = await ctx.db.get(id);
    if (!em) throw new Error("Registro nao encontrado");
    await ctx.db.delete(id);
  },
});

export const toggleAtivo = mutation({
  args: { id: v.id("equipeMembros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:update");
    const em = await ctx.db.get(id);
    if (!em) throw new Error("Registro nao encontrado");
    await ctx.db.patch(id, { ativo: !em.ativo });
  },
});

export const toggleCondutor = mutation({
  args: { id: v.id("equipeMembros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:update");
    const em = await ctx.db.get(id);
    if (!em) throw new Error("Registro nao encontrado");
    await ctx.db.patch(id, { condutor: !em.condutor });
  },
});

export const updateInstrumentos = mutation({
  args: {
    id: v.id("equipeMembros"),
    instrumentos: v.array(v.string()),
  },
  handler: async (ctx, { id, instrumentos }) => {
    await requirePermission(ctx, "escalas:update");
    const em = await ctx.db.get(id);
    if (!em) throw new Error("Registro nao encontrado");
    await ctx.db.patch(id, { instrumentos: instrumentos.length > 0 ? instrumentos : undefined });
  },
});
