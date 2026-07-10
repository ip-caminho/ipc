import { query } from "../_generated/server";
import { v } from "convex/values";
import { checkPermission } from "../_shared/requirePermission";
import { getSaoPauloDateString } from "../_shared/datetime";

// Subtrai `dias` de uma data YYYY-MM-DD.
function subtrairDias(data: string, dias: number): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - dias);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function comNome(ctx: any, aviso: any, membroAtualId: string) {
  try {
    const membro = await ctx.db.get(aviso.membroId);
    const entidade = membro?.entidadeId ? await ctx.db.get(membro.entidadeId) : null;
    return {
      ...aviso,
      nomeCompleto: entidade?.nomeCompleto || "—",
      podeRemover: aviso.membroId === membroAtualId,
    };
  } catch (err) {
    console.error("comNome erro para aviso", aviso._id, ":", err);
    return {
      ...aviso,
      nomeCompleto: "—",
      podeRemover: aviso.membroId === membroAtualId,
    };
  }
}

// Ausencias vigentes ou futuras (dataFim >= hoje), com nome do membro.
// Gated por ausencias:read — retorna [] se sem permissao.
export const listProximas = query({
  args: {},
  handler: async (ctx) => {
    const auth = await checkPermission(ctx, "ausencias:read");
    if (!auth) return [];

    const hoje = getSaoPauloDateString();
    // Limita a leitura a ausencias recentes/futuras (cobre intervalos em curso).
    const cutoff = subtrairDias(hoje, 60);

    const avisos = await ctx.db
      .query("avisosAusencia")
      .withIndex("by_dataInicio", (q: any) => q.gte("dataInicio", cutoff))
      .collect();

    const vigentes = avisos
      .filter((a) => (a.dataFim || a.dataInicio) >= hoje)
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

    return Promise.all(vigentes.map((a) => comNome(ctx, a, auth.membro._id)));
  },
});

// Ausencias que tocam a janela [de, ate] — para a camada de tarja no calendario.
export const listPorPeriodo = query({
  args: { de: v.string(), ate: v.string() },
  handler: async (ctx, { de, ate }) => {
    const auth = await checkPermission(ctx, "ausencias:read");
    if (!auth) return [];

    const cutoff = subtrairDias(de, 60);
    const avisos = await ctx.db
      .query("avisosAusencia")
      .withIndex("by_dataInicio", (q: any) => q.gte("dataInicio", cutoff))
      .collect();

    // Sobreposicao de intervalos: inicio <= ate && fim >= de
    const naJanela = avisos.filter(
      (a) => a.dataInicio <= ate && (a.dataFim || a.dataInicio) >= de
    );

    return Promise.all(naJanela.map((a) => comNome(ctx, a, auth.membro._id)));
  },
});
