import { query } from "../_generated/server";
import { getSaoPauloDateString } from "../_shared/datetime";

/**
 * Dia da semana ("Sun", "Mon", ...) no fuso America/Sao_Paulo.
 * Evita ambiguidades do servidor Convex (UTC) vs culto local.
 */
function getSaoPauloWeekday(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  return parts.find((p) => p.type === "weekday")?.value ?? "";
}

/** Janela de "domingo": domingo inteiro (horário Brasil). */
function isDomingoWindowBrasil(now: Date = new Date()): boolean {
  return getSaoPauloWeekday(now) === "Sun";
}

/**
 * Retorna estado do boletim: se está "ao vivo" agora e qual o próximo culto.
 * Cálculo de isLive feito no servidor em America/Sao_Paulo.
 */
export const getLiveStatus = query({
  args: {},
  handler: async (ctx) => {
    const isLive = isDomingoWindowBrasil();

    const today = getSaoPauloDateString();
    // Proximo culto publicado a partir de hoje — direto pelo indice composto,
    // sem varrer todo o historico de cultos.
    const proximo = await ctx.db
      .query("cultos")
      .withIndex("by_status_data", (q: any) =>
        q.eq("status", "PUBLICADO").gte("data", today)
      )
      .order("asc")
      .first();

    return {
      isLive,
      proximoCulto: proximo
        ? {
            cultoId: proximo._id,
            data: proximo.data,
            horario: proximo.horario ?? null,
            titulo: proximo.titulo ?? null,
            tipo: proximo.tipo,
          }
        : null,
    };
  },
});
