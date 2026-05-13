import {
  mutation,
  query,
  internalMutation,
  internalAction,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  podeReceberCampanha,
  calcularJitter,
  renderizarTemplate,
  ANTISPAM_JANELA_DIAS,
} from "./campanhasHelpers";
import { messaging } from "./service";

/**
 * Pipeline de campanha de mensageria.
 *
 * Fluxo (auto-reagendavel para nao estourar timeout de action):
 *   criarCampanha (mutation, admin)
 *     -> enfileira campanhasEnvios PENDENTE
 *   dispararCampanha (mutation, admin)
 *     -> marca campanha EM_EXECUCAO
 *     -> scheduler.runAfter(0, _processarProximo)
 *   _processarProximo (internalMutation)
 *     -> pega 1 envio PENDENTE, marca PROCESSANDO
 *     -> scheduler.runAfter(0, _enviarMensagem)
 *   _enviarMensagem (internalAction)
 *     -> chama messaging.sendText
 *     -> scheduler.runAfter(0, _registrarResultado)
 *   _registrarResultado (internalMutation)
 *     -> atualiza envio (ENVIADO/FALHOU)
 *     -> se ha proximos PENDENTE, scheduler.runAfter(jitter, _processarProximo)
 *     -> senao, marca campanha CONCLUIDA
 */

// ============ HELPERS ============

async function requireAdmin(ctx: MutationCtx | QueryCtx): Promise<Doc<"membros">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();
  if (!membro || membro.role !== "admin") {
    throw new Error("Only admins can manage campaigns");
  }
  return membro;
}

// ============ MUTATIONS (admin) ============

