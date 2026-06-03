/**
 * Mutations para edicao de dados eclesiasticos do membro.
 * Gated por `membros:update_eclesiastico` (ou `membros:update` para retrocompat).
 *
 * Permitido a: admin, pastor, secretaria, secretario_executivo.
 *
 * Apenas campos eclesiasticos podem ser editados — dados pessoais (nome, CPF,
 * endereco, contato) ficam de fora.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAnyPermission } from "../_shared/requirePermission";
import { createFieldAuditLogs, createActionAuditLog } from "../_shared/auditHelpers";
import { getTipoRol, type CargoEclesiastico, type StatusEntidade, type TipoRol } from "./tipoRolHelpers";
import type { Doc } from "../_generated/dataModel";

export type RolCategoria = "PRINCIPAL" | "SEPARADO" | "AUSENTE" | "ARQUIVO";

/** Mapeia o tipoRol derivado (IPB) para a categoria de rol exibida. */
function categoriaDoRol(
  cargo: string | undefined,
  status: string,
  override: string | undefined
): RolCategoria {
  const t: TipoRol | null = getTipoRol(
    cargo as CargoEclesiastico | undefined,
    status as StatusEntidade,
    override as TipoRol | undefined
  );
  if (t === null) return "ARQUIVO";
  if (t === "COMUNGANTE") return "PRINCIPAL";
  if (t === "NAO_COMUNGANTE") return "SEPARADO";
  return "AUSENTE";
}

const ECLESIASTICO_FIELDS = new Set([
  // Membresia
  "rol",
  "dataMembresia",
  "formaAdmissao",
  "cargoEclesiastico",
  "dataConversao",
  "dataBatismo",
  "igrejaProcedencia",
  "numeroMatricula",
  "observacoesPastorais",
  "tipoRolOverride",
  "civilmenteCapazes",
  // Demissao
  "formaDemissao",
  "dataDemissao",
  "igrejaDestino",
  "dataFalecimento",
]);

export const updateEclesiastico = mutation({
  args: {
    membroId: v.id("membros"),
    data: v.any(),
  },
  handler: async (ctx, { membroId, data }) => {
    await requireAnyPermission(ctx, [
      "membros:update_eclesiastico",
      "membros:update",
    ]);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const editor = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!editor) throw new Error("Editor nao encontrado");

    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");

    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data ?? {})) {
      if (ECLESIASTICO_FIELDS.has(key)) {
        filtered[key] = value === "" ? undefined : value;
      }
    }

    if (Object.keys(filtered).length === 0) {
      return { changed: false };
    }

    const oldMembro = { ...membro };
    await ctx.db.patch(membroId, filtered);
    const newMembro = await ctx.db.get(membroId);
    await createFieldAuditLogs(ctx, oldMembro, newMembro, "membros", membroId);

    return { changed: true, fields: Object.keys(filtered) };
  },
});

/**
 * Marca um campo como verificado pelo livro fisico (selo da secretaria).
 * Adiciona/atualiza entry em `entidades.camposVerificados`.
 */
export const marcarCampoVerificado = mutation({
  args: {
    entidadeId: v.id("entidades"),
    campo: v.string(),
    desmarcar: v.optional(v.boolean()),
  },
  handler: async (ctx, { entidadeId, campo, desmarcar }) => {
    await requireAnyPermission(ctx, [
      "membros:update_eclesiastico",
      "membros:update",
    ]);

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const verificador = await ctx.db
      .query("membros")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!verificador) throw new Error("Verificador nao encontrado");

    const entidade = await ctx.db.get(entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");

    const atuais = entidade.camposVerificados ?? [];
    const semCampo = atuais.filter((c) => c.campo !== campo);

    const novos = desmarcar
      ? semCampo
      : [
          ...semCampo,
          {
            campo,
            verificadoEm: Date.now(),
            verificadoPor: verificador._id,
          },
        ];

    // Tambem remove de dadosIncertos quando marca como verificado
    const dadosIncertos = desmarcar
      ? entidade.dadosIncertos
      : (entidade.dadosIncertos ?? []).filter((c) => c !== campo);

    await ctx.db.patch(entidadeId, {
      camposVerificados: novos.length > 0 ? novos : undefined,
      dadosIncertos:
        dadosIncertos && dadosIncertos.length > 0 ? dadosIncertos : undefined,
    });

    return { ok: true };
  },
});

