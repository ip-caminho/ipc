// Papel na escala normalizado para o enum dos voluntarios
// (PROFESSOR/AUXILIAR/APOIO). Rows antigas gravaram "Professor"/"Auxiliar" —
// esta funcao tolera ambos. Espelha features/educacional/lib/constants.ts
// (o bundle do Convex nao importa de features/).
export function normalizePapel(
  papel?: string | null
): "PROFESSOR" | "AUXILIAR" | "APOIO" {
  const p = (papel ?? "").toUpperCase();
  if (p.startsWith("PROF")) return "PROFESSOR";
  if (p.startsWith("AUX")) return "AUXILIAR";
  return "APOIO";
}
