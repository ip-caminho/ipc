import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog } from "../_shared/auditHelpers";

// ===== Criancas =====

export const createCrianca = mutation({
  args: {
    nomeCompleto: v.string(),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    turma: v.string(),
    usoImagem: v.union(
      v.literal("AUTORIZADO"),
      v.literal("NAO_AUTORIZADO"),
      v.literal("PENDENTE")
    ),
    observacoesMedicas: v.optional(v.string()),
    observacoesFamilia: v.optional(v.string()),
    ovelhinhaId: v.optional(v.id("membros")),
    responsaveis: v.optional(v.array(v.object({
      entidadeId: v.id("entidades"),
      tipo: v.union(
        v.literal("MAE"), v.literal("PAI"),
        v.literal("AVO"), v.literal("TUTOR"),
        v.literal("RESPONSAVEL")
      ),
      principal: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "criancas:manage");

    // Criar entidade da crianca
    const entidadeId = await ctx.db.insert("entidades", {
      tipoEntidade: "PF",
      papeis: ["DEPENDENTE"],
      status: "ATIVO",
      nomeCompleto: args.nomeCompleto,
      dataNascimento: args.dataNascimento,
      sexo: args.sexo,
    });

    // Criar perfil
    const perfilId = await ctx.db.insert("criancaPerfil", {
      entidadeId,
      turma: args.turma,
      usoImagem: args.usoImagem,
      observacoesMedicas: args.observacoesMedicas,
      observacoesFamilia: args.observacoesFamilia,
      ovelhinhaId: args.ovelhinhaId,
      criadoEm: Date.now(),
    });

    // Criar responsaveis
    if (args.responsaveis) {
      for (const resp of args.responsaveis) {
        const respEntidade = await ctx.db.get(resp.entidadeId);
        if (!respEntidade) throw new Error("Responsavel nao encontrado");

        await ctx.db.insert("responsaveis", {
          criancaEntidadeId: entidadeId,
          responsavelEntidadeId: resp.entidadeId,
          tipo: resp.tipo,
          principal: resp.principal,
          criadoEm: Date.now(),
        });
      }
    }

    await createActionAuditLog(ctx, "CREATE", "criancaPerfil", perfilId);
    return entidadeId;
  },
});

export const updateCrianca = mutation({
  args: {
    entidadeId: v.id("entidades"),
    nomeCompleto: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    sexo: v.optional(v.union(v.literal("M"), v.literal("F"))),
    turma: v.optional(v.string()),
    usoImagem: v.optional(v.union(
      v.literal("AUTORIZADO"),
      v.literal("NAO_AUTORIZADO"),
      v.literal("PENDENTE")
    )),
    observacoesMedicas: v.optional(v.string()),
    observacoesFamilia: v.optional(v.string()),
    ovelhinhaId: v.optional(v.id("membros")),
    foto: v.optional(v.string()),
  },
  handler: async (ctx, { entidadeId, ...updates }) => {
    await requirePermission(ctx, "criancas:manage");

    const perfil = await ctx.db
      .query("criancaPerfil")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
      .first();
    if (!perfil) throw new Error("Crianca nao encontrada");

    // Atualizar entidade
    const entidadeUpdates: Record<string, any> = {};
    if (updates.nomeCompleto !== undefined) entidadeUpdates.nomeCompleto = updates.nomeCompleto;
    if (updates.dataNascimento !== undefined) entidadeUpdates.dataNascimento = updates.dataNascimento;
    if (updates.sexo !== undefined) entidadeUpdates.sexo = updates.sexo;
    if (updates.foto !== undefined) entidadeUpdates.foto = updates.foto;
    if (Object.keys(entidadeUpdates).length > 0) {
      await ctx.db.patch(entidadeId, entidadeUpdates);
    }

    // Atualizar perfil
    const perfilUpdates: Record<string, any> = {};
    if (updates.turma !== undefined) perfilUpdates.turma = updates.turma;
    if (updates.usoImagem !== undefined) perfilUpdates.usoImagem = updates.usoImagem;
    if (updates.observacoesMedicas !== undefined) perfilUpdates.observacoesMedicas = updates.observacoesMedicas;
    if (updates.observacoesFamilia !== undefined) perfilUpdates.observacoesFamilia = updates.observacoesFamilia;
    if (updates.ovelhinhaId !== undefined) perfilUpdates.ovelhinhaId = updates.ovelhinhaId;
    if (Object.keys(perfilUpdates).length > 0) {
      perfilUpdates.atualizadoEm = Date.now();
      await ctx.db.patch(perfil._id, perfilUpdates);
    }

    await createActionAuditLog(ctx, "UPDATE", "criancaPerfil", perfil._id);
    return entidadeId;
  },
});

export const removeCrianca = mutation({
  args: { entidadeId: v.id("entidades") },
  handler: async (ctx, { entidadeId }) => {
    await requirePermission(ctx, "criancas:manage");

    const perfil = await ctx.db
      .query("criancaPerfil")
      .withIndex("by_entidade", (q) => q.eq("entidadeId", entidadeId))
      .first();
    if (!perfil) throw new Error("Crianca nao encontrada");

    // Remover responsaveis
    const resps = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", entidadeId))
      .collect();
    for (const r of resps) {
      await ctx.db.delete(r._id);
    }

    // Remover presencas
    const presencas = await ctx.db
      .query("eduPresencas")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", entidadeId))
      .collect();
    for (const p of presencas) {
      await ctx.db.delete(p._id);
    }

    // Remover perfil
    await ctx.db.delete(perfil._id);

    // Marcar entidade como INATIVO
    await ctx.db.patch(entidadeId, { status: "INATIVO" as const });

    await createActionAuditLog(ctx, "DELETE", "criancaPerfil", perfil._id);
  },
});

// ===== Responsaveis =====

export const addResponsavel = mutation({
  args: {
    criancaEntidadeId: v.id("entidades"),
    responsavelEntidadeId: v.id("entidades"),
    tipo: v.union(
      v.literal("MAE"), v.literal("PAI"),
      v.literal("AVO"), v.literal("TUTOR"),
      v.literal("RESPONSAVEL")
    ),
    principal: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "criancas:manage");

    // Validar entidades
    const crianca = await ctx.db.get(args.criancaEntidadeId);
    if (!crianca) throw new Error("Crianca nao encontrada");
    const responsavel = await ctx.db.get(args.responsavelEntidadeId);
    if (!responsavel) throw new Error("Responsavel nao encontrado");

    // Verificar duplicata
    const existing = await ctx.db
      .query("responsaveis")
      .withIndex("by_crianca", (q) => q.eq("criancaEntidadeId", args.criancaEntidadeId))
      .collect();
    const dup = existing.find((r) => r.responsavelEntidadeId === args.responsavelEntidadeId);
    if (dup) throw new Error("Responsavel ja cadastrado para esta crianca");

    return ctx.db.insert("responsaveis", {
      ...args,
      criadoEm: Date.now(),
    });
  },
});

export const removeResponsavel = mutation({
  args: { id: v.id("responsaveis") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "criancas:manage");

    const resp = await ctx.db.get(id);
    if (!resp) throw new Error("Responsavel nao encontrado");

    await ctx.db.delete(id);
  },
});

// ===== Relatorios =====

export const createRelatorio = mutation({
  args: {
    turma: v.string(),
    data: v.string(),
    professores: v.string(),
    observacoes: v.optional(v.string()),
    presentes: v.array(v.id("entidades")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "educacional:write");

    // Verificar unicidade turma+data
    const existing = await ctx.db
      .query("eduRelatorios")
      .withIndex("by_turma_data", (q) =>
        q.eq("turma", args.turma).eq("data", args.data)
      )
      .first();
    if (existing) throw new Error("Ja existe relatorio para esta turma e data");

    const relatorioId = await ctx.db.insert("eduRelatorios", {
      turma: args.turma,
      data: args.data,
      professores: args.professores,
      observacoes: args.observacoes,
      criadoEm: Date.now(),
    });

    // Inserir presencas
    for (const entidadeId of args.presentes) {
      await ctx.db.insert("eduPresencas", {
        relatorioId,
        criancaEntidadeId: entidadeId,
      });
    }

    await createActionAuditLog(ctx, "CREATE", "eduRelatorios", relatorioId);
    return relatorioId;
  },
});

// ===== Escalas =====

export const createEscala = mutation({
  args: {
    ministerioId: v.id("ministerios"),
    data: v.string(),
    subgrupo: v.optional(v.string()),
    membros: v.array(v.object({
      membroId: v.id("membros"),
      papel: v.optional(v.string()),
    })),
    observacoes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "educacional:write");

    const id = await ctx.db.insert("ministerioEscalas", {
      ...args,
      criadoEm: Date.now(),
    });

    return id;
  },
});

