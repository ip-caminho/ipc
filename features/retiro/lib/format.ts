// Formatacao monetaria do modulo (valores armazenados em CENTAVOS).

export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "1.234,56" | "1234.56" | "1234" -> centavos (int). NaN -> 0. */
export function parseReais(s: string): number {
  const limpo = s.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function dataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Quartos = { individual: number; duplo: number; triplo: number; quadruplo: number };

const SIGLA_QUARTO: Record<keyof Quartos, string> = {
  individual: "I",
  duplo: "D",
  triplo: "T",
  quadruplo: "Q",
};

export const LABEL_QUARTO: Record<keyof Quartos, string> = {
  individual: "Individual",
  duplo: "Duplo",
  triplo: "Triplo",
  quadruplo: "Quádruplo",
};

export const TIPOS_QUARTO = ["individual", "duplo", "triplo", "quadruplo"] as const;

/** "1I · 2T" — só os tipos com quantidade > 0 (— se nenhum). */
export function resumoQuartos(q: Quartos): string {
  return (
    TIPOS_QUARTO.filter((t) => q[t] > 0)
      .map((t) => `${q[t]}${SIGLA_QUARTO[t]}`)
      .join(" · ") || "—"
  );
}
