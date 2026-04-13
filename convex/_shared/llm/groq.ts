import Groq from "groq-sdk";
import type { LlmProvider } from "./types";

const MODEL = "llama-3.3-70b-versatile";

export function createGroqProvider(): LlmProvider {
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
  });

  return {
    async complete({ prompt, maxTokens = 8000 }) {
      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0]?.message?.content ?? "";
    },
  };
}
