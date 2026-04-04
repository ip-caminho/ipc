import { internalMutation, internalQuery, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Lazy-load to avoid TS2589 "type instantiation excessively deep"
function getProcessSermonRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.aiAction.processSermon;
}

function getDownloadYouTubeRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.youtubeAction.downloadYouTubeAudio;
}

// ===== INTERNAL QUERY: get gravacao data for action context =====

export const getGravacaoData = internalQuery({
  args: { id: v.id("gravacoes") },
  handler: async (ctx, { id }) => {
    const gravacao = await ctx.db.get(id);
    return gravacao?.data || null;
  },
});

// ===== INTERNAL MUTATION: create calendar events from avisos =====

export const createEventosFromAvisos = internalMutation({
  args: {
    avisos: v.array(v.object({
      titulo: v.string(),
      descricao: v.string(),
      dataEvento: v.optional(v.union(v.string(), v.null())),
      quando: v.optional(v.union(v.string(), v.null())),
      onde: v.optional(v.union(v.string(), v.null())),
      contatoNome: v.optional(v.union(v.string(), v.null())),
      contatoWhatsapp: v.optional(v.union(v.string(), v.null())),
    })),
  },
  handler: async (ctx, { avisos }) => {
    let created = 0;
    for (const aviso of avisos) {
      if (!aviso.dataEvento) continue;

      // Dedup: verificar se ja existe evento com mesmo titulo e data
      const existing = await ctx.db
        .query("calendarioEventos")
        .withIndex("by_data", (q) => q.eq("data", aviso.dataEvento!))
        .collect();
      const dup = existing.find((e) => e.titulo === aviso.titulo);
      if (dup) continue;

      await ctx.db.insert("calendarioEventos", {
        titulo: aviso.titulo,
        data: aviso.dataEvento,
        descricao: aviso.descricao,
        origem: "aviso-ia",
        criadoEm: Date.now(),
      });
      created++;
    }
    return { created };
  },
});

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
    audioUrl: v.optional(v.string()),
    // Auto-fill fields from IA
    titulo: v.optional(v.string()),
    pregadorNome: v.optional(v.string()),
    textoBase: v.optional(v.string()),
    resumo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    inicioSermao: v.optional(v.number()),
    fimSermao: v.optional(v.number()),
    inicioAvisos: v.optional(v.number()),
    fimAvisos: v.optional(v.number()),
    iaAvisos: v.optional(v.array(v.object({
      titulo: v.string(),
      descricao: v.string(),
      dataEvento: v.optional(v.union(v.string(), v.null())),
      quando: v.optional(v.union(v.string(), v.null())),
      onde: v.optional(v.union(v.string(), v.null())),
      contatoNome: v.optional(v.union(v.string(), v.null())),
      contatoWhatsapp: v.optional(v.union(v.string(), v.null())),
    }))),
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
      v.literal("OUTRO")
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
      tipo: args.tipo || "SERMAO",
    });

    return id;
  },
});

// ===== PUBLIC MUTATION: create from YouTube URL + auto-process =====

export const createFromYouTube = mutation({
  args: {
    youtubeUrl: v.string(),
    tipo: v.optional(v.union(
      v.literal("SERMAO"),
      v.literal("ESTUDO_BIBLICO"),
      v.literal("PALESTRA"),
      v.literal("OUTRO")
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
      titulo: "Importando do YouTube...",
      tipo: args.tipo || "SERMAO",
      data: args.data || new Date().toISOString().split("T")[0],
      youtubeUrl: args.youtubeUrl,
      status: "RASCUNHO",
      iaStatus: "BAIXANDO",
    });

    await ctx.scheduler.runAfter(0, getDownloadYouTubeRef(), {
      gravacaoId: id,
      youtubeUrl: args.youtubeUrl,
      membroId: membro._id,
    });

    return id;
  },
});

// ===== PUBLIC MUTATION: start processing =====

export const startProcessing = mutation({
  args: {
    id: v.id("gravacoes"),
    retryFrom: v.optional(v.union(v.literal("BAIXANDO"), v.literal("TRANSCREVENDO"), v.literal("ANALISANDO"))),
  },
  handler: async (ctx, { id, retryFrom }) => {
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

    if (gravacao.iaStatus === "BAIXANDO" || gravacao.iaStatus === "TRANSCREVENDO" || gravacao.iaStatus === "ANALISANDO") {
      throw new Error("Processamento ja em andamento");
    }

    // Retry YouTube download
    if (retryFrom === "BAIXANDO") {
      if (!gravacao.youtubeUrl) throw new Error("Gravacao sem URL do YouTube");

      await ctx.db.patch(id, {
        iaStatus: "BAIXANDO",
        iaErro: undefined,
      });

      await ctx.scheduler.runAfter(0, getDownloadYouTubeRef(), {
        gravacaoId: id,
        youtubeUrl: gravacao.youtubeUrl,
        membroId: membro._id,
      });

      return id;
    }

    if (!gravacao.audioUrl) throw new Error("Gravacao sem audio para processar");

    // Retry from analysis: skip Deepgram, reuse existing transcription
    const skipTranscription =
      retryFrom === "ANALISANDO" && gravacao.iaTranscricao
        ? gravacao.iaTranscricao
        : undefined;

    await ctx.db.patch(id, {
      iaStatus: "PENDENTE",
      iaErro: undefined,
    });

    await ctx.scheduler.runAfter(0, getProcessSermonRef(), {
      gravacaoId: id,
      audioUrl: gravacao.audioUrl,
      membroId: membro._id,
      tipo: gravacao.tipo,
      skipTranscription,
    });

    return id;
  },
});
