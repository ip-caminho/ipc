/**
 * Pure self-service helper functions extracted for testability.
 * Used by selfService.ts mutations — no Convex runtime dependency.
 */

export const SELF_SERVICE_FIELDS = new Set([
  "apelido",
  "telefone",
  "email",
  "endereco",
  "profissao",
  "formacao",
  "foto",
]);

/**
 * Filter an update payload to only contain allowed self-service fields.
 * Returns null if no valid fields remain.
 */
export function filterSelfServiceFields(
  data: Record<string, unknown>
): Record<string, unknown> | null {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SELF_SERVICE_FIELDS.has(key)) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
}