/**
 * Retorna familia (conjuge + filhos) de um membro arbitrario.
 * Usado por secretario_executivo e secretaria para consulta.
 */
export const getFamily = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, ["membros:read", "diretorio:read"]);

    const membro = await ctx.db.get(membroId);
    if (!membro) return null;

    let conjuge: {
      entidadeId: string;
      nomeCompleto: string;
      foto?: string;
    } | null = null;
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

    const links = await ctx.db
      .query("responsaveis")
      .withIndex("by_responsavel", (q) =>
        q.eq("responsavelEntidadeId", membro.entidadeId)
      )
      .collect();

    const filhos = (
      await Promise.all(
        links.map(async (r) => {
          const filho = await ctx.db.get(r.criancaEntidadeId);
          if (!filho) return null;
          return {
            entidadeId: filho._id,
            nomeCompleto: filho.nomeCompleto ?? "",
            foto: filho.foto,
            dataNascimento: filho.dataNascimento,
          };
        })
      )
    ).filter(Boolean) as Array<{
      entidadeId: string;
      nomeCompleto: string;
      foto?: string;
      dataNascimento?: string;
    }>;

    return { conjuge, filhos };
  },
});

type LinhaSecretario = {
  _id: string; // membroId (membro) ou entidadeId (dependente)
  ehMembro: boolean;
  entidadeId: string;
  entidade: { nomeCompleto?: string; whatsapp?: string; status?: string };
  cargoEclesiastico?: string;
  rol?: string;
  tipoRolOverride?: string;
  numeroMatricula?: string;
  dataConversao?: string;
  dataBatismo?: string;
  dataMembresia?: string;
  civilmenteCapazes?: boolean;
  rolCategoria: RolCategoria | null; // null = dependente (fora do rol)
  sexo?: string;
  dataNascimento?: string;
  familiaHeadId: string;
  familiaHeadNome: string;
  familiaOrder: number; // 0 chefe (homem adulto), 1 conjuge, 2 filho
};

/**
 * Lista para a tabela do secretario executivo: membros + dados eclesiasticos
 * + filhos DEPENDENTES (nao-membros, ex: crianca nao batizada) + metadados de
 * familia para agrupamento.
 *
 * Familia: homem adulto (chefe) -> conjuge -> filhos (mais velho primeiro).
 */
