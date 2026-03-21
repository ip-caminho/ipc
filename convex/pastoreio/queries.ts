import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolvePermissions } from "../preferencias/rbacHelpers";

async function resolveMembroNome(ctx: any, membroId: any): Promise<string> {
  if (!membroId) return "";
  const membro = await ctx.db.get(membroId);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.nomeCompleto || "";
}

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

export const listVisitas = query({
  args: {
    membroId: v.optional(v.id("membros")),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("pastoreio:read")) return [];

    let visitas = await ctx.db
      .query("visitasPastorais")
      .order("desc")
      .collect();

    if (args.membroId) {
      visitas = visitas.filter((v) => v.membroId === args.membroId);
    }

    return Promise.all(
      visitas.map(async (visita) => ({
        ...visita,
        membroNome: await resolveMembroNome(ctx, visita.membroId),
        visitanteNome: await resolveMembroNome(ctx, visita.visitanteId),
      }))
    );
  },
});

export const listPedidosOracao = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth) return [];

    const canReadAll = auth.can("pastoreio:read");
    const canReadOwn = auth.can("pedidos_oracao:read");

    if (!canReadAll && !canReadOwn) return [];

    let pedidos = await ctx.db
      .query("pedidosOracao")
      .order("desc")
      .collect();

    // Membro so ve os proprios
    if (!canReadAll) {
      pedidos = pedidos.filter((p) => p.membroId === auth.membro._id);
    }

    if (args.status) {
      pedidos = pedidos.filter((p) => p.status === args.status);
    }

    return Promise.all(
      pedidos.map(async (pedido) => ({
        ...pedido,
        membroNome: await resolveMembroNome(ctx, pedido.membroId),
      }))
    );
  },
});

export const listAnotacoes = query({
  args: {
    membroId: v.optional(v.id("membros")),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("pastoreio:read")) return [];

    let anotacoes = await ctx.db
      .query("anotacoesPastorais")
      .order("desc")
      .collect();

    if (args.membroId) {
      anotacoes = anotacoes.filter((a) => a.membroId === args.membroId);
    }

    return Promise.all(
      anotacoes.map(async (anotacao) => ({
        ...anotacao,
        membroNome: await resolveMembroNome(ctx, anotacao.membroId),
        autorNome: await resolveMembroNome(ctx, anotacao.autorId),
      }))
    );
  },
});

