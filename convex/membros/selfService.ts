import { query, mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs } from "../_shared/auditHelpers";
import { filterSelfServiceFields } from "./selfServiceHelpers";
import type { Id } from "../_generated/dataModel";
import { phonesMatch } from "../messaging/phoneUtils";
import { internal } from "../_generated/api";

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

    // Filter to only allowed fields
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

    // Hook: se ha campanhasEnvios pendentes ou enviadas para este membro
    // sem atualizacao ainda, marca como ATUALIZOU. Permite o dashboard
    // refletir conversao em tempo real.
    await marcarCampanhasAtualizadas(ctx, membro._id, now);

    return membro._id;
  },
});

/**
 * Marca todos os envios ENVIADO/PENDENTE/PROCESSANDO deste membro como ATUALIZOU.
 * Idempotente — envios ja em ATUALIZOU sao ignorados.
 *
 * Faz match duplo:
 *   1) primario por `membroId` (rota normal)
 *   2) fallback por telefone (caso o envio tenha sido criado para outro membroId
 *      que aponta para a mesma pessoa — ex.: duplicata, troca de membro
 *      vinculado ao user, etc). Sem esse fallback a conversao nao e detectada
 *      mesmo quando a pessoa atualizou o perfil pelo link da campanha.
 *
 * Agenda uma confirmacao WhatsApp para o membro (uma so por chamada, mesmo
 * se houver multiplos envios em estados diferentes).
 */
async function marcarCampanhasAtualizadas(
  ctx: MutationCtx,
  membroId: Id<"membros">,
  agora: number
): Promise<void> {
  const membro = await ctx.db.get(membroId);
  const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
  const meuTelefone = entidade?.whatsapp ?? entidade?.telefone ?? null;

  const enviosPorMembro = await ctx.db
    .query("campanhasEnvios")
    .withIndex("by_membro_enviadoEm", (q) => q.eq("membroId", membroId))
    .collect();

  let enviosPorTelefone: typeof enviosPorMembro = [];
  if (meuTelefone) {
    // Sem indice por telefone — scan completo. Tabela e pequena (~centenas).
    const todos = await ctx.db.query("campanhasEnvios").collect();
    enviosPorTelefone = todos.filter(
      (e) => e.status !== "ATUALIZOU" && phonesMatch(e.telefone, meuTelefone)
    );
  }

  const seen = new Set<string>();
  const candidatos = [...enviosPorMembro, ...enviosPorTelefone].filter((e) => {
    if (seen.has(e._id)) return false;
    seen.add(e._id);
    return true;
  });

  let confirmarTelefone: string | null = null;

  for (const envio of candidatos) {
    if (
      envio.status === "ENVIADO" ||
      envio.status === "PENDENTE" ||
      envio.status === "PROCESSANDO"
    ) {
      await ctx.db.patch(envio._id, {
        status: "ATUALIZOU",
        atualizouEm: agora,
      });
      // Confirma so para envios que ja sairam (estavam ENVIADO).
      // Para PENDENTE/PROCESSANDO o membro entrou direto sem receber, nao manda nada.
      if (envio.status === "ENVIADO" && !confirmarTelefone) {
        confirmarTelefone = envio.telefone;
      }
    }
  }

  if (confirmarTelefone) {
    await ctx.scheduler.runAfter(
      0,
      internal.messaging.campanhas._enviarConfirmacao,
      { telefone: confirmarTelefone }
    );
  }
}

/**
 * Endpoint "confirmar dados sem mudar nada" — usado quando o membro
 * abre /meu-perfil pela campanha e clica "Confirmar dados" sem editar.
 * Apenas grava perfilAtualizadoEm/Por e dispara hook de campanha.
 */
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

    await marcarCampanhasAtualizadas(ctx, membro._id, now);
    return membro._id;
  },
});
