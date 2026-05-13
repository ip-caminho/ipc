import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAnyPermission } from "../_shared/requirePermission";

const TIPO_VALIDATOR = v.union(
  v.literal("BATISMO"),
  v.literal("PROFISSAO_FE"),
  v.literal("CASAMENTO"),
  v.literal("FUNERAL"),
  v.literal("RESTAURACAO"),
  v.literal("OUTRO")
);

export const registrar = mutation({
  args: {
    membroId: v.id("membros"),
    tipo: TIPO_VALIDATOR,
    data: v.string(),
    local: v.optional(v.string()),
    oficiante: v.optional(v.string()),
    padrinhos: v.optional(v.array(v.string())),
    observacoes: v.optional(v.string()),
    livroFolha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyPermission(ctx, ["membros:update"]);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const registrador = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!registrador) throw new Error("Registrador nao encontrado");

    const id = await ctx.db.insert("atosPastorais", {
      ...args,
      registradoEm: Date.now(),
      registradoPor: registrador._id,
    });

    // Tira o campo de dadosIncertos correspondente, se houver
    const membro = await ctx.db.get(args.membroId);
    if (membro) {
      const entidade = await ctx.db.get(membro.entidadeId);
      if (entidade?.dadosIncertos?.length) {
        const campoIncerto =
          args.tipo === "BATISMO"
            ? "dataBatismo"
            : args.tipo === "PROFISSAO_FE"
              ? "dataConversao"
              : null;
        if (campoIncerto) {
          const newDadosIncertos = entidade.dadosIncertos.filter((c) => c !== campoIncerto);
          await ctx.db.patch(membro.entidadeId, {
            dadosIncertos: newDadosIncertos.length > 0 ? newDadosIncertos : undefined,
          });
        }
      }
    }

    return id;
  },
});

export const atualizar = mutation({
  args: {
    id: v.id("atosPastorais"),
    data: v.optional(v.string()),
    local: v.optional(v.string()),
    oficiante: v.optional(v.string()),
    padrinhos: v.optional(v.array(v.string())),
    observacoes: v.optional(v.string()),
    livroFolha: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAnyPermission(ctx, ["membros:update"]);
    const ato = await ctx.db.get(id);
    if (!ato) throw new Error("Ato pastoral nao encontrado");
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remover = mutation({
  args: { id: v.id("atosPastorais") },
  handler: async (ctx, { id }) => {
    await requireAnyPermission(ctx, ["membros:delete", "membros:update"]);
    await ctx.db.delete(id);
    return { ok: true };
  },
});
