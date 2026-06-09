"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateObjectKey, generatePresignedUploadUrl, deleteFromB2 } from "./helpers";
import { generatePresignedReadUrl } from "./signing";

export const getUploadUrl = action({
  args: {
    folder: v.string(),
    entityId: v.string(),
    mimeType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // Login + permissao compativel com a pasta (ver files/authz.ts)
    await ctx.runQuery(internal.files.authz.checkUploadAccess, { folder: args.folder });
    const ext = args.fileName.split(".").pop() || "bin";
    const key = generateObjectKey(args.folder, args.entityId, ext);
    const result = await generatePresignedUploadUrl(key, args.mimeType);
    console.log("[getUploadUrl] key:", key, "uploadUrl:", result.uploadUrl.substring(0, 100) + "...");
    return result;
  },
});

export const getReadUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await generatePresignedReadUrl(args.url);
  },
});

// Somente backend (scheduler em gravacoes/mutations) — nao expor ao cliente
export const deleteFile = internalAction({
  args: { url: v.string() },
  handler: async (_ctx, args) => {
    return await deleteFromB2(args.url);
  },
});

// Upload PUBLICO de audio (sem login) — protegido por token no link e restrito a
// pasta de audio + mimetype audio/*. Usado pela pagina /subir-audio (voluntarios
// de multimidia). Ver convex/gravacoes/publicUpload.ts para a criacao do rascunho.
export const getPublicAudioUploadUrl = action({
  args: {
    token: v.string(),
    mimeType: v.string(),
    fileName: v.string(),
  },
  handler: async (_ctx, args) => {
    const expected = process.env.AUDIO_UPLOAD_TOKEN;
    if (!expected || args.token !== expected) {
      throw new Error("Link invalido ou expirado");
    }
    if (!args.mimeType.startsWith("audio/")) {
      throw new Error("Apenas arquivos de audio sao aceitos");
    }
    const ext = args.fileName.split(".").pop() || "mp3";
    const key = generateObjectKey("gravacoes-audio", "publico", ext);
    return await generatePresignedUploadUrl(key, args.mimeType);
  },
});
