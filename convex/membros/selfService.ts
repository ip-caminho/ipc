import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs } from "../_shared/auditHelpers";
import { filterSelfServiceFields } from "./selfServiceHelpers";
import { espelharConjuge, vincularCriancaAoConjuge } from "./familiaHelpers";
import { limparOverridePorAtualizacao } from "../cron/paradeiroIgnorado";
import { apagarArquivosSumidos } from "../files/orfaos";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    return { ...membro, entidade };
  },
});

export const updateMyProfile = mutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Member not found");

    // Ownership check: only update own profile
    if (membro.userId !== userId) {
      throw new Error("Unauthorized: can only update own profile");
    }

    const filteredData = filterSelfServiceFields(data);
    if (!filteredData) {
      throw new Error("No valid fields to update");
    }

    const oldEntidade = await ctx.db.get(membro.entidadeId);
    const now = Date.now();
    await ctx.db.patch(membro.entidadeId, {
      ...filteredData,
      perfilAtualizadoEm: now,
      perfilAtualizadoPor: membro._id,
    });
    const newEntidade = await ctx.db.get(membro.entidadeId);

    await createFieldAuditLogs(ctx, oldEntidade, newEntidade, "entidades", membro.entidadeId);
    await apagarArquivosSumidos(ctx, "entidades", oldEntidade, newEntidade);

    // Confirmou/atualizou cadastro: limpa o override PARADEIRO_IGNORADO se houver.
    await limparOverridePorAtualizacao(ctx, membro._id);

    return membro._id;
  },
});

// ============ FAMILIA (self-service) ============

/**
 * Busca membros para selecionar como conjuge ou referenciar como pai/mae.
 * Retorna nome + foto + entidadeId. Limitado a 20 resultados.
 * Exige termo de busca >= 2 caracteres.
 */
export const searchMembersForFamily = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    // Caminho comum: searchIndex (prefixo por token, status ATIVO) — sem scan.
    const termTrim = search.trim();
    const porPrefixo = await ctx.db
      .query("entidades")
      .withSearchIndex("search_entidades", (q) =>
        q.search("nomeCompleto", termTrim).eq("status", "ATIVO"),
      )
      .take(40);
    let candidatos = porPrefixo.filter((e) => e._id !== myMembro?.entidadeId);

    // Fallback substring (termo casa no meio da palavra) — raro.
    if (candidatos.length === 0) {
      const ativos = await ctx.db
        .query("entidades")
        .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
        .collect();
      candidatos = ativos
        .filter((e) => e._id !== myMembro?.entidadeId)
        .filter((e) => (e.nomeCompleto || "").toLowerCase().includes(term));
    }

    return candidatos.slice(0, 20).map((e) => ({
      entidadeId: e._id,
      nomeCompleto: e.nomeCompleto ?? "",
      foto: e.foto,
    }));
  },
});

export const getMyFamily = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    let conjuge = null;
    if (membro.conjugeId) {
      const conjugeEnt = await ctx.db.get(membro.conjugeId);
      if (conjugeEnt) {
        conjuge = {
          entidadeId: conjugeEnt._id,
          nomeCompleto: conjugeEnt.nomeCompleto ?? "",
          foto: conjugeEnt.foto,
        };
      }
    }

    // Filhos: por responsaveis onde eu sou o responsavel
    const minhasResponsabilidades = await ctx.db
      .query("responsaveis")
      .withIndex("by_responsavel", (q) =>
        q.eq("responsavelEntidadeId", membro.entidadeId)
      )
      .collect();

    const filhos = await Promise.all(
      minhasResponsabilidades.map(async (r) => {
        const filho = await ctx.db.get(r.criancaEntidadeId);
        if (!filho) return null;
        return {
          entidadeId: filho._id,
          nomeCompleto: filho.nomeCompleto ?? "",
          dataNascimento: filho.dataNascimento,
          foto: filho.foto,
          tipo: r.tipo,
          vinculoIgreja: filho.vinculoIgreja,
        };
      })
    );

    return {
      conjuge,
      filhos: filhos.filter((f): f is NonNullable<typeof f> => f !== null),
    };
  },
});

export const vincularConjuge = mutation({
  args: { conjugeEntidadeId: v.id("entidades") },
  handler: async (ctx, { conjugeEntidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    if (myMembro.entidadeId === conjugeEntidadeId) {
      throw new Error("Nao e possivel se vincular a si mesmo");
    }

    const conjugeEntidade = await ctx.db.get(conjugeEntidadeId);
    if (!conjugeEntidade) throw new Error("Conjuge nao encontrado");

    await ctx.db.patch(myMembro._id, { conjugeId: conjugeEntidadeId });
    await espelharConjuge(ctx, myMembro.entidadeId, conjugeEntidadeId);

    return { ok: true };
  },
});

export const desvincularConjuge = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    const oldConjugeEntId = myMembro.conjugeId;
    await ctx.db.patch(myMembro._id, { conjugeId: undefined });

    if (oldConjugeEntId) {
      const oldConjugeMembro = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", oldConjugeEntId))
        .first();
      if (oldConjugeMembro?.conjugeId === myMembro.entidadeId) {
        await ctx.db.patch(oldConjugeMembro._id, { conjugeId: undefined });
      }
    }

    return { ok: true };
  },
});

