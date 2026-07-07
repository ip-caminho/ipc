import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Import pontual do retiro 2026.
 * Passo 1: vincular casais (conjugeId bilateral) + limpar DOB divergente.
 * Passo 2: cadastrar filhos como entidade DEPENDENTE + responsaveis.
 *
 * internalMutations rodadas via `npx convex run --prod ... {dryRun:true}` antes.
 * Idempotentes. Ver memoria project_retiro_cadastro_retiro.
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

/**
 * Corrige entidades marcadas TRANSFERIDO/EX_MEMBRO por engano (sem registro de
 * demissao): volta a status ATIVO + vinculoIgreja MEMBRO.
 */
export const reativarComoMembro = internalMutation({
  args: { entidadeIds: v.array(v.id("entidades")), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const alterados: Array<{ nome: string; de: string; para: string }> = [];
    const erros: Array<{ id: string; motivo: string }> = [];
    for (const id of args.entidadeIds) {
      const e = await ctx.db.get(id);
      if (!e) {
        erros.push({ id, motivo: "nao encontrada" });
        continue;
      }
      const m = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", id))
        .first();
      if (m?.formaDemissao || m?.dataDemissao) {
        erros.push({ id, motivo: `tem registro de demissao (${m?.formaDemissao ?? m?.dataDemissao}) — nao reativar automaticamente` });
        continue;
      }
      alterados.push({ nome: e.nomeCompleto ?? "?", de: `${e.status}/${e.vinculoIgreja ?? "—"}`, para: "ATIVO/MEMBRO" });
      if (!args.dryRun) await ctx.db.patch(id, { status: "ATIVO", vinculoIgreja: "MEMBRO" });
    }
    return { dryRun: !!args.dryRun, resumo: { alterar: alterados.length, erros: erros.length }, alterados, erros };
  },
});

/**
 * Passo 3: promove filhos DEPENDENTES (com >=1 pai membro atual) a
 * MEMBRO_NAO_COMUNGANTE (Rol Separado). Espelha `tornarMembro`. Idempotente.
 */
export const tornarFilhosMembros = internalMutation({
  args: { entidadeIds: v.array(v.id("entidades")), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const criados: string[] = [];
    const jaEram: string[] = [];
    const erros: Array<{ id: string; motivo: string }> = [];

    for (const entidadeId of args.entidadeIds) {
      const e = await ctx.db.get(entidadeId);
      if (!e) {
        erros.push({ id: entidadeId, motivo: "entidade nao encontrada" });
        continue;
      }
      const existente = await ctx.db
        .query("membros")
        .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
        .first();
      if (existente) {
        jaEram.push(e.nomeCompleto ?? "?");
        continue;
      }
      if (!args.dryRun) {
        await ctx.db.insert("membros", {
          entidadeId,
          role: "membro",
          cargoEclesiastico: "MEMBRO_NAO_COMUNGANTE",
        });
        const papeis = (e.papeis ?? []).filter(
          (p) => p !== "DEPENDENTE" && p !== "MEMBRO",
        ) as typeof e.papeis;
        await ctx.db.patch(entidadeId, { papeis, vinculoIgreja: "MEMBRO" });
      }
      criados.push(e.nomeCompleto ?? "?");
    }

    return {
      dryRun: !!args.dryRun,
      resumo: { criar: criados.length, jaEram: jaEram.length, erros: erros.length },
      criados,
      erros,
    };
  },
});

/**
 * Funde uma duplicata (criada pelo import) na entidade canonica pre-existente:
 * move responsaveis pra canonica, garante membro na canonica se a duplicata era,
 * e apaga a duplicata (responsaveis + membro + entidade). Idempotente-ish.
 */
