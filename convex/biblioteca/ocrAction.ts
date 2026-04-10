"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `Voce e um assistente especializado em catalogar livros. Analise a imagem da capa do livro e extraia os seguintes dados:

1. titulo (string)
2. autores (array de strings)
3. editora (string ou null)
4. isbn (string ou null) — se visivel
5. ano (number ou null)
6. idioma (string)

Retorne APENAS um JSON valido com esses campos. Sem markdown, sem code blocks, sem comentarios.`;

export const extractBookData = action({
  args: {
    imageUrl: v.string(),
  },
  handler: async (_, { imageUrl }): Promise<{
    titulo: string;
    autores: string[];
    editora?: string | null;
    isbn?: string | null;
    ano?: number | null;
    idioma?: string;
  }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY nao configurada");

    // Baixar imagem
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Erro ao baixar imagem");
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = imgRes.headers.get("content-type") || "image/jpeg";

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error("Erro ao parsear resposta da IA");
    }
  },
});
