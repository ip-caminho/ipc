import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { FREQUENCIA_MINIMA_PADRAO } from "../turmas/lib/constants";

function validaFrequencia(valor: number | undefined): number | undefined {
  if (valor === undefined) return undefined;
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    throw new Error("Frequencia minima deve estar entre 0 e 100");
  }
  return Math.round(valor);
}

export const create = mutation({
  args: {
    nome: v.string(),
    descricao: v.optional(v.string()),
    ementa: v.optional(v.string()),
    cargaHoraria: v.optional(v.number()),
    totalAulas: v.optional(v.number()),
    frequenciaMinima: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "turmas:create");

    const id = await ctx.db.insert("cursos", {
      nome: args.nome.trim(),
      descricao: args.descricao?.trim() || undefined,
      ementa: args.ementa?.trim() || undefined,
      cargaHoraria: args.cargaHoraria,
      totalAulas: args.totalAulas,
      frequenciaMinima:
        validaFrequencia(args.frequenciaMinima) ?? FREQUENCIA_MINIMA_PADRAO,
      status: "ATIVO",
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "cursos", id as string);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("cursos"),
    nome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    ementa: v.optional(v.string()),
    cargaHoraria: v.optional(v.number()),
    totalAulas: v.optional(v.number()),
    frequenciaMinima: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "turmas:update");
    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Curso nao encontrado");

    validaFrequencia(updates.frequenciaMinima);

    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined) continue;
      patch[key] = typeof val === "string" ? val.trim() : val;
    }
    if (Object.keys(patch).length === 0) return;

    // Mudar o curso NAO altera turma em andamento: a turma copia
    // frequenciaMinima na criacao.
    await ctx.db.patch(id, patch);
    const newRecord = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "cursos");
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("cursos"),
    status: v.union(v.literal("ATIVO"), v.literal("INATIVO")),
  },
  handler: async (ctx, { id, status }) => {
    await requirePermission(ctx, "turmas:update");
    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Curso nao encontrado");
    if (oldRecord.status === status) return;

    // Curso inativo sai do select de turmas novas, mas o historico fica.
    await ctx.db.patch(id, { status });
    const newRecord = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "cursos");
  },
});
