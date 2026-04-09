import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

async function requireAuth(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Nao autenticado");
  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();
  if (!membro) throw new Error("Membro nao encontrado");
  return { userId, membro };
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ===== Tipos de Turma =====

export const createTipo = mutation({
  args: { nome: v.string(), descricao: v.optional(v.string()) },
  handler: async (ctx, { nome, descricao }) => {
    await requireAuth(ctx);
    const id = await ctx.db.insert("tiposTurma", {
      nome: nome.trim(),
      descricao: descricao?.trim(),
      status: "ATIVO",
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "tiposTurma", id as string);
    return id;
  },
});

export const updateTipo = mutation({
  args: { id: v.id("tiposTurma"), nome: v.optional(v.string()), descricao: v.optional(v.string()) },
  handler: async (ctx, { id, nome, descricao }) => {
    await requireAuth(ctx);
    const patch: Record<string, unknown> = {};
    if (nome !== undefined) patch.nome = nome.trim();
    if (descricao !== undefined) patch.descricao = descricao.trim();
    await ctx.db.patch(id, patch);
  },
});

export const removeTipo = mutation({
  args: { id: v.id("tiposTurma") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    await ctx.db.patch(id, { status: "INATIVO" });
  },
});

// ===== Turmas =====

export const create = mutation({
  args: {
    nome: v.string(),
    tipoTurmaId: v.id("tiposTurma"),
    instrutorId: v.optional(v.id("membros")),
    instrutorNome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    dataInicio: v.string(),
    dataFim: v.optional(v.string()),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
    vagas: v.optional(v.number()),
    camposSistema: v.array(v.string()),
    perguntasExtras: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
      obrigatorio: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const { membro } = await requireAuth(ctx);
    const id = await ctx.db.insert("turmas", {
      ...args,
      nome: args.nome.trim(),
      vagasOcupadas: 0,
      status: "ABERTA",
      token: generateToken(),
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "turmas", id as string);
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("turmas"),
    nome: v.optional(v.string()),
    instrutorId: v.optional(v.id("membros")),
    instrutorNome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    dataInicio: v.optional(v.string()),
    dataFim: v.optional(v.string()),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
    vagas: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requireAuth(ctx);
    const oldRecord = await ctx.db.get(id);
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) patch[key] = typeof val === "string" ? val.trim() : val;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
      const newRecord = await ctx.db.get(id);
      await createFieldAuditLogs(ctx, oldRecord, newRecord, "turmas");
    }
  },
});

const STATUS_TRANSITIONS: Record<string, string[]> = {
  ABERTA: ["EM_ANDAMENTO", "CANCELADA"],
  EM_ANDAMENTO: ["ENCERRADA", "CANCELADA"],
  CANCELADA: ["ABERTA"],
};

export const updateStatus = mutation({
  args: {
    id: v.id("turmas"),
    status: v.union(
      v.literal("ABERTA"),
      v.literal("EM_ANDAMENTO"),
      v.literal("ENCERRADA"),
      v.literal("CANCELADA")
    ),
  },
  handler: async (ctx, { id, status }) => {
    await requireAuth(ctx);
    const turma = await ctx.db.get(id);
    if (!turma) throw new Error("Turma nao encontrada");

    const allowed = STATUS_TRANSITIONS[turma.status];
    if (!allowed?.includes(status)) {
      throw new Error(`Transicao invalida: ${turma.status} → ${status}`);
    }
    const oldRecord = await ctx.db.get(id);
    await ctx.db.patch(id, { status });
    const newRecord = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "turmas");
  },
});

export const duplicar = mutation({
  args: { id: v.id("turmas"), nome: v.string() },
  handler: async (ctx, { id, nome }) => {
    const { membro } = await requireAuth(ctx);
    const original = await ctx.db.get(id);
    if (!original) throw new Error("Turma nao encontrada");

    const newId = await ctx.db.insert("turmas", {
      nome: nome.trim(),
      tipoTurmaId: original.tipoTurmaId,
      instrutorId: original.instrutorId,
      instrutorNome: original.instrutorNome,
      descricao: original.descricao,
      dataInicio: original.dataInicio,
      dataFim: original.dataFim,
      diaSemana: original.diaSemana,
      horario: original.horario,
      local: original.local,
      vagas: original.vagas,
      vagasOcupadas: 0,
      status: "ABERTA",
      camposSistema: original.camposSistema,
      perguntasExtras: original.perguntasExtras,
      token: generateToken(),
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "turmas", newId as string);
    return newId;
  },
});

// ===== Inscricoes =====

function normalizeWhatsApp(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)]/g, "");
  if (!clean.startsWith("+")) {
    if (clean.startsWith("55")) clean = "+" + clean;
    else clean = "+55" + clean;
  }
  return clean;
}