export const listParaSecretario = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }): Promise<LinhaSecretario[]> => {
    await requireAnyPermission(ctx, [
      "membros:update_eclesiastico",
      "membros:read",
    ]);

    const membros = await ctx.db.query("membros").collect();
    const membroPorEnt = new Map<string, Doc<"membros">>();
    const entPorId = new Map<string, Doc<"entidades">>();
    for (const m of membros) {
      const e = await ctx.db.get(m.entidadeId);
      if (!e) continue;
      membroPorEnt.set(e._id, m);
      entPorId.set(e._id, e);
    }

    // Relacoes de parentesco: pai precisa ser membro. Filhos podem ser
    // membros OU dependentes (entidade sem membro) — estes tambem entram.
    const filhosDe = new Map<string, string[]>();
    const paisDe = new Map<string, string[]>();
    const responsaveis = await ctx.db.query("responsaveis").collect();
    for (const r of responsaveis) {
      const crianca = r.criancaEntidadeId as string;
      const resp = r.responsavelEntidadeId as string;
      if (!membroPorEnt.has(resp)) continue;
      if (!entPorId.has(crianca)) {
        const ce = await ctx.db.get(r.criancaEntidadeId);
        if (!ce) continue;
        entPorId.set(crianca, ce);
      }
      (filhosDe.get(resp) ?? filhosDe.set(resp, []).get(resp)!).push(crianca);
      (paisDe.get(crianca) ?? paisDe.set(crianca, []).get(crianca)!).push(resp);
    }

    // Chefe de um casal = homem; sem homem, deterministico (menor id)
    function chefeDoCasal(entId: string): string {
      const m = membroPorEnt.get(entId);
      const conjId = m?.conjugeId as string | undefined;
      if (!conjId || !membroPorEnt.has(conjId)) return entId;
      if (entPorId.get(entId)?.sexo === "M") return entId;
      if (entPorId.get(conjId)?.sexo === "M") return conjId;
      return entId < conjId ? entId : conjId;
    }

    function metaFamilia(entId: string): { headId: string; order: number } {
      const m = membroPorEnt.get(entId);
      const conjId = m?.conjugeId as string | undefined;
      const temConjuge = !!conjId && membroPorEnt.has(conjId);
      const temFilhos = (filhosDe.get(entId)?.length ?? 0) > 0;
      const pais = paisDe.get(entId) ?? [];
      const dependente = pais.length > 0 && !temConjuge && !temFilhos;
      if (dependente) return { headId: chefeDoCasal(pais[0]), order: 2 };
      if (temConjuge) {
        const headId = chefeDoCasal(entId);
        return { headId, order: headId === entId ? 0 : 1 };
      }
      return { headId: entId, order: 0 };
    }

    let linhas: LinhaSecretario[] = [];
    for (const [entId, e] of entPorId) {
      const m = membroPorEnt.get(entId);
      const { headId, order } = metaFamilia(entId);
      linhas.push({
        _id: m ? m._id : entId,
        ehMembro: !!m,
        entidadeId: entId,
        entidade: {
          nomeCompleto: e.nomeCompleto,
          whatsapp: e.whatsapp,
          status: e.status,
        },
        cargoEclesiastico: m?.cargoEclesiastico,
        rol: m?.rol,
        tipoRolOverride: m?.tipoRolOverride,
        numeroMatricula: m?.numeroMatricula,
        dataConversao: m?.dataConversao,
        dataBatismo: m?.dataBatismo,
        dataMembresia: m?.dataMembresia,
        civilmenteCapazes: m?.civilmenteCapazes,
        rolCategoria: m
          ? categoriaDoRol(m.cargoEclesiastico, e.status, m.tipoRolOverride)
          : null,
        sexo: e.sexo,
        dataNascimento: e.dataNascimento,
        familiaHeadId: headId,
        familiaHeadNome: entPorId.get(headId)?.nomeCompleto ?? "",
        familiaOrder: order,
      });
    }

    if (search) {
      const t = search.toLowerCase();
      linhas = linhas.filter(
        (l) =>
          (l.entidade.nomeCompleto ?? "").toLowerCase().includes(t) ||
          (l.entidade.whatsapp ?? "").includes(t)
      );
    }

    linhas.sort((a, b) =>
      (a.entidade.nomeCompleto ?? "").localeCompare(b.entidade.nomeCompleto ?? "")
    );
    return linhas;
  },
});

const FIELD_LABELS: Record<string, string> = {
  cargoEclesiastico: "Cargo eclesiastico",
  rol: "Rol",
  tipoRolOverride: "Tipo de rol",
  numeroMatricula: "Matricula",
  dataConversao: "Data de conversao",
  dataBatismo: "Data de batismo",
  dataMembresia: "Membresia",
  formaAdmissao: "Forma de admissao",
  igrejaProcedencia: "Igreja de procedencia",
  observacoesPastorais: "Observacoes pastorais",
  formaDemissao: "Forma de demissao",
  dataDemissao: "Data de demissao",
  igrejaDestino: "Igreja destino",
  dataFalecimento: "Data de falecimento",
};

type HistoricoItem = {
  id: string;
  field: string;
  label: string;
  de: string | null;
  para: string | null;
  em: number;
  autor: string | null;
};

/**
 * Historico de alteracoes eclesiasticas de um membro (FIELD_CHANGE no
 * auditLog), para revisao e reversao de ajustes acidentais.
 */
export const getHistorico = query({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }): Promise<HistoricoItem[]> => {
    await requireAnyPermission(ctx, [
      "membros:update_eclesiastico",
      "membros:read",
    ]);

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_referencia", (q) =>
        q.eq("referenciaTabela", "membros").eq("referenciaId", membroId)
      )
      .order("desc")
      .take(200);

    const eclesi = logs.filter(
      (l) => l.action === "FIELD_CHANGE" && l.field && ECLESIASTICO_FIELDS.has(l.field)
    );

    const out: HistoricoItem[] = [];
    const nomeCache = new Map<string, string | null>();
    for (const l of eclesi) {
      let autor: string | null = null;
      if (l.membroId) {
        const key = l.membroId as string;
        if (nomeCache.has(key)) {
          autor = nomeCache.get(key) ?? null;
        } else {
          const a = await ctx.db.get(l.membroId);
          const e = a ? await ctx.db.get(a.entidadeId) : null;
          autor = e?.nomeCompleto ?? null;
          nomeCache.set(key, autor);
        }
      }
      const de = l.from === undefined || l.from === null ? null : String(l.from);
      const para = l.to === undefined || l.to === null ? null : String(l.to);
      out.push({
        id: l._id,
        field: l.field as string,
        label: FIELD_LABELS[l.field as string] ?? (l.field as string),
        de,
        para,
        em: l.createdAt,
        autor,
      });
    }
    return out;
  },
});

