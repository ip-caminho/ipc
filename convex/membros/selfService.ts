import { query, mutation, type MutationCtx } from "../_generated/server";
import { getSaoPauloDate } from "../_shared/datetime";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createFieldAuditLogs } from "../_shared/auditHelpers";
import { filterSelfServiceFields } from "./selfServiceHelpers";
import { espelharConjuge, vincularCriancaAoConjuge } from "./familiaHelpers";
import type { Id } from "../_generated/dataModel";
import { phonesMatch } from "../messaging/phoneUtils";
import { makeFunctionReference } from "convex/server";

// Referencia construida por string: evita TS2589 (a arvore de tipos
// `internal` ficou profunda demais para o scheduler resolver).
const enviarConfirmacaoRef = makeFunctionReference<
  "action",
  { telefone: string },
  void
>("messaging/campanhas:_enviarConfirmacao");

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) return null;

    const entidade = await ctx.db.get(membro.entidadeId);
    return { ...membro, entidade };
  },
});

export const updateMyProfile = mutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Member not found");

    // Ownership check: only update own profile
    if (membro.userId !== userId) {
      throw new Error("Unauthorized: can only update own profile");
    }

    const filteredData = filterSelfServiceFields(data);
    if (!filteredData) {
      throw new Error("No valid fields to update");
    }

    const oldEntidade = await ctx.db.get(membro.entidadeId);
    const now = Date.now();
    await ctx.db.patch(membro.entidadeId, {
      ...filteredData,
      perfilAtualizadoEm: now,
      perfilAtualizadoPor: membro._id,
    });
    const newEntidade = await ctx.db.get(membro.entidadeId);

    await createFieldAuditLogs(ctx, oldEntidade, newEntidade, "entidades", membro.entidadeId);

    // Hook: se ha campanhasEnvios pendentes ou enviadas para este membro
    // sem atualizacao ainda, marca como ATUALIZOU. Permite o dashboard
    // refletir conversao em tempo real.
    await marcarCampanhasAtualizadas(ctx, membro._id, now);

    return membro._id;
  },
});

/**
 * Marca todos os envios ENVIADO/PENDENTE/PROCESSANDO deste membro como ATUALIZOU.
 * Idempotente — envios ja em ATUALIZOU sao ignorados.
 *
 * Faz match duplo:
 *   1) primario por `membroId` (rota normal)
 *   2) fallback por telefone (caso o envio tenha sido criado para outro membroId
 *      que aponta para a mesma pessoa — ex.: duplicata, troca de membro
 *      vinculado ao user, etc). Sem esse fallback a conversao nao e detectada
 *      mesmo quando a pessoa atualizou o perfil pelo link da campanha.
 *
 * Agenda uma confirmacao WhatsApp para o membro (uma so por chamada, mesmo
 * se houver multiplos envios em estados diferentes).
 */
async function marcarCampanhasAtualizadas(
  ctx: MutationCtx,
  membroId: Id<"membros">,
  agora: number
): Promise<void> {
  const membro = await ctx.db.get(membroId);
  const entidade = membro ? await ctx.db.get(membro.entidadeId) : null;
  const meuTelefone = entidade?.whatsapp ?? entidade?.telefone ?? null;

  // Membro confirmou cadastro -> nao e mais paradeiro ignorado
  if (membro?.tipoRolOverride === "PARADEIRO_IGNORADO") {
    await ctx.db.patch(membroId, { tipoRolOverride: undefined });
  }

  const enviosPorMembro = await ctx.db
    .query("campanhasEnvios")
    .withIndex("by_membro_enviadoEm", (q) => q.eq("membroId", membroId))
    .collect();

  let enviosPorTelefone: typeof enviosPorMembro = [];
  if (meuTelefone) {
    // Sem indice por telefone — scan completo. Tabela e pequena (~centenas).
    const todos = await ctx.db.query("campanhasEnvios").collect();
    enviosPorTelefone = todos.filter(
      (e) => e.status !== "ATUALIZOU" && phonesMatch(e.telefone, meuTelefone)
    );
  }

  const seen = new Set<string>();
  const candidatos = [...enviosPorMembro, ...enviosPorTelefone].filter((e) => {
    if (seen.has(e._id)) return false;
    seen.add(e._id);
    return true;
  });

  let confirmarTelefone: string | null = null;

  for (const envio of candidatos) {
    if (
      envio.status === "ENVIADO" ||
      envio.status === "PENDENTE" ||
      envio.status === "PROCESSANDO"
    ) {
      await ctx.db.patch(envio._id, {
        status: "ATUALIZOU",
        atualizouEm: agora,
      });
      // Confirma so para envios que ja sairam (estavam ENVIADO).
      // Para PENDENTE/PROCESSANDO o membro entrou direto sem receber, nao manda nada.
      if (envio.status === "ENVIADO" && !confirmarTelefone) {
        confirmarTelefone = envio.telefone;
      }
    }
  }

  if (confirmarTelefone) {
    await ctx.scheduler.runAfter(0, enviarConfirmacaoRef, {
      telefone: confirmarTelefone,
    });
  }
}

