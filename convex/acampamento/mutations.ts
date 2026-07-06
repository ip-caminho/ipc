import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { calcularValorInscricao } from "./calculoHelpers";

// Config do acampamento — gestao sob inscricoes:manage (secretaria).
// Valores monetarios em CENTAVOS.

const precosValidator = v.object({
  faixas: v.array(
    v.object({ idadeMin: v.number(), idadeMax: v.number(), valor: v.number() }),
  ),
  camaExtra: v.number(),
  petPorDia: v.number(),
  palestra: v.number(),
});

function validarPrecos(precos: {
  faixas: { idadeMin: number; idadeMax: number; valor: number }[];
}) {
  if (precos.faixas.length === 0) throw new Error("Defina ao menos uma faixa etária");
  for (const f of precos.faixas) {
    if (f.idadeMin > f.idadeMax) throw new Error("Faixa etária com idadeMin > idadeMax");
    if (f.valor < 0) throw new Error("Valor de faixa negativo");
  }
}

export const criar = mutation({
  args: {
    slug: v.string(),
    titulo: v.string(),
    descricao: v.optional(v.string()),
    ativa: v.boolean(),
    dataInicio: v.string(),
    dataFim: v.string(),
    inscricoesAbrem: v.optional(v.number()),
    inscricoesFecham: v.optional(v.number()),
    precos: precosValidator,
    estoqueDuplos: v.number(),
    estoqueTriplos: v.number(),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "inscricoes:manage");

    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("Slug obrigatório");
    if (args.dataFim < args.dataInicio) throw new Error("Data fim antes do início");
    validarPrecos(args.precos);

    const existente = await ctx.db
      .query("acampamentos")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existente) throw new Error("Já existe um acampamento com este slug");

    const id = await ctx.db.insert("acampamentos", {
      ...args,
      slug,
      duplosReservados: 0,
      triplosReservados: 0,
      aportesFundo: [],
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "acampamentos", id);
    return id;
  },
});

export const atualizar = mutation({
  args: {
    id: v.id("acampamentos"),
    titulo: v.optional(v.string()),
    descricao: v.optional(v.string()),
    ativa: v.optional(v.boolean()),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
    inscricoesAbrem: v.optional(v.number()),
    inscricoesFecham: v.optional(v.number()),
    precos: v.optional(precosValidator),
    estoqueDuplos: v.optional(v.number()),
    estoqueTriplos: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const antes = await ctx.db.get(id);
    if (!antes) throw new Error("Acampamento não encontrado");
    if (updates.precos) validarPrecos(updates.precos);

    const limpos: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) limpos[k] = val;
    }
    await ctx.db.patch(id, limpos);
    const depois = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, antes, depois, "acampamentos");
    return id;
  },
});

// ===== Gestao de inscricoes (fase 3) =====

// Vincula (ou desvincula, membroId=null) um participante a um membro da base.
// Sempre acao manual da secretaria — matching automatico nunca grava sozinho.
export const confirmarMatching = mutation({
  args: {
    inscricaoId: v.id("inscricoesAcampamento"),
    participanteIndex: v.number(),
    membroId: v.union(v.id("membros"), v.null()),
  },
  handler: async (ctx, { inscricaoId, participanteIndex, membroId }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const insc = await ctx.db.get(inscricaoId);
    if (!insc) throw new Error("Inscrição não encontrada");
    const parts = [...insc.participantes];
    if (!parts[participanteIndex]) throw new Error("Participante inválido");
    parts[participanteIndex] = {
      ...parts[participanteIndex],
      membroId: membroId ?? undefined,
    };
    await ctx.db.patch(inscricaoId, { participantes: parts, atualizadoEm: Date.now() });
    await createActionAuditLog(ctx, "MATCHING", "inscricoesAcampamento", inscricaoId);
    return inscricaoId;
  },
});

const participanteValidator = v.object({
  nome: v.string(),
  dataNascimento: v.string(),
  membroId: v.optional(v.id("membros")),
  participaPalestras: v.boolean(),
});

const hospedagemValidator = v.object({
  quartosDuplos: v.number(),
  quartosTriplos: v.number(),
  camasExtras: v.number(),
  pets: v.number(),
});