export const registrar = mutation({
  args: {
    token: v.string(),
    dadosSistema: v.object({
      nomeCompleto: v.string(),
      whatsapp: v.optional(v.string()),
      email: v.optional(v.string()),
      dataNascimento: v.optional(v.string()),
      sexo: v.optional(v.string()),
    }),
    respostasExtras: v.optional(v.array(v.object({
      perguntaId: v.string(),
      valor: v.string(),
    }))),
    lgpdConsentimento: v.boolean(),
  },
  handler: async (ctx, { token, dadosSistema, respostasExtras, lgpdConsentimento }) => {
    if (!lgpdConsentimento) throw new Error("Consentimento LGPD obrigatorio");

    const turma = await ctx.db
      .query("turmas")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!turma) throw new Error("Turma nao encontrada");
    if (turma.status !== "ABERTA") throw new Error("Turma nao esta aceitando inscricoes");

    // Normalizar WhatsApp
    const dados = { ...dadosSistema };
    if (dados.whatsapp) dados.whatsapp = normalizeWhatsApp(dados.whatsapp);

    // Verificar dedup
    const userId = await getAuthUserId(ctx);
    let membroId: any = undefined;
    if (userId) {
      const membro = await ctx.db
        .query("membros")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      if (membro) {
        membroId = membro._id;
        // Dedup por membroId
        const existing = await ctx.db
          .query("inscricoes")
          .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
          .collect();
        if (existing.some((i) => i.membroId === membroId && i.status !== "CANCELADA")) {
          throw new Error("Voce ja esta inscrito nesta turma");
        }
      }
    } else if (dados.whatsapp) {
      // Dedup por WhatsApp para nao-membros
      const existing = await ctx.db
        .query("inscricoes")
        .withIndex("by_turma", (q) => q.eq("turmaId", turma._id))
        .collect();
      if (existing.some((i) =>
        i.dadosSistema.whatsapp === dados.whatsapp && i.status !== "CANCELADA"
      )) {
        throw new Error("Ja existe inscricao com este WhatsApp");
      }
    }

    // Verificar vagas
    let status: "CONFIRMADA" | "LISTA_ESPERA" = "CONFIRMADA";
    if (turma.vagas && turma.vagasOcupadas >= turma.vagas) {
      status = "LISTA_ESPERA";
    } else {
      // Incrementar vagas ocupadas
      await ctx.db.patch(turma._id, { vagasOcupadas: turma.vagasOcupadas + 1 });
    }

    const id = await ctx.db.insert("inscricoes", {
      turmaId: turma._id,
      membroId,
      dadosSistema: dados,
      respostasExtras,
      status,
      lgpdConsentimento,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "inscricoes", id as string);
    return id;
  },
});

export const cancelarInscricao = mutation({
  args: { id: v.id("inscricoes") },
  handler: async (ctx, { id }) => {
    const inscricao = await ctx.db.get(id);
    if (!inscricao) throw new Error("Inscricao nao encontrada");
    if (inscricao.status === "CANCELADA") throw new Error("Inscricao ja cancelada");

    await ctx.db.patch(id, { status: "CANCELADA", canceladoEm: Date.now() });
    await createActionAuditLog(ctx, "CANCEL", "inscricoes", id as string);

    // Se estava confirmada, liberar vaga
    if (inscricao.status === "CONFIRMADA") {
      const turma = await ctx.db.get(inscricao.turmaId);
      if (turma) {
        await ctx.db.patch(turma._id, { vagasOcupadas: Math.max(0, turma.vagasOcupadas - 1) });

        // Promover primeiro da lista de espera
        const espera = await ctx.db
          .query("inscricoes")
          .withIndex("by_turma_status", (q) =>
            q.eq("turmaId", turma._id).eq("status", "LISTA_ESPERA")
          )
          .first();
        if (espera) {
          await ctx.db.patch(espera._id, { status: "CONFIRMADA" });
          await ctx.db.patch(turma._id, { vagasOcupadas: turma.vagasOcupadas }); // mantém o mesmo
        }
      }
    }
  },
});

// ===== Encontros =====

export const createEncontro = mutation({
  args: {
    turmaId: v.id("turmas"),
    data: v.string(),
    titulo: v.optional(v.string()),
  },
  handler: async (ctx, { turmaId, data, titulo }) => {
    const { membro } = await requireAuth(ctx);
    return await ctx.db.insert("turmaEncontros", {
      turmaId,
      data,
      titulo: titulo?.trim(),
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
  },
});

export const removeEncontro = mutation({
  args: { id: v.id("turmaEncontros") },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);
    // Remove presencas associadas
    const presencas = await ctx.db
      .query("turmaPresencas")
      .withIndex("by_encontro", (q) => q.eq("encontroId", id))
      .collect();
    for (const p of presencas) await ctx.db.delete(p._id);
    await ctx.db.delete(id);
  },
});

export const salvarPresencas = mutation({
  args: {
    encontroId: v.id("turmaEncontros"),
    presencas: v.array(v.object({
      inscricaoId: v.id("inscricoes"),
      presente: v.boolean(),
    })),
  },
  handler: async (ctx, { encontroId, presencas }) => {
    const { membro } = await requireAuth(ctx);

    for (const { inscricaoId, presente } of presencas) {
      const existing = await ctx.db
        .query("turmaPresencas")
        .withIndex("by_encontro", (q) => q.eq("encontroId", encontroId))
        .collect()
        .then((list) => list.find((p) => p.inscricaoId === inscricaoId));

      if (existing) {
        await ctx.db.patch(existing._id, { presente });
      } else {
        await ctx.db.insert("turmaPresencas", {
          encontroId,
          inscricaoId,
          presente,
          registradoPor: membro._id,
        });
      }
    }
  },
});