/**
 * Endpoint "confirmar dados sem mudar nada" — usado quando o membro
 * abre /meu-perfil pela campanha e clica "Confirmar dados" sem editar.
 * Apenas grava perfilAtualizadoEm/Por e dispara hook de campanha.
 */
// ============ FAMILIA (self-service) ============

/**
 * Busca membros para selecionar como conjuge ou referenciar como pai/mae.
 * Retorna nome + foto + entidadeId. Limitado a 20 resultados.
 * Exige termo de busca >= 2 caracteres.
 */
export const searchMembersForFamily = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const entidades = await ctx.db.query("entidades").collect();
    const result = entidades
      .filter((e) => e.status === "ATIVO")
      .filter((e) => e._id !== myMembro?.entidadeId)
      .filter((e) => (e.nomeCompleto || "").toLowerCase().includes(term))
      .slice(0, 20)
      .map((e) => ({
        entidadeId: e._id,
        nomeCompleto: e.nomeCompleto ?? "",
        foto: e.foto,
      }));
    return result;
  },
});

export const getMyFamily = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) return null;

    let conjuge = null;
    if (membro.conjugeId) {
      const conjugeEnt = await ctx.db.get(membro.conjugeId);
      if (conjugeEnt) {
        conjuge = {
          entidadeId: conjugeEnt._id,
          nomeCompleto: conjugeEnt.nomeCompleto ?? "",
          foto: conjugeEnt.foto,
        };
      }
    }

    // Filhos: por responsaveis onde eu sou o responsavel
    const minhasResponsabilidades = await ctx.db
      .query("responsaveis")
      .withIndex("by_responsavel", (q) =>
        q.eq("responsavelEntidadeId", membro.entidadeId)
      )
      .collect();

    const filhos = await Promise.all(
      minhasResponsabilidades.map(async (r) => {
        const filho = await ctx.db.get(r.criancaEntidadeId);
        if (!filho) return null;
        return {
          entidadeId: filho._id,
          nomeCompleto: filho.nomeCompleto ?? "",
          dataNascimento: filho.dataNascimento,
          foto: filho.foto,
          tipo: r.tipo,
          vinculoIgreja: filho.vinculoIgreja,
        };
      })
    );

    return {
      conjuge,
      filhos: filhos.filter((f): f is NonNullable<typeof f> => f !== null),
    };
  },
});

export const vincularConjuge = mutation({
  args: { conjugeEntidadeId: v.id("entidades") },
  handler: async (ctx, { conjugeEntidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    if (myMembro.entidadeId === conjugeEntidadeId) {
      throw new Error("Nao e possivel se vincular a si mesmo");
    }

    const conjugeEntidade = await ctx.db.get(conjugeEntidadeId);
    if (!conjugeEntidade) throw new Error("Conjuge nao encontrado");

    await ctx.db.patch(myMembro._id, { conjugeId: conjugeEntidadeId });
    await espelharConjuge(ctx, myMembro.entidadeId, conjugeEntidadeId);

    return { ok: true };
  },
});

export const desvincularConjuge = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    const oldConjugeEntId = myMembro.conjugeId;
    await ctx.db.patch(myMembro._id, { conjugeId: undefined });

    if (oldConjugeEntId) {
      const oldConjugeMembro = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", oldConjugeEntId))
        .first();
      if (oldConjugeMembro?.conjugeId === myMembro.entidadeId) {
        await ctx.db.patch(oldConjugeMembro._id, { conjugeId: undefined });
      }
    }

    return { ok: true };
  },
});

