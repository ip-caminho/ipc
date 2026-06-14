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
      msg.includes("high demand") ||
      msg.includes("credit balance") ||
      msg.includes("rate limit")
    );
  }
  return false;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(
  provider: LlmProvider,
  params: { prompt: string; maxTokens?: number },
  maxRetries: number = 2
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await provider.complete(params);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = 1000 * 2 ** attempt; // 1s, 2s
        console.warn(
          `[LLM] Tentativa ${attempt + 1} falhou, retry em ${delay}ms. Erro: ${error}`
        );
        await sleep(delay);
        continue;
      }
      break;
    }
  }
  throw lastError;
}

/**
 * Factory — escolhe o provider baseado nas env vars disponíveis.
 * Prioridade: Gemini (gratuito) > Groq (gratuito) > Anthropic.
 * Retry com backoff no primário + fallback em cadeia para erros transientes.
 */
export function createLlmProvider(): LlmProvider {
  const providers: LlmProvider[] = [];

  // require() lazy proposital: so carrega o SDK do provider cujo env var existe
  // (evita inicializar SDKs nao usados).
  if (process.env.GOOGLE_API_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    providers.push(require("./gemini").createGeminiProvider());
  }
  if (process.env.GROQ_API_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    providers.push(require("./groq").createGroqProvider());
  }
  if (process.env.ANTHROPIC_API_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    providers.push(require("./anthropic").createAnthropicProvider());
  }

  if (providers.length === 0) {
    throw new Error(
      "Nenhum provider LLM configurado. Configure GOOGLE_API_KEY, GROQ_API_KEY ou ANTHROPIC_API_KEY nas env vars do Convex."
    );
  }

  if (providers.length === 1) return providers[0];

  return {
    async complete(params) {
      for (let i = 0; i < providers.length; i++) {
        try {
          return await withRetry(providers[i], params);
        } catch (error) {
          const isLast = i === providers.length - 1;
          if (isLast || !isRetryableError(error)) throw error;
          console.warn(
            `[LLM] Provider ${i + 1}/${providers.length} falhou, tentando próximo. Erro: ${error}`
          );
        }
      }
      throw new Error("[LLM] Todos os providers falharam");
    },
  };
}
