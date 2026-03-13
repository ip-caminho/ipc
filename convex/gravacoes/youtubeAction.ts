"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Innertube } from "youtubei.js";
import { createS3Client, getBucketName, getPublicUrl, generateObjectKey } from "../files/helpers";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Lazy-load to avoid TS2589 "type instantiation excessively deep"
function getUpdateRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.ai.updateIaStatus;
}

function getProcessSermonRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.gravacoes.aiAction.processSermon;
}

/**
 * Extract video ID from various YouTube URL formats.
 */
function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error("URL do YouTube invalida — nao foi possivel extrair o ID do video");
}

export const downloadYouTubeAudio = internalAction({
  args: {
    gravacaoId: v.id("gravacoes"),
    youtubeUrl: v.string(),
    membroId: v.id("membros"),
  },
  handler: async (ctx, { gravacaoId, youtubeUrl, membroId }) => {
    const updateIaStatus = getUpdateRef();
    const processSermon = getProcessSermonRef();

    try {
      // Set status to BAIXANDO
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "BAIXANDO",
      });

      const videoId = extractVideoId(youtubeUrl);

      // Create Innertube client (uses YouTube's internal API)
      const yt = await Innertube.create();

      // Get video info
      const info = await yt.getBasicInfo(videoId);
      const videoTitle = info.basic_info.title || "Video do YouTube";

      // Get audio-only stream
      const format = info.chooseFormat({ type: "audio", quality: "best" });
      const stream = await yt.download(videoId, {
        type: "audio",
        quality: "best",
      });

      // Collect stream into buffer
      const reader = stream.getReader();
      const chunks: Buffer[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
      const audioBuffer = Buffer.concat(chunks);

      if (audioBuffer.length < 1000) {
        throw new Error("Audio muito pequeno ou vazio — download pode ter falhado");
      }

      // Determine file extension from mime type
      const mimeType = format.mime_type || "audio/mp4";
      const ext = mimeType.includes("webm") ? "webm" : "m4a";
      const contentType = mimeType.split(";")[0];

      // Upload to B2
      const key = generateObjectKey("gravacoes-audio", gravacaoId, ext);
      const s3 = createS3Client();

      await s3.send(
        new PutObjectCommand({
          Bucket: getBucketName(),
          Key: key,
          Body: audioBuffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000",
        })
      );

      const audioUrl = getPublicUrl(key);

      // Update gravacao with audio URL and video title
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "PENDENTE",
        titulo: videoTitle,
        audioUrl,
      });

      // Trigger the existing IA pipeline
      await ctx.scheduler.runAfter(0, processSermon, {
        gravacaoId,
        audioUrl,
        membroId,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido ao baixar do YouTube";
      await ctx.runMutation(updateIaStatus, {
        id: gravacaoId,
        iaStatus: "ERRO",
        iaErro: errorMsg,
      });
    }
  },
});
