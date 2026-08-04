import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createFieldAuditLogs, createActionAuditLog } from "../_shared/auditHelpers";
import { espelharConjuge, limparEspelhoConjuge } from "./familiaHelpers";
import { apagarArquivosSumidos } from "../files/orfaos";

export const create = mutation({
  args: {
    // Entidade PF fields
    nomeCompleto: v.string(),
    apelido: v.optional(v.string()),
    cpf: v.optional(v.string()),
    tipoDocumento: v.optional(v.string()),
    rg: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    estadoCivil: v.optional(v.string()),
    nacionalidade: v.optional(v.string()),
    naturalidade: v.optional(v.any()),
    pai: v.optional(v.string()),
    mae: v.optional(v.string()),
    profissao: v.optional(v.string()),
    formacao: v.optional(v.string()),
    foto: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    telefone: v.optional(v.string()),
    email: v.optional(v.string()),
    endereco: v.optional(v.any()),
    cbcm: v.optional(v.string()),
    atestadoAntecedentes: v.optional(v.string()),
    vinculoIgreja: v.optional(v.string()),

    // Membro fields
    role: v.optional(v.string()),
    rol: v.optional(v.string()),
    dataMembresia: v.optional(v.string()),
    formaAdmissao: v.optional(v.string()),
    cargoEclesiastico: v.optional(v.string()),
    dataConversao: v.optional(v.string()),
    dataBatismo: v.optional(v.string()),
    igrejaProcedencia: v.optional(v.string()),
    conjugeId: v.optional(v.id("entidades")),
  },
  handler: async (ctx, args) => {
    const { membro: caller } = await requirePermission(ctx, "membros:create");

    // Papel admin so pode ser atribuido por outro admin
    if (args.role === "admin" && caller.role !== "admin") {
      throw new Error("Somente admin pode criar membro com papel admin");
    }

    // Atomic: create entidade + membro together
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      // `papeis` serve so para PJ (FORNECEDOR/IGREJA_PARCEIRA). Ser membro e
      // determinado pela linha em `membros` + `vinculoIgreja`, nao por papeis.
      papeis: [],
      status: "ATIVO",
      nomeCompleto: args.nomeCompleto,
      apelido: args.apelido,
      cpf: args.cpf,
      tipoDocumento: args.tipoDocumento as any,
      rg: args.rg,
      dataNascimento: args.dataNascimento,
      sexo: args.sexo as any,
      estadoCivil: args.estadoCivil as any,
      nacionalidade: args.nacionalidade,
      naturalidade: args.naturalidade,
      pai: args.pai,
      mae: args.mae,
      profissao: args.profissao,
      formacao: args.formacao as any,
      foto: args.foto,
      whatsapp: args.whatsapp,
      telefone: args.telefone,
      email: args.email,
      endereco: args.endereco,
      cbcm: args.cbcm as any,
      atestadoAntecedentes: args.atestadoAntecedentes,
      vinculoIgreja: args.vinculoIgreja as any,
    });

    const membroId = await ctx.db.insert("membros", {
      entidadeId,
      role: args.role || "membro",
      rol: args.rol,
      dataMembresia: args.dataMembresia,
      formaAdmissao: args.formaAdmissao as any,
      cargoEclesiastico: args.cargoEclesiastico as any,
      dataConversao: args.dataConversao,
      dataBatismo: args.dataBatismo,
      igrejaProcedencia: args.igrejaProcedencia,
      conjugeId: args.conjugeId,
    });

    // Vinculo de conjuge e bilateral
    if (args.conjugeId) {
      await espelharConjuge(ctx, entidadeId, args.conjugeId);
    }

    await createActionAuditLog(ctx, "CREATE", "membros", membroId);
    return membroId;
  },
});

export const update = mutation({
  args: {
    id: v.id("membros"),
    entidadeData: v.optional(v.any()),
    membroData: v.optional(v.any()),
  },
  handler: async (ctx, { id, entidadeData, membroData }) => {
    // Dados pessoais (entidade) exigem membros:update
    const { membro: caller } = await requirePermission(ctx, "membros:update");

    if (membroData) {
      // Troca de papel so via preferencias/rbac.updateMembroRole (admin),
      // que tambem limpa o snapshot de permissions[]
      if ("role" in membroData) {
        throw new Error("Papel (role) e alterado apenas na tela de Permissoes");
      }
      // Dados eclesiasticos (membro) exigem rol:update
      if (caller.role !== "admin") {
        await requirePermission(ctx, "rol:update");
      }
    }

    const membro = await ctx.db.get(id);
    if (!membro) throw new Error("Membro not found");

    // Update entidade if data provided
    if (entidadeData) {
      const oldEntidade = await ctx.db.get(membro.entidadeId);
      await ctx.db.patch(membro.entidadeId, entidadeData);
      const newEntidade = await ctx.db.get(membro.entidadeId);
      await createFieldAuditLogs(ctx, oldEntidade, newEntidade, "entidades", membro.entidadeId);
      await apagarArquivosSumidos(ctx, "entidades", oldEntidade, newEntidade);
    }

    // Update membro if data provided
    if (membroData) {
      const oldMembro = { ...membro };
      await ctx.db.patch(id, membroData);
      const newMembro = await ctx.db.get(id);
      await createFieldAuditLogs(ctx, oldMembro, newMembro, "membros", id);
      await apagarArquivosSumidos(ctx, "membros", oldMembro, newMembro);

      // Vinculo de conjuge e bilateral: espelha o novo e limpa o antigo
      if ("conjugeId" in membroData && membroData.conjugeId !== oldMembro.conjugeId) {
        if (oldMembro.conjugeId) {
          await limparEspelhoConjuge(ctx, membro.entidadeId, oldMembro.conjugeId);
        }
        if (membroData.conjugeId) {
          await espelharConjuge(ctx, membro.entidadeId, membroData.conjugeId);
        }
      }
    }

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("membros"),
    status: v.union(
      v.literal("ATIVO"),
      v.literal("INATIVO"),
      v.literal("TRANSFERIDO"),
      v.literal("FALECIDO"),
      v.literal("DESLIGADO")
    ),
  },
  handler: async (ctx, { id, status }) => {
    await requirePermission(ctx, "membros:update");

    const membro = await ctx.db.get(id);
    if (!membro) throw new Error("Membro not found");

    const oldEntidade = await ctx.db.get(membro.entidadeId);
    await ctx.db.patch(membro.entidadeId, { status });
    const newEntidade = await ctx.db.get(membro.entidadeId);
    await createFieldAuditLogs(ctx, oldEntidade, newEntidade, "entidades", membro.entidadeId);
  },
});
