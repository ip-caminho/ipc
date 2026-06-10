import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkPermission, requirePermission } from "../_shared/requirePermission";
import { extrairFrases } from "./iaHelpers";

// Remove os campos pesados legados (pre-migracao) do payload das listas
function semCamposPesados<T extends { iaTranscricao?: unknown; iaResultado?: unknown }>(g: T) {
  const { iaTranscricao, iaResultado, ...leve } = g;
  void iaTranscricao;
  void iaResultado;
  return leve;
}

async function isQuiosqueAtivo(ctx: any): Promise<boolean> {
  const config = await ctx.db.query("configApp").first();
  return !!config?.modoQuiosque;
}

export const list = query({
  args: {
    tipo: v.optional(v.string()),
    pregadorId: v.optional(v.id("membros")),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await checkPermission(ctx, "gravacoes:read"))) return [];
    let results = await ctx.db.query("gravacoes").order("desc").collect();

    if (args.tipo) {
      results = results.filter((g) => g.tipo === args.tipo);
    }
    if (args.pregadorId) {
      results = results.filter((g) => g.pregadorId === args.pregadorId);
    }
    if (args.status) {
      results = results.filter((g) => g.status === args.status);
    }
    if (args.tag) {
      results = results.filter((g) => (g.tags || []).includes(args.tag!));
    }
    if (args.search) {
      const term = args.search.toLowerCase();
      results = results.filter((g) => {
        return (
          g.titulo.toLowerCase().includes(term) ||
          (g.pregadorNome || "").toLowerCase().includes(term) ||
          (g.textoBase || "").toLowerCase().includes(term) ||
          (g.tags || []).some((t) => t.toLowerCase().includes(term))
        );
      });
    }

    // Enrich with pregador info + serie info
    return Promise.all(
      results.map(async (g) => {
        let pregadorInfo = null;
        if (g.pregadorId) {
          const membro = await ctx.db.get(g.pregadorId);
          if (membro) {
            const entidade = await ctx.db.get(membro.entidadeId);
            pregadorInfo = { nome: entidade?.nomeCompleto || "" };
          }
        }
        let serieInfo = null;
        if (g.serieId) {
          const serie = await ctx.db.get(g.serieId);
          if (serie) {
            serieInfo = { nome: serie.nome };
          }
        }
        // Reacoes summary
        const reacoes = await ctx.db
          .query("reacoesGravacao")
          .withIndex("by_gravacao", (q) => q.eq("gravacaoId", g._id))
          .collect();
        const reacoesSummary: { tipo: string; count: number }[] = [];
        const counts: Record<string, number> = {};
        for (const r of reacoes) {
          counts[r.tipo] = (counts[r.tipo] || 0) + 1;
        }
        for (const [tipo, count] of Object.entries(counts)) {
          reacoesSummary.push({ tipo, count });
        }

        // Comment count (tabela unificada)
        const comentarios = await ctx.db
          .query("comentarios")
          .withIndex("by_entidade", (q) =>
            q.eq("entidadeTipo", "gravacoes").eq("entidadeId", g._id)
          )
          .collect();

        return { ...semCamposPesados(g), pregadorInfo, serieInfo, reacoesSummary, comentarioCount: comentarios.length };
      })
    );
  },
});

// Versao enxuta para o hub /comunidade: usa o indice by_tipo (sem varrer a
// tabela toda), ordena por data, limita no servidor e enriquece apenas os N
// itens exibidos. Nao traz reacoes/comentarios/serie (o AudioListItem nao usa)
// — evita o N+1 da `list` generica.
export const listRecentesByTipo = query({
  args: {
    tipo: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!(await checkPermission(ctx, "gravacoes:read"))) return [];
    const limit = args.limit ?? 4;

    const doTipo = await ctx.db
      .query("gravacoes")
      .withIndex("by_tipo", (q) => q.eq("tipo", args.tipo as Doc<"gravacoes">["tipo"]))
      .collect();

    const recentes = doTipo
      .filter((g) => g.status === "PUBLICADO")
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, limit);

    return Promise.all(
      recentes.map(async (g) => {
        let pregadorInfo = null;
        if (g.pregadorId) {
          const membro = await ctx.db.get(g.pregadorId);
          if (membro) {
            const entidade = await ctx.db.get(membro.entidadeId);
            pregadorInfo = { nome: entidade?.nomeCompleto || "" };
          }
        }
        return { ...semCamposPesados(g), pregadorInfo };
      }),
    );
  },
});

export const getById = query({
  args: { id: v.id("gravacoes") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "gravacoes:read");
    const gravacao = await ctx.db.get(id);
    if (!gravacao) return null;

    let pregadorInfo = null;
    if (gravacao.pregadorId) {
      const membro = await ctx.db.get(gravacao.pregadorId);
      if (membro) {
        const entidade = await ctx.db.get(membro.entidadeId);
        pregadorInfo = { nome: entidade?.nomeCompleto || "" };
      }
    }

    let serieInfo = null;
    if (gravacao.serieId) {
      const serie = await ctx.db.get(gravacao.serieId);
      if (serie) {
        serieInfo = { nome: serie.nome };
      }
    }

    // Transcricao/resultado moram em gravacoesIA; fallback aos campos legados
    // do proprio doc enquanto a migracao nao roda
    const ia = await ctx.db
      .query("gravacoesIA")
      .withIndex("by_gravacao", (q) => q.eq("gravacaoId", id))
      .first();

    return {
      ...gravacao,
      iaTranscricao: ia?.transcricao ?? gravacao.iaTranscricao,
      iaResultado: ia?.resultado ?? gravacao.iaResultado,
      pregadorInfo,
      serieInfo,
    };
  },
});

