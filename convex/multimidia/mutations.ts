import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createActionAuditLog } from "../_shared/auditHelpers";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Nao autenticado");
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");
  return { userId, membro };
}

// ===== Arquivos =====

export const enviarArquivo = mutation({
  args: {
    cultoId: v.id("cultos"),
    tipo: v.union(v.literal("APRESENTACAO"), v.literal("VIDEO"), v.literal("IMAGEM"), v.literal("OUTRO")),
    nomeArquivo: v.string(),
    url: v.string(),
    mimeType: v.string(),
    descricao: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { membro } = await requireAuth(ctx);
    const id = await ctx.db.insert("multimidiaArquivos", {
      ...args,
      enviadoPor: membro._id,
      status: "RECEBIDO",
    });

    await createActionAuditLog(ctx, "CREATE", "multimidiaArquivos", id as string);
    return id;
  },
});

export const revisarArquivo = mutation({
  args: {
    id: v.id("multimidiaArquivos"),
    status: v.union(v.literal("REVISADO"), v.literal("APROVADO")),
  },
  handler: async (ctx, { id, status }) => {
    const { membro } = await requireAuth(ctx);
    await ctx.db.patch(id, { status, revisadoPor: membro._id });
  },
});

export const removeArquivo = mutation({
  args: { id: v.id("multimidiaArquivos") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "multimidiaArquivos", id as string);
  },
});

// ===== Checklist =====

export const initChecklist = mutation({
  args: { cultoId: v.id("cultos") },
  handler: async (ctx, { cultoId }) => {
    await requireAuth(ctx);

    // Verificar se ja tem checklist
    const existing = await ctx.db
      .query("multimidiaChecklist")
      .withIndex("by_culto", (q) => q.eq("cultoId", cultoId))
      .first();
    if (existing) return; // ja inicializado

    // Copiar do template
    const templates = await ctx.db.query("multimidiaChecklistTemplate").collect();
    const ativos = templates.filter((t) => t.ativo).sort((a, b) => a.ordem - b.ordem);

    for (const t of ativos) {
      await ctx.db.insert("multimidiaChecklist", {
        cultoId,
        item: t.item,
        ordem: t.ordem,
        concluido: false,
      });
    }
  },
});

export const toggleChecklistItem = mutation({
  args: { id: v.id("multimidiaChecklist") },
  handler: async (ctx, { id }) => {
    const { membro } = await requireAuth(ctx);

    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item nao encontrado");

    await ctx.db.patch(id, {
      concluido: !item.concluido,
      concluidoPor: !item.concluido ? membro._id : undefined,
      concluidoEm: !item.concluido ? Date.now() : undefined,
    });
  },
});

// ===== Notas =====

export const criarNota = mutation({
  args: {
    cultoId: v.id("cultos"),
    texto: v.string(),
  },
  handler: async (ctx, { cultoId, texto }) => {
    const { membro } = await requireAuth(ctx);
    return await ctx.db.insert("multimidiaNotas", {
      cultoId,
      membroId: membro._id,
      texto: texto.trim(),
      criadoEm: Date.now(),
    });
  },
});

export const removeNota = mutation({
  args: { id: v.id("multimidiaNotas") },
  handler: async (ctx, { id }) => {
    const { membro } = await requireAuth(ctx);
    const nota = await ctx.db.get(id);
    if (!nota) throw new Error("Nota nao encontrada");
    if (nota.membroId !== membro._id && membro.role !== "admin") {
      throw new Error("Sem permissao");
    }
    await ctx.db.delete(id);
  },
});

// ===== Template =====

export const seedChecklistTemplate = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("multimidiaChecklistTemplate").collect();
    if (existing.length > 0) return;

    const items = [
      "Montar apresentacao",
      "Conferir versiculo biblico",
      "Conferir versao da Biblia",
      "Conferir avisos",
      "Conferir louvores e tons",
      "Testar projecao",
      "Conferir audio/microfone",
    ];

    for (let i = 0; i < items.length; i++) {
      await ctx.db.insert("multimidiaChecklistTemplate", {
        item: items[i],
        ordem: i + 1,
        ativo: true,
      });
    }
  },
});
