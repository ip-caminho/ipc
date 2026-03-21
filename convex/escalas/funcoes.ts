import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const FUNCOES_INICIAIS = [
  { slug: "ABERTURA", label: "Abertura", multiplo: false, temEquipe: false, temPassagem: true, views: ["escala", "liturgia"], qtdPorCulto: 1, ordem: 1 },
  { slug: "CONFISSAO", label: "Confissao", multiplo: false, temEquipe: false, temPassagem: true, views: ["escala", "liturgia"], qtdPorCulto: 1, ordem: 2 },
  { slug: "PREGACAO", label: "Pregacao", multiplo: false, temEquipe: false, temPassagem: true, views: ["escala", "liturgia"], qtdPorCulto: 1, ordem: 3 },
  { slug: "LOUVOR", label: "Louvor", multiplo: true, temEquipe: true, temPassagem: false, views: ["escala", "liturgia"], qtdPorCulto: 3, ordem: 4 },
  { slug: "HOSPITALIDADE", label: "Hospitalidade", multiplo: true, temEquipe: true, temPassagem: false, views: ["escala"], qtdPorCulto: 3, ordem: 5 },
  { slug: "SOM", label: "Som", multiplo: false, temEquipe: true, temPassagem: false, views: ["escala"], qtdPorCulto: 1, ordem: 6 },
  { slug: "MULTIMIDIA", label: "Multimidia", multiplo: false, temEquipe: true, temPassagem: false, views: ["escala"], qtdPorCulto: 1, ordem: 7 },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const funcoes = await ctx.db.query("funcoes").collect();
    return funcoes
      .filter((f) => f.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const funcoes = await ctx.db.query("funcoes").collect();
    return funcoes.sort((a, b) => a.ordem - b.ordem);
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    label: v.string(),
    multiplo: v.boolean(),
    temEquipe: v.boolean(),
    temPassagem: v.boolean(),
    views: v.array(v.string()),
    qtdPorCulto: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") throw new Error("Apenas admin");

    const existing = await ctx.db
      .query("funcoes")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Funcao com esse slug ja existe");

    // Get max ordem
    const all = await ctx.db.query("funcoes").collect();
    const maxOrdem = all.reduce((max, f) => Math.max(max, f.ordem), 0);

    return ctx.db.insert("funcoes", {
      ...args,
      ordem: maxOrdem + 1,
      ativo: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("funcoes"),
    label: v.optional(v.string()),
    multiplo: v.optional(v.boolean()),
    temEquipe: v.optional(v.boolean()),
    temPassagem: v.optional(v.boolean()),
    views: v.optional(v.array(v.string())),
    qtdPorCulto: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") throw new Error("Apenas admin");

    await ctx.db.patch(id, data);
  },
});

export const toggle = mutation({
  args: { id: v.id("funcoes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro || membro.role !== "admin") throw new Error("Apenas admin");

    const funcao = await ctx.db.get(id);
    if (!funcao) throw new Error("Funcao nao encontrada");

    await ctx.db.patch(id, { ativo: !funcao.ativo });
  },
});

export const seedFuncoes = mutation({
  args: {},
  handler: async (ctx) => {
    for (const funcao of FUNCOES_INICIAIS) {
      const existing = await ctx.db
        .query("funcoes")
        .withIndex("by_slug", (q) => q.eq("slug", funcao.slug))
        .first();
      if (!existing) {
        await ctx.db.insert("funcoes", { ...funcao, ativo: true });
      }
    }
  },
});
