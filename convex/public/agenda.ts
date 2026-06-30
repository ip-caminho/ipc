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

// Culto fixo da igreja: todo domingo às 10h. Quantos domingos futuros gerar
// (rola pra frente a cada consulta — "para sempre", sem registros no banco).
const CULTO_HORARIO = "10h";
const DOMINGOS_FUTUROS = 12;

// Gera as datas (YYYY-MM-DD) dos próximos N domingos a partir de `hoje`
// (inclusive, se hoje for domingo). Cálculo em UTC = aritmética de calendário
// pura sobre a string de data, sem conversão de fuso.
function proximosDomingos(hoje: string, n: number): string[] {
  const base = new Date(`${hoje}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return [];
  const ateDomingo = (7 - base.getUTCDay()) % 7; // 0 = hoje é domingo
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + ateDomingo);
  const datas: string[] = [];
  for (let i = 0; i < n; i++) {
    datas.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return datas;
}

async function coletarAgenda(ctx: QueryCtx, tipoFiltro?: TipoAgenda): Promise<EventoPublico[]> {
  const hoje = getSaoPauloDateString();
  const eventos: EventoPublico[] = [];

  // Cultos PUBLICADOS a partir de hoje (range de índice composto — sem ler passado)
  if (!tipoFiltro || tipoFiltro === "culto") {
    const cultos = await ctx.db
      .query("cultos")
      .withIndex("by_status_data", (q) => q.eq("status", "PUBLICADO").gte("data", hoje))
      .collect();
    const datasReais = new Set<string>();
    for (const c of cultos) {
      datasReais.add(c.data);
      eventos.push({
        id: c._id,
        tipo: "culto",
        titulo: c.titulo ?? (c.tipo === "DOMINICAL" ? "Culto Dominical" : "Culto"),
        subtitulo: c.observacoes,
        data: c.data,
        horario: c.horario,
      });
    }
    // Culto recorrente de domingo (10h). Gerado automaticamente; um registro
    // real publicado naquele domingo tem prioridade (não duplica).
    for (const data of proximosDomingos(hoje, DOMINGOS_FUTUROS)) {
      if (datasReais.has(data)) continue;
      eventos.push({
        id: `culto-${data}`,
        tipo: "culto",
        titulo: "Culto Dominical",
        data,
        horario: CULTO_HORARIO,
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
