import { query } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { consolidadoEvento, saldoInscricao, totalRecebido, valorFinal } from "./calculoHelpers";

// Queries admin do retiro (inscricoes:manage). Volume baixo (1 evento/ano,
// dezenas de inscricoes) — collect por indice e agregacao em memoria.

export const listar = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "inscricoes:manage");
    const docs = await ctx.db.query("retiros").collect();
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
  args: { id: v.id("retiros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    return await ctx.db.get(id);
  },
});

// Lista de inscricoes com resumo financeiro por linha. Shape ENXUTO: a lista
// e reativa (re-executa a cada mutation em qualquer inscricao) — detalhes
// (extras, pagamento, participantes completos) ficam no getInscricao do
// drawer. Os agregados por linha permitem ao cliente derivar o consolidado
// do evento sem uma segunda assinatura (ver resumoFinanceiro).
export const listarInscricoes = query({
  args: { retiroId: v.id("retiros") },
  handler: async (ctx, { retiroId }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const docs = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_retiro", (q) => q.eq("retiroId", retiroId))
      .collect();
    return docs
      .sort((a, b) => a.criadoEm - b.criadoEm)
      .map((i) => ({
        _id: i._id,
        responsavel: i.responsavel,
        participantesQtd: i.participantes.length,
        participantesNomes: i.participantes.map((p) => p.nome), // busca client-side
        hospedagem: i.hospedagem,
        status: i.status,
        criadoEm: i.criadoEm,
        valorTabela: i.valorTabela,
        valorFinal: valorFinal(i.valorTabela, i.ajustes),
        recebido: totalRecebido(i.recebimentos),
        saldo: saldoInscricao(i.valorTabela, i.ajustes, i.recebimentos),
        contribuicoesFundo: i.ajustes
          .filter((a) => a.tipo === "CONTRIBUICAO_FUNDO")
          .reduce((s, a) => s + a.valor, 0),
        semMatching: i.participantes.filter((p) => !p.membroId).length,
        comprovantesAConferir: i.comprovantesPendentes?.length ?? 0,
      }));
  },
});

export const getInscricao = query({
  args: { id: v.id("inscricoesRetiro") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const insc = await ctx.db.get(id);
    if (!insc) return null;
    // membroNome ja e denormalizado no matching — sem N+1 aqui. Shape sem
    // precosSnapshot/ipHash/lgpd (o drawer nao usa; menos egress por
    // re-execucao — esta query reexecuta a cada acao no drawer).
    const { precosSnapshot, ipHash, lgpdConsentimento, ...resto } = insc;
    void precosSnapshot;
    void ipHash;
    void lgpdConsentimento;
    return {
      ...resto,
      valorFinal: valorFinal(insc.valorTabela, insc.ajustes),
      recebido: totalRecebido(insc.recebimentos),
      saldo: saldoInscricao(insc.valorTabela, insc.ajustes, insc.recebimentos),
    };
  },
});

// Sugestoes de membro para um nome de participante (matching manual da
// secretaria — nunca vinculamos automatico). Usa o full-text de entidades.
export const sugerirMembros = query({
  args: { nome: v.string() },
  handler: async (ctx, { nome }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const termo = nome.trim();
    if (termo.length < 3) return [];
    const ents = await ctx.db
      .query("entidades")
      .withSearchIndex("search_entidades", (q) => q.search("nomeCompleto", termo))
      .take(5);
    const out: { membroId: string; nome: string; dataNascimento?: string }[] = [];
    for (const e of ents) {
      const m = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", e._id))
        .first();
      if (m) {
        out.push({
          membroId: m._id,
          nome: e.nomeCompleto ?? "",
          dataNascimento: e.dataNascimento,
        });
      }
    }
    return out;
  },
});

// Painel financeiro consolidado do evento. A pagina admin NAO assina esta
// query — deriva o consolidado no cliente via consolidadoEvento() sobre as
// linhas de listarInscricoes + aportes do getById (uma assinatura so).
// Mantida p/ o dialog de desconto (assinatura pontual enquanto aberto) e testes.
export const resumoFinanceiro = query({
  args: { id: v.id("retiros") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const acamp = await ctx.db.get(id);
    if (!acamp) return null;

    const inscricoes = await ctx.db
      .query("inscricoesRetiro")
      .withIndex("by_retiro", (q) => q.eq("retiroId", id))
      .collect();

    const linhas = inscricoes.map((i) => ({
      status: i.status,
      valorTabela: i.valorTabela,
      valorFinal: valorFinal(i.valorTabela, i.ajustes),
      recebido: totalRecebido(i.recebimentos),
      saldo: saldoInscricao(i.valorTabela, i.ajustes, i.recebimentos),
      contribuicoesFundo: i.ajustes
        .filter((a) => a.tipo === "CONTRIBUICAO_FUNDO")
        .reduce((s, a) => s + a.valor, 0),
    }));

    return {
      ...consolidadoEvento(linhas, acamp.aportesFundo),
      inscricoes: {
        ativas: inscricoes.filter((i) => i.status === "ATIVA").length,
        listaEspera: inscricoes.filter((i) => i.status === "LISTA_ESPERA").length,
        canceladas: inscricoes.filter((i) => i.status === "CANCELADA").length,
      },
    };
  },
});