// Edicao pela secretaria. Recalcula valorTabela com o SNAPSHOT da inscricao
// (preco combinado na epoca) — recalcular com a tabela vigente e acao separada.
// Ajusta os contadores de estoque pelo delta de quartos (inscricao ATIVA).
export const editarInscricao = mutation({
  args: {
    id: v.id("inscricoesAcampamento"),
    responsavel: v.optional(v.object({ nome: v.string(), whatsapp: v.string() })),
    participantes: v.optional(v.array(participanteValidator)),
    hospedagem: v.optional(hospedagemValidator),
    extras: v.optional(
      v.object({
        colegaDeQuarto: v.optional(v.string()),
        berco: v.optional(v.boolean()),
        necessidadesEspeciais: v.optional(v.string()),
        observacao: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const antes = await ctx.db.get(id);
    if (!antes) throw new Error("Inscrição não encontrada");
    const acamp = await ctx.db.get(antes.acampamentoId);
    if (!acamp) throw new Error("Acampamento não encontrado");

    const participantes = updates.participantes ?? antes.participantes;
    const hospedagem = updates.hospedagem ?? antes.hospedagem;
    if (participantes.length === 0) throw new Error("Informe ao menos um participante");

    // Delta de quartos ajusta os contadores (so p/ inscricao ATIVA)
    if (antes.status === "ATIVA" && updates.hospedagem) {
      await ctx.db.patch(acamp._id, {
        duplosReservados: Math.max(
          0,
          acamp.duplosReservados + hospedagem.quartosDuplos - antes.hospedagem.quartosDuplos,
        ),
        triplosReservados: Math.max(
          0,
          acamp.triplosReservados + hospedagem.quartosTriplos - antes.hospedagem.quartosTriplos,
        ),
      });
    }

    const calculo = calcularValorInscricao(
      participantes,
      hospedagem,
      antes.precosSnapshot,
      acamp.dataInicio,
      acamp.dataFim,
    );

    const patch: Record<string, unknown> = {
      participantes,
      hospedagem,
      valorTabela: calculo.total,
      atualizadoEm: Date.now(),
    };
    if (updates.responsavel) {
      const soDigitos = updates.responsavel.whatsapp.replace(/\D/g, "");
      patch.responsavel = {
        ...antes.responsavel,
        nome: updates.responsavel.nome.trim(),
        whatsapp: `+${soDigitos.startsWith("55") ? soDigitos : `55${soDigitos}`}`,
      };
    }
    if (updates.extras !== undefined) patch.extras = updates.extras;

    await ctx.db.patch(id, patch);
    const depois = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, antes, depois, "inscricoesAcampamento");
    return { id, valorTabela: calculo.total };
  },
});

// Recalcula o valor com a TABELA VIGENTE (atualiza o snapshot) — acao
// explicita; precos nunca mudam silenciosamente.
export const recalcularValor = mutation({
  args: { id: v.id("inscricoesAcampamento") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const insc = await ctx.db.get(id);
    if (!insc) throw new Error("Inscrição não encontrada");
    const acamp = await ctx.db.get(insc.acampamentoId);
    if (!acamp) throw new Error("Acampamento não encontrado");

    const calculo = calcularValorInscricao(
      insc.participantes,
      insc.hospedagem,
      acamp.precos,
      acamp.dataInicio,
      acamp.dataFim,
    );
    await ctx.db.patch(id, {
      valorTabela: calculo.total,
      precosSnapshot: acamp.precos,
      atualizadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "RECALCULO", "inscricoesAcampamento", id);
    return { id, valorTabela: calculo.total };
  },
});

// Cancela: devolve quartos ao estoque (se ATIVA) e preserva o historico.
export const cancelarInscricao = mutation({
  args: { id: v.id("inscricoesAcampamento"), observacao: v.optional(v.string()) },
  handler: async (ctx, { id, observacao }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const insc = await ctx.db.get(id);
    if (!insc) throw new Error("Inscrição não encontrada");
    if (insc.status === "CANCELADA") return id;

    if (insc.status === "ATIVA") {
      const acamp = await ctx.db.get(insc.acampamentoId);
      if (acamp) {
        await ctx.db.patch(acamp._id, {
          duplosReservados: Math.max(0, acamp.duplosReservados - insc.hospedagem.quartosDuplos),
          triplosReservados: Math.max(0, acamp.triplosReservados - insc.hospedagem.quartosTriplos),
        });
      }
    }
    await ctx.db.patch(id, {
      status: "CANCELADA",
      observacaoCancelamento: observacao?.trim() || undefined,
      atualizadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CANCELAMENTO", "inscricoesAcampamento", id);
    return id;
  },
});

// Promove da lista de espera. Reserva os quartos mesmo que estoure o estoque
// (decisao consciente da secretaria — ex: hotel liberou mais quartos).
export const promoverListaEspera = mutation({
  args: { id: v.id("inscricoesAcampamento") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const insc = await ctx.db.get(id);
    if (!insc) throw new Error("Inscrição não encontrada");
    if (insc.status !== "LISTA_ESPERA") throw new Error("Inscrição não está na lista de espera");

    const acamp = await ctx.db.get(insc.acampamentoId);
    if (acamp) {
      await ctx.db.patch(acamp._id, {
        duplosReservados: acamp.duplosReservados + insc.hospedagem.quartosDuplos,
        triplosReservados: acamp.triplosReservados + insc.hospedagem.quartosTriplos,
      });
    }
    await ctx.db.patch(id, { status: "ATIVA", atualizadoEm: Date.now() });
    await createActionAuditLog(ctx, "PROMOCAO", "inscricoesAcampamento", id);
    return id;
  },
});

// Entrada avulsa no fundo solidario (doacao sem inscricao / verba da igreja).
export const aportarFundo = mutation({
  args: {
    id: v.id("acampamentos"),
    valor: v.number(),
    descricao: v.string(),
  },
  handler: async (ctx, { id, valor, descricao }) => {
    const { membro } = await requirePermission(ctx, "inscricoes:manage");
    if (valor <= 0) throw new Error("Valor do aporte deve ser positivo");
    if (!descricao.trim()) throw new Error("Descreva a origem do aporte");

    const acamp = await ctx.db.get(id);
    if (!acamp) throw new Error("Acampamento não encontrado");
    await ctx.db.patch(id, {
      aportesFundo: [
        ...acamp.aportesFundo,
        { valor, descricao: descricao.trim(), criadoPor: membro._id, em: Date.now() },
      ],
    });
    await createActionAuditLog(ctx, "APORTE_FUNDO", "acampamentos", id);
    return id;
  },
});
