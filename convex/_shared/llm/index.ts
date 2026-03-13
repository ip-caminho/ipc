import type { LlmProvider } from "./types";

export type { LlmProvider } from "./types";

/**
 * Factory — escolhe o provider baseado nas env vars disponíveis.
 * Prioridade: Gemini (mais barato) > Anthropic.
 */
export function createLlmProvider(): LlmProvider {
  if (process.env.GOOGLE_API_KEY) {
    const { createGeminiProvider } = require("./gemini");
    return createGeminiProvider();
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const { createAnthropicProvider } = require("./anthropic");
    return createAnthropicProvider();
  }

  throw new Error(
    "Nenhum provider LLM configurado. Configure GOOGLE_API_KEY ou ANTHROPIC_API_KEY nas env vars do Convex."
  );
}
