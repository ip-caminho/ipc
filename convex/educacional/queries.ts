import { query } from "../_generated/server";
import { getSaoPauloDateString } from "../_shared/datetime";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolvePermissions } from "../preferencias/rbacHelpers";

import { resolveMembroNome } from "../_shared/membroResolver";

async function getAuthContext(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) return null;

  const rolePerms = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("role", membro.role))
    .first();
  const permissions = resolvePermissions(
    membro.permissions,
    rolePerms?.permissions,
    membro.role
  );

  const can = (perm: string) =>
    permissions.includes("*") || permissions.includes(perm);

  return { userId, membro, permissions, can };
}

export const listCriancas = query({
  args: {
    turma: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("criancas:read")) return [];

    const canManage = auth.can("criancas:manage");

    let perfis;
    if (args.turma) {
      perfis = await ctx.db
        .query("criancaPerfil")
        .withIndex("by_turma", (q) => q.eq("turma", args.turma!))
        .collect();
    } else {
      perfis = await ctx.db.query("criancaPerfil").collect();
    }

    return Promise.all(
      perfis.map(async (perfil) => {
        const entidade = await ctx.db.get(perfil.entidadeId);

        // Buscar responsaveis
        const resps = await ctx.db
          .query("responsaveis")
          .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", perfil.entidadeId))
          .collect();
        const responsaveis = await Promise.all(
          resps.map(async (r) => {
            const respEntidade = await ctx.db.get(r.responsavelEntidadeId);
            return {
              _id: r._id,
              tipo: r.tipo,
              principal: r.principal,
              nome: respEntidade?.nomeCompleto || "",
              entidadeId: r.responsavelEntidadeId,
            };
          })
        );

        // Ovelhinha
        let ovelhinhaNome = "";
        if (perfil.ovelhinhaId) {
          ovelhinhaNome = await resolveMembroNome(ctx, perfil.ovelhinhaId);
        }

        return {
          _id: perfil._id,
          entidadeId: perfil.entidadeId,
          nome: entidade?.nomeCompleto || "",
          foto: entidade?.foto || null,
          dataNascimento: entidade?.dataNascimento,
          sexo: entidade?.sexo,
          turma: perfil.turma,
          usoImagem: perfil.usoImagem,
          observacoesMedicas: canManage ? perfil.observacoesMedicas : undefined,
          observacoesFamilia: perfil.observacoesFamilia,
          ovelhinhaId: perfil.ovelhinhaId,
          ovelhinhaNome,
          responsaveis,
          criadoEm: perfil.criadoEm,
        };
      })
    );
  },
});

export const getCrianca = query({
  args: { entidadeId: v.id("entidades") },
  handler: async (ctx, { entidadeId }) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("criancas:read")) return null;

    const canManage = auth.can("criancas:manage");

    const perfil = await ctx.db
      .query("criancaPerfil")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
      .first();
    if (!perfil) return null;

    const entidade = await ctx.db.get(entidadeId);

    // Responsaveis
    const resps = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", entidadeId))
      .collect();
    const responsaveis = await Promise.all(
      resps.map(async (r) => {
        const respEntidade = await ctx.db.get(r.responsavelEntidadeId);
        return {
          _id: r._id,
          tipo: r.tipo,
          principal: r.principal,
          nome: respEntidade?.nomeCompleto || "",
          entidadeId: r.responsavelEntidadeId,
          whatsapp: respEntidade?.whatsapp,
        };
      })
    );

    // Historico de presenca
    const presencas = await ctx.db
      .query("eduPresencas")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", entidadeId))
      .collect();
    const presencaRelatorios = await Promise.all(
      presencas.slice(-20).map(async (p) => {
        const rel = await ctx.db.get(p.relatorioId);
        return rel ? { data: rel.data, turma: rel.turma } : null;
      })
    );

    let ovelhinhaNome = "";
    if (perfil.ovelhinhaId) {
      ovelhinhaNome = await resolveMembroNome(ctx, perfil.ovelhinhaId);
    }

    return {
      _id: perfil._id,
      entidadeId,
      nome: entidade?.nomeCompleto || "",
      foto: entidade?.foto || null,
      dataNascimento: entidade?.dataNascimento,
      sexo: entidade?.sexo,
      turma: perfil.turma,
      usoImagem: perfil.usoImagem,
      observacoesMedicas: canManage ? perfil.observacoesMedicas : undefined,
      observacoesFamilia: perfil.observacoesFamilia,
      ovelhinhaId: perfil.ovelhinhaId,
      ovelhinhaNome,
      responsaveis,
      presencas: presencaRelatorios.filter((p): p is NonNullable<typeof p> => p !== null),
      criadoEm: perfil.criadoEm,
    };
  },
});

