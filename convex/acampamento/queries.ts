import { query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { saldoFundo, saldoInscricao, totalRecebido, valorFinal } from "./calculoHelpers";

// Queries admin do acampamento (inscricoes:manage). Volume baixo (1 evento/ano,
// dezenas de inscricoes) — collect por indice e agregacao em memoria.

export const listar = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "inscricoes:manage");
    const docs = await ctx.db.query("acampamentos").collect();
    return docs
      .sort((a, b) => b.criadoEm - a.criadoEm)
      .map((a) => ({
        _id: a._id,
        slug: a.slug,
        titulo: a.titulo,
        ativa: a.ativa,
        dataInicio: a.dataInicio,
        dataFim: a.dataFim,
        estoqueDuplos: a.estoqueDuplos,
        estoqueTriplos: a.estoqueTriplos,
        duplosReservados: a.duplosReservados,
        triplosReservados: a.triplosReservados,
      }));
  },
});

export const getById = query({
  args: { id: v.id("acampamentos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    return await ctx.db.get(id);
  },
});

// Painel financeiro consolidado: totais + fundo + situacao por inscricao.
export const resumoFinanceiro = query({
  args: { id: v.id("acampamentos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const acamp = await ctx.db.get(id);
    if (!acamp) return null;

    const inscricoes = await ctx.db
      .query("inscricoesAcampamento")
      .withIndex("by_acampamento", (q) => q.eq("acampamentoId", id))
      .collect();

    const consideradas = inscricoes.filter((i) => i.status !== "CANCELADA");
    let totalTabela = 0,
      totalDescontos = 0,
      totalFinal = 0,
      totalRecebidoGeral = 0;
    for (const i of consideradas) {
      totalTabela += i.valorTabela;
      const final = valorFinal(i.valorTabela, i.ajustes);
      totalDescontos += i.valorTabela - final;
      totalFinal += final;
      totalRecebidoGeral += totalRecebido(i.recebimentos);
    }
    const fundo = saldoFundo(
      acamp.aportesFundo,
      consideradas.flatMap((i) => i.ajustes),
    );

    return {
      totalTabela,
      totalDescontos,
      totalFinal,
      totalRecebido: totalRecebidoGeral,
      aReceber: consideradas.reduce(
        (s, i) => s + Math.max(0, saldoInscricao(i.valorTabela, i.ajustes, i.recebimentos)),
        0,
      ),
      fundo,
      inscricoes: {
        ativas: inscricoes.filter((i) => i.status === "ATIVA").length,
        listaEspera: inscricoes.filter((i) => i.status === "LISTA_ESPERA").length,
        canceladas: inscricoes.filter((i) => i.status === "CANCELADA").length,
      },
    };
  },
});
