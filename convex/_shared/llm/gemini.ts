import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LlmProvider } from "./types";

const MODEL = "gemini-2.5-flash";

export function createGeminiProvider(): LlmProvider {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

  return {
    async complete({ prompt, maxTokens }) {
      const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}