export const listRelatorios = query({
  args: {
    turma: v.optional(v.string()),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("educacional:read")) return [];

    let relatorios;
    if (args.turma) {
      relatorios = await ctx.db
        .query("eduRelatorios")
        .withIndex("by_turma", (q) => q.eq("turma", args.turma!))
        .collect();
    } else {
      relatorios = await ctx.db.query("eduRelatorios").collect();
    }

    // Filtro por data
    if (args.dataInicio) {
      relatorios = relatorios.filter((r) => r.data >= args.dataInicio!);
    }
    if (args.dataFim) {
      relatorios = relatorios.filter((r) => r.data <= args.dataFim!);
    }

    // Ordenar por data desc
    relatorios.sort((a, b) => b.data.localeCompare(a.data));

    return Promise.all(
      relatorios.map(async (rel) => {
        const presencas = await ctx.db
          .query("eduPresencas")
          .withIndex("by_relatorio", (q) => q.eq("relatorioId", rel._id))
          .collect();
        return {
          ...rel,
          totalPresentes: presencas.length,
        };
      })
    );
  },
});

export const getRelatorio = query({
  args: { id: v.id("eduRelatorios") },
  handler: async (ctx, { id }) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("educacional:read")) return null;

    const relatorio = await ctx.db.get(id);
    if (!relatorio) return null;

    const presencas = await ctx.db
      .query("eduPresencas")
      .withIndex("by_relatorio", (q) => q.eq("relatorioId", id))
      .collect();

    const presentes = await Promise.all(
      presencas.map(async (p) => {
        const entidade = await ctx.db.get(p.criancaEntidadeId);
        return {
          entidadeId: p.criancaEntidadeId,
          nome: entidade?.nomeCompleto || "",
        };
      })
    );

    return {
      ...relatorio,
      presentes,
    };
  },
});

export const listEscalas = query({
  args: {
    ministerioId: v.id("ministerios"),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("educacional:read")) return [];

    let escalas = await ctx.db
      .query("ministerioEscalas")
      .withIndex("by_ministerio", (q) => q.eq("ministerioId", args.ministerioId))
      .collect();

    if (args.dataInicio) {
      escalas = escalas.filter((e) => e.data >= args.dataInicio!);
    }
    if (args.dataFim) {
      escalas = escalas.filter((e) => e.data <= args.dataFim!);
    }

    escalas.sort((a, b) => a.data.localeCompare(b.data));

    return Promise.all(
      escalas.map(async (escala) => {
        const membrosEnriched = await Promise.all(
          escala.membros.map(async (m) => ({
            ...m,
            nome: await resolveMembroNome(ctx, m.membroId),
          }))
        );
        return {
          ...escala,
          membros: membrosEnriched,
        };
      })
    );
  },
});

// ===== Queries para Diretorio =====

