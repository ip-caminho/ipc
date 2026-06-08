/**
 * Acessos ao link publico de convidado: registro (com IP, via route handler
 * server-side) e relatorio (admin).
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Registra um acesso ao link de convidado. Chamada pelo route handler
 * /api/convidado-acesso, que captura o IP real do visitante. So registra se
 * o codigo bater com o token vigente (evita lixo de codigos invalidos).
 */
export const registrarAcesso = mutation({
  args: {
    codigo: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, { codigo, ip, userAgent }) => {
    const config = await ctx.db.query("configApp").first();
    const token = config?.convidadoToken;
    if (!token || codigo !== token) return { ok: false };

    await ctx.db.insert("convidadoAcessos", { em: Date.now(), ip, userAgent });
    return { ok: true };
  },
});

type RelatorioAcessos = {
  total: number;
  ipsUnicos: number;
  ultimo: number | null;
  lista: { em: number; ip: string | null; userAgent: string | null }[];
};

/** Relatorio de acessos do canal de convidado (admin). */
export const relatorioAcessos = query({
  args: {},
  handler: async (ctx): Promise<RelatorioAcessos | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") return null;

    const todos = await ctx.db
      .query("convidadoAcessos")
      .withIndex("by_em")
      .order("desc")
      .collect();

    const ipsUnicos = new Set(
      todos.map((a) => a.ip).filter((ip): ip is string => !!ip)
    ).size;

    return {
      total: todos.length,
      ipsUnicos,
      ultimo: todos[0]?.em ?? null,
      lista: todos.slice(0, 100).map((a) => ({
        em: a.em,
        ip: a.ip ?? null,
        userAgent: a.userAgent ?? null,
      })),
    };
  },
});
