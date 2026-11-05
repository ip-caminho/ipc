import type { DatabaseWriter } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Deixa livroCategorias igual as categorias do livro, tocando so a diferenca. */
export async function sincronizarCategorias(
  ctx: { db: DatabaseWriter },
  livroId: Id<"livros">,
  categorias: string[]
): Promise<void> {
  const atuais = await ctx.db
    .query("livroCategorias")
    .withIndex("by_livro", (q) => q.eq("livroId", livroId))
    .collect();
  const desejadas = new Set(categorias);
  for (const atual of atuais) {
    if (!desejadas.delete(atual.categoria)) await ctx.db.delete(atual._id);
  }
  for (const categoria of desejadas) {
    await ctx.db.insert("livroCategorias", { categoria, livroId });
  }
}