export const listCriancasForDiretorio = query({
  args: {
    search: v.optional(v.string()),
    turma: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("diretorio:read")) return [];

    let perfis;
    if (args.turma) {
      perfis = await ctx.db
        .query("criancaPerfil")
        .withIndex("by_turma", (q) => q.eq("turma", args.turma!))
        .collect();
    } else {
      perfis = await ctx.db.query("criancaPerfil").collect();
    }

    const results = await Promise.all(
      perfis.map(async (perfil) => {
        const entidade = await ctx.db.get(perfil.entidadeId);
        if (!entidade || entidade.status !== "ATIVO") return null;

        // Responsaveis
        const resps = await ctx.db
          .query("responsaveis")
          .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", perfil.entidadeId))
          .collect();
        const responsaveis = await Promise.all(
          resps.map(async (r) => {
            const respEntidade = await ctx.db.get(r.responsavelEntidadeId);
            return {
              tipo: r.tipo,
              nome: respEntidade?.nomeCompleto || "",
              entidadeId: r.responsavelEntidadeId,
            };
          })
        );

        return {
          entidadeId: perfil.entidadeId,
          nome: entidade.nomeCompleto || "",
          dataNascimento: entidade.dataNascimento,
          sexo: entidade.sexo,
          foto: entidade.foto,
          turma: perfil.turma,
          responsaveis,
        };
      })
    );

    let filtered = results.filter((r): r is NonNullable<typeof r> => r !== null);

    if (args.search) {
      const term = args.search.toLowerCase();
      filtered = filtered.filter((r) => r.nome.toLowerCase().includes(term));
    }

    return filtered.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },
});

export const listCriancasByResponsavel = query({
  args: {
    entidadeId: v.id("entidades"),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("diretorio:read")) return [];

    const resps = await ctx.db
      .query("responsaveis")
      .withIndex("by_responsavel", (q) => q.eq("responsavelEntidadeId", args.entidadeId))
      .collect();

    const criancas = await Promise.all(
      resps.map(async (r) => {
        const entidade = await ctx.db.get(r.criancaEntidadeId);
        if (!entidade || entidade.status !== "ATIVO") return null;

        const perfil = await ctx.db
          .query("criancaPerfil")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", r.criancaEntidadeId))
          .first();

        return {
          entidadeId: r.criancaEntidadeId,
          nome: entidade.nomeCompleto || "",
          dataNascimento: entidade.dataNascimento,
          turma: perfil?.turma || "",
        };
      })
    );

    return criancas.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

export const dashboardPais = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade) return null;

    // Buscar criancas onde este membro eh responsavel
    const resps = await ctx.db
      .query("responsaveis")
      .withIndex("by_responsavel", (q) => q.eq("responsavelEntidadeId", membro.entidadeId))
      .collect();

    if (resps.length === 0) return null;

    // Escalas futuras uma unica vez (range por indice), reutilizadas para
    // todos os filhos — antes ficava um full scan por filho dentro do loop.
    const hoje = getSaoPauloDateString();
    const escalasFuturas = await ctx.db
      .query("ministerioEscalas")
      .withIndex("by_data", (q) => q.gte("data", hoje))
      .collect();

    const criancas = await Promise.all(
      resps.map(async (r) => {
        const criancaEntidade = await ctx.db.get(r.criancaEntidadeId);
        const perfil = await ctx.db
          .query("criancaPerfil")
          .withIndex("by_entidade", (q) => q.eq("entidadeId", r.criancaEntidadeId))
          .first();

        if (!criancaEntidade || !perfil) return null;

        // Proxima escala do educacional para esta turma
        const proximaEscala = escalasFuturas
          .filter((e) => e.subgrupo === perfil.turma)
          .sort((a, b) => a.data.localeCompare(b.data))[0];

        let professores: string[] = [];
        if (proximaEscala) {
          professores = await Promise.all(
            proximaEscala.membros.map(async (m) => resolveMembroNome(ctx, m.membroId))
          );
        }

        return {
          nome: criancaEntidade.nomeCompleto || "",
          turma: perfil.turma,
          proximaEscalaData: proximaEscala?.data,
          professores: professores.filter(Boolean),
        };
      })
    );

    const validas = criancas.filter((c): c is NonNullable<typeof c> => c !== null);
    return validas.length > 0 ? validas : null;
  },
});
