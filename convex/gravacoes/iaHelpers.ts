/**
 * Extrai as frases pequenas do resultado bruto da IA (fraseChave +
 * frasesRedesSociais) para denormalizar em gravacoes.iaFrases — assim o
 * listFrases/carrossel nao precisa ler o iaResultado pesado.
 */
export function extrairFrases(resultado: unknown): string[] | undefined {
  if (!resultado || typeof resultado !== "object") return undefined;
  const r = resultado as { fraseChave?: unknown; frasesRedesSociais?: unknown };
  const frases: string[] = [];

  if (typeof r.fraseChave === "string" && r.fraseChave.trim()) {
    frases.push(r.fraseChave);
  }
  if (Array.isArray(r.frasesRedesSociais)) {
    for (const f of r.frasesRedesSociais) {
      if (typeof f === "string" && f.trim()) frases.push(f);
    }
  }

  return frases.length > 0 ? frases : undefined;
}
