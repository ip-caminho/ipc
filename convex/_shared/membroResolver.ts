// Memoiza a resolução membro→entidade por execução de query.
//
// Numa listagem, o mesmo membro costuma aparecer em vários itens (autor de
// vários pedidos, intercessor recorrente, etc.). Sem cache, cada ocorrência
// relê o doc do membro E o da entidade — bandwidth pago N vezes pelo mesmo
// par. O cache é keyed pelo objeto `ctx` (estável dentro de uma execução de
// query e coletado depois), então a memoização é transparente: não muda a
// assinatura das funções nem os call-sites.

export type MembroResumo = {
  _id: string;
  nome: string;
  foto: string | null;
} | null;

const cacheByCtx = new WeakMap<object, Map<string, MembroResumo>>();

function getCache(ctx: any): Map<string, MembroResumo> {
  let cache = cacheByCtx.get(ctx);
  if (!cache) {
    cache = new Map();
    cacheByCtx.set(ctx, cache);
  }
  return cache;
}

export async function resolveMembroResumo(
  ctx: any,
  membroId: any,
): Promise<MembroResumo> {
  if (!membroId) return null;
  const cache = getCache(ctx);
  const key = String(membroId);
  if (cache.has(key)) return cache.get(key)!;

  const membro = await ctx.db.get(membroId);
  const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
  const resumo: MembroResumo =
    membro && entidade
      ? {
          _id: String(membro._id),
          nome: entidade.nomeCompleto || "",
          foto: entidade.foto ?? null,
        }
      : null;

  cache.set(key, resumo);
  return resumo;
}

export async function resolveMembroNome(
  ctx: any,
  membroId: any,
): Promise<string> {
  return (await resolveMembroResumo(ctx, membroId))?.nome ?? "";
}
