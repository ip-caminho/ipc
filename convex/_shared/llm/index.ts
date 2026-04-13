import type { LlmProvider } from "./types";

export type { LlmProvider } from "./types";

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return (
      msg.includes("503") ||
      msg.includes("429") ||
      msg.includes("Service Unavailable") ||
      msg.includes("overloaded") ||
      msg.includes("high demand")
    );
  }
  return false;
}

/**
 * Factory — escolhe o provider baseado nas env vars disponíveis.
 * Prioridade: Gemini (mais barato) > Anthropic.
 * Se ambos estiverem configurados, tenta Gemini com fallback para Anthropic em erros transientes.
 */
export function createLlmProvider(): LlmProvider {
  const hasGemini = !!process.env.GOOGLE_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (!hasGemini && !hasAnthropic) {
    throw new Error(
      "Nenhum provider LLM configurado. Configure GOOGLE_API_KEY ou ANTHROPIC_API_KEY nas env vars do Convex."
    );
  }

  const primary = hasGemini
    ? require("./gemini").createGeminiProvider()
    : require("./anthropic").createAnthropicProvider();

  const fallback =
    hasGemini && hasAnthropic
      ? require("./anthropic").createAnthropicProvider()
      : null;

  if (!fallback) return primary;

  return {
    async complete(params) {
      try {
        return await primary.complete(params);
      } catch (error) {
        if (isRetryableError(error)) {
          console.warn(
            `[LLM] Provider primário falhou com erro transiente, usando fallback. Erro: ${error}`
          );
          return fallback.complete(params);
        }
        throw error;
      }
    },
  };
}