export const fundirDuplicata = internalMutation({
  args: { duplicataId: v.id("entidades"), canonicaId: v.id("entidades"), nomeCanonica: v.optional(v.string()), manterNascimentoCanonica: v.optional(v.boolean()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { duplicataId, canonicaId, nomeCanonica, manterNascimentoCanonica, dryRun }) => {
    if (duplicataId === canonicaId) return { erro: "ids iguais" };
    const dup = await ctx.db.get(duplicataId);
    const can = await ctx.db.get(canonicaId);
    if (!dup || !can) return { erro: "entidade nao encontrada" };

    const rel = async (crianca: Id<"entidades">) =>
      ctx.db.query("responsaveis").withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", crianca)).collect();
    const memb = async (ent: Id<"entidades">) =>
      ctx.db.query("membros").withIndex("by_entidade", (q) => q.eq("entidadeId", ent)).first();

    const dupRels = await rel(duplicataId);
    const canRels = await rel(canonicaId);
    const paisMovidos: string[] = [];
    for (const r of dupRels) {
      if (!canRels.some((c) => c.responsavelEntidadeId === r.responsavelEntidadeId)) {
        if (!dryRun) {
          await ctx.db.insert("responsaveis", {
            criancaEntidadeId: canonicaId,
            responsavelEntidadeId: r.responsavelEntidadeId,
            tipo: r.tipo,
            principal: canRels.length === 0 && paisMovidos.length === 0,
            criadoEm: r.criadoEm,
          });
        }
        paisMovidos.push(r.responsavelEntidadeId);
      }
    }

    // Atualiza DOB (dos pais/retiro = da duplicata) e nome (se canonica for so 1o nome)
    const titleCase = (s: string) =>
      s.trim().toLowerCase().split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
    const canPatch: Record<string, unknown> = {};
    if (nomeCanonica) {
      canPatch.nomeCompleto = nomeCanonica;
    } else if ((can.nomeCompleto ?? "").trim().split(/\s+/).length <= 1 && dup.nomeCompleto) {
      canPatch.nomeCompleto = titleCase(dup.nomeCompleto);
    }
    if (!manterNascimentoCanonica && dup.dataNascimento && dup.dataNascimento !== can.dataNascimento) {
      canPatch.dataNascimento = dup.dataNascimento;
    }
    if (!dryRun && Object.keys(canPatch).length) await ctx.db.patch(canonicaId, canPatch);

    const dupMembro = await memb(duplicataId);
    const canMembro = await memb(canonicaId);
    let virouMembro = false;
    if (dupMembro && !canMembro) {
      if (!dryRun) {
        await ctx.db.insert("membros", {
          entidadeId: canonicaId,
          role: "membro",
          cargoEclesiastico: dupMembro.cargoEclesiastico ?? "MEMBRO_NAO_COMUNGANTE",
        });
        const papeis = (can.papeis ?? []).filter(
          (p) => p !== "DEPENDENTE" && p !== "MEMBRO",
        ) as typeof can.papeis;
        await ctx.db.patch(canonicaId, { papeis, vinculoIgreja: "MEMBRO" });
      }
      virouMembro = true;
    }

    // criancaPerfil: se a canonica nao tem e a duplicata tem, repoe pra canonica; se ambas tem, apaga a da duplicata
    const cpDe = async (ent: Id<"entidades">) =>
      ctx.db.query("criancaPerfil").withIndex("by_entidade", (q) => q.eq("entidadeId", ent)).first();
    const dupCp = await cpDe(duplicataId);
    const canCp = await cpDe(canonicaId);
    let cpRepontada = false;
    let cpApagada = false;
    if (dupCp) {
      if (!canCp) {
        if (!dryRun) await ctx.db.patch(dupCp._id, { entidadeId: canonicaId });
        cpRepontada = true;
      } else {
        if (!dryRun) await ctx.db.delete(dupCp._id);
        cpApagada = true;
      }
    }

    // apaga a duplicata
    if (!dryRun) {
      for (const r of dupRels) await ctx.db.delete(r._id);
      if (dupMembro) await ctx.db.delete(dupMembro._id);
      await ctx.db.delete(duplicataId);
    }

    return {
      dryRun: !!dryRun,
      canonica: can.nomeCompleto,
      duplicataApagada: dup.nomeCompleto,
      nomeAtualizado: (canPatch.nomeCompleto as string) ?? null,
      dobAtualizada: (canPatch.dataNascimento as string) ?? null,
      dobMantida: manterNascimentoCanonica ? (can.dataNascimento ?? null) : undefined,
      paisMovidos: paisMovidos.length,
      canonicaVirouMembro: virouMembro,
      relsApagadas: dupRels.length,
      membroApagado: !!dupMembro,
      criancaPerfilRepontada: cpRepontada,
      criancaPerfilApagada: cpApagada,
    };
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
            papeis: [],
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

/** Corrige a data de nascimento de uma entidade (uso pontual pos-fusao). */
export const corrigirNascimento = internalMutation({
  args: {
    entidadeId: v.id("entidades"),
    dataNascimento: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.entidadeId);
    if (!e) throw new Error("entidade nao encontrada");
    const antes = e.dataNascimento ?? null;
    if (!args.dryRun) {
      await ctx.db.patch(args.entidadeId, { dataNascimento: args.dataNascimento });
    }
    return { nome: e.nomeCompleto, antes, depois: args.dataNascimento, dryRun: !!args.dryRun };
  },
});
