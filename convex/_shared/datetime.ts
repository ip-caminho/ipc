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

/** Data de hoje no formato "YYYY-MM-DD" no fuso America/Sao_Paulo. */
export function getSaoPauloDateString(now: Date = new Date()): string {
  const { year, month, day } = getSaoPauloDate(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Hora do dia (0-23) no fuso America/Sao_Paulo. */
export function getSaoPauloHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
}

/** Dia da semana no fuso America/Sao_Paulo (0=Domingo .. 6=Sabado). */
export function getSaoPauloWeekday(now: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  })
    .formatToParts(now)
    .find((p) => p.type === "weekday")?.value;
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd ?? "Sun"] ?? 0;
}
