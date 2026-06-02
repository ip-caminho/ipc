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
import { createFieldAuditLogs } from "../_shared/auditHelpers";

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
