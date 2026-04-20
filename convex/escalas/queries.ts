import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(" ")[0];
}

/** Helper: buscar cultoLouvores enriquecidos para um culto */
async function enrichCultoLouvores(ctx: any, cultoId: any) {
  const items = await ctx.db
    .query("cultoLouvores")
    .withIndex("by_culto", (q: any) => q.eq("cultoId", cultoId))
    .collect();

  if (items.length === 0) return null; // Sem dados na nova tabela

  items.sort((a: any, b: any) => a.ordem - b.ordem);

  const enriched = [];
  for (const item of items) {
    let titulo = item.tituloLegado || "";
    let artista: string | undefined;
    let tomOriginal: string | undefined;

    if (item.louvorId) {
      const louvor = await ctx.db.get(item.louvorId);
      if (louvor) {
        titulo = louvor.titulo;
        artista = louvor.artista;
        tomOriginal = louvor.tom;
      }
    }

    enriched.push({
      _id: item._id,
      louvorId: item.louvorId || null,
      titulo,
      artista: artista || null,
      tomOriginal: tomOriginal || null,
      tomEscolhido: item.tom || null,
      secao: item.secao || null,
      ordem: item.ordem,
    });
  }
  return enriched;
}

async function resolveEscalaNome(ctx: any, e: any): Promise<string> {
  if (e.nomeCustom) return e.nomeCustom;
  if (!e.membroId) return "";
  const membro = await ctx.db.get(e.membroId);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return primeiroNome(entidade?.nomeCompleto || "");
}

async function resolveEscalaNomeCompleto(ctx: any, e: any): Promise<string> {
  if (e.nomeCustom) return e.nomeCustom;
  if (!e.membroId) return "";
  const membro = await ctx.db.get(e.membroId);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.nomeCompleto || "";
}

async function resolveEscalaFoto(ctx: any, e: any): Promise<string | undefined> {
  if (!e.membroId) return undefined;
  const membro = await ctx.db.get(e.membroId);
  if (!membro) return undefined;
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.foto || undefined;
}

export const listCultos = query({
  args: {
    tipo: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cultos = await ctx.db.query("cultos").order("desc").collect();

    if (args.tipo) {
      cultos = cultos.filter((c) => c.tipo === args.tipo);
    }
    if (args.status) {
      cultos = cultos.filter((c) => c.status === args.status);
    }

    return Promise.all(
      cultos.map(async (culto) => {
        const escalas = await ctx.db
          .query("cultoEscalas")
          .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
          .collect();

        const escalasEnriched = await Promise.all(
          escalas.map(async (e) => ({
            ...e,
            membroNome: await resolveEscalaNome(ctx, e),
          }))
        );

        return { ...culto, escalas: escalasEnriched };
      })
    );
  },
});

export const getCultoById = query({
  args: { id: v.id("cultos") },
  handler: async (ctx, { id }) => {
    const culto = await ctx.db.get(id);
    if (!culto) return null;

    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto", (q) => q.eq("cultoId", id))
      .collect();

    const escalasEnriched = await Promise.all(
      escalas.map(async (e) => ({
        ...e,
        membroNome: await resolveEscalaNome(ctx, e),
      }))
    );

    const louvoresDetalhados = await enrichCultoLouvores(ctx, id);
    return { ...culto, escalas: escalasEnriched, louvoresDetalhados };
  },
});

export const minhasEscalas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return [];

    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.all(
      escalas.map(async (e) => {
        const culto = await ctx.db.get(e.cultoId);
        if (!culto || culto.data < today) return null;

        // Se escalado para LOUVOR, buscar colegas de louvor do mesmo culto
        let colegasLouvor: string[] | undefined;
        if (e.funcao === "LOUVOR") {
          const todasEscalasCulto = await ctx.db
            .query("cultoEscalas")
            .withIndex("by_culto_funcao", (q: any) =>
              q.eq("cultoId", e.cultoId).eq("funcao", "LOUVOR")
            )
            .collect();
          const nomes = await Promise.all(
            todasEscalasCulto
              .filter((ec) => ec.membroId && ec.membroId !== membro._id)
              .map(async (ec) => {
                if (!ec.membroId) return null;
                const m = await ctx.db.get(ec.membroId);
                if (!m) return null;
                const ent = await ctx.db.get(m.entidadeId);
                return ent ? primeiroNome(ent.apelido || ent.nomeCompleto || "") : null;
              })
          );
          colegasLouvor = nomes.filter((n): n is string => !!n);
        }

        return { ...e, culto, colegasLouvor };
      })
    );

    return results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.culto.data.localeCompare(b.culto.data));
  },
});

export const listProximosCultos = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 3 }) => {
    const today = new Date().toISOString().split("T")[0];

    const cultos = await ctx.db
      .query("cultos")
      .order("asc")
      .collect();

    const upcoming = cultos
      .filter((c) => c.data >= today)
      .slice(0, limit);

    return Promise.all(
      upcoming.map(async (culto) => {
        const escalas = await ctx.db
          .query("cultoEscalas")
          .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
          .collect();

        const escalasEnriched = await Promise.all(
          escalas.map(async (e) => ({
            funcao: e.funcao,
            membroNome: await resolveEscalaNome(ctx, e),
          }))
        );

        return { ...culto, escalas: escalasEnriched };
      })
    );
  },
});

