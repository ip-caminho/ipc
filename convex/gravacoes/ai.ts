import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Lazy-load to avoid TS2589 "type instantiation excessively deep"
function getProcessSermonRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.aiAction.processSermon;
}

// ===== INTERNAL MUTATION: update IA status =====

export const updateIaStatus = internalMutation({
  args: {
    id: v.id("gravacoes"),
    iaStatus: v.string(),
    iaErro: v.optional(v.string()),
    iaTranscricao: v.optional(v.string()),
    iaResultado: v.optional(v.any()),
    iaProcessadoEm: v.optional(v.number()),
    iaProcessadoPor: v.optional(v.id("membros")),
    // Auto-fill fields from IA
    titulo: v.optional(v.string()),
    pregadorNome: v.optional(v.string()),
    textoBase: v.optional(v.string()),
    resumo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(id, patch);
  },
});

// ===== PUBLIC MUTATION: create from audio + auto-process =====

export const createFromAudio = mutation({
  args: {
    audioUrl: v.string(),
    tipo: v.optional(v.union(
      v.literal("SERMAO"),
      v.literal("ESTUDO_BIBLICO"),
      v.literal("PALESTRA"),
      v.literal("TESTEMUNHO")
    )),
    data: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Membro nao encontrado");

    const id = await ctx.db.insert("gravacoes", {
      titulo: "Processando...",
      tipo: args.tipo || "SERMAO",
      data: args.data || new Date().toISOString().split("T")[0],
      audioUrl: args.audioUrl,
      status: "RASCUNHO",
      iaStatus: "PENDENTE",
    });

    await ctx.scheduler.runAfter(0, getProcessSermonRef(), {
      gravacaoId: id,
      audioUrl: args.audioUrl,
      membroId: membro._id,
    });

    return id;
  },
});

// ===== PUBLIC MUTATION: start processing =====

export const startProcessing = mutation({
  args: {
    id: v.id("gravacoes"),
  },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Membro nao encontrado");

    // Check permission: admin wildcard or explicit permission
    const hasPermission =
      membro.role === "admin" ||
      (membro.permissions && membro.permissions.includes("gravacoes:process_ai"));

    if (!hasPermission) {
      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("role", membro.role))
        .first();
      const perms = rolePerms?.permissions ?? [];
      if (!perms.includes("gravacoes:process_ai") && !perms.includes("*")) {
        throw new Error("Sem permissao para processar com IA");
      }
    }

    const gravacao = await ctx.db.get(id);
    if (!gravacao) throw new Error("Gravacao nao encontrada");
    if (!gravacao.audioUrl) throw new Error("Gravacao sem audio para processar");

    if (gravacao.iaStatus === "TRANSCREVENDO" || gravacao.iaStatus === "ANALISANDO") {
      throw new Error("Processamento ja em andamento");
    }

    await ctx.db.patch(id, {
      iaStatus: "PENDENTE",
      iaErro: undefined,
    });

    await ctx.scheduler.runAfter(0, getProcessSermonRef(), {
      gravacaoId: id,
      audioUrl: gravacao.audioUrl,
      membroId: membro._id,
    });

    return id;
  },
});
