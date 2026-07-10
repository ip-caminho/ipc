/**
 * Extrai a mensagem legível de um erro do Convex.
 *
 * Em produção o Convex redige mensagens de `throw new Error(...)` para
 * "Server Error". Só `ConvexError` preserva a mensagem no cliente (via `.data`).
 * Este helper prioriza `.data` (ConvexError) e cai para `.message` (Error) e,
 * por fim, para o fallback informado.
 */
export function getConvexErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "string" && data.trim()) return data;
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
    ) {
      return (data as { message: string }).message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
