import { query } from "../_generated/server";
import { v } from "convex/values";
import { checkPermission } from "../_shared/requirePermission";

// Catalogo de cursos. Tabela pequena (poucas dezenas): a listagem sem filtro
// pode ser collect, mas o filtro por status sai do indice.
export const list = query({
  args: { status: v.optional(v.union(v.literal("ATIVO"), v.literal("INATIVO"))) },
  handler: async (ctx, { status }) => {
    if (!(await checkPermission(ctx, "turmas:read"))) return [];

    const cursos = status
      ? await ctx.db
          .query("cursos")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      : await ctx.db.query("cursos").order("desc").collect();

    return cursos;
  },
});

// Cursos disponiveis para vincular a uma turma nova
export const listAtivos = query({
  args: {},
  handler: async (ctx) => {
    if (!(await checkPermission(ctx, "turmas:read"))) return [];
    return await ctx.db
      .query("cursos")
      .withIndex("by_status", (q) => q.eq("status", "ATIVO"))
      .collect();
  },
});
