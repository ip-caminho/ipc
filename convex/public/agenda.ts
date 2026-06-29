import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getSaoPauloDateString } from "../_shared/datetime";

// Agenda pública (sem auth). Agrega cultos PUBLICADOS + eventos do calendário,
// ambos a partir de hoje. Retorno enxuto: NÃO inclui escalas, nomes de membros
// nem fotos (evita vazar dado sensível). Nem cultos nem calendarioEventos têm
// `local` — o endereço fixo vem de getIgrejaInfo no rodapé/visite.

type TipoAgenda = "culto" | "pg" | "evento" | "reuniao";

export type EventoPublico = {
  id: string;
  titulo: string;
  subtitulo?: string;
  data: string; // YYYY-MM-DD
  horario?: string;
  tipo: TipoAgenda;
};

async function coletarAgenda(ctx: QueryCtx, tipoFiltro?: TipoAgenda): Promise<EventoPublico[]> {
  const hoje = getSaoPauloDateString();
  const eventos: EventoPublico[] = [];

  // Cultos PUBLICADOS a partir de hoje (range de índice composto — sem ler passado)
  if (!tipoFiltro || tipoFiltro === "culto") {
    const cultos = await ctx.db
      .query("cultos")
      .withIndex("by_status_data", (q) => q.eq("status", "PUBLICADO").gte("data", hoje))
      .collect();
    for (const c of cultos) {
      eventos.push({
        id: c._id,
        tipo: "culto",
        titulo: c.titulo ?? (c.tipo === "DOMINICAL" ? "Culto Dominical" : "Culto"),
        subtitulo: c.observacoes,
        data: c.data,
        horario: c.horario,
      });
    }
  }

  // Eventos do calendário a partir de hoje (range de índice por data)
  const eventosCalendario = await ctx.db
    .query("calendarioEventos")
    .withIndex("by_data", (q) => q.gte("data", hoje))
    .collect();
  for (const e of eventosCalendario) {
    const tipo: TipoAgenda = e.tipo ?? "evento";
    if (tipoFiltro && tipoFiltro !== tipo) continue;
    eventos.push({
      id: e._id,
      tipo,
      titulo: e.titulo,
      subtitulo: e.descricao,
      data: e.data,
    });
  }

  eventos.sort((a, b) => a.data.localeCompare(b.data));
  return eventos;
}

// Próximos N eventos (default 4) — usado na home.
export const proximos = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 4 }) => {
    const agenda = await coletarAgenda(ctx);
    return agenda.slice(0, Math.max(0, limit));
  },
});

// Agenda completa futura, com filtro opcional por tipo — usado em /agenda.
export const list = query({
  args: {
    tipo: v.optional(
      v.union(
        v.literal("culto"),
        v.literal("pg"),
        v.literal("evento"),
        v.literal("reuniao"),
      ),
    ),
  },
  handler: async (ctx, { tipo }) => {
    return await coletarAgenda(ctx, tipo);
  },
});
