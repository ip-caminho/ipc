import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
}

async function resolveNomeCriador(ctx: any, criadoPor: any): Promise<string> {
  if (!criadoPor) return "";
  const membro = await ctx.db.get(criadoPor);
  if (!membro) return "";
  const entidade = await ctx.db.get(membro.entidadeId);
  return entidade?.nomeCompleto?.split(" ")[0] || "";
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const avisos = await ctx.db
      .query("avisos")
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      avisos.map(async (a) => ({
        ...a,
        criadoPorNome: await resolveNomeCriador(ctx, a.criadoPor),
      }))
    );

    return enriched.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  },
});

// Avisos validos para uma data especifica
export const listByData = query({
  args: { data: v.string() },
  handler: async (ctx, { data }) => {
    await requireAuth(ctx);
    const avisos = await ctx.db
      .query("avisos")
      .collect();

    return avisos.filter((a) => {
      const fim = a.dataFim || a.dataInicio;
      return a.dataInicio <= data && fim >= data;
    });
  },
});
