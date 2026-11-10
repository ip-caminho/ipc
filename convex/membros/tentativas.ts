import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const MAX_FALHAS = 5;
export const JANELA_FALHAS_MS = 60 * 60 * 1000;

export type Contador = {
  chave: string;
  tentativa: Doc<"recuperacaoTentativas"> | null;
  janelaAberta: boolean;
};

/** Evita guardar o dado em claro na tabela de tentativas. */
async function chaveDeTentativa(origem: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(origem)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Le os contadores das origens informadas, na mesma ordem.
 */
export async function lerTentativas(
  ctx: MutationCtx,
  origens: string[],
  agora: number
): Promise<{ contadores: Contador[]; bloqueado: boolean }> {
  const contadores = await Promise.all(
    origens.map(async (origem) => {
      const chave = await chaveDeTentativa(origem);
      const tentativa = await ctx.db
        .query("recuperacaoTentativas")
        .withIndex("by_chave", (q) => q.eq("chave", chave))
        .unique();
      const janelaAberta =
        tentativa !== null && agora - tentativa.janelaInicio < JANELA_FALHAS_MS;
      return { chave, tentativa, janelaAberta };
    })
  );
  const bloqueado = contadores.some(
    (c) => c.janelaAberta && c.tentativa !== null && c.tentativa.falhas >= MAX_FALHAS
  );
  return { contadores, bloqueado };
}

/** Cria, incrementa ou reinicia cada contador. */
export async function registrarFalha(
  ctx: MutationCtx,
  contadores: Contador[],
  agora: number
): Promise<void> {
  for (const { chave, tentativa, janelaAberta } of contadores) {
    if (!tentativa) {
      await ctx.db.insert("recuperacaoTentativas", {
        chave,
        falhas: 1,
        janelaInicio: agora,
      });
    } else if (janelaAberta) {
      await ctx.db.patch(tentativa._id, { falhas: tentativa.falhas + 1 });
    } else {
      await ctx.db.patch(tentativa._id, { falhas: 1, janelaInicio: agora });
    }
  }
}

/** Apaga os contadores existentes. */
export async function zerarTentativas(
  ctx: MutationCtx,
  contadores: Contador[]
): Promise<void> {
  for (const { tentativa } of contadores) {
    if (tentativa) await ctx.db.delete(tentativa._id);
  }
}