export const removeEscala = mutation({
  args: { id: v.id("ministerioEscalas") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "educacional:write");

    const escala = await ctx.db.get(id);
    if (!escala) throw new Error("Escala nao encontrada");

    await ctx.db.delete(id);
  },
});

// ===== Seed de Criancas (dados do Notion) =====

type UsoImagem = "AUTORIZADO" | "NAO_AUTORIZADO" | "PENDENTE";

interface CriancaSeed {
  nome: string;
  turma: string;
  usoImagem: UsoImagem;
  dataNascimento?: string; // YYYY-MM-DD
  ovelhinha?: string; // nome do mentor (salvo em observacoesFamilia)
}

// Dados exportados do Notion — 55 criancas
// Datas de nascimento calculadas: dia/mes do CSV, ano = 2026 - idade
const CRIANCAS_SEED: CriancaSeed[] = [
  // === TURMA 0-2 ===
  { nome: "Beatriz", turma: "0-2", usoImagem: "PENDENTE" },
  { nome: "Daniel Gomes", turma: "0-2", usoImagem: "PENDENTE", dataNascimento: "2025-07-23" },
  { nome: "Daniel Hayashi", turma: "0-2", usoImagem: "PENDENTE" },
  { nome: "Lian", turma: "0-2", usoImagem: "AUTORIZADO", dataNascimento: "2025-02-01" },
  { nome: "Lucas", turma: "0-2", usoImagem: "PENDENTE" },
  { nome: "Maya", turma: "0-2", usoImagem: "AUTORIZADO" },
  { nome: "Thomas", turma: "0-2", usoImagem: "PENDENTE", dataNascimento: "2025-02-11" },
  { nome: "Victoria", turma: "0-2", usoImagem: "PENDENTE" },

  // === TURMA 3-4 ===
  { nome: "Amy", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2023-12-11", ovelhinha: "Nicole" },
  { nome: "Benjamin", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2023-08-12", ovelhinha: "Stefania" },
  { nome: "Clara", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2024-07-13" },
  { nome: "Davi Froehlich", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2024-07-04" },
  { nome: "Davi Vilarinho", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2022-05-18", ovelhinha: "Nicole" },
  { nome: "David", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2022-06-08", ovelhinha: "Eduardo" },
  { nome: "Esther", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2024-06-11" },
  { nome: "Gabriel", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2022-10-30", ovelhinha: "Raquel" },
  { nome: "Giovanna", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2023-06-20", ovelhinha: "Quezia" },
  { nome: "Greg", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2024-09-04" },
  { nome: "Joshua", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2024-04-23" },
  { nome: "Lucas", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2022-07-18", ovelhinha: "Nicole" },
  { nome: "Lucca", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2024-02-13" },
  { nome: "Mateus", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2024-04-19" },
  { nome: "Noah", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2022-08-03" },
  { nome: "Pedro", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2023-07-29", ovelhinha: "Quezia" },
  { nome: "Rafaela", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2022-09-18", ovelhinha: "Carol" },
  { nome: "Sofia", turma: "3-4", usoImagem: "AUTORIZADO", dataNascimento: "2022-04-02", ovelhinha: "Raquel" },
  { nome: "Tiago", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2022-05-16" },
  { nome: "Yuji", turma: "3-4", usoImagem: "PENDENTE", dataNascimento: "2022-12-03", ovelhinha: "Luana" },

  // === TURMA 5-6 ===
  { nome: "Adele", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2021-07-09", ovelhinha: "Susan" },
  { nome: "Ana Clara", turma: "5-6", usoImagem: "PENDENTE", dataNascimento: "2020-08-22", ovelhinha: "Esther" },
  { nome: "Arthur", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2020-09-08", ovelhinha: "Aline" },
  { nome: "Brian", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2021-04-01" },
  { nome: "Felipe", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2021-11-29", ovelhinha: "Mirela" },
  { nome: "Ian", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2020-08-01", ovelhinha: "Ana" },
  { nome: "Joao", turma: "5-6", usoImagem: "PENDENTE", dataNascimento: "2020-07-27" },
  { nome: "Julia", turma: "5-6", usoImagem: "PENDENTE", dataNascimento: "2020-10-23", ovelhinha: "Blenda" },
  { nome: "Manuela", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2021-11-20" },
  { nome: "Marina", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2020-08-17", ovelhinha: "Ricardo" },
  { nome: "Olivia", turma: "5-6", usoImagem: "AUTORIZADO", dataNascimento: "2020-05-09", ovelhinha: "Stefania" },
  { nome: "Sofia", turma: "5-6", usoImagem: "PENDENTE", ovelhinha: "Annes" },
  { nome: "Theo", turma: "5-6", usoImagem: "PENDENTE", dataNascimento: "2020-08-07", ovelhinha: "Ricardo" },

  // === TURMA 7-8 ===
  { nome: "Gabriela", turma: "7-8", usoImagem: "AUTORIZADO", dataNascimento: "2018-01-09", ovelhinha: "Michael" },
  { nome: "Kaylie", turma: "7-8", usoImagem: "AUTORIZADO", dataNascimento: "2018-10-08", ovelhinha: "Sarah Jung" },
  { nome: "Martina", turma: "7-8", usoImagem: "AUTORIZADO", dataNascimento: "2018-05-21", ovelhinha: "Annes" },
  { nome: "Noah Choi", turma: "7-8", usoImagem: "AUTORIZADO", dataNascimento: "2018-12-08", ovelhinha: "Thais" },
  { nome: "Noah Chung", turma: "7-8", usoImagem: "AUTORIZADO", dataNascimento: "2019-06-21", ovelhinha: "Eduardo" },
  { nome: "Rebeca", turma: "7-8", usoImagem: "AUTORIZADO", dataNascimento: "2019-06-14", ovelhinha: "Gabriel" },

  // === TURMA 9-10 ===
  { nome: "Arthur Park", turma: "9-10", usoImagem: "AUTORIZADO", ovelhinha: "Sarah Oliveira" },
  { nome: "Dara", turma: "9-10", usoImagem: "AUTORIZADO", dataNascimento: "2017-11-04", ovelhinha: "Roberta" },
  { nome: "Larissa", turma: "9-10", usoImagem: "AUTORIZADO", dataNascimento: "2017-04-07", ovelhinha: "Karin" },
  { nome: "Nathan", turma: "9-10", usoImagem: "AUTORIZADO", dataNascimento: "2017-10-10", ovelhinha: "Kenji" },
  { nome: "Pedro", turma: "9-10", usoImagem: "AUTORIZADO", dataNascimento: "2017-04-13", ovelhinha: "Fernanda" },
  { nome: "Rafael Cho", turma: "9-10", usoImagem: "AUTORIZADO", dataNascimento: "2017-03-02", ovelhinha: "Pang" },
  { nome: "Rafael Jung", turma: "9-10", usoImagem: "PENDENTE", dataNascimento: "2017-06-08", ovelhinha: "Andre" },
  { nome: "Yumi", turma: "9-10", usoImagem: "AUTORIZADO", dataNascimento: "2017-07-18", ovelhinha: "Luana" },
];

export const seedCriancas = mutation({
  args: {},
  handler: async (ctx) => {
    // Verifica se ja tem criancas cadastradas
    const existing = await ctx.db.query("criancaPerfil").first();
    if (existing) {
      throw new Error("Ja existem criancas cadastradas. Seed cancelado para evitar duplicatas.");
    }

    let count = 0;
    for (const c of CRIANCAS_SEED) {
      // Criar entidade
      const entidadeId = await ctx.db.insert("entidades", {
        tipoEntidade: "PF" as const,
        papeis: ["DEPENDENTE" as const],
        status: "ATIVO" as const,
        nomeCompleto: c.nome,
        dataNascimento: c.dataNascimento,
      });

      // Criar perfil
      await ctx.db.insert("criancaPerfil", {
        entidadeId,
        turma: c.turma,
        usoImagem: c.usoImagem,
        observacoesFamilia: c.ovelhinha ? `Ovelhinha: ${c.ovelhinha}` : undefined,
        criadoEm: Date.now(),
      });

      count++;
    }

    return { inserted: count };
  },
});

// ===== Migracao: MEMBRO → DEPENDENTE para criancas existentes =====

export const migrateCriancasPapel = mutation({
  args: {},
  handler: async (ctx) => {
    const perfis = await ctx.db.query("criancaPerfil").collect();
    let migrated = 0;

    for (const perfil of perfis) {
      const entidade = await ctx.db.get(perfil.entidadeId);
      if (!entidade) continue;

      if (entidade.papeis.includes("MEMBRO" as any)) {
        const novosPapeis = entidade.papeis.map((p: string) =>
          p === "MEMBRO" ? "DEPENDENTE" : p
        );
        await ctx.db.patch(perfil.entidadeId, { papeis: novosPapeis as any });
        migrated++;
      }
    }

    return { migrated };
  },
});
