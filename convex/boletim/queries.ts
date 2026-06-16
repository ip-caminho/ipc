import { query } from "../_generated/server";
import { getSaoPauloDateString } from "../_shared/datetime";

/**
 * Extrai {weekday, hour} do Date atual no fuso America/Sao_Paulo.
 * Evita ambiguidades do servidor Convex (UTC) vs culto local.
 */
function getSaoPauloParts(now: Date = new Date()): { weekday: string; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  return { weekday, hour };
}

/** Janela de "domingo": domingo inteiro OU sábado a partir das 18h (horário Brasil). */
function isDomingoWindowBrasil(now: Date = new Date()): boolean {
  const { weekday, hour } = getSaoPauloParts(now);
  if (weekday === "Sun") return true;
  if (weekday === "Sat" && hour >= 18) return true;
  return false;
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
