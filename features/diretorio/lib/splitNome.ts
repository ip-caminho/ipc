/**
 * Divide `nomeCompleto` em primeiro nome (ate o primeiro espaco)
 * e resto (tudo apos). Funciona com nomes compostos tipo "Joao Pedro da Silva":
 * primeiro = "Joao", resto = "Pedro da Silva".
 */
export function splitNome(completo: string): {
  primeiro: string;
  resto: string;
} {
  const trimmed = completo.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { primeiro: trimmed, resto: "" };
  return {
    primeiro: trimmed.slice(0, spaceIdx),
    resto: trimmed.slice(spaceIdx + 1).trim(),
  };
}

/**
 * Retorna 1-2 iniciais para avatar fallback.
 * "Joao" → "J"; "Joao Pedro da Silva" → "JS".
 */
export function getIniciais(completo: string): string {
  const parts = completo.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
