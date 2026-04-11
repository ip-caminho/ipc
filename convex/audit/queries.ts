import { query } from "../_generated/server";
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
    const q = ctx.db.query("auditLogs").order("desc");
    let results = await q.collect();

    if (args.referenciaTabela) {
      results = results.filter((l) => l.referenciaTabela === args.referenciaTabela);
    }
    if (args.referenciaId) {
      results = results.filter((l) => l.referenciaId === args.referenciaId);
    }

    const limit = args.limit || 50;
    return results.slice(0, limit);
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

    let logs = await ctx.db.query("auditLogs").order("desc").collect();

    if (args.tabela) {
      logs = logs.filter((l) => l.referenciaTabela === args.tabela);
    }
    if (args.userId) {
      logs = logs.filter((l) => l.userId === args.userId);
    }
    if (args.dataInicio !== undefined) {
      const inicio = args.dataInicio;
      logs = logs.filter((l) => l.createdAt >= inicio);
    }
    if (args.dataFim !== undefined) {
      const fim = args.dataFim;
      logs = logs.filter((l) => l.createdAt <= fim);
    }
    if (args.action) {
      const needle = args.action.toLowerCase();
      logs = logs.filter((l) => l.action.toLowerCase().includes(needle));
    }

    const limit = args.limit ?? 100;
    const hasMore = logs.length > limit;
    const page = logs.slice(0, limit);

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
    const all = await ctx.db.query("auditLogs").collect();
    const set = new Set<string>();
    for (const l of all) set.add(l.referenciaTabela);
    return Array.from(set).sort();
  },
});