export const getLatestAvisos = query({
  args: {},
  handler: async (ctx) => {
    if (!(await checkPermission(ctx, "gravacoes:read"))) return null;
    // Itera pelo index desc ate achar o primeiro sermao com avisos
    const iter = ctx.db
      .query("gravacoes")
      .withIndex("by_data")
      .order("desc");

    for await (const g of iter) {
      if (
        g.tipo === "SERMAO" &&
        g.iaStatus === "CONCLUIDO" &&
        g.iaAvisos &&
        g.iaAvisos.length > 0
      ) {
        return {
          gravacaoId: g._id,
          titulo: g.titulo,
          data: g.data,
          audioUrl: g.audioUrl || null,
          inicioAvisos: g.inicioAvisos ?? null,
          fimAvisos: g.fimAvisos ?? null,
          avisos: g.iaAvisos,
        };
      }
    }

    return null;
  },
});

export const listFrases = query({
  args: {},
  handler: async (ctx) => {
    if (!(await checkPermission(ctx, "gravacoes:read"))) return [];
    const gravacoes = await ctx.db.query("gravacoes").order("desc").collect();
    const frases: { frase: string; pregador: string; titulo: string; gravacaoId: string }[] = [];

    for (const g of gravacoes) {
      if (g.status !== "PUBLICADO" || g.iaStatus !== "CONCLUIDO") continue;
      // Frases apenas de sermões e palestras
      if (g.tipo !== "SERMAO" && g.tipo !== "PALESTRA") continue;

      // iaFrases denormalizado (fraseChave + frasesRedesSociais); fallback ao
      // iaResultado legado enquanto a migracao nao roda
      const frasesDaGravacao = g.iaFrases ?? extrairFrases(g.iaResultado);
      if (!frasesDaGravacao) continue;

      for (const f of frasesDaGravacao) {
        frases.push({
          frase: f,
          pregador: g.pregadorNome || "Pregador",
          titulo: g.titulo,
          gravacaoId: g._id,
        });
      }
    }

    return frases;
  },
});

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    if (!(await checkPermission(ctx, "gravacoes:read"))) return [];
    const gravacoes = await ctx.db.query("gravacoes").collect();
    const counts: Record<string, number> = {};
    for (const g of gravacoes) {
      if (g.status !== "PUBLICADO" && g.status !== "RASCUNHO") continue;
      for (const tag of g.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  },
});

// ===== Modo Quiosque =====
// Queries dedicadas para o modo de visualizacao restrita (so sermoes).
// Acessiveis apenas quando configApp.modoQuiosque = true.

export const listSermoesQuiosque = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!(await isQuiosqueAtivo(ctx))) return [];

    let results = await ctx.db
      .query("gravacoes")
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("tipo"), "SERMAO"),
          q.eq(q.field("status"), "PUBLICADO"),
        ),
      )
      .collect();

    if (args.search) {
      const term = args.search.toLowerCase();
      results = results.filter((g) => {
        return (
          g.titulo.toLowerCase().includes(term) ||
          (g.pregadorNome || "").toLowerCase().includes(term) ||
          (g.textoBase || "").toLowerCase().includes(term)
        );
      });
    }

    return results.map((g) => ({
      _id: g._id,
      titulo: g.titulo,
      data: g.data,
      tipo: g.tipo,
      pregadorNome: g.pregadorNome ?? null,
      textoBase: g.textoBase ?? null,
      inicioConteudo: g.inicioConteudo ?? null,
      fimConteudo: g.fimConteudo ?? null,
      inicioSermao: g.inicioSermao ?? null,
      fimSermao: g.fimSermao ?? null,
    }));
  },
});

export const getSermaoQuiosque = query({
  args: { id: v.id("gravacoes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    if (!(await isQuiosqueAtivo(ctx))) return null;

    const gravacao = await ctx.db.get(id);
    if (!gravacao) return null;
    if (gravacao.tipo !== "SERMAO" || gravacao.status !== "PUBLICADO") return null;

    return {
      _id: gravacao._id,
      titulo: gravacao.titulo,
      data: gravacao.data,
      tipo: gravacao.tipo,
      pregadorNome: gravacao.pregadorNome ?? null,
      textoBase: gravacao.textoBase ?? null,
      audioUrl: gravacao.audioUrl ?? null,
      inicioConteudo: gravacao.inicioConteudo ?? null,
      fimConteudo: gravacao.fimConteudo ?? null,
      inicioSermao: gravacao.inicioSermao ?? null,
      fimSermao: gravacao.fimSermao ?? null,
    };
  },
});