/**
 * Promove um dependente (entidade sem membro) a membro, criando o registro
 * de `membros` e atualizando o vinculo da entidade. Habilita a edicao dos
 * campos eclesiasticos dele na tabela.
 */
export const tornarMembro = mutation({
  args: { entidadeId: v.id("entidades") },
  handler: async (ctx, { entidadeId }) => {
    await requireAnyPermission(ctx, [
      "membros:update_eclesiastico",
      "membros:update",
    ]);

    const entidade = await ctx.db.get(entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");

    const existente = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
      .first();
    if (existente) return { membroId: existente._id, jaEra: true };

    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: "membro",
      cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
    });

    const papeis = Array.from(
      new Set([...(entidade.papeis ?? []).filter((p) => p !== "DEPENDENTE"), "MEMBRO"])
    ) as typeof entidade.papeis;
    await ctx.db.patch(entidadeId, { papeis, vinculoIgreja: "MEMBRO" });

    await createActionAuditLog(ctx, "CREATE", "membros", membroId);

    return { membroId, jaEra: false };
  },
});

/**
 * Atualiza o status da entidade (ATIVO/INATIVO/TRANSFERIDO/DESLIGADO/FALECIDO).
 * Afeta a categoria de rol derivada (ATIVO -> Principal/Separado; demais ->
 * Arquivo/Ausente) e o bloqueio de login. Audita a mudanca.
 */
export const updateStatus = mutation({
  args: {
    entidadeId: v.id("entidades"),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("INATIVO"),
      v.literal("TRANSFERIDO"),
      v.literal("DESLIGADO"),
      v.literal("FALECIDO")
    ),
  },
  handler: async (ctx, { entidadeId, status }) => {
    await requireAnyPermission(ctx, [
      "membros:update_eclesiastico",
      "membros:update",
    ]);
    const entidade = await ctx.db.get(entidadeId);
    if (!entidade) throw new Error("Entidade nao encontrada");
    if (entidade.status === status) return { changed: false };

    const old = { ...entidade };
    await ctx.db.patch(entidadeId, { status });
    const novo = await ctx.db.get(entidadeId);
    await createFieldAuditLogs(ctx, old, novo, "entidades", entidadeId);
    return { changed: true };
  },
});

// ============ VINCULOS DE FAMILIA (admin / secretario) ============

const PERM_FAMILIA = ["membros:update_eclesiastico", "membros:update"];

