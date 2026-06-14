import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolvePermissions } from "../preferencias/rbacHelpers";

export const list = query({
  args: {
    referenciaTabela: v.optional(v.string()),
    referenciaId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Trilha de um registro especifico: usa o indice dedicado (point lookup)
    // em vez de varrer a tabela inteira.
    if (args.referenciaTabela && args.referenciaId) {
      const tabela = args.referenciaTabela;
      const refId = args.referenciaId;
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_referencia", (q) =>
          q.eq("referenciaTabela", tabela).eq("referenciaId", refId),
        )
        .order("desc")
        .take(limit);
    }

    // Caso geral: le os mais recentes pelo indice e para ao encher a pagina,
    // filtrando em memoria — sem coletar a tabela toda.
    const out: Doc<"auditLogs">[] = [];
    for await (const l of ctx.db
      .query("auditLogs")
      .withIndex("by_created_at")
      .order("desc")) {
      if (args.referenciaTabela && l.referenciaTabela !== args.referenciaTabela) continue;
      if (args.referenciaId && l.referenciaId !== args.referenciaId) continue;
      out.push(l);
      if (out.length >= limit) break;
    }
    return out;
  },
});

async function checkAuditRead(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) return null;
  if (membro.role === "admin") return membro;

  const rolePerms = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("role", membro.role))
    .first();
  const perms = resolvePermissions(
    membro.permissions,
    rolePerms?.permissions,
    membro.role
  );
  if (!perms.includes("*") && !perms.includes("audit:read")) return null;
  return membro;
}

export const listFiltered = query({
  args: {
    tabela: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    dataInicio: v.optional(v.number()),
    dataFim: v.optional(v.number()),
    action: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membro = await checkAuditRead(ctx);
    if (!membro) return { logs: [], hasMore: false };

    const limit = args.limit ?? 100;

    // Le pelo indice by_created_at (desc), restringindo por intervalo de data
    // quando houver, e para assim que enche a pagina (+1 p/ detectar hasMore) —
    // em vez de coletar a tabela inteira a cada chamada. tabela/userId/action
    // sao filtrados em memoria sobre o fluxo (sem indice composto disponivel).
    const iter = ctx.db
      .query("auditLogs")
      .withIndex("by_created_at", (q) => {
        if (args.dataInicio !== undefined && args.dataFim !== undefined) {
          return q.gte("createdAt", args.dataInicio).lte("createdAt", args.dataFim);
        }
        if (args.dataInicio !== undefined) return q.gte("createdAt", args.dataInicio);
        if (args.dataFim !== undefined) return q.lte("createdAt", args.dataFim);
        return q;
      })
      .order("desc");

    const needle = args.action?.toLowerCase();
    const page: Doc<"auditLogs">[] = [];
    let hasMore = false;
    for await (const log of iter) {
      if (args.tabela && log.referenciaTabela !== args.tabela) continue;
      if (args.userId && log.userId !== args.userId) continue;
      if (needle && !log.action.toLowerCase().includes(needle)) continue;
      if (page.length >= limit) {
        hasMore = true;
        break;
      }
      page.push(log);
    }

    // Enriquecer com nome do autor (via membros → entidades)
    const enriched = await Promise.all(
      page.map(async (log) => {
        let autorNome: string | null = null;
        if (log.membroId) {
          const m = await ctx.db.get(log.membroId);
          if (m) {
            const ent = await ctx.db.get(m.entidadeId);
            autorNome = ent?.nomeCompleto ?? null;
          }
        } else if (log.userId) {
          const m = await ctx.db
            .query("membros")
            .withIndex("by_user_id", (q: any) => q.eq("userId", log.userId))
            .first();
          if (m) {
            const ent = await ctx.db.get(m.entidadeId);
            autorNome = ent?.nomeCompleto ?? null;
          }
        }
        return { ...log, autorNome };
      })
    );

    return { logs: enriched, hasMore };
  },
});

export const listTabelas = query({
  args: {},
  handler: async (ctx) => {
    const membro = await checkAuditRead(ctx);
    if (!membro) return [];
    // Distinct nao tem indice barato no Convex. Como popula um dropdown de
    // filtro e e admin/baixa-frequencia, lemos os N mais recentes (cobre todas
    // as tabelas auditadas na pratica) em vez de varrer a tabela inteira.
    const CAP = 5000;
    const recentes = await ctx.db
      .query("auditLogs")
      .withIndex("by_created_at")
      .order("desc")
      .take(CAP);
    if (recentes.length === CAP) {
      console.warn(
        `[audit.listTabelas] cap de ${CAP} atingido — dropdown pode omitir tabelas so presentes em logs antigos`,
      );
    }
    const set = new Set<string>();
    for (const l of recentes) set.add(l.referenciaTabela);
    return Array.from(set).sort();
  },
});