// ============ FILHOS (self-service) ============

/**
 * Cria nova entidade como filho do membro autenticado.
 * - Se batizadoNestaIgreja=true, cria tambem registro em membros com
 *   tipoRol=NAO_COMUNGANTE (caso ainda <18, podera virar COMUNGANTE
 *   apos profissao de fe).
 * - Se nao, cria so entidade com vinculoIgreja=NAO_MEMBRO.
 * Vincula via tabela responsaveis (tipo PAI/MAE definido pelo sexo
 * do responsavel quando disponivel; senao RESPONSAVEL).
 */
export const adicionarFilho = mutation({
  args: {
    nomeCompleto: v.string(),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    batizadoNestaIgreja: v.optional(v.boolean()),
    dataBatismo: v.optional(v.string()),
    usoImagem: v.optional(v.union(
      v.literal("AUTORIZADO"),
      v.literal("NAO_AUTORIZADO"),
      v.literal("PENDENTE")
    )),
    observacoesMedicas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      nomeCompleto,
      dataNascimento,
      sexo,
      batizadoNestaIgreja,
      dataBatismo,
      usoImagem,
      observacoesMedicas,
    } = args;

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    const minhaEntidade = await ctx.db.get(myMembro.entidadeId);
    if (!minhaEntidade) throw new Error("Minha entidade nao encontrada");

    const filhoEntidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: batizadoNestaIgreja ? ["MEMBRO"] : ["DEPENDENTE"],
      status: "ATIVO",
      nomeCompleto,
      dataNascimento,
      sexo,
      vinculoIgreja: batizadoNestaIgreja ? "MEMBRO" : "NAO_MEMBRO",
      perfilAtualizadoEm: Date.now(),
      perfilAtualizadoPor: myMembro._id,
    });

    if (batizadoNestaIgreja) {
      await ctx.db.insert("membros", {
        entidadeId: filhoEntidadeId,
        role: "membro",
        cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
        dataBatismo: dataBatismo || undefined,
      });
    }

    const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
      minhaEntidade.sexo === "M"
        ? "PAI"
        : minhaEntidade.sexo === "F"
          ? "MAE"
          : "RESPONSAVEL";

    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: myMembro.entidadeId,
      tipo,
      principal: true,
      criadoEm: Date.now(),
    });
    // Filho pertence ao casal: vincula tambem ao conjuge, se houver
    await vincularCriancaAoConjuge(ctx, myMembro.entidadeId, filhoEntidadeId);

    // Departamento infantil: se idade derivavel <11, cria criancaPerfil
    const turma = turmaFromDataNascimento(dataNascimento);
    if (turma && (usoImagem || observacoesMedicas)) {
      await ctx.db.insert("criancaPerfil", {
        entidadeId: filhoEntidadeId,
        turma,
        usoImagem: usoImagem || "PENDENTE",
        observacoesMedicas: observacoesMedicas || undefined,
        criadoEm: Date.now(),
      });
    }

    return { filhoEntidadeId };
  },
});

/**
 * Deriva a turma do departamento infantil a partir da data de nascimento.
 * Retorna null para idade >10 ou data invalida.
 */
function turmaFromDataNascimento(dataNascimento: string | undefined): string | null {
  if (!dataNascimento) return null;
  const [by, bm, bd] = dataNascimento.split("-").map(Number);
  if ([by, bm, bd].some((n) => Number.isNaN(n))) return null;
  // Idade "hoje" no fuso da igreja (Sao Paulo), nao no UTC do servidor.
  const sp = getSaoPauloDate();
  let age = sp.year - by;
  const beforeBirthday = sp.month < bm || (sp.month === bm && sp.day < bd);
  if (beforeBirthday) age--;
  if (age < 0) return null;
  if (age <= 2) return "0-2";
  if (age <= 4) return "3-4";
  if (age <= 6) return "5-6";
  if (age <= 8) return "7-8";
  if (age <= 10) return "9-10";
  return null;
}

