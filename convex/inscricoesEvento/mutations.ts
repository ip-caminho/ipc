import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

// CRUD de inscrições de evento — apenas chrMS autenticado (RBAC).

const campoSistemaValidator = v.union(
  v.literal("nomeCompleto"),
  v.literal("whatsapp"),
  v.literal("email"),
  v.literal("telefone"),
  v.literal("dataNascimento"),
  v.literal("sexo"),
);

const campoCustomValidator = v.object({
  id: v.string(),
  label: v.string(),
  tipo: v.union(
    v.literal("text"),
    v.literal("email"),
    v.literal("tel"),
    v.literal("select"),
    v.literal("textarea"),
    v.literal("checkbox"),
  ),
  obrigatorio: v.boolean(),
  opcoes: v.optional(v.array(v.string())),
  placeholder: v.optional(v.string()),
});

export const criar = mutation({
  args: {
    slug: v.string(),
    titulo: v.string(),
    descricao: v.string(),
    ativa: v.boolean(),
    dataAbertura: v.optional(v.number()),
    dataLimite: v.optional(v.number()),
    vagas: v.optional(v.number()),
    camposSistema: v.array(campoSistemaValidator),
    camposCustom: v.array(campoCustomValidator),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "inscricoes:manage");

    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("Slug obrigatório");
    const existing = await ctx.db
      .query("inscricoesEvento")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) throw new Error("Já existe uma inscrição com este slug");

    const id = await ctx.db.insert("inscricoesEvento", {
      ...args,
      slug,
      vagasOcupadas: 0,
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "inscricoesEvento", id);
    return id;
  },
});

export const atualizar = mutation({
  args: {
    id: v.id("inscricoesEvento"),
    titulo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    ativa: v.optional(v.boolean()),
    dataAbertura: v.optional(v.number()),
    dataLimite: v.optional(v.number()),
    vagas: v.optional(v.number()),
    camposSistema: v.optional(v.array(campoSistemaValidator)),
    camposCustom: v.optional(v.array(campoCustomValidator)),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "inscricoes:manage");

    const antes = await ctx.db.get(id);
    if (!antes) throw new Error("Inscrição não encontrada");

    const limpos: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) limpos[k] = val;
    }
    await ctx.db.patch(id, limpos);

    const depois = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, antes, depois, "inscricoesEvento");
    return id;
  },
});

export const encerrar = mutation({
  args: { id: v.id("inscricoesEvento") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const antes = await ctx.db.get(id);
    if (!antes) throw new Error("Inscrição não encontrada");
    await ctx.db.patch(id, { ativa: false });
    const depois = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, antes, depois, "inscricoesEvento");
    return id;
  },
});

// === Gestão de respostas ===

// Move uma resposta entre CONFIRMADA e LISTA_ESPERA, mantendo o contador
// denormalizado vagasOcupadas (= nº de CONFIRMADA) consistente. Promover da
// espera pode estourar as vagas de propósito — é ação manual do admin.
export const moverStatusResposta = mutation({
  args: {
    respostaId: v.id("respostasInscricaoEvento"),
    status: v.union(v.literal("CONFIRMADA"), v.literal("LISTA_ESPERA")),
  },
  handler: async (ctx, { respostaId, status }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const resposta = await ctx.db.get(respostaId);
    if (!resposta) throw new Error("Resposta não encontrada");
    if (resposta.status === status) return respostaId;

    const insc = await ctx.db.get(resposta.inscricaoId);
    if (insc) {
      const delta = status === "CONFIRMADA" ? 1 : -1;
      await ctx.db.patch(insc._id, {
        vagasOcupadas: Math.max(0, insc.vagasOcupadas + delta),
      });
    }
    await ctx.db.patch(respostaId, { status });
    await createActionAuditLog(ctx, "UPDATE", "respostasInscricaoEvento", respostaId);
    return respostaId;
  },
});

// Exclui uma resposta (spam, teste, duplicada). Se estava CONFIRMADA, libera a
// vaga (decrementa o contador). Não promove automaticamente da espera — o admin
// promove quem quiser via moverStatusResposta.
export const excluirResposta = mutation({
  args: { respostaId: v.id("respostasInscricaoEvento") },
  handler: async (ctx, { respostaId }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const resposta = await ctx.db.get(respostaId);
    if (!resposta) throw new Error("Resposta não encontrada");

    if (resposta.status === "CONFIRMADA") {
      const insc = await ctx.db.get(resposta.inscricaoId);
      if (insc) {
        await ctx.db.patch(insc._id, {
          vagasOcupadas: Math.max(0, insc.vagasOcupadas - 1),
        });
      }
    }
    await ctx.db.delete(respostaId);
    await createActionAuditLog(ctx, "DELETE", "respostasInscricaoEvento", respostaId);
    return respostaId;
  },
});