export const criarCampanha = mutation({
  args: {
    titulo: v.string(),
    tipo: v.union(
      v.literal("ATUALIZACAO_CADASTRO"),
      v.literal("BOAS_VINDAS_FREQUENTADOR"),
      v.literal("AVISO_GERAL")
    ),
    template: v.string(),
    filtros: v.object({
      vinculoIgreja: v.optional(v.array(v.string())),
      status: v.optional(v.array(v.string())),
      apenasComWhatsapp: v.optional(v.boolean()),
      naoAtualizadoHaMeses: v.optional(v.number()),
      membroIds: v.optional(v.array(v.id("membros"))),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    // Resolve destinatarios. Se membroIds vier preenchido, ignora outros
    // filtros e mira so esses (modo teste / disparo segmentado manualmente).
    const apenasComWhatsapp = args.filtros.apenasComWhatsapp ?? true;
    const membroIdsAlvo = args.filtros.membroIds;
    const destinatarios: Array<{
      membroId: Id<"membros">;
      entidadeId: Id<"entidades">;
      telefone: string;
    }> = [];

    if (membroIdsAlvo && membroIdsAlvo.length > 0) {
      for (const id of membroIdsAlvo) {
        const membro = await ctx.db.get(id);
        if (!membro) continue;
        const entidade = await ctx.db.get(membro.entidadeId);
        if (!entidade) continue;
        if (apenasComWhatsapp && !entidade.whatsapp) continue;

        const enviosAnteriores = await ctx.db
          .query("campanhasEnvios")
          .withIndex("by_membro_enviadoEm", (q) => q.eq("membroId", membro._id))
          .collect();
        const enviadosEm = enviosAnteriores
          .map((e) => e.enviadoEm ?? 0)
          .filter((ts) => ts > 0);
        if (!podeReceberCampanha(enviadosEm, now)) {
          console.log(`[Campanha] Pulando membro ${membro._id} - anti-spam`);
          continue;
        }

        destinatarios.push({
          membroId: membro._id,
          entidadeId: entidade._id,
          telefone: entidade.whatsapp!,
        });
      }
    } else {
      const vinculosAlvo = args.filtros.vinculoIgreja ?? ["MEMBRO"];
      const statusAlvo = args.filtros.status ?? ["ATIVO"];
      const janelaInativoMs = args.filtros.naoAtualizadoHaMeses
        ? args.filtros.naoAtualizadoHaMeses * 30 * 24 * 60 * 60 * 1000
        : null;

      const entidades = await ctx.db.query("entidades").collect();

      for (const entidade of entidades) {
        if (entidade.vinculoIgreja && !vinculosAlvo.includes(entidade.vinculoIgreja)) continue;
        if (!statusAlvo.includes(entidade.status)) continue;
        if (apenasComWhatsapp && !entidade.whatsapp) continue;
        if (
          janelaInativoMs !== null &&
          entidade.perfilAtualizadoEm &&
          now - entidade.perfilAtualizadoEm < janelaInativoMs
        ) {
          continue;
        }

        const membro = await ctx.db
          .query("membros")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
          .first();
        if (!membro) continue;

        const enviosAnteriores = await ctx.db
          .query("campanhasEnvios")
          .withIndex("by_membro_enviadoEm", (q) => q.eq("membroId", membro._id))
          .collect();
        const enviadosEm = enviosAnteriores
          .map((e) => e.enviadoEm ?? 0)
          .filter((ts) => ts > 0);
        if (!podeReceberCampanha(enviadosEm, now)) {
          console.log(`[Campanha] Pulando membro ${membro._id} - anti-spam`);
          continue;
        }

        destinatarios.push({
          membroId: membro._id,
          entidadeId: entidade._id,
          telefone: entidade.whatsapp!,
        });
      }
    }

    const campanhaId = await ctx.db.insert("campanhas", {
      titulo: args.titulo,
      tipo: args.tipo,
      template: args.template,
      filtros: args.filtros,
      status: "RASCUNHO",
      totalDestinatarios: destinatarios.length,
      criadoEm: now,
      criadoPor: admin._id,
    });

    for (const d of destinatarios) {
      await ctx.db.insert("campanhasEnvios", {
        campanhaId,
        membroId: d.membroId,
        entidadeId: d.entidadeId,
        telefone: d.telefone,
        status: "PENDENTE",
        tentativas: 0,
      });
    }

    return { campanhaId, totalDestinatarios: destinatarios.length };
  },
});

export const dispararCampanha = mutation({
  args: { campanhaId: v.id("campanhas") },
  handler: async (ctx, { campanhaId }) => {
    await requireAdmin(ctx);

    const campanha = await ctx.db.get(campanhaId);
    if (!campanha) throw new Error("Campanha nao encontrada");
    if (campanha.status === "EM_EXECUCAO") {
      throw new Error("Campanha ja esta em execucao");
    }
    if (campanha.status === "CONCLUIDA") {
      throw new Error("Campanha ja foi concluida");
    }

    await ctx.db.patch(campanhaId, {
      status: "EM_EXECUCAO",
      iniciadoEm: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.messaging.campanhas._processarProximo, {
      campanhaId,
    });

    return { ok: true };
  },
});

export const reenviarPendentes = mutation({
  args: { campanhaId: v.id("campanhas") },
  handler: async (ctx, { campanhaId }) => {
    await requireAdmin(ctx);

    const campanha = await ctx.db.get(campanhaId);
    if (!campanha) throw new Error("Campanha nao encontrada");

    // Reabre FALHOU como PENDENTE (sem mexer em ATUALIZOU)
    const falhados = await ctx.db
      .query("campanhasEnvios")
      .withIndex("by_campanha_status", (q) =>
        q.eq("campanhaId", campanhaId).eq("status", "FALHOU")
      )
      .collect();

    for (const envio of falhados) {
      await ctx.db.patch(envio._id, { status: "PENDENTE", erro: undefined });
    }

    await ctx.db.patch(campanhaId, {
      status: "EM_EXECUCAO",
      concluidoEm: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.messaging.campanhas._processarProximo, {
      campanhaId,
    });

    return { reabertos: falhados.length };
  },
});

// ============ INTERNAL (pipeline) ============

export const _processarProximo = internalMutation({
  args: { campanhaId: v.id("campanhas") },
  handler: async (ctx, { campanhaId }) => {
    const proximo = await ctx.db
      .query("campanhasEnvios")
      .withIndex("by_campanha_status", (q) =>
        q.eq("campanhaId", campanhaId).eq("status", "PENDENTE")
      )
      .first();

    if (!proximo) {
      // Nao ha mais pendentes - concluir campanha
      await ctx.db.patch(campanhaId, {
        status: "CONCLUIDA",
        concluidoEm: Date.now(),
      });
      return { done: true };
    }

    await ctx.db.patch(proximo._id, { status: "PROCESSANDO" });

    await ctx.scheduler.runAfter(0, internal.messaging.campanhas._enviarMensagem, {
      envioId: proximo._id,
    });

    return { done: false, envioId: proximo._id };
  },
});

export const _enviarMensagem = internalAction({
  args: { envioId: v.id("campanhasEnvios") },
  handler: async (ctx, { envioId }): Promise<void> => {
    // Carregar envio e contexto via queries internas
    const ctxData = await ctx.runQuery(
      internal.messaging.campanhas._loadEnvioContext,
      { envioId }
    );
    if (!ctxData) return;

    const text = renderizarTemplate(ctxData.template, {
      nome: ctxData.primeiroNome,
      apelido: ctxData.apelido ?? ctxData.primeiroNome,
    });

    let success = false;
    let erro: string | undefined;
    try {
      await messaging.sendText(ctxData.telefone, text);
      success = true;
    } catch (e) {
      erro = e instanceof Error ? e.message : "Erro desconhecido no envio";
    }

    await ctx.runMutation(internal.messaging.campanhas._registrarResultado, {
      envioId,
      success,
      erro,
    });
  },
});

export const _loadEnvioContext = internalQuery({
  args: { envioId: v.id("campanhasEnvios") },
  handler: async (ctx, { envioId }) => {
    const envio = await ctx.db.get(envioId);
    if (!envio) return null;
    const campanha = await ctx.db.get(envio.campanhaId);
    const entidade = await ctx.db.get(envio.entidadeId);
    if (!campanha || !entidade) return null;

    const nome = entidade.nomeCompleto ?? entidade.nomeRazaoSocial ?? "irmao(a)";
    const primeiroNome = nome.split(" ")[0];
    return {
      telefone: envio.telefone,
      template: campanha.template,
      primeiroNome,
      apelido: entidade.apelido,
    };
  },
});

export const _registrarResultado = internalMutation({
  args: {
    envioId: v.id("campanhasEnvios"),
    success: v.boolean(),
    erro: v.optional(v.string()),
  },
  handler: async (ctx, { envioId, success, erro }) => {
    const envio = await ctx.db.get(envioId);
    if (!envio) return;

    const now = Date.now();
    if (success) {
      await ctx.db.patch(envioId, {
        status: "ENVIADO",
        enviadoEm: now,
        tentativas: envio.tentativas + 1,
        erro: undefined,
      });
    } else {
      await ctx.db.patch(envioId, {
        status: "FALHOU",
        tentativas: envio.tentativas + 1,
        erro: erro ?? "Erro desconhecido",
      });
    }

    // Agenda proximo com jitter (so se ainda houver pendente)
    const proximaPendente = await ctx.db
      .query("campanhasEnvios")
      .withIndex("by_campanha_status", (q) =>
        q.eq("campanhaId", envio.campanhaId).eq("status", "PENDENTE")
      )
      .first();

    if (proximaPendente) {
      const delay = calcularJitter();
      await ctx.scheduler.runAfter(delay, internal.messaging.campanhas._processarProximo, {
        campanhaId: envio.campanhaId,
      });
    } else {
      // Sem mais pendentes - conclui campanha
      await ctx.db.patch(envio.campanhaId, {
        status: "CONCLUIDA",
        concluidoEm: now,
      });
    }
  },
});

// ============ QUERIES (admin) ============

export const listCampanhas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") return [];

    const campanhas = await ctx.db
      .query("campanhas")
      .withIndex("by_criadoEm")
      .order("desc")
      .collect();

    // Stats por campanha
    const result = [];
    for (const c of campanhas) {
      const envios = await ctx.db
        .query("campanhasEnvios")
        .withIndex("by_campanha", (q) => q.eq("campanhaId", c._id))
        .collect();
      result.push({
        ...c,
        stats: {
          total: envios.length,
          enviados: envios.filter((e) => e.status === "ENVIADO" || e.status === "ATUALIZOU").length,
          falhados: envios.filter((e) => e.status === "FALHOU").length,
          atualizaram: envios.filter((e) => e.status === "ATUALIZOU").length,
          pendentes: envios.filter((e) => e.status === "PENDENTE" || e.status === "PROCESSANDO").length,
        },
      });
    }
    return result;
  },
});

export const getCampanha = query({
  args: { campanhaId: v.id("campanhas") },
  handler: async (ctx, { campanhaId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") return null;

    const campanha = await ctx.db.get(campanhaId);
    if (!campanha) return null;

    const envios = await ctx.db
      .query("campanhasEnvios")
      .withIndex("by_campanha", (q) => q.eq("campanhaId", campanhaId))
      .collect();

    const enviosComEntidade = await Promise.all(
      envios.map(async (e) => {
        const ent = await ctx.db.get(e.entidadeId);
        return {
          ...e,
          nomeEntidade: ent?.nomeCompleto ?? ent?.nomeRazaoSocial ?? "(sem nome)",
        };
      })
    );

    return {
      ...campanha,
      envios: enviosComEntidade,
      stats: {
        total: envios.length,
        enviados: envios.filter((e) => e.status === "ENVIADO" || e.status === "ATUALIZOU").length,
        falhados: envios.filter((e) => e.status === "FALHOU").length,
        atualizaram: envios.filter((e) => e.status === "ATUALIZOU").length,
        pendentes: envios.filter((e) => e.status === "PENDENTE" || e.status === "PROCESSANDO").length,
      },
    };
  },
});

/**
 * Preview de quantos membros uma campanha atingiria, antes de criar.
 * Aplica anti-spam tambem para o admin saber quantos serao pulados.
 */
export const previewDestinatarios = query({
  args: {
    filtros: v.object({
      vinculoIgreja: v.optional(v.array(v.string())),
      status: v.optional(v.array(v.string())),
      apenasComWhatsapp: v.optional(v.boolean()),
      naoAtualizadoHaMeses: v.optional(v.number()),
      membroIds: v.optional(v.array(v.id("membros"))),
    }),
  },
  handler: async (ctx, { filtros }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, puladosAntiSpam: 0 };
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") return { total: 0, puladosAntiSpam: 0 };

    const now = Date.now();
    const apenasComWhatsapp = filtros.apenasComWhatsapp ?? true;
    const membroIdsAlvo = filtros.membroIds;
    let total = 0;
    let puladosAntiSpam = 0;

    const contar = async (membroId: Id<"membros">, entidade: Doc<"entidades">) => {
      if (apenasComWhatsapp && !entidade.whatsapp) return;
      const enviosAnteriores = await ctx.db
        .query("campanhasEnvios")
        .withIndex("by_membro_enviadoEm", (q) => q.eq("membroId", membroId))
        .collect();
      const enviadosEm = enviosAnteriores.map((e) => e.enviadoEm ?? 0).filter((ts) => ts > 0);
      if (!podeReceberCampanha(enviadosEm, now)) {
        puladosAntiSpam++;
        return;
      }
      total++;
    };

    if (membroIdsAlvo && membroIdsAlvo.length > 0) {
      for (const id of membroIdsAlvo) {
        const m = await ctx.db.get(id);
        if (!m) continue;
        const entidade = await ctx.db.get(m.entidadeId);
        if (!entidade) continue;
        await contar(m._id, entidade);
      }
    } else {
      const vinculosAlvo = filtros.vinculoIgreja ?? ["MEMBRO"];
      const statusAlvo = filtros.status ?? ["ATIVO"];
      const janelaInativoMs = filtros.naoAtualizadoHaMeses
        ? filtros.naoAtualizadoHaMeses * 30 * 24 * 60 * 60 * 1000
        : null;

      const entidades = await ctx.db.query("entidades").collect();
      for (const entidade of entidades) {
        if (entidade.vinculoIgreja && !vinculosAlvo.includes(entidade.vinculoIgreja)) continue;
        if (!statusAlvo.includes(entidade.status)) continue;
        if (
          janelaInativoMs !== null &&
          entidade.perfilAtualizadoEm &&
          now - entidade.perfilAtualizadoEm < janelaInativoMs
        ) continue;

        const m = await ctx.db
          .query("membros")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", entidade._id))
          .first();
        if (!m) continue;
        await contar(m._id, entidade);
      }
    }

    return { total, puladosAntiSpam, janelaAntiSpamDias: ANTISPAM_JANELA_DIAS };
  },
});
