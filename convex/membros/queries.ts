import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    search: v.optional(v.string()),
    cargoEclesiastico: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membros = await ctx.db.query("membros").collect();

    const results = await Promise.all(
      membros.map(async (m) => {
        const entidade = await ctx.db.get(m.entidadeId);
        return entidade ? { ...m, entidade } : null;
      })
    );

    let filtered = results.filter(Boolean) as NonNullable<(typeof results)[0]>[];

    if (args.status) {
      filtered = filtered.filter((r) => r!.entidade.status === args.status);
    } else {
      // Default: show only ATIVO
      filtered = filtered.filter((r) => r!.entidade.status === "ATIVO");
    }

    if (args.cargoEclesiastico) {
      filtered = filtered.filter((r) => r!.cargoEclesiastico === args.cargoEclesiastico);
    }

    if (args.search) {
      const term = args.search.toLowerCase();
      filtered = filtered.filter((r) => {
        const name = (r!.entidade.nomeCompleto || "").toLowerCase();
        const phone = (r!.entidade.whatsapp || "").toLowerCase();
        return name.includes(term) || phone.includes(term);
      });
    }

    return filtered;
  },
});

export const getById = query({
  args: { id: v.id("membros") },
  handler: async (ctx, { id }) => {
    const membro = await ctx.db.get(id);
    if (!membro) return null;
    const entidade = await ctx.db.get(membro.entidadeId);
    return { ...membro, entidade };
  },
});

export const getPublicProfile = query({
  args: { id: v.id("membros") },
  handler: async (ctx, { id }) => {
    const membro = await ctx.db.get(id);
    if (!membro) return null;
    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade || entidade.status !== "ATIVO") return null;

    // Conjuge
    let conjugeNome: string | null = null;
    if (membro.conjugeId) {
      const conjugeEntidade = await ctx.db.get(membro.conjugeId);
      if (conjugeEntidade && conjugeEntidade.status === "ATIVO") {
        conjugeNome = conjugeEntidade.nomeCompleto || null;
      }
    }

    // Pequeno grupo
    const pgMembros = await ctx.db
      .query("pgMembros")
      .withIndex("by_membro", (q) => q.eq("membroId", id))
      .collect();
    let pgNome: string | null = null;
    if (pgMembros.length > 0) {
      const pg = await ctx.db.get(pgMembros[0].pgId);
      if (pg && pg.status === "ATIVO") {
        pgNome = pg.nome;
      }
    }

    return {
      nome: entidade.nomeCompleto || entidade.nomeRazaoSocial || "",
      apelido: entidade.apelido || null,
      foto: entidade.foto || null,
      whatsapp: entidade.whatsapp || null,
      cargoEclesiastico: membro.cargoEclesiastico || null,
      dataNascimento: entidade.dataNascimento || null,
      profissao: entidade.profissao || null,
      bairro: entidade.endereco?.bairro || null,
      cidade: entidade.endereco?.cidade || null,
      dataMembresia: membro.dataMembresia || null,
      conjugeNome,
      filhos: membro.filhos || null,
      pgNome,
    };
  },
});

export const birthdaysThisMonth = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    const membros = await ctx.db.query("membros").collect();
    const results = await Promise.all(
      membros.map(async (m) => {
        const entidade = await ctx.db.get(m.entidadeId);
        return entidade ? { ...m, entidade } : null;
      })
    );

    return results
      .filter((r): r is NonNullable<typeof r> => {
        if (!r || !r.entidade.dataNascimento || r.entidade.status !== "ATIVO") return false;
        // dataNascimento format: YYYY-MM-DD
        const month = r.entidade.dataNascimento.split("-")[1];
        return month === currentMonth;
      })
      .sort((a, b) => {
        const dayA = parseInt(a!.entidade.dataNascimento!.split("-")[2]);
        const dayB = parseInt(b!.entidade.dataNascimento!.split("-")[2]);
        return dayA - dayB;
      });
  },
});

export const birthdaysThisWeek = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 6);

    const membros = await ctx.db.query("membros").collect();
    const results = await Promise.all(
      membros.map(async (m) => {
        const entidade = await ctx.db.get(m.entidadeId);
        return entidade ? { ...m, entidade } : null;
      })
    );

    return results
      .filter((r): r is NonNullable<typeof r> => {
        if (!r || !r.entidade.dataNascimento || r.entidade.status !== "ATIVO") return false;
        const [, month, day] = r.entidade.dataNascimento.split("-").map(Number);
        const bday = new Date(now.getFullYear(), month - 1, day);
        return bday >= today && bday <= endOfWeek;
      })
      .sort((a, b) => {
        const [, mA, dA] = a.entidade.dataNascimento!.split("-").map(Number);
        const [, mB, dB] = b.entidade.dataNascimento!.split("-").map(Number);
        return new Date(now.getFullYear(), mA - 1, dA).getTime() - new Date(now.getFullYear(), mB - 1, dB).getTime();
      });
  },
});

export const getByUserId = query({
  args: {},
  handler: async (ctx) => {
    const { auth } = ctx;
    // @ts-ignore
    const identity = await auth.getUserIdentity();
    if (!identity) return null;
    // Try to find by subject (userId)
    const userId = identity.subject;
    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id")
      .filter((q) => q.neq(q.field("userId"), undefined))
      .collect();
    const match = membro.find((m) => m.userId === userId as any);
    if (!match) return null;
    const entidade = await ctx.db.get(match.entidadeId);
    return { ...match, entidade };
  },
});
