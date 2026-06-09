/**
 * Helpers de data/fuso. O servidor Convex roda em UTC; para calculos de
 * "hoje" (aniversarios, agenda do dia) precisamos da data no fuso da igreja
 * (America/Sao_Paulo) — senao, a partir das 21h locais o servidor ja conta
 * como o dia seguinte (UTC) e some/avanca itens 3h antes.
 */

/** Ano/mes/dia da data informada (ou agora) no fuso America/Sao_Paulo. */
export function getSaoPauloDate(now: Date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return { year: get("year"), month: get("month"), day: get("day") };
}
