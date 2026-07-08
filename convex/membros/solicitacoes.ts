import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog } from "../_shared/auditHelpers";
import {
  criarFilhoParaResponsavel,
  criarConjugeParaMembro,
} from "./familiaHelpers";

const dadosValidator = v.object({
  nomeCompleto: v.string(),
  dataNascimento: v.optional(v.string()),
  sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
  batizadoNestaIgreja: v.optional(v.boolean()),
  dataBatismo: v.optional(v.string()),
  usoImagem: v.optional(
    v.union(
      v.literal("AUTORIZADO"),
      v.literal("NAO_AUTORIZADO"),
      v.literal("PENDENTE")
    )
  ),
  observacoesMedicas: v.optional(v.string()),
});

// ============ SELF-SERVICE ============

// Membro solicita o cadastro de um familiar (filho ou conjuge) ainda nao
// cadastrado. Nao cria entidade — apenas registra a solicitacao PENDENTE.
export const solicitarCadastroFamiliar = mutation({
  args: {
    tipoVinculo: v.union(v.literal("FILHO"), v.literal("CONJUGE")),
    dados: dadosValidator,
  },
  handler: async (ctx, { tipoVinculo, dados }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    if (!dados.nomeCompleto.trim()) throw new Error("Informe o nome");

    const solicitacaoId = await ctx.db.insert("solicitacoesCadastro", {
      status: "PENDENTE",
      tipoVinculo,
      solicitadoPor: myMembro._id,
      solicitanteEntidadeId: myMembro.entidadeId,
      dadosPreenchidos: { ...dados, nomeCompleto: dados.nomeCompleto.trim() },
      criadoEm: Date.now(),
    });

    return { ok: true, solicitacaoId };
  },
});

// Solicitacoes pendentes do proprio membro (para feedback "Aguardando" na
// secao Familia). Poucos registros por membro — filtro de status em memoria.
export const getMinhasSolicitacoes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) return [];

    const solicitacoes = await ctx.db
      .query("solicitacoesCadastro")
      .withIndex("by_solicitante", (q) => q.eq("solicitadoPor", myMembro._id))
      .collect();

    return solicitacoes
      .filter((s) => s.status === "PENDENTE")
      .map((s) => ({
        _id: s._id,
        tipoVinculo: s.tipoVinculo,
        nomeCompleto: s.dadosPreenchidos.nomeCompleto,
      }));
  },
});

// ============ ADMIN (secretaria) ============

// Fila de solicitacoes pendentes para a secretaria revisar.
export const listSolicitacoes = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "membros:create");

    const pendentes = await ctx.db
      .query("solicitacoesCadastro")
      .withIndex("by_status", (q) => q.eq("status", "PENDENTE"))
      .order("desc")
      .collect();

    return await Promise.all(
      pendentes.map(async (s) => {
        const solicitante = await ctx.db.get(s.solicitanteEntidadeId);
        return {
          _id: s._id,
          tipoVinculo: s.tipoVinculo,
          dados: s.dadosPreenchidos,
          criadoEm: s.criadoEm,
          solicitanteNome: solicitante?.nomeCompleto ?? "—",
        };
      })
    );
  },
});

export const aprovarSolicitacao = mutation({
  args: { solicitacaoId: v.id("solicitacoesCadastro") },
  handler: async (ctx, { solicitacaoId }) => {
    const { membro: revisor } = await requirePermission(ctx, "membros:create");

    const solicitacao = await ctx.db.get(solicitacaoId);
    if (!solicitacao) throw new Error("Solicitacao nao encontrada");
    if (solicitacao.status !== "PENDENTE") {
      throw new Error("Solicitacao ja foi revisada");
    }

    const solicitante = await ctx.db.get(solicitacao.solicitadoPor);
    if (!solicitante) throw new Error("Solicitante nao encontrado");

    const entidadeCriadaId =
      solicitacao.tipoVinculo === "FILHO"
        ? await criarFilhoParaResponsavel(ctx, solicitante, solicitacao.dadosPreenchidos)
        : await criarConjugeParaMembro(ctx, solicitante, solicitacao.dadosPreenchidos);

    await ctx.db.patch(solicitacaoId, {
      status: "APROVADA",
      revisadoPor: revisor?._id,
      revisadoEm: Date.now(),
      entidadeCriadaId,
    });

    await createActionAuditLog(ctx, "APPROVE", "solicitacoesCadastro", solicitacaoId);

    return { ok: true, entidadeCriadaId };
  },
});

export const rejeitarSolicitacao = mutation({
  args: {
    solicitacaoId: v.id("solicitacoesCadastro"),
    motivo: v.optional(v.string()),
  },
  handler: async (ctx, { solicitacaoId, motivo }) => {
    const { membro: revisor } = await requirePermission(ctx, "membros:create");

    const solicitacao = await ctx.db.get(solicitacaoId);
    if (!solicitacao) throw new Error("Solicitacao nao encontrada");
    if (solicitacao.status !== "PENDENTE") {
      throw new Error("Solicitacao ja foi revisada");
    }

    await ctx.db.patch(solicitacaoId, {
      status: "REJEITADA",
      revisadoPor: revisor?._id,
      revisadoEm: Date.now(),
      motivoRejeicao: motivo?.trim() || undefined,
    });

    await createActionAuditLog(ctx, "REJECT", "solicitacoesCadastro", solicitacaoId);

    return { ok: true };
  },
});
