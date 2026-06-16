import { query, mutation } from "../_generated/server";
import { getSaoPauloDate, getSaoPauloDateString } from "../_shared/datetime";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");

  return { userId, membro };
}

// Retorna proximos N domingos a partir de hoje
function getProximosDomingos(semanas: number): string[] {
  const datas: string[] = [];
  const sp = getSaoPauloDate();
  const hoje = new Date(sp.year, sp.month - 1, sp.day);
  const dia = new Date(hoje);

  // Avançar para o proximo domingo
  dia.setDate(dia.getDate() + ((7 - dia.getDay()) % 7 || 7));

  for (let i = 0; i < semanas; i++) {
    datas.push(dia.toISOString().split("T")[0]);
    dia.setDate(dia.getDate() + 7);
  }

  return datas;
}

export const minhasIndisponibilidades = query({
  args: {
    ateData: v.optional(v.string()), // YYYY-MM-DD — default: fim do ano corrente
  },
  handler: async (ctx, { ateData }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const hoje = getSaoPauloDateString();
    const limite = ateData || `${new Date().getFullYear()}-12-31`;

    const indisps = await ctx.db
      .query("indisponibilidades")
      .withIndex("by_membro", (q: any) => q.eq("membroId", membro._id))
      .collect();

    return indisps.filter((i) => i.data >= hoje && i.data <= limite);
  },
});

export const listPorData = query({
  args: { data: v.string() },
  handler: async (ctx, { data }) => {
    const indisps = await ctx.db
      .query("indisponibilidades")
      .withIndex("by_data", (q: any) => q.eq("data", data))
      .collect();

    return Promise.all(
      indisps.map(async (i) => {
        const membro = await ctx.db.get(i.membroId);
        const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
        return {
          ...i,
          nomeCompleto: entidade?.nomeCompleto || "",
        };
      })
    );
  },
});

export const minhasDatasEscaladas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const hoje = getSaoPauloDateString();

    const minhasEscalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_membro", (q: any) => q.eq("membroId", membro._id))
      .collect();

    const datas: string[] = [];

    for (const e of minhasEscalas) {
      const culto = await ctx.db.get(e.cultoId);
      if (culto && culto.data >= hoje) {
        datas.push(culto.data);
      }
    }

    return [...new Set(datas)];
  },
});

export const toggleIndisponibilidade = mutation({
  args: { data: v.string(), motivo: v.optional(v.string()) },
  handler: async (ctx, { data, motivo }) => {
    const { membro } = await requireAuth(ctx);

    // Verificar se já está escalado nessa data
    const cultosNaData = await ctx.db
      .query("cultos")
      .withIndex("by_data", (q: any) => q.eq("data", data))
      .collect();

    for (const culto of cultosNaData) {
      const escala = await ctx.db
        .query("cultoEscalas")
        .withIndex("by_culto_funcao", (q: any) => q.eq("cultoId", culto._id))
        .collect();
      if (escala.some((e) => e.membroId === membro._id)) {
        throw new Error("Você já está escalado nesta data. Solicite ao coordenador para alterar.");
      }
    }

    const existing = await ctx.db
      .query("indisponibilidades")
      .withIndex("by_membro_data", (q: any) =>
        q.eq("membroId", membro._id).eq("data", data)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "removed" as const };
    }

    await ctx.db.insert("indisponibilidades", {
      membroId: membro._id,
      data,
      motivo,
      criadoEm: Date.now(),
    });
    return { action: "added" as const };
  },
});

export const setIndisponibilidades = mutation({
  args: { datas: v.array(v.string()) },
  handler: async (ctx, { datas }) => {
    const { membro } = await requireAuth(ctx);

    const datasSet = new Set(datas);

    // Buscar todas as indisponibilidades do membro
    const existing = await ctx.db
      .query("indisponibilidades")
      .withIndex("by_membro", (q: any) => q.eq("membroId", membro._id))
      .collect();

    // Remover as que nao estao mais na lista
    for (const e of existing) {
      if (!datasSet.has(e.data)) {
        await ctx.db.delete(e._id);
      }
    }

    // Inserir as que faltam
    const existingDatas = new Set(existing.map((e) => e.data));
    for (const data of datas) {
      if (!existingDatas.has(data)) {
        await ctx.db.insert("indisponibilidades", {
          membroId: membro._id,
          data,
          criadoEm: Date.now(),
        });
      }
    }
  },
});
