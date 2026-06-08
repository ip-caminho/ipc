import { query } from "../_generated/server";
import { v } from "convex/values";
import { checkPermission, requireAnyPermission } from "../_shared/requirePermission";
import { naoEhOuvinte } from "./ouvinteHelpers";

export const list = query({
  args: {
    search: v.optional(v.string()),
    cargoEclesiastico: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyPermission(ctx, ["diretorio:read", "membros:read"]);
    const membros = (await ctx.db.query("membros").collect()).filter(naoEhOuvinte);

    const results = await Promise.all(
      membros.map(async (m) => {
        const entidade = await ctx.db.get(m.entidadeId);
        return entidade ? { ...m, entidade } : null;
      })
    );

    let filtered = results.filter(Boolean) as NonNullable<(typeof results)[0]>[];

    if (args.status === "TODOS") {
      // Sem filtro de status
    } else if (args.status) {
      filtered = filtered.filter((r) => r!.entidade.status === args.status);
    } else {
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
    await requireAnyPermission(ctx, ["diretorio:read", "membros:read"]);
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
      entidadeId: membro.entidadeId,
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
    // Aniversariantes visiveis a qualquer membro autenticado; WhatsApp so
    // para quem tem diretorio:read.
    const temDiretorio = !!(await checkPermission(ctx, "diretorio:read"));
    const podeVer = temDiretorio || !!(await checkPermission(ctx, "membros:self_service"));
    if (!podeVer) return [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    const membros = (await ctx.db.query("membros").collect()).filter(naoEhOuvinte);

    const aniversariantes: Array<{
      _id: string;
      nome: string;
      foto?: string;
      whatsapp?: string;
      dataNascimento: string;
      dia: number;
      mes: number;
      jaPassou: boolean;
    }> = [];

    const seenEntidades = new Set<string>();

    for (const m of membros) {
      const entidadeIdStr = m.entidadeId.toString();
      if (seenEntidades.has(entidadeIdStr)) continue;
      seenEntidades.add(entidadeIdStr);

      const entidade = await ctx.db.get(m.entidadeId);
      if (!entidade || entidade.status !== "ATIVO" || !entidade.dataNascimento) continue;

      const parts = entidade.dataNascimento.split("-");
      if (parts.length < 3) continue;

      const birthMonth = parseInt(parts[1], 10);
      const birthDay = parseInt(parts[2], 10);

      // Include current month + next month (7-day lookahead across month boundary)
      if (birthMonth === currentMonth || birthMonth === nextMonth) {
        aniversariantes.push({
          _id: m._id,
          nome: (entidade as any).apelido || entidade.nomeCompleto || "Sem nome",
          foto: (entidade as any).foto || undefined,
          whatsapp: temDiretorio ? ((entidade as any).whatsapp || undefined) : undefined,
          dataNascimento: entidade.dataNascimento,
          dia: birthDay,
          mes: birthMonth,
          jaPassou: birthMonth === currentMonth && birthDay < currentDay,
        });
      }
    }

    // Sort: today first, then upcoming by proximity, then past
    aniversariantes.sort((a, b) => {
      const aIsToday = a.mes === currentMonth && a.dia === currentDay;
      const bIsToday = b.mes === currentMonth && b.dia === currentDay;
      if (aIsToday !== bIsToday) return aIsToday ? -1 : 1;
      if (a.jaPassou !== b.jaPassou) return a.jaPassou ? 1 : -1;
      if (!a.jaPassou && !b.jaPassou) {
        const aDays = a.mes === currentMonth ? a.dia - currentDay : a.dia + 31 - currentDay;
        const bDays = b.mes === currentMonth ? b.dia - currentDay : b.dia + 31 - currentDay;
        return aDays - bDays;
      }
      return a.dia - b.dia;
    });

    return aniversariantes;
  },
});

export const birthdaysThisWeek = query({
  args: {},
  handler: async (ctx) => {
    if (!(await checkPermission(ctx, "diretorio:read"))) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 6);

    const membros = (await ctx.db.query("membros").collect()).filter(naoEhOuvinte);
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
