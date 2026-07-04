import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { createActionAuditLog, createFieldAuditLogs } from "../_shared/auditHelpers";

// Ferramenta one-off (CLI) para tratar cadastro duplicado de membro:
// `inspecionar` mostra o diff de campos e as referencias ao duplicado;
// `mesclar` copia campos vazios para o registro destino, re-aponta os
// vinculos (conjuge, responsaveis, PGs, escalas) e apaga o duplicado.

const vazio = (x: unknown) => x === undefined || x === null || x === "";

async function acharPorEntidade(ctx: { db: any }, entidadeId: string) {
  return await ctx.db
    .query("membros")
    .withIndex("by_entidade", (q: any) => q.eq("entidadeId", entidadeId))
    .first();
}

async function referenciasAoDuplicado(ctx: { db: any }, dupEnt: string, dupMem: string | null) {
  const refs: string[] = [];

  const membros = await ctx.db.query("membros").collect();
  for (const m of membros) {
    if (m.conjugeId === dupEnt) refs.push(`membros.conjugeId (${m._id})`);
  }
  const responsaveis = await ctx.db.query("responsaveis").collect();
  for (const r of responsaveis) {
    if (r.responsavelEntidadeId === dupEnt) refs.push(`responsaveis.responsavel (${r._id})`);
    if (r.criancaEntidadeId === dupEnt) refs.push(`responsaveis.crianca (${r._id})`);
  }
  if (dupMem) {
    const pgs = await ctx.db
      .query("pgMembros")
      .withIndex("by_membro", (q: any) => q.eq("membroId", dupMem))
      .collect();
    for (const p of pgs) refs.push(`pgMembros (${p._id})`);
    const escalas = await ctx.db.query("cultoEscalas").collect();
    for (const e of escalas) {
      if (e.membroId === dupMem) refs.push(`cultoEscalas (${e._id})`);
    }
  }
  return refs;
}

export const inspecionar = internalQuery({
  args: { dupEntidadeId: v.id("entidades"), destinoEntidadeId: v.id("entidades") },
  handler: async (ctx, { dupEntidadeId, destinoEntidadeId }) => {
    const dup = await ctx.db.get(dupEntidadeId);
    const destino = await ctx.db.get(destinoEntidadeId);
    if (!dup || !destino) throw new Error("Entidade nao encontrada");
    const dupMem = await acharPorEntidade(ctx, dupEntidadeId);
    const destinoMem = await acharPorEntidade(ctx, destinoEntidadeId);

    // Campos que o duplicado tem e o destino nao
    const soNoDup: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(dup)) {
      if (k.startsWith("_")) continue;
      if (!vazio(val) && vazio((destino as Record<string, unknown>)[k])) soNoDup[k] = val;
    }
    const soNoDupMembro: Record<string, unknown> = {};
    if (dupMem && destinoMem) {
      for (const [k, val] of Object.entries(dupMem)) {
        if (k.startsWith("_") || k === "entidadeId" || k === "userId" || k === "role" || k === "permissions") continue;
        if (!vazio(val) && vazio((destinoMem as Record<string, unknown>)[k])) soNoDupMembro[k] = val;
      }
    }

    return {
      dup: { nome: dup.nomeCompleto, membroId: dupMem?._id ?? null, temLogin: !!dupMem?.userId },
      destino: { nome: destino.nomeCompleto, membroId: destinoMem?._id ?? null, temLogin: !!destinoMem?.userId },
      camposSoNoDup: soNoDup,
      camposMembroSoNoDup: soNoDupMembro,
      referenciasAoDup: await referenciasAoDuplicado(ctx, dupEntidadeId, dupMem?._id ?? null),
    };
  },
});

