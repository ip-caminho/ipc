"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { DeepgramClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { fetchB2File } from "../files/signing";

const SERMON_ANALYSIS_PROMPT = `Você é um analista teológico especializado em sermões reformados/presbiterianos. Analise a transcrição do sermão abaixo e retorne um JSON estruturado com os seguintes campos:

1. **tituloSugerido**: string com um título conciso e descritivo para a gravação (máximo 80 caracteres). Deve funcionar como título de um podcast.
2. **pregadorIdentificado**: string com o nome do pregador/ministrante, se for possível identificá-lo na transcrição (ex: se alguém o apresenta ou ele se identifica). Retorne null se não for possível identificar.
3. **temaCentral**: objeto com "titulo" (tema central do sermão em até 10 palavras) e "passagemBiblica" (texto bíblico base, ex: "João 3:16-18")
4. **pontosChave**: array com 3-5 pontos principais do sermão (frases curtas e objetivas)
5. **aplicacaoPratica**: array com 2-4 aplicações práticas para a vida do ouvinte
6. **momentoInteracao**: string com um momento marcante de interação com a congregação, ou null se não houver
7. **fraseChave**: a frase mais impactante do sermão (citação direta)
8. **resumo**: string com um resumo do sermão em 2-4 parágrafos, descrevendo o conteúdo abordado de forma clara e acessível.
9. **descricao**: descrição curta do sermão em no máximo 2 frases. Objetiva, sem emojis.
10. **frasesRedesSociais**: array com exatamente 14 frases marcantes do sermão para posts em redes sociais. Cada frase deve ser impactante, entre 100-280 caracteres, e funcionar isoladamente como post. Sem emojis.
11. **descricoesInstagram**: array com exatamente 14 descrições para posts do Instagram. Cada descrição deve contextualizar a frase correspondente (mesmo índice de frasesRedesSociais), ter 2-4 linhas, incluir 3-5 hashtags relevantes e um call-to-action. Sem emojis.
12. **tags**: array com 3-8 tags relevantes para categorização (ex: "graça", "salvação", "fé", "evangelho"). Palavras simples, sem hashtag.

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown, sem code blocks, sem texto antes ou depois
- Mantenha o tom teológico reformado/presbiteriano
- NÃO use emojis em nenhum campo
- As frases para redes sociais devem ser extraídas ou adaptadas diretamente do sermão
- As descrições do Instagram devem complementar as frases, não repeti-las

TRANSCRIÇÃO:
`;

// Lazy-load internal to avoid TS2589 "type instantiation excessively deep"
function getUpdateRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.ai.updateIaStatus;
}

export const processSermon = internalAction({
  args: {
    gravacaoId: v.id("gravacoes"),
    audioUrl: v.string(),
    membroId: v.id("membros"),
  },
  handler: async (ctx, { gravacaoId, audioUrl, membroId }) => {
    const updateIaStatus = getUpdateRef();

    try {
      // === Step 1: Transcription with Deepgram ===
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "TRANSCREVENDO",
      });

      // Download audio from B2 server-side, then send buffer to Deepgram
      const audioBuffer = await fetchB2File(audioUrl);
      if (!audioBuffer) {
        throw new Error("Nao foi possivel baixar o audio do B2");
      }

      const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! });
      const result = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
        model: "nova-2",
        language: "pt-BR",
        smart_format: true,
        punctuate: true,
        paragraphs: true,
      });

      const channels = (result as any)?.results?.channels;
      const firstAlt = channels?.[0]?.alternatives?.[0];
      const transcription =
        firstAlt?.paragraphs?.transcript ||
        firstAlt?.transcript ||
        "";

      if (!transcription) {
        throw new Error("Transcricao vazia — verifique o audio");
      }

      // Save transcription immediately (even if LLM fails later)
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "ANALISANDO",
        iaTranscricao: transcription,
      });

      // === Step 2: Analysis with Claude ===
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: SERMON_ANALYSIS_PROMPT + transcription,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      // Parse JSON response — handle possible markdown code blocks
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const iaResultado = JSON.parse(cleanJson);

      if (!iaResultado.temaCentral || !iaResultado.frasesRedesSociais) {
        throw new Error("Resultado da IA incompleto — campos obrigatorios ausentes");
      }

      // === Step 3: Save IA results + auto-fill gravação fields ===
      const autoFill: Record<string, unknown> = {};

      if (iaResultado.tituloSugerido) {
        autoFill.titulo = iaResultado.tituloSugerido;
      }
      if (iaResultado.pregadorIdentificado) {
        autoFill.pregadorNome = iaResultado.pregadorIdentificado;
      }
      if (iaResultado.temaCentral?.passagemBiblica) {
        autoFill.textoBase = iaResultado.temaCentral.passagemBiblica;
      }
      if (iaResultado.resumo) {
        autoFill.resumo = iaResultado.resumo;
      }
      if (iaResultado.descricao) {
        autoFill.descricao = iaResultado.descricao;
      }
      if (iaResultado.tags && Array.isArray(iaResultado.tags)) {
        autoFill.tags = iaResultado.tags;
      }

      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "CONCLUIDO",
        iaResultado,
        iaProcessadoEm: Date.now(),
        iaProcessadoPor: membroId,
        ...autoFill,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "ERRO",
        iaErro: errorMsg,
      });
    }
  },
});