export const getMembroPerfil = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("pastoreio:read")) return null;

    const membro = await ctx.db.get(membroId);
    if (!membro) return null;
    const entidade = await ctx.db.get(membro.entidadeId);
    if (!entidade) return null;

    // Conjuge
    let conjuge = null;
    if (membro.conjugeId) {
      const conjugeEnt = await ctx.db.get(membro.conjugeId);
      if (conjugeEnt) {
        conjuge = {
          nome: conjugeEnt.nomeCompleto || "",
          dataNascimento: conjugeEnt.dataNascimento || null,
          whatsapp: conjugeEnt.whatsapp || null,
        };
      }
    }

    // PGs
    const pgMembros = await ctx.db
      .query("pgMembros")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const pgs = await Promise.all(
      pgMembros.map(async (pm) => {
        const pg = await ctx.db.get(pm.pgId);
        return pg ? { nome: pg.nome, _id: pg._id } : null;
      })
    );

    // Visitas recebidas
    const visitas = await ctx.db
      .query("visitasPastorais")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const visitasEnriched = await Promise.all(
      visitas
        .sort((a, b) => b.criadoEm - a.criadoEm)
        .slice(0, 10)
        .map(async (v) => ({
          _id: v._id,
          data: v.data,
          tipo: v.tipo,
          observacoes: v.observacoes,
          visitanteNome: await resolveMembroNome(ctx, v.visitanteId),
        }))
    );

    // Pedidos de oracao
    const pedidos = await ctx.db
      .query("pedidosOracao")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const pedidosOrdenados = pedidos
      .sort((a, b) => b.criadoEm - a.criadoEm)
      .slice(0, 10);

    // Anotacoes pastorais
    const anotacoes = await ctx.db
      .query("anotacoesPastorais")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const anotacoesEnriched = await Promise.all(
      anotacoes
        .sort((a, b) => b.criadoEm - a.criadoEm)
        .slice(0, 10)
        .map(async (a) => ({
          _id: a._id,
          texto: a.texto,
          criadoEm: a.criadoEm,
          autorNome: await resolveMembroNome(ctx, a.autorId),
        }))
    );

    // Escalas — onde serve
    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const escalasEnriched = await Promise.all(
      escalas.slice(-20).map(async (e) => {
        const culto = await ctx.db.get(e.cultoId);
        return culto
          ? { funcao: e.funcao, cultoData: culto.data, cultoTipo: culto.tipo }
          : null;
      })
    );
    const escalasValidas = escalasEnriched
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => b.cultoData.localeCompare(a.cultoData))
      .slice(0, 10);

    // Funcoes distintas em que serve
    const funcoesSet = new Set(escalas.map((e) => e.funcao));

    // Escutas de gravacoes
    const escutas = await ctx.db
      .query("escutasGravacao")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const escutasEnriched = await Promise.all(
      escutas
        .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
        .slice(0, 10)
        .map(async (e) => {
          const gravacao = await ctx.db.get(e.gravacaoId);
          return {
            titulo: gravacao?.titulo || "—",
            progresso: e.progresso,
            completou: e.completou,
            atualizadoEm: e.atualizadoEm,
          };
        })
    );

    return {
      membro: {
        _id: membro._id,
        role: membro.role,
        rol: membro.rol,
        dataMembresia: membro.dataMembresia,
        formaAdmissao: membro.formaAdmissao,
        cargoEclesiastico: membro.cargoEclesiastico,
        dataConversao: membro.dataConversao,
        dataBatismo: membro.dataBatismo,
        igrejaProcedencia: membro.igrejaProcedencia,
        filhos: membro.filhos,
      },
      entidade: {
        nomeCompleto: entidade.nomeCompleto || "",
        foto: entidade.foto,
        dataNascimento: entidade.dataNascimento,
        sexo: entidade.sexo,
        estadoCivil: entidade.estadoCivil,
        whatsapp: entidade.whatsapp,
        telefone: entidade.telefone,
        email: entidade.email,
        endereco: entidade.endereco,
        profissao: entidade.profissao,
        status: entidade.status,
      },
      conjuge,
      pgs: pgs.filter((p): p is NonNullable<typeof p> => p !== null),
      visitas: visitasEnriched,
      totalVisitas: visitas.length,
      pedidos: pedidosOrdenados,
      totalPedidos: pedidos.length,
      anotacoes: anotacoesEnriched,
      totalAnotacoes: anotacoes.length,
      escalas: escalasValidas,
      funcoes: Array.from(funcoesSet),
      escutas: escutasEnriched,
      totalEscutas: escutas.length,
      escutasCompletas: escutas.filter((e) => e.completou).length,
    };
  },
});

export const listMembrosResumo = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("pastoreio:read")) return [];

    const membros = await ctx.db.query("membros").collect();

    const results = await Promise.all(
      membros.map(async (m) => {
        const entidade = await ctx.db.get(m.entidadeId);
        if (!entidade || entidade.status !== "ATIVO") return null;
        return {
          _id: m._id,
          nome: entidade.nomeCompleto || "",
          foto: entidade.foto,
          whatsapp: entidade.whatsapp,
          cargoEclesiastico: m.cargoEclesiastico,
          dataNascimento: entidade.dataNascimento,
        };
      })
    );

    let filtered = results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    if (args.search) {
      const term = args.search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.nome.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => a.nome.localeCompare(b.nome));
  },
});

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    if (!auth || !auth.can("pastoreio:read")) return null;

    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const visitas = await ctx.db.query("visitasPastorais").collect();
    const visitasMes = visitas.filter((v) => v.data.startsWith(mesAtual));

    const pedidos = await ctx.db.query("pedidosOracao").collect();
    const pedidosAtivos = pedidos.filter((p) => p.status === "ATIVO");

    const anotacoes = await ctx.db.query("anotacoesPastorais").collect();
    const umaSemanaAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const anotacoesRecentes = anotacoes.filter(
      (a) => a.criadoEm > umaSemanaAtras
    );

    return {
      visitasMes: visitasMes.length,
      pedidosAtivos: pedidosAtivos.length,
      anotacoesRecentes: anotacoesRecentes.length,
      totalVisitas: visitas.length,
    };
  },
});
