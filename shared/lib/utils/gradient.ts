/**
 * Gera um gradient CSS deterministico baseado em uma seed qualquer.
 * Mesma seed = mesmo gradient sempre.
 */

const PALETTE: Array<{ from: string; to: string }> = [
  { from: "#1e3a8a", to: "#3b82f6" }, // azul
  { from: "#0f766e", to: "#14b8a6" }, // teal
  { from: "#7c2d12", to: "#f97316" }, // laranja terra
  { from: "#581c87", to: "#a855f7" }, // violeta
  { from: "#134e4a", to: "#0ea5e9" }, // cyan profundo
  { from: "#78350f", to: "#eab308" }, // âmbar
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getDeterministicGradient(seed?: string | null): string {
  const key = (seed || "default").trim().toLowerCase();
  const { from, to } = PALETTE[hash(key) % PALETTE.length];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}
