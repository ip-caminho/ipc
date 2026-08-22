import { mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission, checkPermission } from "../_shared/requirePermission";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";
import { FREQUENCIA_MINIMA_PADRAO, truncarObservacao } from "./lib/constants";
import { gerarDatasAulas } from "./lib/aulas";
import { avaliarJanelaInscricao } from "./lib/inscricoes";
import { getSaoPauloDateString } from "../_shared/datetime";
import type { Id } from "../_generated/dataModel";

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

/**
 * Encontros e presencas: quem gerencia inscricoes acessa qualquer turma; o
 * instrutor acessa apenas a propria (a chamada sai tambem do widget do
 * dashboard, e instrutor pode ser membro comum — exigir so a permissao
 * quebraria esse fluxo).
 */
async function requireGestaoTurma(ctx: any, turmaId: Id<"turmas">) {
  const turma = await ctx.db.get(turmaId);
  if (!turma) throw new Error("Turma nao encontrada");

  const gestor = await checkPermission(ctx, "turmas:manage_inscricoes");
  if (gestor) return { turma, membro: gestor.membro };

  const { membro } = await requireAuth(ctx);
  if (turma.instrutorId !== membro._id) throw new Error("Sem permissao");
  return { turma, membro };
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ===== Turmas =====

type PlanoAula = { titulo: string; detalhe?: string };

/**
 * Cria as aulas da turma. Dois modos:
 *
 * - `datas`: lista explicita. Existe porque calendario real pula datas — Novos
 *   Membros tem 8 domingos com tres intervalos de 14 dias, impossivel de
 *   descrever com cadencia fixa.
 * - `totalAulas`: N aulas semanais a partir de dataInicio (o caso simples).
 *
 * O titulo vem do plano do curso quando existe; senao, "Aula N". Nao gera se a
 * turma ja tem aula — evita duplicar em clique repetido.
 */
async function criarAulas(
  ctx: MutationCtx,
  turmaId: Id<"turmas">,
  opts: {
    dataInicio: string;
    diaSemana?: string;
    totalAulas?: number;
    datas?: string[];
    plano?: PlanoAula[];
    membroId: Id<"membros">;
  }
): Promise<number> {
  const existentes = await ctx.db
    .query("turmaEncontros")
    .withIndex("by_turma", (q) => q.eq("turmaId", turmaId))
    .first();
  if (existentes) return 0;

  const datas = opts.datas?.length
    ? [...opts.datas].sort()
    : gerarDatasAulas(opts.dataInicio, opts.diaSemana, opts.totalAulas ?? 0);

  const agora = Date.now();
  for (const [i, data] of datas.entries()) {
    const doPlano = opts.plano?.[i];
    await ctx.db.insert("turmaEncontros", {
      turmaId,
      data,
      titulo: doPlano?.titulo ?? `Aula ${i + 1}`,
      observacoes: doPlano?.detalhe,
      criadoPor: opts.membroId,
      criadoEm: agora,
    });
  }
  return datas.length;
}

export const create = mutation({
  args: {
    nome: v.string(),
    cursoId: v.optional(v.id("cursos")),
    tipo: v.optional(v.union(
      v.literal("NOVOS_MEMBROS"),
      v.literal("CATACUMENOS"),
      v.literal("OUTRO")
    )),
    instrutorId: v.optional(v.id("membros")),
    instrutorNome: v.optional(v.string()),
    descricao: v.optional(v.string()),
    dataInicio: v.string(),
    dataFim: v.optional(v.string()),
    inscricoesDe: v.optional(v.string()),
    inscricoesAte: v.optional(v.string()),
    publicarNoSite: v.optional(v.boolean()),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
    vagas: v.optional(v.number()),
    camposSistema: v.array(v.string()),
    perguntasExtras: v.optional(v.array(v.object({
      id: v.string(),
      label: v.string(),
      obrigatorio: v.boolean(),
      tipo: v.optional(v.union(
        v.literal("TEXTO"),
        v.literal("TEXTO_LONGO"),
        v.literal("ESCOLHA_UNICA"),
        v.literal("ESCOLHA_MULTIPLA")
      )),
      opcoes: v.optional(v.array(v.string())),
      ajuda: v.optional(v.string()),
    }))),
    // Datas dos encontros. Quando vem, manda mais que o totalAulas do curso —
    // sem isso a turma nasceria com cadencia semanal errada e gerarAulas
    // passaria a recusar ("Esta turma ja tem aulas").
    datasAulas: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "turmas:create");

    if (
      args.inscricoesDe &&
      args.inscricoesAte &&
      args.inscricoesAte < args.inscricoesDe
    ) {
      throw new Error("O fim das inscricoes nao pode ser antes da abertura");
    }

    const curso = args.cursoId ? await ctx.db.get(args.cursoId) : null;
    if (args.cursoId && !curso) throw new Error("Curso nao encontrado");

    const { datasAulas, ...camposDaTurma } = args;

    const id = await ctx.db.insert("turmas", {
      ...camposDaTurma,
      nome: args.nome.trim(),
      // Copia do curso: congela a regra de aprovacao no inicio da turma.
      frequenciaMinima: curso?.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO,
      criterioAprovacao: curso?.criterioAprovacao,
      maxFaltas: curso?.maxFaltas,
      vagasOcupadas: 0,
      status: "ABERTA",
      token: generateToken(),
      criadoPor: membro._id,
      criadoEm: Date.now(),
    });
    await createActionAuditLog(ctx, "CREATE", "turmas", id as string);

    // Aulas ja saem criadas: o instrutor nunca precisa criar encontro.
    if (datasAulas?.length || curso?.totalAulas) {
      await criarAulas(ctx, id, {
        dataInicio: args.dataInicio,
        diaSemana: args.diaSemana,
        totalAulas: curso?.totalAulas,
        datas: datasAulas,
        plano: curso?.planoAulas,
        membroId: membro._id,
      });
    }

    return id;
  },
});

