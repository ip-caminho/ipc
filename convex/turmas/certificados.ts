import { mutation, query, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission, checkPermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { resumoFrequenciaTurma } from "./lib/resumo";
import { truncarObservacao, PASTOR_TITULAR } from "./lib/constants";
import { resolveMembroNome } from "../_shared/membroResolver";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Certificado guarda SNAPSHOT do que foi impresso: frequencia e nome mudam
 * depois, o papel entregue nao. Entrega e presencial (impressao em lote no
 * ultimo dia), por isso nada vai para o B2 e nao existe rota de acesso do aluno.
 *
 * Um certificado ATIVO por inscricao. Corrigir nome ou reemitir = revogar e
 * emitir novo, mantendo o rastro do que foi entregue antes.
 */

function gerarCodigo(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function codigoUnico(ctx: MutationCtx): Promise<string> {
  // by_codigo nao e indice unico: a colisao (1 em 2^48) e checada aqui.
  for (let i = 0; i < 5; i++) {
    const codigo = gerarCodigo();
    const existe = await ctx.db
      .query("certificados")
      .withIndex("by_codigo", (q) => q.eq("codigo", codigo))
      .first();
    if (!existe) return codigo;
  }
  throw new Error("Nao foi possivel gerar um codigo unico");
}

async function certificadoAtivo(ctx: MutationCtx, inscricaoId: Id<"inscricoes">) {
  const emitidos = await ctx.db
    .query("certificados")
    .withIndex("by_inscricao", (q) => q.eq("inscricaoId", inscricaoId))
    .collect();
  return emitidos.find((c) => !c.revogadoEm) ?? null;
}

/** Nome do instrutor da turma: membro vinculado ou texto livre (externo). */
async function nomeDoInstrutor(
  ctx: MutationCtx,
  turma: Doc<"turmas">
): Promise<string | undefined> {
  if (turma.instrutorId) {
    const nome = await resolveMembroNome(ctx, turma.instrutorId);
    if (nome) return nome;
  }
  return turma.instrutorNome?.trim() || undefined;
}

async function emitirUm(
  ctx: MutationCtx,
  params: {
    inscricao: Doc<"inscricoes">;
    turma: Doc<"turmas">;
    cursoNome: string;
    cargaHoraria?: number;
    nomeImpresso: string;
    instrutorNome?: string;
    percentualFrequencia: number;
    aulasPresentes: number;
    aulasConsideradas: number;
    emitidoPor: Id<"membros">;
  }
) {
  const id = await ctx.db.insert("certificados", {
    turmaId: params.turma._id,
    inscricaoId: params.inscricao._id,
    nomeImpresso: params.nomeImpresso,
    percentualFrequencia: params.percentualFrequencia,
    aulasPresentes: params.aulasPresentes,
    aulasConsideradas: params.aulasConsideradas,
    cursoNome: params.cursoNome,
    turmaNome: params.turma.nome,
    cargaHoraria: params.cargaHoraria,
    instrutorNome: params.instrutorNome,
    pastorNome: PASTOR_TITULAR,
    codigo: await codigoUnico(ctx),
    emitidoPor: params.emitidoPor,
    emitidoEm: Date.now(),
  });
  await createActionAuditLog(ctx, "CREATE", "certificados", id as string);
  return id;
}

// Painel de certificados da turma: frequencia + certificado ativo por aluno.
export const painel = query({
  args: { turmaId: v.id("turmas") },
  handler: async (ctx, { turmaId }) => {
    // PII (nome dos inscritos) + decisao de emissao: exige gestao.
    if (!(await checkPermission(ctx, "turmas:manage_inscricoes"))) return null;

    const turma = await ctx.db.get(turmaId);
    if (!turma) return null;
    const curso = turma.cursoId ? await ctx.db.get(turma.cursoId) : null;

    const alunos = await resumoFrequenciaTurma(ctx, turmaId);
    const emitidos = await ctx.db
      .query("certificados")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect();
    const ativoPorInscricao = new Map(
      emitidos.filter((c) => !c.revogadoEm).map((c) => [c.inscricaoId, c])
    );

    return {
      turmaNome: turma.nome,
      cursoNome: curso?.nome ?? turma.nome,
      cargaHoraria: curso?.cargaHoraria,
      frequenciaMinima: alunos[0]?.frequenciaMinima ?? turma.frequenciaMinima,
      alunos: alunos.map((a) => ({
        ...a,
        certificado: ativoPorInscricao.get(a.inscricaoId) ?? null,
      })),
    };
  },
});

// Certificados emitidos de uma turma — usado pela rota de impressao em lote.
export const listParaImpressao = query({
  args: { turmaId: v.id("turmas") },
  handler: async (ctx, { turmaId }) => {
    if (!(await checkPermission(ctx, "turmas:manage_inscricoes"))) return [];
    const emitidos = await ctx.db
      .query("certificados")
      .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
      .collect();
    return emitidos
      .filter((c) => !c.revogadoEm)
      .sort((a, b) => a.nomeImpresso.localeCompare(b.nomeImpresso));
  },
});

export const emitir = mutation({
  args: {
    inscricaoId: v.id("inscricoes"),
    nomeImpresso: v.optional(v.string()),
  },
  handler: async (ctx, { inscricaoId, nomeImpresso }) => {
    const { membro } = await requirePermission(ctx, "turmas:manage_inscricoes");

    const inscricao = await ctx.db.get(inscricaoId);
    if (!inscricao) throw new Error("Inscricao nao encontrada");
    if (inscricao.status !== "CONFIRMADA") {
      throw new Error("So inscricao confirmada recebe certificado");
    }
    if (await certificadoAtivo(ctx, inscricaoId)) {
      throw new Error("Ja existe certificado ativo. Revogue antes de emitir outro");
    }

    const turma = await ctx.db.get(inscricao.turmaId);
    if (!turma) throw new Error("Turma nao encontrada");
    const curso = turma.cursoId ? await ctx.db.get(turma.cursoId) : null;

    const resumo = (await resumoFrequenciaTurma(ctx, turma._id)).find(
      (a) => a.inscricaoId === inscricaoId
    );
    if (!resumo || resumo.percentual === null) {
      throw new Error("Sem frequencia apurada: nenhuma aula com chamada feita");
    }

    // Frequencia abaixo do minimo NAO bloqueia: o minimo e semaforo, a decisao
    // e do professor/secretaria. O percentual real fica gravado no snapshot.
    return await emitirUm(ctx, {
      inscricao,
      turma,
      cursoNome: curso?.nome ?? turma.nome,
      cargaHoraria: curso?.cargaHoraria,
      nomeImpresso: (nomeImpresso?.trim() || inscricao.dadosSistema.nomeCompleto).trim(),
      instrutorNome: await nomeDoInstrutor(ctx, turma),
      percentualFrequencia: resumo.percentual,
      aulasPresentes: resumo.aulasPresentes,
      aulasConsideradas: resumo.aulasConsideradas,
      emitidoPor: membro._id,
    });
  },
});

// Emite para todos os aptos que ainda nao tem certificado ativo.
export const emitirAptos = mutation({
  args: { turmaId: v.id("turmas") },
  handler: async (ctx, { turmaId }) => {
    const { membro } = await requirePermission(ctx, "turmas:manage_inscricoes");

    const turma = await ctx.db.get(turmaId);
    if (!turma) throw new Error("Turma nao encontrada");
    const curso = turma.cursoId ? await ctx.db.get(turma.cursoId) : null;

    const alunos = await resumoFrequenciaTurma(ctx, turmaId);
    const instrutorNome = await nomeDoInstrutor(ctx, turma);
    let emitidos = 0;

    for (const a of alunos) {
      if (!a.apto || a.percentual === null) continue;
      if (await certificadoAtivo(ctx, a.inscricaoId)) continue;
      const inscricao = await ctx.db.get(a.inscricaoId);
      if (!inscricao) continue;

      await emitirUm(ctx, {
        inscricao,
        turma,
        cursoNome: curso?.nome ?? turma.nome,
        cargaHoraria: curso?.cargaHoraria,
        nomeImpresso: inscricao.dadosSistema.nomeCompleto.trim(),
        instrutorNome,
        percentualFrequencia: a.percentual,
        aulasPresentes: a.aulasPresentes,
        aulasConsideradas: a.aulasConsideradas,
        emitidoPor: membro._id,
      });
      emitidos++;
    }

    return emitidos;
  },
});

export const revogar = mutation({
  args: { id: v.id("certificados") },
  handler: async (ctx, { id }) => {
    const { membro } = await requirePermission(ctx, "turmas:manage_inscricoes");
    const certificado = await ctx.db.get(id);
    if (!certificado) throw new Error("Certificado nao encontrado");
    if (certificado.revogadoEm) throw new Error("Certificado ja revogado");

    // Revogar nao apaga: mantem o rastro do que foi entregue.
    await ctx.db.patch(id, { revogadoEm: Date.now(), revogadoPor: membro._id });
    await createActionAuditLog(ctx, "CANCEL", "certificados", id as string);
  },
});

export const setObservacoesInstrutor = mutation({
  args: { inscricaoId: v.id("inscricoes"), texto: v.optional(v.string()) },
  handler: async (ctx, { inscricaoId, texto }) => {
    await requirePermission(ctx, "turmas:manage_inscricoes");
    const oldRecord = await ctx.db.get(inscricaoId);
    if (!oldRecord) throw new Error("Inscricao nao encontrada");

    await ctx.db.patch(inscricaoId, {
      observacoesInstrutor: truncarObservacao(texto),
    });
    const newRecord = await ctx.db.get(inscricaoId);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "inscricoes");
  },
});
