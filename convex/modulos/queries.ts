import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { MODULOS_INICIAIS } from "./constants";

export const listModulos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro || membro.role !== "admin") return [];

    const cadastrados = await ctx.db.query("modulos").collect();
    return cadastrados.sort((a, b) => a.ordem - b.ordem);
  },
});

export const listModulosAtivos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const modulos = await ctx.db.query("modulos").collect();
    const desativados = new Set(
      modulos.filter((m) => !m.ativo).map((m) => m.slug),
    );
    const ativosNaTabela = modulos.filter((m) => m.ativo).map((m) => m.slug);

    // Defensivo: slug conhecido pelo codigo mas ausente da tabela e tratado
    // como ativo. Evita redirect silencioso para /dashboard quando uma nova
    // feature e adicionada sem rerodar o seed.
    const ausentes = MODULOS_INICIAIS.map((m) => m.slug).filter(
      (slug) => !modulos.some((m) => m.slug === slug),
    );

    return Array.from(
      new Set([
        ...ativosNaTabela,
        ...ausentes.filter((slug) => !desativados.has(slug)),
      ]),
    );
  },
});