export const gerarAulas = mutation({
  args: {
    turmaId: v.id("turmas"),
    totalAulas: v.optional(v.number()),
    // Datas explicitas: o caminho para calendario que pula datas.
    datas: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { turmaId, totalAulas, datas }) => {
    const { membro } = await requirePermission(ctx, "turmas:update");
    const turma = await ctx.db.get(turmaId);
    if (!turma) throw new Error("Turma nao encontrada");

    const curso = turma.cursoId ? await ctx.db.get(turma.cursoId) : null;

    if (datas?.length) {
      const invalida = datas.find((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));
      if (invalida) throw new Error(`Data invalida: ${invalida}`);
    } else {
      const quantas = totalAulas ?? curso?.totalAulas;
      if (!quantas || quantas < 1) {
        throw new Error("Informe as datas ou quantas aulas gerar");
      }
    }

    const criadas = await criarAulas(ctx, turmaId, {
      dataInicio: turma.dataInicio,
      diaSemana: turma.diaSemana,
      totalAulas: totalAulas ?? curso?.totalAulas,
      datas,
      plano: curso?.planoAulas,
      membroId: membro._id,
    });
    if (criadas === 0) throw new Error("Esta turma ja tem aulas");
    return criadas;
  },
});

/**
 * Cria os marcos da turma no calendario da igreja (entrevistas, apresentacao e
 * batismo). Nao sao aulas: nao tem chamada e nao entram na frequencia — por isso
 * viram evento, nao encontro.
 *
 * Exige turmas:update E calendario:create. requireAnyPermission seria OU, o que
 * nao serve; o padrao do repo para "exige A, precisa de B tambem" e
 * requirePermission + checkPermission.
 */
export const criarEventosDaTurma = mutation({
  args: {
    turmaId: v.id("turmas"),
    marcos: v.array(v.object({ titulo: v.string(), data: v.string() })),
    publicarNoSite: v.optional(v.boolean()),
  },
  handler: async (ctx, { turmaId, marcos, publicarNoSite }) => {
    await requirePermission(ctx, "turmas:update");
    const turma = await ctx.db.get(turmaId);
    if (!turma) throw new Error("Turma nao encontrada");

    if (!(await checkPermission(ctx, "calendario:create"))) {
      throw new Error(
        "Sem permissao para criar evento no calendario (calendario:create)"
      );
    }

    const existentes = new Set(
      (await ctx.db.query("calendarioEventos").collect()).map(
        (e) => `${e.data}|${e.titulo}`
      )
    );

    const criados: string[] = [];
    for (const marco of marcos) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(marco.data)) {
        throw new Error(`Data invalida: ${marco.data}`);
      }
      const titulo = `${marco.titulo.trim()} — ${turma.nome}`;
      // Idempotente: rodar de novo nao duplica o evento.
      if (existentes.has(`${marco.data}|${titulo}`)) continue;

      const id = await ctx.db.insert("calendarioEventos", {
        titulo,
        data: marco.data,
        descricao: `Marco da turma ${turma.nome}.`,
        tipo: "evento",
        publicadoNoSite: publicarNoSite ?? false,
        criadoEm: Date.now(),
      });
      await createActionAuditLog(ctx, "CREATE", "calendarioEventos", id as string);
      criados.push(titulo);
    }

    return criados;
  },
});

