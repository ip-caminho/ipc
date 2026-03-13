import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types";

const MODEL = "claude-sonnet-4-20250514";

export function createAnthropicProvider(): LlmProvider {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  return {
    async complete({ prompt, maxTokens = 8000 }) {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      return message.content[0].type === "text" ? message.content[0].text : "";
    },
  };
}
