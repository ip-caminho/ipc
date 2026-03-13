import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs, createActionAuditLog } from "../_shared/auditHelpers";

export const create = mutation({
  args: {
    tipoEntidade: v.union(v.literal("PF"), v.literal("PJ")),
    papeis: v.array(v.string()),
    nomeCompleto: v.optional(v.string()),
    cpf: v.optional(v.string()),
    rg: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.string()),
    estadoCivil: v.optional(v.string()),
    nacionalidade: v.optional(v.string()),
    naturalidade: v.optional(v.any()),
    pai: v.optional(v.string()),
    mae: v.optional(v.string()),
    profissao: v.optional(v.string()),
    formacao: v.optional(v.string()),
    foto: v.optional(v.string()),
    nomeRazaoSocial: v.optional(v.string()),
    nomeFantasia: v.optional(v.string()),
    cnpj: v.optional(v.string()),
    inscricaoEstadual: v.optional(v.string()),
    responsavelNome: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    telefone: v.optional(v.string()),
    email: v.optional(v.string()),
    endereco: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const id = await ctx.db.insert("entidades", {
      ...args,
      status: "ATIVO",
    } as any);

    await createActionAuditLog(ctx, "CREATE", "entidades", id);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("entidades"),
    data: v.any(),
  },
  handler: async (ctx, { id, data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Entidade not found");

    await ctx.db.patch(id, data);
    const newRecord = await ctx.db.get(id);

    await createFieldAuditLogs(ctx, oldRecord, newRecord, "entidades", id);
    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("entidades"),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("INATIVO"),
      v.literal("TRANSFERIDO"),
      v.literal("FALECIDO"),
      v.literal("DESLIGADO")
    ),
  },
  handler: async (ctx, { id, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const oldRecord = await ctx.db.get(id);
    if (!oldRecord) throw new Error("Entidade not found");

    await ctx.db.patch(id, { status });
    const newRecord = await ctx.db.get(id);

    await createFieldAuditLogs(ctx, oldRecord, newRecord, "entidades", id);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("entidades") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await createActionAuditLog(ctx, "DELETE", "entidades", id);
    await ctx.db.delete(id);
  },
});