export const mesclar = internalMutation({
  args: { dupEntidadeId: v.id("entidades"), destinoEntidadeId: v.id("entidades") },
  handler: async (ctx, { dupEntidadeId, destinoEntidadeId }) => {
    const dup = await ctx.db.get(dupEntidadeId);
    const destino = await ctx.db.get(destinoEntidadeId);
    if (!dup || !destino) throw new Error("Entidade nao encontrada");
    const dupMem = await acharPorEntidade(ctx, dupEntidadeId);
    const destinoMem = await acharPorEntidade(ctx, destinoEntidadeId);
    if (dupMem?.userId) throw new Error("Duplicado tem login — mesclar na outra direcao");

    const acoes: string[] = [];

    // 1. Copia campos vazios (entidade e membro)
    const patchEnt: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(dup)) {
      if (k.startsWith("_")) continue;
      if (!vazio(val) && vazio((destino as Record<string, unknown>)[k])) patchEnt[k] = val;
    }
    if (Object.keys(patchEnt).length > 0) {
      await ctx.db.patch(destinoEntidadeId, patchEnt);
      const depois = await ctx.db.get(destinoEntidadeId);
      await createFieldAuditLogs(ctx, destino, depois, "entidades");
      acoes.push(`entidade: copiados ${Object.keys(patchEnt).join(", ")}`);
    }
    if (dupMem && destinoMem) {
      const patchMem: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(dupMem)) {
        if (k.startsWith("_") || k === "entidadeId" || k === "userId" || k === "role" || k === "permissions") continue;
        if (!vazio(val) && vazio((destinoMem as Record<string, unknown>)[k])) patchMem[k] = val;
      }
      if (Object.keys(patchMem).length > 0) {
        await ctx.db.patch(destinoMem._id, patchMem);
        const depois = await ctx.db.get(destinoMem._id);
        await createFieldAuditLogs(ctx, destinoMem, depois, "membros");
        acoes.push(`membro: copiados ${Object.keys(patchMem).join(", ")}`);
      }
    }

    // 2. Re-aponta referencias para o destino
    const membros = await ctx.db.query("membros").collect();
    for (const m of membros) {
      if (m.conjugeId === dupEntidadeId) {
        await ctx.db.patch(m._id, { conjugeId: destinoEntidadeId });
        acoes.push(`conjugeId re-apontado (${m._id})`);
      }
    }
    const responsaveis = await ctx.db.query("responsaveis").collect();
    for (const r of responsaveis) {
      if (r.responsavelEntidadeId === dupEntidadeId) {
        await ctx.db.patch(r._id, { responsavelEntidadeId: destinoEntidadeId });
        acoes.push(`responsaveis.responsavel re-apontado (${r._id})`);
      }
      if (r.criancaEntidadeId === dupEntidadeId) {
        await ctx.db.patch(r._id, { criancaEntidadeId: destinoEntidadeId });
        acoes.push(`responsaveis.crianca re-apontado (${r._id})`);
      }
    }
    if (dupMem && destinoMem) {
      const pgs = await ctx.db
        .query("pgMembros")
        .withIndex("by_membro", (q: any) => q.eq("membroId", dupMem._id))
        .collect();
      for (const p of pgs) {
        await ctx.db.patch(p._id, { membroId: destinoMem._id });
        acoes.push(`pgMembros re-apontado (${p._id})`);
      }
      const escalas = await ctx.db.query("cultoEscalas").collect();
      for (const e of escalas) {
        if (e.membroId === dupMem._id) {
          await ctx.db.patch(e._id, { membroId: destinoMem._id });
          acoes.push(`cultoEscalas re-apontado (${e._id})`);
        }
      }
    }

    // 3. Apaga o duplicado
    if (dupMem) {
      await createActionAuditLog(ctx, "DELETE", "membros", dupMem._id);
      await ctx.db.delete(dupMem._id);
      acoes.push(`membro duplicado apagado (${dupMem._id})`);
    }
    await createActionAuditLog(ctx, "DELETE", "entidades", dupEntidadeId);
    await ctx.db.delete(dupEntidadeId);
    acoes.push(`entidade duplicada apagada (${dupEntidadeId})`);

    return acoes;
  },
});