export const setFrequenciaMinima = mutation({
  args: { turmaId: v.id("turmas"), frequenciaMinima: v.number() },
  handler: async (ctx, { turmaId, frequenciaMinima }) => {
    await requirePermission(ctx, "turmas:manage_inscricoes");
    if (
      !Number.isFinite(frequenciaMinima) ||
      frequenciaMinima < 0 ||
      frequenciaMinima > 100
    ) {
      throw new Error("Frequencia minima deve estar entre 0 e 100");
    }
    const oldRecord = await ctx.db.get(turmaId);
    if (!oldRecord) throw new Error("Turma nao encontrada");

    await ctx.db.patch(turmaId, { frequenciaMinima: Math.round(frequenciaMinima) });
    const newRecord = await ctx.db.get(turmaId);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "turmas");
  },
});

/**
 * Troca o criterio de aprovacao da turma (percentual ou maximo de faltas). Vive
 * na tela de certificados, junto do numero — e ali que a secretaria decide.
 */
export const setCriterioAprovacao = mutation({
  args: {
    turmaId: v.id("turmas"),
    criterioAprovacao: v.union(v.literal("PERCENTUAL"), v.literal("MAX_FALTAS")),
    maxFaltas: v.optional(v.number()),
  },
  handler: async (ctx, { turmaId, criterioAprovacao, maxFaltas }) => {
    await requirePermission(ctx, "turmas:manage_inscricoes");
    const oldRecord = await ctx.db.get(turmaId);
    if (!oldRecord) throw new Error("Turma nao encontrada");

    if (criterioAprovacao === "MAX_FALTAS") {
      if (maxFaltas === undefined || !Number.isFinite(maxFaltas) || maxFaltas < 0) {
        throw new Error("Informe o maximo de faltas permitido");
      }
    }

    await ctx.db.patch(turmaId, {
      criterioAprovacao,
      maxFaltas: criterioAprovacao === "MAX_FALTAS" ? Math.round(maxFaltas!) : undefined,
    });
    const newRecord = await ctx.db.get(turmaId);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "turmas");
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
    inscricoesDe: v.optional(v.string()),
    inscricoesAte: v.optional(v.string()),
    publicarNoSite: v.optional(v.boolean()),
    diaSemana: v.optional(v.string()),
    horario: v.optional(v.string()),
    local: v.optional(v.string()),
    vagas: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "turmas:update");
    const oldRecord = await ctx.db.get(id);
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined) continue;
      if (typeof val !== "string") {
        patch[key] = val;
        continue;
      }
      const texto = val.trim();
      // String vazia = remover o campo (e assim que a tela apaga um prazo de
      // inscricao ja definido). Nome nao pode ser apagado.
      if (texto === "") {
        if (key === "nome") continue;
        patch[key] = undefined;
        continue;
      }
      patch[key] = texto;
    }

    // Valida a janela no estado final (o patch pode mexer em so uma ponta).
    // Testa a PRESENCA da chave: com "vazio = remover", o valor no patch pode
    // ser undefined de proposito — `??` cairia no valor antigo por engano.
    const de = ("inscricoesDe" in patch
      ? (patch.inscricoesDe as string | undefined)
      : oldRecord?.inscricoesDe) as string | undefined;
    const ate = ("inscricoesAte" in patch
      ? (patch.inscricoesAte as string | undefined)
      : oldRecord?.inscricoesAte) as string | undefined;
    if (de && ate && ate < de) {
      throw new Error("O fim das inscricoes nao pode ser antes da abertura");
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
      const newRecord = await ctx.db.get(id);
      await createFieldAuditLogs(ctx, oldRecord, newRecord, "turmas");
    }
  },
});

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
    await requirePermission(ctx, "turmas:update");
    const turma = await ctx.db.get(id);
    if (!turma) throw new Error("Turma nao encontrada");

    if (turma.status === status) return; // sem mudanca

    const oldRecord = await ctx.db.get(id);
    await ctx.db.patch(id, { status });
    const newRecord = await ctx.db.get(id);
    await createFieldAuditLogs(ctx, oldRecord, newRecord, "turmas");
  },
});