export const vincularFilhoExistente = mutation({
  args: { filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { filhoEntidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    if (filhoEntidadeId === myMembro.entidadeId) {
      throw new Error("Nao e possivel se vincular como proprio filho");
    }

    // Idempotente — nao duplica se ja existe vinculo
    const existente = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    if (existente.some((r) => r.responsavelEntidadeId === myMembro.entidadeId)) {
      return { ok: true, jaVinculado: true };
    }

    const minhaEntidade = await ctx.db.get(myMembro.entidadeId);
    const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
      minhaEntidade?.sexo === "M"
        ? "PAI"
        : minhaEntidade?.sexo === "F"
          ? "MAE"
          : "RESPONSAVEL";

    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: myMembro.entidadeId,
      tipo,
      principal: false,
      criadoEm: Date.now(),
    });
    // Filho pertence ao casal: vincula tambem ao conjuge, se houver
    await vincularCriancaAoConjuge(ctx, myMembro.entidadeId, filhoEntidadeId);
    return { ok: true };
  },
});

export const removerFilho = mutation({
  args: { filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { filhoEntidadeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myMembro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!myMembro) throw new Error("Member not found");

    // Remove apenas o link, mantem a entidade existindo
    const links = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    for (const link of links) {
      if (link.responsavelEntidadeId === myMembro.entidadeId) {
        await ctx.db.delete(link._id);
      }
    }
    return { ok: true };
  },
});

export const confirmProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!membro) throw new Error("Member not found");

    const now = Date.now();
    await ctx.db.patch(membro.entidadeId, {
      perfilAtualizadoEm: now,
      perfilAtualizadoPor: membro._id,
    });

    await marcarCampanhasAtualizadas(ctx, membro._id, now);
    return membro._id;
  },
});

/**
 * Permite o membro atualizar as proprias datas sacramentais
 * (membresia, batismo, conversao). Marcadas como "pendentes de
 * verificacao": removidas de `camposVerificados` e `dadosIncertos`
 * — secretaria deve confirmar depois com o livro de registros.
 *
 * Passar null para limpar; undefined para nao alterar.
 */
export const updateMembresiaDatas = mutation({
  args: {
    dataMembresia: v.optional(v.union(v.string(), v.null())),
    dataBatismo: v.optional(v.union(v.string(), v.null())),
    dataConversao: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membro = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!membro) throw new Error("Member not found");
    if (membro.userId !== userId) {
      throw new Error("Unauthorized: can only update own profile");
    }

    const patch: Record<string, string | undefined> = {};
    const camposTocados: string[] = [];

    for (const campo of ["dataMembresia", "dataBatismo", "dataConversao"] as const) {
      const valor = args[campo];
      if (valor === undefined) continue;
      patch[campo] = valor ?? undefined;
      camposTocados.push(campo);
    }

    if (camposTocados.length === 0) {
      return { changed: false };
    }

    const oldMembro = await ctx.db.get(membro._id);
    await ctx.db.patch(membro._id, patch);
    const newMembro = await ctx.db.get(membro._id);
    await createFieldAuditLogs(ctx, oldMembro, newMembro, "membros", membro._id);

    // Limpa verificacao e marcacao de "nao lembro" para campos que membro acabou
    // de preencher. Secretaria precisa re-verificar com livro fisico.
    const entidade = await ctx.db.get(membro.entidadeId);
    if (entidade) {
      const camposVerificados = (entidade.camposVerificados ?? []).filter(
        (c) => !camposTocados.includes(c.campo)
      );
      const dadosIncertos = (entidade.dadosIncertos ?? []).filter(
        (c) => !(camposTocados.includes(c) && patch[c])
      );
      const now = Date.now();
      await ctx.db.patch(membro.entidadeId, {
        camposVerificados,
        dadosIncertos,
        perfilAtualizadoEm: now,
        perfilAtualizadoPor: membro._id,
      });
      await marcarCampanhasAtualizadas(ctx, membro._id, now);
    }

    return { changed: true, camposTocados };
  },
});
