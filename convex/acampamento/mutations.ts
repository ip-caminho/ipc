import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

// Config do acampamento — gestao sob inscricoes:manage (secretaria).
// Valores monetarios em CENTAVOS.

const precosValidator = v.object({
  faixas: v.array(
    v.object({ idadeMin: v.number(), idadeMax: v.number(), valor: v.number() }),
  ),
  camaExtra: v.number(),
  petPorDia: v.number(),
  palestra: v.number(),
});

function validarPrecos(precos: {
  faixas: { idadeMin: number; idadeMax: number; valor: number }[];
}) {
  if (precos.faixas.length === 0) throw new Error("Defina ao menos uma faixa etária");
  for (const f of precos.faixas) {
    if (f.idadeMin > f.idadeMax) throw new Error("Faixa etária com idadeMin > idadeMax");
    if (f.valor < 0) throw new Error("Valor de faixa negativo");
  }
}

export const criar = mutation({
  args: {
    slug: v.string(),
    titulo: v.string(),
    descricao: v.optional(v.string()),
    ativa: v.boolean(),
    dataInicio: v.string(),
    dataFim: v.string(),
    inscricoesAbrem: v.optional(v.number()),
    inscricoesFecham: v.optional(v.number()),
    precos: precosValidator,
    estoqueDuplos: v.number(),
    estoqueTriplos: v.number(),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "inscricoes:manage");

    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("Slug obrigatório");
    if (args.dataFim < args.dataInicio) throw new Error("Data fim antes do início");
    validarPrecos(args.precos);

    const existente = await ctx.db
      .query("acampamentos")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existente) throw new Error("Já existe um acampamento com este slug");

    const id = await ctx.db.insert("acampamentos", {
      ...args,
      slug,
      duplosReservados: 0,
      triplosReservados: 0,
      aportesFundo: [],
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "acampamentos", id);
    return id;
  },
});

export const atualizar = mutation({
  args: {
    id: v.id("acampamentos"),
    titulo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    ativa: v.optional(v.boolean()),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
    inscricoesAbrem: v.optional(v.number()),
    inscricoesFecham: v.optional(v.number()),
    precos: v.optional(precosValidator),
    estoqueDuplos: v.optional(v.number()),
    estoqueTriplos: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const antes = await ctx.db.get(id);
    if (!antes) throw new Error("Acampamento não encontrado");
    if (updates.precos) validarPrecos(updates.precos);

    const limpos: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) limpos[k] = val;
    }
    await ctx.db.patch(id, limpos);
    const depois = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, antes, depois, "acampamentos");
    return id;
  },
});

// Entrada avulsa no fundo solidario (doacao sem inscricao / verba da igreja).
export const aportarFundo = mutation({
  args: {
    id: v.id("acampamentos"),
    valor: v.number(),
    descricao: v.string(),
  },
  handler: async (ctx, { id, valor, descricao }) => {
    const { membro } = await requirePermission(ctx, "inscricoes:manage");
    if (valor <= 0) throw new Error("Valor do aporte deve ser positivo");
    if (!descricao.trim()) throw new Error("Descreva a origem do aporte");

    const acamp = await ctx.db.get(id);
    if (!acamp) throw new Error("Acampamento não encontrado");
    await ctx.db.patch(id, {
      aportesFundo: [
        ...acamp.aportesFundo,
        { valor, descricao: descricao.trim(), criadoPor: membro._id, em: Date.now() },
      ],
    });
    await createActionAuditLog(ctx, "APORTE_FUNDO", "acampamentos", id);
    return id;
  },
});
