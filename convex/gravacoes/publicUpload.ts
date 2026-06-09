import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getPublicUrl } from "../files/helpers";

const TIPO = v.union(
  v.literal("SERMAO"),
  v.literal("ESTUDO_BIBLICO"),
  v.literal("PALESTRA"),
  v.literal("OUTRO"),
);

const TIPO_LABEL: Record<string, string> = {
  SERMAO: "Sermao",
  ESTUDO_BIBLICO: "Estudo Biblico",
  PALESTRA: "Palestra",
  OUTRO: "Gravacao",
};

function tokenOk(token: string): boolean {
  const expected = process.env.AUDIO_UPLOAD_TOKEN;
  return !!expected && token === expected;
}

// dd/MM/yyyy no horario de Sao Paulo (UTC-3, sem horario de verao desde 2019).
// Offset manual evita depender de Intl com timeZone no runtime do Convex.
function hojeBR(): { iso: string; br: string } {
  const sp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const y = sp.getUTCFullYear();
  const m = String(sp.getUTCMonth() + 1).padStart(2, "0");
  const d = String(sp.getUTCDate()).padStart(2, "0");
  return { iso: `${y}-${m}-${d}`, br: `${d}/${m}/${y}` };
}

// Valida o token sem expor nada — usado pela pagina /subir-audio para decidir se
// mostra o formulario ou um aviso de link invalido.
export const checkToken = query({
  args: { token: v.string() },
  handler: async (_ctx, args) => {
    return { valid: tokenOk(args.token) };
  },
});

// Cria a gravacao como RASCUNHO, sem disparar IA. A compressao ja aconteceu no
// browser (useAudioCompressor) antes do upload. Admin revisa, ajusta e publica.
export const createRascunho = mutation({
  args: {
    token: v.string(),
    tipo: TIPO,
    audioUrl: v.string(),
    nome: v.optional(v.string()),
    observacao: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!tokenOk(args.token)) {
      throw new Error("Link invalido ou expirado");
    }
    // So aceita URL gerada pelo nosso B2 na pasta de audio — evita injecao de URL
    const prefixo = getPublicUrl("gravacoes-audio/");
    if (!args.audioUrl.startsWith(prefixo)) {
      throw new Error("Audio invalido");
    }

    const { iso, br } = hojeBR();
    const enviadoPor = args.nome?.trim();
    const obs = args.observacao?.trim();
    const descricaoPartes = [
      enviadoPor ? `Enviado por ${enviadoPor}` : "Enviado pelo formulario publico",
      obs || null,
    ].filter(Boolean);

    const id = await ctx.db.insert("gravacoes", {
      titulo: `${TIPO_LABEL[args.tipo]} — ${br}`,
      tipo: args.tipo,
      data: iso,
      audioUrl: args.audioUrl,
      status: "RASCUNHO",
      descricao: descricaoPartes.join(". "),
    });

    return { id };
  },
});
