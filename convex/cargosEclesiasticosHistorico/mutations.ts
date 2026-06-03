import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAnyPermission } from "../_shared/requirePermission";

const CARGO_VALIDATOR = v.union(
  v.literal("PASTOR"),
  v.literal("PRESBITERO"),
  v.literal("DIACONO"),
);

export const iniciarMandato = mutation({
  args: {
    membroId: v.id("membros"),
    cargo: CARGO_VALIDATOR,
    mandatoInicio: v.string(),
    mandatoFim: v.optional(v.string()),
    observacoes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyPermission(ctx, ["membros:update_eclesiastico", "membros:update"]);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const registrador = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!registrador) throw new Error("Registrador nao encontrado");

    const id = await ctx.db.insert("cargosEclesiasticosHistorico", {
      ...args,
      status: "ATIVO",
      registradoEm: Date.now(),
      registradoPor: registrador._id,
    });
    return id;
  },
});

export const encerrarMandato = mutation({
  args: {
    id: v.id("cargosEclesiasticosHistorico"),
    mandatoFim: v.string(),
    status: v.optional(v.union(v.literal("ENCERRADO"), v.literal("AFASTADO"))),
  },
  handler: async (ctx, { id, mandatoFim, status }) => {
    await requireAnyPermission(ctx, ["membros:update_eclesiastico", "membros:update"]);
    const cargo = await ctx.db.get(id);
    if (!cargo) throw new Error("Mandato nao encontrado");
    await ctx.db.patch(id, {
      mandatoFim,
      status: status ?? "ENCERRADO",
    });
    return id;
  },
});

export const remover = mutation({
  args: { id: v.id("cargosEclesiasticosHistorico") },
  handler: async (ctx, { id }) => {
    await requireAnyPermission(ctx, ["membros:delete", "membros:update", "membros:update_eclesiastico"]);
    await ctx.db.delete(id);
    return { ok: true };
  },
});