// ============ FILHOS (self-service) ============
//
// A criacao direta de filho (adicionarFilho) foi removida: agora o membro
// SOLICITA o cadastro (convex/membros/solicitacoes.ts) e a secretaria aprova.
// Aqui restam apenas vincular filho ja cadastrado e remover vinculo.

export const vincularFilhoExistente = mutation({
  args: { filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { filhoEntidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    if (filhoEntidadeId === myMembro.entidadeId) {
      throw new Error("Nao e possivel se vincular como proprio filho");
    }

    // Idempotente — nao duplica se ja existe vinculo
    const existente = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    if (existente.some((r) => r.responsavelEntidadeId === myMembro.entidadeId)) {
      return { ok: true, jaVinculado: true };
    }

    const minhaEntidade = await ctx.db.get(myMembro.entidadeId);
    const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
      minhaEntidade?.sexo === "M"
        ? "PAI"
        : minhaEntidade?.sexo === "F"
          ? "MAE"
          : "RESPONSAVEL";

    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: myMembro.entidadeId,
      tipo,
      principal: false,
      criadoEm: Date.now(),
    });
    // Filho pertence ao casal: vincula tambem ao conjuge, se houver
    await vincularCriancaAoConjuge(ctx, myMembro.entidadeId, filhoEntidadeId);
    return { ok: true };
  },
});

export const removerFilho = mutation({
  args: { filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { filhoEntidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    // Remove apenas o link, mantem a entidade existindo
    const links = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    for (const link of links) {
      if (link.responsavelEntidadeId === myMembro.entidadeId) {
        await ctx.db.delete(link._id);
      }
    }
    return { ok: true };
  },
});

export const confirmProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Member not found");

    const now = Date.now();
    await ctx.db.patch(membro.entidadeId, {
      perfilAtualizadoEm: now,
      perfilAtualizadoPor: membro._id,
    });

    await limparOverridePorAtualizacao(ctx, membro._id);
    return membro._id;
  },
});

/**
 * Permite o membro atualizar as proprias datas sacramentais
 * (membresia, batismo, conversao). Marcadas como "pendentes de
 * verificacao": removidas de `camposVerificados` e `dadosIncertos`
 * — secretaria deve confirmar depois com o livro de registros.
 *
 * Passar null para limpar; undefined para nao alterar.
 */
export const updateMembresiaDatas = mutation({
  args: {
    dataMembresia: v.optional(v.union(v.string(), v.null())),
    dataBatismo: v.optional(v.union(v.string(), v.null())),
    dataConversao: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) throw new Error("Member not found");
    if (membro.userId !== userId) {
      throw new Error("Unauthorized: can only update own profile");
    }

    const patch: Record<string, string | undefined> = {};
    const camposTocados: string[] = [];

    for (const campo of ["dataMembresia", "dataBatismo", "dataConversao"] as const) {
      const valor = args[campo];
      if (valor === undefined) continue;
      patch[campo] = valor ?? undefined;
      camposTocados.push(campo);
    }

    if (camposTocados.length === 0) {
      return { changed: false };
    }

    const oldMembro = await ctx.db.get(membro._id);
    await ctx.db.patch(membro._id, patch);
    const newMembro = await ctx.db.get(membro._id);
    await createFieldAuditLogs(ctx, oldMembro, newMembro, "membros", membro._id);

    // Limpa verificacao e marcacao de "nao lembro" para campos que membro acabou
    // de preencher. Secretaria precisa re-verificar com livro fisico.
    const entidade = await ctx.db.get(membro.entidadeId);
    if (entidade) {
      const camposVerificados = (entidade.camposVerificados ?? []).filter(
        (c) => !camposTocados.includes(c.campo)
      );
      const dadosIncertos = (entidade.dadosIncertos ?? []).filter(
        (c) => !(camposTocados.includes(c) && patch[c])
      );
      const now = Date.now();
      await ctx.db.patch(membro.entidadeId, {
        camposVerificados,
        dadosIncertos,
        perfilAtualizadoEm: now,
        perfilAtualizadoPor: membro._id,
      });
      await limparOverridePorAtualizacao(ctx, membro._id);
    }

    return { changed: true, camposTocados };
  },
});
