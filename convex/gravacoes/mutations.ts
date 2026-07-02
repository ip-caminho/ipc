import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs, createActionAuditLog } from "../_shared/auditHelpers";
import { requirePermission } from "../_shared/requirePermission";

export const create = mutation({
  args: {
    titulo: v.string(),
    tipo: v.union(
      v.literal("SERMAO"),
      v.literal("ESTUDO_BIBLICO"),
      v.literal("PALESTRA"),
      v.literal("OUTRO")
    ),
    pregadorId: v.optional(v.id("membros")),
    pregadorNome: v.optional(v.string()),
    data: v.string(),
    descricao: v.optional(v.string()),
    resumo: v.optional(v.string()),
    textoBase: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    serieId: v.optional(v.id("serieGravacoes")),
    materiaisComplementares: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("RASCUNHO"), v.literal("PUBLICADO"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const id = await ctx.db.insert("gravacoes", {
      ...args,
      status: args.status || "RASCUNHO",
    });

    await createActionAuditLog(ctx, "CREATE", "gravacoes", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("gravacoes"),
    data: v.any(),
  },
  handler: async (ctx, { id, data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Gravacao not found");

    // Player e UI preferem inicioConteudo/fimConteudo. Ao editar o trecho do
    // sermao (inicioSermao/fimSermao), sincroniza esses campos — senao o
    // playback continua usando o valor antigo de inicioConteudo.
    const patch = { ...data };
    if (data.inicioSermao !== undefined) patch.inicioConteudo = data.inicioSermao;
    if (data.fimSermao !== undefined) patch.fimConteudo = data.fimSermao;

    await ctx.db.patch(id, patch);
    const newRecord = await ctx.db.get(id);

    await createFieldAuditLogs(ctx, oldRecord, newRecord, "gravacoes", id);
    return id;
  },
});

export const publish = mutation({
  args: { id: v.id("gravacoes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Gravacao not found");

    await ctx.db.patch(id, { status: "PUBLICADO" });
    const newRecord = await ctx.db.get(id);

    await createFieldAuditLogs(ctx, oldRecord, newRecord, "gravacoes", id);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("gravacoes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const gravacao = await ctx.db.get(id);
    if (!gravacao) throw new Error("Gravacao nao encontrada");

    // Delete audio file from B2
    if (gravacao.audioUrl) {
      // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
      await ctx.scheduler.runAfter(0, internal.files.upload.deleteFile, {
        url: gravacao.audioUrl,
      });
    }

    // Delete comentarios (tabela unificada)
    const comentarios = await ctx.db
      .query("comentarios")
      .withIndex("by_entidade", (q: any) =>
        q.eq("entidadeTipo", "gravacoes").eq("entidadeId", id)
      )
      .collect();
    for (const c of comentarios) {
      await ctx.db.delete(c._id);
    }

    // Delete reacoes
    const reacoes = await ctx.db
      .query("reacoesGravacao")
      .withIndex("by_gravacao", (q: any) => q.eq("gravacaoId", id))
      .collect();
    for (const r of reacoes) {
      await ctx.db.delete(r._id);
    }

    // Delete escutas
    const escutas = await ctx.db
      .query("escutasGravacao")
      .withIndex("by_gravacao", (q: any) => q.eq("gravacaoId", id))
      .collect();
    for (const e of escutas) {
      await ctx.db.delete(e._id);
    }

    await createActionAuditLog(ctx, "DELETE", "gravacoes", id);
    await ctx.db.delete(id);
  },
});

// Curadoria dos avisos do site (painel /admin/site-publico/avisos). Escopada SO
// ao campo iaAvisos — nao expoe os demais campos da gravacao a quem tem site_publico:manage.
// A tela recarrega e reenvia todos os campos de cada aviso (inclusive contato/
// dataEvento) para nao apaga-los. Contato/WhatsApp seguem nao expostos no site
// (public/avisos.ts ja omite). Exige site_publico:manage.
export const corrigirAvisosCulto = mutation({
  args: {
    gravacaoId: v.id("gravacoes"),
    avisos: v.array(
      v.object({
        titulo: v.string(),
        descricao: v.string(),
        quando: v.optional(v.union(v.string(), v.null())),
        onde: v.optional(v.union(v.string(), v.null())),
        dataEvento: v.optional(v.union(v.string(), v.null())),
        contatoNome: v.optional(v.union(v.string(), v.null())),
        contatoWhatsapp: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  handler: async (ctx, { gravacaoId, avisos }) => {
    await requirePermission(ctx, "site_publico:manage");
    const old = await ctx.db.get(gravacaoId);
    if (!old) throw new Error("Gravacao nao encontrada");
    await ctx.db.patch(gravacaoId, { iaAvisos: avisos });
    const novo = await ctx.db.get(gravacaoId);
    await createFieldAuditLogs(ctx, old, novo, "gravacoes", gravacaoId);
  },
});
