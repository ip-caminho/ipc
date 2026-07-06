import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Import pontual do retiro 2026.
 * Passo 1: vincular casais (conjugeId bilateral) + limpar DOB divergente.
 * Passo 2: cadastrar filhos como entidade DEPENDENTE + responsaveis.
 *
 * internalMutations rodadas via `npx convex run --prod ... {dryRun:true}` antes.
 * Idempotentes. Ver memoria project_acampamento_cadastro_retiro.
 */
export const vincularCasaisRetiro = internalMutation({
  args: {
    casais: v.array(v.object({ a: v.id("entidades"), b: v.id("entidades") })),
    limparNascimento: v.optional(v.array(v.id("entidades"))),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const vinculados: Array<{ a: string; b: string }> = [];
    const pulados: Array<{ a: string; b: string; motivo: string }> = [];
    const nascLimpos: Array<{ nome: string; de: string }> = [];
    const erros: Array<{ ref: string; motivo: string }> = [];

    const membroDe = async (entidadeId: Id<"entidades">) =>
      ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
        .first();

    for (const { a, b } of args.casais) {
      const ea = await ctx.db.get(a);
      const eb = await ctx.db.get(b);
      if (!ea || !eb) {
        erros.push({ ref: `${a}/${b}`, motivo: "entidade nao encontrada" });
        continue;
      }
      const ma = await membroDe(a);
      const mb = await membroDe(b);
      if (!ma || !mb) {
        erros.push({ ref: `${ea.nomeCompleto} / ${eb.nomeCompleto}`, motivo: "membro nao encontrado" });
        continue;
      }
      if (ma.conjugeId || mb.conjugeId) {
        pulados.push({ a: ea.nomeCompleto ?? "?", b: eb.nomeCompleto ?? "?", motivo: "ja tem conjuge" });
        continue;
      }
      if (!args.dryRun) {
        await ctx.db.patch(ma._id, { conjugeId: b });
        await ctx.db.patch(mb._id, { conjugeId: a });
      }
      vinculados.push({ a: ea.nomeCompleto ?? "?", b: eb.nomeCompleto ?? "?" });
    }

    for (const id of args.limparNascimento ?? []) {
      const e = await ctx.db.get(id);
      if (!e) {
        erros.push({ ref: id, motivo: "entidade nao encontrada (limparNascimento)" });
        continue;
      }
      if (e.dataNascimento === undefined) continue;
      if (!args.dryRun) await ctx.db.patch(id, { dataNascimento: undefined });
      nascLimpos.push({ nome: e.nomeCompleto ?? "?", de: e.dataNascimento });
    }

    return {
      dryRun: !!args.dryRun,
      resumo: { vincular: vinculados.length, pular: pulados.length, limparNasc: nascLimpos.length, erros: erros.length },
      vinculados,
      pulados,
      nascLimpos,
      erros,
    };
  },
});

export const corrigirVinculoIgreja = internalMutation({
  args: {
    entidadeId: v.id("entidades"),
    vinculo: v.union(
      v.literal("MEMBRO"),
      v.literal("FREQUENTADOR"),
      v.literal("VISITANTE"),
      v.literal("EX_MEMBRO"),
      v.literal("NAO_MEMBRO"),
    ),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.entidadeId);
    if (!e) return { erro: "entidade nao encontrada" };
    const de = e.vinculoIgreja ?? null;
    if (!args.dryRun) await ctx.db.patch(args.entidadeId, { vinculoIgreja: args.vinculo });
    return { dryRun: !!args.dryRun, nome: e.nomeCompleto, de, para: args.vinculo };
  },
});

const normNome = (s?: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export const cadastrarFilhosRetiro = internalMutation({
  args: {
    filhos: v.array(
      v.object({
        nomeCompleto: v.string(),
        dataNascimento: v.optional(v.string()),
        pais: v.array(
          v.object({
            entidadeId: v.id("entidades"),
            tipo: v.union(v.literal("PAI"), v.literal("MAE"), v.literal("RESPONSAVEL")),
          }),
        ),
      }),
    ),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const criados: string[] = [];
    const jaExistiam: string[] = [];
    const links: Array<{ filho: string; pai: string }> = [];
    const erros: Array<{ filho: string; motivo: string }> = [];

    for (const f of args.filhos) {
      // idempotencia: entidade DEPENDENTE com mesmo nome ja ligada a um dos pais?
      let filhoId: Id<"entidades"> | null = null;
      for (const pai of f.pais) {
        const rels = await ctx.db
          .query("responsaveis")
          .withIndex("by_responsavel", (q) => q.eq("responsavelEntidadeId", pai.entidadeId))
          .collect();
        for (const rel of rels) {
          const cri = await ctx.db.get(rel.criancaEntidadeId);
          if (cri && normNome(cri.nomeCompleto) === normNome(f.nomeCompleto)) {
            filhoId = cri._id;
            break;
          }
        }
        if (filhoId) break;
      }

      if (filhoId) {
        jaExistiam.push(f.nomeCompleto);
      } else {
        if (!args.dryRun) {
          filhoId = await ctx.db.insert("entidades", {
            tipoEntidade: "PF",
            papeis: ["DEPENDENTE"],
            status: "ATIVO",
            nomeCompleto: f.nomeCompleto,
            dataNascimento: f.dataNascimento,
            vinculoIgreja: "NAO_MEMBRO",
            perfilAtualizadoEm: Date.now(),
          });
        }
        criados.push(f.nomeCompleto);
      }

      // garante responsaveis para cada pai (idempotente)
      let i = 0;
      for (const pai of f.pais) {
        if (filhoId) {
          const existentes = await ctx.db
            .query("responsaveis")
            .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", filhoId as Id<"entidades">))
            .collect();
          if (existentes.some((r) => r.responsavelEntidadeId === pai.entidadeId)) {
            i++;
            continue;
          }
          if (!args.dryRun) {
            await ctx.db.insert("responsaveis", {
              criancaEntidadeId: filhoId,
              responsavelEntidadeId: pai.entidadeId,
              tipo: pai.tipo,
              principal: i === 0,
              criadoEm: Date.now(),
            });
          }
        }
        links.push({ filho: f.nomeCompleto, pai: pai.entidadeId });
        i++;
      }
    }

    return {
      dryRun: !!args.dryRun,
      resumo: { criar: criados.length, jaExistiam: jaExistiam.length, links: links.length, erros: erros.length },
      criados,
      jaExistiam,
      erros,
    };
  },
});