/** Busca entidades por nome para vincular como conjuge/filho. */
export const buscarEntidadesFamilia = query({
  args: { termo: v.string(), excluirEntidadeId: v.optional(v.id("entidades")) },
  handler: async (ctx, { termo, excluirEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const t = termo.trim().toLowerCase();
    if (t.length < 2) return [];
    const entidades = await ctx.db.query("entidades").collect();
    const out: Array<{ entidadeId: string; nomeCompleto: string; ehMembro: boolean }> = [];
    for (const e of entidades) {
      if (e._id === excluirEntidadeId) continue;
      if (!(e.nomeCompleto ?? "").toLowerCase().includes(t)) continue;
      const m = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", e._id))
        .first();
      out.push({ entidadeId: e._id, nomeCompleto: e.nomeCompleto ?? "", ehMembro: !!m });
      if (out.length >= 20) break;
    }
    return out;
  },
});

export const vincularConjugeAdmin = mutation({
  args: { membroId: v.id("membros"), conjugeEntidadeId: v.id("entidades") },
  handler: async (ctx, { membroId, conjugeEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    if (membro.entidadeId === conjugeEntidadeId) {
      throw new Error("Nao e possivel vincular a propria pessoa");
    }
    const conjuge = await ctx.db.get(conjugeEntidadeId);
    if (!conjuge) throw new Error("Conjuge nao encontrado");

    await ctx.db.patch(membroId, { conjugeId: conjugeEntidadeId });
    const conjugeMembro = await ctx.db
      .query("membros")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", conjugeEntidadeId))
      .first();
    if (conjugeMembro && !conjugeMembro.conjugeId) {
      await ctx.db.patch(conjugeMembro._id, { conjugeId: membro.entidadeId });
    }
    return { ok: true };
  },
});

export const desvincularConjugeAdmin = mutation({
  args: { membroId: v.id("membros") },
  handler: async (ctx, { membroId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const membro = await ctx.db.get(membroId);
    if (!membro) throw new Error("Membro nao encontrado");
    const antigoConjuge = membro.conjugeId;
    await ctx.db.patch(membroId, { conjugeId: undefined });
    if (antigoConjuge) {
      const outro = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", antigoConjuge))
        .first();
      if (outro && outro.conjugeId === membro.entidadeId) {
        await ctx.db.patch(outro._id, { conjugeId: undefined });
      }
    }
    return { ok: true };
  },
});

export const adicionarFilhoAdmin = mutation({
  args: {
    responsavelMembroId: v.id("membros"),
    nomeCompleto: v.string(),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    batizadoNestaIgreja: v.optional(v.boolean()),
    dataBatismo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const responsavel = await ctx.db.get(args.responsavelMembroId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");
    const respEntidade = await ctx.db.get(responsavel.entidadeId);
    if (!respEntidade) throw new Error("Entidade do responsavel nao encontrada");

    const filhoEntidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: args.batizadoNestaIgreja ? ["MEMBRO"] : ["DEPENDENTE"],
      status: "ATIVO",
      nomeCompleto: args.nomeCompleto,
      dataNascimento: args.dataNascimento,
      sexo: args.sexo,
      vinculoIgreja: args.batizadoNestaIgreja ? "MEMBRO" : "NAO_MEMBRO",
      perfilAtualizadoEm: Date.now(),
    });

    if (args.batizadoNestaIgreja) {
      await ctx.db.insert("membros", {
        entidadeId: filhoEntidadeId,
        role: "membro",
        cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
        dataBatismo: args.dataBatismo || undefined,
      });
    }

    const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
      respEntidade.sexo === "M" ? "PAI" : respEntidade.sexo === "F" ? "MAE" : "RESPONSAVEL";
    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: responsavel.entidadeId,
      tipo,
      principal: true,
      criadoEm: Date.now(),
    });
    return { filhoEntidadeId };
  },
});

export const vincularFilhoExistenteAdmin = mutation({
  args: { responsavelMembroId: v.id("membros"), filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { responsavelMembroId, filhoEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const responsavel = await ctx.db.get(responsavelMembroId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");
    if (filhoEntidadeId === responsavel.entidadeId) {
      throw new Error("Nao e possivel vincular como proprio filho");
    }
    const existente = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    if (existente.some((r) => r.responsavelEntidadeId === responsavel.entidadeId)) {
      return { ok: true, jaVinculado: true };
    }
    const respEntidade = await ctx.db.get(responsavel.entidadeId);
    const tipo: "PAI" | "MAE" | "RESPONSAVEL" =
      respEntidade?.sexo === "M" ? "PAI" : respEntidade?.sexo === "F" ? "MAE" : "RESPONSAVEL";
    await ctx.db.insert("responsaveis", {
      criancaEntidadeId: filhoEntidadeId,
      responsavelEntidadeId: responsavel.entidadeId,
      tipo,
      principal: false,
      criadoEm: Date.now(),
    });
    return { ok: true };
  },
});

export const removerFilhoAdmin = mutation({
  args: { responsavelMembroId: v.id("membros"), filhoEntidadeId: v.id("entidades") },
  handler: async (ctx, { responsavelMembroId, filhoEntidadeId }) => {
    await requireAnyPermission(ctx, PERM_FAMILIA);
    const responsavel = await ctx.db.get(responsavelMembroId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");
    const links = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoEntidadeId))
      .collect();
    for (const link of links) {
      if (link.responsavelEntidadeId === responsavel.entidadeId) {
        await ctx.db.delete(link._id);
      }
    }
    return { ok: true };
  },
});