// duplicar foi removida: nao tinha botao em tela nenhuma e virou redundante —
// criar turma escolhendo o curso faz o mesmo com menos conceito.

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
      valores: v.optional(v.array(v.string())),
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

    // Janela de inscricao checada no servidor: a pagina publica tambem esconde
    // o formulario, mas o token e a mutation sao acessiveis sem auth.
    const janela = avaliarJanelaInscricao(turma, getSaoPauloDateString());
    if (!janela.aberta) {
      if (janela.motivo === "AINDA_NAO_COMECOU") {
        throw new Error("As inscricoes ainda nao comecaram");
      }
      if (janela.motivo === "ENCERRADA") {
        throw new Error("As inscricoes para esta turma foram encerradas");
      }
      throw new Error("Turma nao esta aceitando inscricoes");
    }

    // Respostas validadas AQUI, nao so no cliente: `registrar` e publica e
    // alcancavel por quem tem o token. Sem isto, pergunta obrigatoria em branco
    // ou opcao inventada entrariam no banco.
    const perguntas = turma.perguntasExtras ?? [];
    const respostaPorId = new Map(
      (respostasExtras ?? []).map((r) => [r.perguntaId, r])
    );
    for (const pergunta of perguntas) {
      const resposta = respostaPorId.get(pergunta.id);
      const marcadas = resposta?.valores ?? (resposta?.valor ? [resposta.valor] : []);
      const vazia = marcadas.every((v) => !v.trim());

      if (pergunta.obrigatorio && vazia) {
        throw new Error(`Responda: ${pergunta.label}`);
      }
      if (vazia) continue;

      const escolha =
        pergunta.tipo === "ESCOLHA_UNICA" || pergunta.tipo === "ESCOLHA_MULTIPLA";
      if (escolha) {
        const validas = new Set(pergunta.opcoes ?? []);
        const invalida = marcadas.find((v) => !validas.has(v));
        if (invalida) {
          throw new Error(`Opcao invalida em "${pergunta.label}": ${invalida}`);
        }
        if (pergunta.tipo === "ESCOLHA_UNICA" && marcadas.length > 1) {
          throw new Error(`"${pergunta.label}" aceita uma resposta so`);
        }
      }
    }
    // Resposta de pergunta que nao existe na turma nao entra.
    const respostasValidas = (respostasExtras ?? []).filter((r) =>
      perguntas.some((p) => p.id === r.perguntaId)
    );

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
      respostasExtras: respostasValidas.length ? respostasValidas : undefined,
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
    await requirePermission(ctx, "turmas:manage_inscricoes");
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
    const { membro } = await requireGestaoTurma(ctx, turmaId);
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
    const encontro = await ctx.db.get(id);
    if (!encontro) throw new Error("Encontro nao encontrado");
    await requireGestaoTurma(ctx, encontro.turmaId);
    // Remove presencas associadas
    const presencas = await ctx.db
      .query("turmaPresencas")
      .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", id))
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
    // Anotacao da aula (opcional): "como foi", assunto que sobrou, etc.
    observacoes: v.optional(v.string()),
  },
  handler: async (ctx, { encontroId, presencas, observacoes }) => {
    const encontro = await ctx.db.get(encontroId);
    if (!encontro) throw new Error("Encontro nao encontrado");
    const { membro } = await requireGestaoTurma(ctx, encontro.turmaId);

    // Le as presencas existentes UMA vez (antes era um collect por aluno
    // dentro do loop: O(N^2) em bytes lidos).
    const existentes = new Map(
      (
        await ctx.db
          .query("turmaPresencas")
          .withIndex("by_encontro_inscricao", (q) => q.eq("encontroId", encontroId))
          .collect()
      ).map((p) => [p.inscricaoId, p])
    );

    for (const { inscricaoId, presente } of presencas) {
      const existing = existentes.get(inscricaoId);
      if (existing) {
        if (existing.presente !== presente) {
          await ctx.db.patch(existing._id, { presente });
        }
      } else {
        await ctx.db.insert("turmaPresencas", {
          encontroId,
          inscricaoId,
          presente,
          registradoPor: membro._id,
        });
      }
    }

    // Marca a chamada como feita: o widget do dashboard passa a checar este
    // campo em vez de ler as presencas, e o calculo de frequencia ignora aula
    // sem chamada (nao vira falta de ninguem).
    const patch: { presencaRegistradaEm: number; observacoes?: string } = {
      presencaRegistradaEm: Date.now(),
    };
    // Nao apaga a anotacao existente quando a chamada e salva de novo sem texto.
    const nota = truncarObservacao(observacoes);
    if (nota) patch.observacoes = nota;
    await ctx.db.patch(encontroId, patch);
  },
});
