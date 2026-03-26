import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const MODULOS_INICIAIS = [
  { slug: "membros", label: "Membros", descricao: "Cadastro e gestao de membros", ativo: true, ordem: 1 },
  { slug: "diretorio", label: "Diretorio", descricao: "Diretorio de contatos", ativo: true, ordem: 2 },
  { slug: "entidades", label: "Entidades", descricao: "Gestao de entidades (PF/PJ)", ativo: true, ordem: 3 },
  { slug: "escalas", label: "Cultos", descricao: "Escalas e liturgia dos cultos", ativo: false, ordem: 4 },
  { slug: "boletim", label: "Boletim", descricao: "Boletim dominical", ativo: false, ordem: 5 },
  { slug: "gravacoes", label: "Gravacoes", descricao: "Gravacoes de sermoes e estudos", ativo: false, ordem: 6 },
  { slug: "pequenos-grupos", label: "Pequenos Grupos", descricao: "Gestao de pequenos grupos", ativo: false, ordem: 7 },
  { slug: "pedidos-oracao", label: "Pedidos de Oracao", descricao: "Pedidos de oracao da comunidade", ativo: false, ordem: 8 },
  { slug: "pastoreio", label: "Pastoreio", descricao: "Acompanhamento pastoral", ativo: false, ordem: 9 },
  { slug: "ministerios", label: "Ministerios", descricao: "Gestao de ministerios da igreja", ativo: false, ordem: 10 },
  { slug: "calendario", label: "Calendario", descricao: "Calendario de eventos da igreja", ativo: false, ordem: 11 },
  { slug: "educacional", label: "Educacional Infantil", descricao: "Gestao das turmas e criancas", ativo: false, ordem: 12 },
  { slug: "louvor", label: "Louvor", descricao: "Repertorio de musicas com cifras e tons", ativo: false, ordem: 13 },
];

export const seedModulos = mutation({
  args: {},
  handler: async (ctx) => {
    for (const modulo of MODULOS_INICIAIS) {
      const existing = await ctx.db
        .query("modulos")
        .withIndex("by_slug", (q) => q.eq("slug", modulo.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("modulos", modulo);
      }
    }
  },
});

export const toggleModulo = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro || membro.role !== "admin") {
      throw new Error("Apenas admin pode alterar modulos");
    }

    const modulo = await ctx.db
      .query("modulos")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!modulo) throw new Error("Modulo nao encontrado");

    await ctx.db.patch(modulo._id, { ativo: !modulo.ativo });
  },
});