// Proximo Domingo — dados completos para visualizacao
export const getProximoDomingo = query({
  args: { data: v.optional(v.string()) },
  handler: async (ctx, { data }) => {
    const today = new Date().toISOString().split("T")[0];

    const cultos = await ctx.db.query("cultos").order("asc").collect();
    const dominicais = cultos
      .filter((c) => c.tipo === "DOMINICAL")
      .sort((a, b) => a.data.localeCompare(b.data));

    let culto;
    if (data) culto = dominicais.find((c) => c.data === data);
    if (!culto) culto = dominicais.find((c) => c.data >= today);
    if (!culto && dominicais.length > 0) culto = dominicais[dominicais.length - 1];
    if (!culto) return null;

    // Escalas com nomes completos e passagens
    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
      .collect();

    const escalasEnriched = await Promise.all(
      escalas.map(async (e) => ({
        ...e,
        membroNome: await resolveEscalaNome(ctx, e),
        membroNomeCompleto: await resolveEscalaNomeCompleto(ctx, e),
      }))
    );

    // Avisos validos para esta data
    const todosAvisos = await ctx.db.query("avisos").collect();
    const avisos = todosAvisos.filter((a) => {
      const fim = a.dataFim || a.dataInicio;
      return a.dataInicio <= culto!.data && fim >= culto!.data;
    });

    // Indisponibilidades
    const indisps = await ctx.db
      .query("indisponibilidades")
      .withIndex("by_data", (q: any) => q.eq("data", culto!.data))
      .collect();

    const indispsEnriched = await Promise.all(
      indisps.map(async (i) => {
        const membro = await ctx.db.get(i.membroId);
        const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
        return { nome: entidade?.nomeCompleto || "", motivo: i.motivo };
      })
    );

    // Datas disponiveis para seletor
    const datasDisponiveis = dominicais.map((c) => c.data);

    // Navegacao
    const idx = dominicais.findIndex((c) => c._id === culto!._id);
    const anterior = idx > 0 ? dominicais[idx - 1].data : null;
    const proximo = idx < dominicais.length - 1 ? dominicais[idx + 1].data : null;

    const louvoresDetalhados = await enrichCultoLouvores(ctx, culto!._id);
    return {
      ...culto,
      escalas: escalasEnriched,
      avisos,
      indisponibilidades: indispsEnriched,
      datasDisponiveis,
      navegacao: { anterior, proximo },
      louvoresDetalhados,
    };
  },
});

// Boletim dominical — proximo culto DOMINICAL com dados completos
export const getBoletim = query({
  args: { data: v.optional(v.string()) },
  handler: async (ctx, { data }) => {
    const today = new Date().toISOString().split("T")[0];

    const cultos = await ctx.db
      .query("cultos")
      .order("asc")
      .collect();

    const dominicais = cultos
      .filter((c) => c.tipo === "DOMINICAL")
      .sort((a, b) => a.data.localeCompare(b.data));

    // Culto selecionado por data, ou ultimo domingo (no domingo mostra o de hoje)
    let culto;
    if (data) {
      culto = dominicais.find((c) => c.data === data);
    }
    if (!culto) {
      const isDomingo = new Date().getDay() === 0;
      if (isDomingo) {
        // No domingo, mostra o culto de hoje
        culto = dominicais.find((c) => c.data === today);
      }
      if (!culto) {
        // De segunda a sábado, mostra o último domingo passado
        const passados = dominicais.filter((c) => c.data <= today);
        culto = passados.length > 0 ? passados[passados.length - 1] : undefined;
      }
    }
    if (!culto && dominicais.length > 0) {
      culto = dominicais[0]; // primeiro disponível como fallback
    }
    if (!culto) return null;

    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto", (q) => q.eq("cultoId", culto._id))
      .collect();

    const escalasEnriched = await Promise.all(
      escalas.map(async (e) => ({
        ...e,
        membroNome: await resolveEscalaNome(ctx, e),
        membroNomeCompleto: await resolveEscalaNomeCompleto(ctx, e),
        membroFoto: await resolveEscalaFoto(ctx, e),
      }))
    );

    // Datas para navegacao
    const idx = dominicais.findIndex((c) => c._id === culto!._id);
    const anterior = idx > 0 ? dominicais[idx - 1].data : null;
    const proximo = idx < dominicais.length - 1 ? dominicais[idx + 1].data : null;

    // Avisos validos para esta data
    // dataInicio = domingo em que o aviso comeca a aparecer
    // dataFim = ultimo domingo em que aparece (se omitido, aparece so no dataInicio)
    const todosAvisos = await ctx.db.query("avisos").collect();
    const avisos = todosAvisos.filter((a) => {
      const fim = a.dataFim || a.dataInicio;
      return a.dataInicio <= culto!.data && fim >= culto!.data;
    });

    const louvoresDetalhados = await enrichCultoLouvores(ctx, culto!._id);
    return {
      ...culto,
      escalas: escalasEnriched,
      avisos,
      navegacao: { anterior, proximo },
      louvoresDetalhados,
    };
  },
});

/** Próxima escala do membro autenticado + contagem de futuras */
export const minhaProximaEscala = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { proxima: null, totalFuturas: 0 };

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return { proxima: null, totalFuturas: 0 };

    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    const escalasComCulto = await Promise.all(
      escalas.map(async (e) => {
        const culto = await ctx.db.get(e.cultoId);
        if (!culto || culto.data < today) return null;
        return { escala: e, culto };
      })
    );

    const futuras = escalasComCulto
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.culto.data.localeCompare(b.culto.data));

    if (futuras.length === 0) {
      return { proxima: null, totalFuturas: 0 };
    }

    const { escala, culto } = futuras[0];
    return {
      proxima: {
        _id: escala._id,
        funcao: escala.funcao,
        cultoId: culto._id,
        data: culto.data,
        horario: culto.horario ?? null,
        titulo: culto.titulo ?? null,
      },
      totalFuturas: futuras.length,
    };
  },
});
