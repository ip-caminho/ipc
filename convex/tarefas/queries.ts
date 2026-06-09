import { query } from "../_generated/server";
import { getSaoPauloDateString } from "../_shared/datetime";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasPermission, resolvePermissions, INITIAL_ROLE_PERMISSIONS } from "../preferencias/rbacHelpers";

async function resolveMembroResumo(ctx: any, membroId: any) {
  if (!membroId) return null;
  const membro = await ctx.db.get(membroId);
  if (!membro) return null;
  const entidade = await ctx.db.get(membro.entidadeId);
  if (!entidade) return null;
  return {
    _id: membro._id,
    nome: entidade.nomeCompleto || "",
    foto: entidade.foto || null,
  };
}

async function requireAuthWithPerms(ctx: any) {
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

  return { userId, membro, permissions };
}

export const list = query({
  args: {
    filtro: v.optional(v.union(
      v.literal("MINHAS"),
      v.literal("CRIADAS"),
      v.literal("TODAS"),
    )),
    status: v.optional(v.union(
      v.literal("ABERTA"),
      v.literal("EM_ANDAMENTO"),
      v.literal("CONCLUIDA"),
      v.literal("CANCELADA"),
    )),
    prioridade: v.optional(v.union(
      v.literal("BAIXA"),
      v.literal("MEDIA"),
      v.literal("ALTA"),
      v.literal("URGENTE"),
    )),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthWithPerms(ctx);
    if (!auth) return [];

    const { membro, permissions } = auth;
    const filtro = args.filtro ?? "MINHAS";

    let tarefas: any[];

    if (filtro === "MINHAS") {
      tarefas = await ctx.db
        .query("tarefas")
        .withIndex("by_responsavel", (q) => q.eq("responsavelId", membro._id))
        .collect();
    } else if (filtro === "CRIADAS") {
      tarefas = await ctx.db
        .query("tarefas")
        .withIndex("by_criador", (q) => q.eq("criadoPor", membro._id))
        .collect();
    } else {
      // TODAS — requer permissao tarefas:read
      if (!hasPermission(permissions, "tarefas:read")) return [];
      tarefas = await ctx.db.query("tarefas").collect();
    }

    // Filtrar por status
    if (args.status) {
      tarefas = tarefas.filter((t) => t.status === args.status);
    }

    // Filtrar por prioridade
    if (args.prioridade) {
      tarefas = tarefas.filter((t) => t.prioridade === args.prioridade);
    }

    // Ordenar: vencimento mais proximo primeiro, depois por criadoEm desc
    tarefas.sort((a, b) => {
      // Tarefas sem data de vencimento por ultimo
      if (a.dataVencimento && !b.dataVencimento) return -1;
      if (!a.dataVencimento && b.dataVencimento) return 1;
      if (a.dataVencimento && b.dataVencimento) {
        return a.dataVencimento.localeCompare(b.dataVencimento);
      }
      return b.criadoEm - a.criadoEm;
    });

    // Enriquecer com dados do responsavel e criador
    return Promise.all(
      tarefas.map(async (t) => {
        const responsavel = await resolveMembroResumo(ctx, t.responsavelId);
        const criador = await resolveMembroResumo(ctx, t.criadoPor);

        // Contar comentarios
        const comentarios = await ctx.db
          .query("comentarios")
          .withIndex("by_entidade", (q) =>
            q.eq("entidadeTipo", "tarefas").eq("entidadeId", t._id)
          )
          .collect();

        return {
          ...t,
          responsavelNome: responsavel?.nome || "",
          responsavelFoto: responsavel?.foto || null,
          criadorNome: criador?.nome || "",
          qtdComentarios: comentarios.length,
          isOwner: t.criadoPor === membro._id,
          isResponsavel: t.responsavelId === membro._id,
        };
      })
    );
  },
});

export const getById = query({
  args: { id: v.id("tarefas") },
  handler: async (ctx, { id }) => {
    const auth = await requireAuthWithPerms(ctx);
    if (!auth) return null;

    const { membro, permissions } = auth;

    const tarefa = await ctx.db.get(id);
    if (!tarefa) return null;

    // Verificar acesso: owner, responsavel, ou permissao
    const isOwner = tarefa.criadoPor === membro._id;
    const isResponsavel = tarefa.responsavelId === membro._id;
    if (!isOwner && !isResponsavel && !hasPermission(permissions, "tarefas:read")) {
      return null;
    }

    const responsavel = await resolveMembroResumo(ctx, tarefa.responsavelId);
    const criador = await resolveMembroResumo(ctx, tarefa.criadoPor);

    return {
      ...tarefa,
      responsavelNome: responsavel?.nome || "",
      responsavelFoto: responsavel?.foto || null,
      criadorNome: criador?.nome || "",
      criadorFoto: criador?.foto || null,
      isOwner,
      isResponsavel,
    };
  },
});

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthWithPerms(ctx);
    if (!auth) return null;

    const { membro } = auth;

    const minhas = await ctx.db
      .query("tarefas")
      .withIndex("by_responsavel", (q) => q.eq("responsavelId", membro._id))
      .collect();

    const hoje = getSaoPauloDateString();
    const pendentes = minhas.filter((t) => t.status === "ABERTA" || t.status === "EM_ANDAMENTO");
    const atrasadas = pendentes.filter((t) => t.dataVencimento && t.dataVencimento < hoje);

    return {
      pendentes: pendentes.length,
      atrasadas: atrasadas.length,
    };
  },
});

export const minhasPendentes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const tarefas = await ctx.db
      .query("tarefas")
      .withIndex("by_responsavel", (q) => q.eq("responsavelId", membro._id))
      .collect();

    return tarefas
      .filter((t) => t.status === "ABERTA" || t.status === "EM_ANDAMENTO")
      .sort((a, b) => {
        if (a.dataVencimento && !b.dataVencimento) return -1;
        if (!a.dataVencimento && b.dataVencimento) return 1;
        if (a.dataVencimento && b.dataVencimento) {
          return a.dataVencimento.localeCompare(b.dataVencimento);
        }
        return b.criadoEm - a.criadoEm;
      })
      .slice(0, 5);
  },
});
