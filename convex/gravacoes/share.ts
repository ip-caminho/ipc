/**
 * Compartilhamento publico de uma gravacao individual (/g/<codigo>).
 * Apenas quem tem `gravacoes:share` gera/revoga (nenhum papel concede por
 * padrao — admin via wildcard, demais so se adicionados na matriz). So
 * gravacoes PUBLICADO podem ser compartilhadas.
 */
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission, checkPermission } from "../_shared/requirePermission";

function gerarToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Gera (ou retorna) o link publico de uma gravacao publicada. */
export const gerarShareLink = mutation({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    await requirePermission(ctx, "gravacoes:share");

    const g = await ctx.db.get(gravacaoId);
    if (!g) throw new Error("Gravacao nao encontrada");
    if (g.status !== "PUBLICADO") {
      throw new Error("So gravacoes publicadas podem ser compartilhadas");
    }

    if (g.shareToken) return { token: g.shareToken };

    const token = gerarToken();
    await ctx.db.patch(gravacaoId, { shareToken: token });
    return { token };
  },
});

/** Revoga o link publico de uma gravacao. */
export const revogarShareLink = mutation({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    await requirePermission(ctx, "gravacoes:share");
    const g = await ctx.db.get(gravacaoId);
    if (!g) throw new Error("Gravacao nao encontrada");
    await ctx.db.patch(gravacaoId, { shareToken: undefined });
    return { ok: true };
  },
});

/** Token atual de compartilhamento de uma gravacao (para quem tem share). */
export const getShareInfo = query({
  args: { gravacaoId: v.id("gravacoes") },
  handler: async (ctx, { gravacaoId }) => {
    if (!(await checkPermission(ctx, "gravacoes:share"))) return null;
    const g = await ctx.db.get(gravacaoId);
    if (!g) return null;
    return { token: g.shareToken ?? null, podeCompartilhar: g.status === "PUBLICADO" };
  },
});

/** Pagina publica: uma gravacao por shareToken (sem login). */
export const getCompartilhada = query({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    if (!codigo) return { valido: false as const };

    const g = await ctx.db
      .query("gravacoes")
      .withIndex("by_share_token", (q) => q.eq("shareToken", codigo))
      .first();

    // Revogada (sem token) ou nao publicada → indisponivel
    if (!g || g.status !== "PUBLICADO") return { valido: false as const };

    let pregadorNome = g.pregadorNome || "";
    if (!pregadorNome && g.pregadorId) {
      const membro = await ctx.db.get(g.pregadorId);
      if (membro) {
        const entidade = await ctx.db.get(membro.entidadeId);
        pregadorNome = entidade?.nomeCompleto || "";
      }
    }

    return {
      valido: true as const,
      gravacao: {
        _id: g._id,
        titulo: g.titulo,
        tipo: g.tipo,
        data: g.data,
        pregadorNome,
        descricao: g.descricao ?? null,
        resumo: g.resumo ?? null,
        audioUrl: g.audioUrl ?? null,
        inicioConteudo: g.inicioConteudo,
        fimConteudo: g.fimConteudo,
        inicioSermao: g.inicioSermao,
        fimSermao: g.fimSermao,
      },
    };
  },
});
