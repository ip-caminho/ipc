"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateObjectKey, generatePresignedUploadUrl, deleteFromB2 } from "./helpers";
import { generatePresignedReadUrl, generatePresignedReadUrls } from "./signing";

export const getUploadUrl = action({
  args: {
    folder: v.string(),
    entityId: v.string(),
    mimeType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // Login + permissao compativel com a pasta (ver files/authz.ts). O bucket
    // de destino sai da propria pasta, dentro do helper (ver files/urls.ts).
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    await ctx.runQuery(internal.files.authz.checkUploadAccess, { folder: args.folder });
    const ext = args.fileName.split(".").pop() || "bin";
    const key = generateObjectKey(args.folder, args.entityId, ext);
    return await generatePresignedUploadUrl(key, args.mimeType);
  },
});

export const getReadUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    const permitidas: boolean[] = await ctx.runQuery(internal.files.authz.checkReadAccess, {
      urls: [args.url],
    });
    if (!permitidas[0]) return null;
    return await generatePresignedReadUrl(args.url);
  },
});

// Assina a tela inteira de uma vez (listas de avatar) em vez de uma action por
// imagem. Arquivo sem permissao volta como null, sem derrubar o resto do lote.
export const getReadUrls = action({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, args): Promise<(string | null)[]> => {
    if (args.urls.length === 0) return [];
    if (args.urls.length > 200) throw new Error("Muitas URLs por chamada (max 200)");
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    const permitidas: boolean[] = await ctx.runQuery(internal.files.authz.checkReadAccess, {
      urls: args.urls,
    });
    const assinadas = await generatePresignedReadUrls(
      args.urls.map((url, i) => (permitidas[i] ? url : null)),
    );
    return assinadas;
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

// Upload PUBLICO de comprovante de pagamento (sem login) — protegido pelo token
// da inscricao (link individual) e restrito a imagem/PDF na pasta de
// comprovantes. Usado pela pagina /retiro/comprovante (membro ou visitante).
export const getPublicComprovanteUploadUrl = action({
  args: {
    token: v.string(),
    mimeType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    const inscricaoId = await ctx.runQuery(
      internal.public.retiro.validarComprovanteToken,
      { token: args.token },
    );
    if (!inscricaoId) {
      throw new Error("Link inválido ou expirado");
    }
    const ok = args.mimeType.startsWith("image/") || args.mimeType === "application/pdf";
    if (!ok) {
      throw new Error("Envie uma imagem ou PDF do comprovante");
    }
    const ext = args.fileName.split(".").pop() || "bin";
    const key = generateObjectKey("retiro-comprovantes", String(inscricaoId), ext);
    return await generatePresignedUploadUrl(key, args.mimeType);
  },
});
