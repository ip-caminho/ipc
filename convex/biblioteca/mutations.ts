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

async function gerarCodigo(ctx: any): Promise<string> {
  // Codigos sao sempre BIB-NNNN com padding de 4 digitos, entao a ordem
  // lexicografica do indice by_codigo == ordem numerica (ate BIB-9999).
  // Le 1 doc em vez de varrer a tabela inteira (importante no createBatch).
  const ultimo = await ctx.db
    .query("exemplares")
    .withIndex("by_codigo")
    .order("desc")
    .first();
  const maxNum = ultimo
    ? parseInt(ultimo.codigo.match(/^BIB-(\d+)$/)?.[1] ?? "0", 10) || 0
    : 0;
  return `BIB-${String(maxNum + 1).padStart(4, "0")}`;
}

async function registrarEvento(
  ctx: any,
  exemplarId: string,
  livroId: string,
  tipo: string,
  descricao: string,
  membroId?: string,
  registradoPor?: string
) {
  await ctx.db.insert("livroEventos", {
    exemplarId,
    livroId,
    tipo,
    data: new Date().toISOString().split("T")[0],
    descricao,
    membroId,
    registradoPor,
  });
}

// ===== Livros =====

export const create = mutation({
  args: {
    titulo: v.string(),
    autores: v.array(v.string()),
    editora: v.optional(v.string()),
    isbn: v.optional(v.string()),
    ano: v.optional(v.number()),
    categorias: v.array(v.string()),
    edicao: v.optional(v.string()),
    idioma: v.optional(v.string()),
    capaUrl: v.optional(v.string()),
    descricao: v.optional(v.string()),
    paginas: v.optional(v.number()),
    // Primeiro exemplar (opcional)
    condicao: v.optional(v.union(v.literal("NOVO"), v.literal("BOM"), v.literal("REGULAR"), v.literal("RUIM"))),
    doadorNome: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { membro } = await requireAuth(ctx);

    const livroId = await ctx.db.insert("livros", {
      titulo: args.titulo.trim(),
      autores: args.autores,
      editora: args.editora?.trim(),
      isbn: args.isbn?.trim(),
      ano: args.ano,
      categorias: args.categorias,
      edicao: args.edicao?.trim(),
      idioma: args.idioma || "Portugues",
      capaUrl: args.capaUrl,
      descricao: args.descricao?.trim(),
      paginas: args.paginas,
      criadoEm: Date.now(),
    });

    // Criar primeiro exemplar se condicao fornecida
    if (args.condicao) {
      const codigo = await gerarCodigo(ctx);
      const exemplarId = await ctx.db.insert("exemplares", {
        livroId,
        codigo,
        condicao: args.condicao,
        status: "DISPONIVEL",
        dataAquisicao: new Date().toISOString().split("T")[0],
        doadorNome: args.doadorNome?.trim(),
      });
      await registrarEvento(ctx, exemplarId, livroId, "CADASTRO", `Exemplar ${codigo} cadastrado`, undefined, membro._id);
      if (args.doadorNome) {
        await registrarEvento(ctx, exemplarId, livroId, "DOACAO", `Doado por ${args.doadorNome}`, undefined, membro._id);
      }
    }

    await createActionAuditLog(ctx, "CREATE", "livros", livroId as string);
    return livroId;
  },
});

export const update = mutation({
  args: {
    id: v.id("livros"),
    titulo: v.optional(v.string()),
    autores: v.optional(v.array(v.string())),
    editora: v.optional(v.string()),
    isbn: v.optional(v.string()),
    ano: v.optional(v.number()),
    categorias: v.optional(v.array(v.string())),
    descricao: v.optional(v.string()),
    capaUrl: v.optional(v.string()),
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
      await createFieldAuditLogs(ctx, oldRecord, newRecord, "livros");
    }
  },
});

// Cadastro em lote (doacoes)
export const createBatch = mutation({
  args: {
    doadorNome: v.optional(v.string()),
    livros: v.array(v.object({
      titulo: v.string(),
      autores: v.array(v.string()),
      editora: v.optional(v.string()),
      isbn: v.optional(v.string()),
      ano: v.optional(v.number()),
      categorias: v.array(v.string()),
      descricao: v.optional(v.string()),
      capaUrl: v.optional(v.string()),
      paginas: v.optional(v.number()),
      condicao: v.union(v.literal("NOVO"), v.literal("BOM"), v.literal("REGULAR"), v.literal("RUIM")),
    })),
  },
  handler: async (ctx, { doadorNome, livros }) => {
    const { membro } = await requireAuth(ctx);
    let count = 0;

    for (const l of livros) {
      const livroId = await ctx.db.insert("livros", {
        titulo: l.titulo.trim(),
        autores: l.autores,
        editora: l.editora?.trim(),
        isbn: l.isbn?.trim(),
        ano: l.ano,
        categorias: l.categorias,
        idioma: "Portugues",
        capaUrl: l.capaUrl,
        descricao: l.descricao?.trim(),
        paginas: l.paginas,
        criadoEm: Date.now(),
      });

      const codigo = await gerarCodigo(ctx);
      const exemplarId = await ctx.db.insert("exemplares", {
        livroId,
        codigo,
        condicao: l.condicao,
        status: "DISPONIVEL",
        dataAquisicao: new Date().toISOString().split("T")[0],
        doadorNome: doadorNome?.trim(),
      });
      await registrarEvento(ctx, exemplarId, livroId, "CADASTRO", `Exemplar ${codigo} cadastrado`, undefined, membro._id);
      if (doadorNome) {
        await registrarEvento(ctx, exemplarId, livroId, "DOACAO", `Doado por ${doadorNome}`, undefined, membro._id);
      }
      await createActionAuditLog(ctx, "CREATE", "livros", livroId as string);
      count++;
    }

    return { criados: count };
  },
});

export const addExemplar = mutation({
  args: {
    livroId: v.id("livros"),
    condicao: v.union(v.literal("NOVO"), v.literal("BOM"), v.literal("REGULAR"), v.literal("RUIM")),
    doadorNome: v.optional(v.string()),
  },
  handler: async (ctx, { livroId, condicao, doadorNome }) => {
    const { membro } = await requireAuth(ctx);
    const codigo = await gerarCodigo(ctx);
    const exemplarId = await ctx.db.insert("exemplares", {
      livroId,
      codigo,
      condicao,
      status: "DISPONIVEL",
      dataAquisicao: new Date().toISOString().split("T")[0],
      doadorNome: doadorNome?.trim(),
    });
    await registrarEvento(ctx, exemplarId, livroId, "CADASTRO", `Exemplar ${codigo} cadastrado`, undefined, membro._id);
    await createActionAuditLog(ctx, "CREATE", "exemplares", exemplarId as string);
    return exemplarId;
  },
});

// ===== Emprestimos =====

const LIMITE_EMPRESTIMOS = 3;
const PERIODO_PADRAO_DIAS = 14;

export const emprestar = mutation({
  args: {
    exemplarId: v.id("exemplares"),
    membroId: v.id("membros"),
    diasEmprestimo: v.optional(v.number()),
  },
  handler: async (ctx, { exemplarId, membroId, diasEmprestimo }) => {
    const { membro: registrador } = await requireAuth(ctx);

    const exemplar = await ctx.db.get(exemplarId);
    if (!exemplar) throw new Error("Exemplar nao encontrado");
    if (exemplar.status !== "DISPONIVEL") throw new Error("Exemplar nao esta disponivel");

    // Verificar limite
    const ativos = await ctx.db
      .query("emprestimos")
      .withIndex("by_membro", (q) => q.eq("membroId", membroId))
      .collect();
    const emprestimosAtivos = ativos.filter((e) => e.status === "ATIVO");
    if (emprestimosAtivos.length >= LIMITE_EMPRESTIMOS) {
      throw new Error(`Limite de ${LIMITE_EMPRESTIMOS} emprestimos simultaneos`);
    }

    const hoje = new Date().toISOString().split("T")[0];
    const dias = diasEmprestimo ?? PERIODO_PADRAO_DIAS;
    const devolucao = new Date();
    devolucao.setDate(devolucao.getDate() + dias);
    const dataDevolucao = devolucao.toISOString().split("T")[0];

    const empId = await ctx.db.insert("emprestimos", {
      exemplarId,
      livroId: exemplar.livroId,
      membroId,
      dataEmprestimo: hoje,
      dataPrevistaDevolucao: dataDevolucao,
      status: "ATIVO",
      registradoPor: registrador._id,
    });

    await ctx.db.patch(exemplarId, { status: "EMPRESTADO" });

    // Resolver nome do membro
    const membroDest = await ctx.db.get(membroId);
    const entidade = membroDest ? await ctx.db.get(membroDest.entidadeId) : null;
    const nome = entidade?.nomeCompleto || "membro";

    await registrarEvento(
      ctx, exemplarId, exemplar.livroId,
      "EMPRESTIMO", `Emprestado para ${nome}`,
      membroId, registrador._id
    );

    await createActionAuditLog(ctx, "CREATE", "emprestimos", empId as string);
    return empId;
  },
});

// ===== Self-service =====

export const emprestimoSelfService = mutation({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const { membro } = await requireAuth(ctx);

    const exemplar = await ctx.db
      .query("exemplares")
      .withIndex("by_codigo", (q) => q.eq("codigo", codigo))
      .first();
    if (!exemplar) throw new Error("Exemplar nao encontrado");

    // Se o exemplar escaneado nao esta disponivel, tenta outro do mesmo livro
    let exemplarParaEmprestar = exemplar;
    if (exemplar.status !== "DISPONIVEL") {
      const outros = await ctx.db
        .query("exemplares")
        .withIndex("by_livro", (q) => q.eq("livroId", exemplar.livroId))
        .collect();
      const disponivel = outros.find((e) => e.status === "DISPONIVEL");
      if (!disponivel) throw new Error("Nenhum exemplar disponivel");
      exemplarParaEmprestar = disponivel;
    }

    // Verificar limite
    const ativos = await ctx.db
      .query("emprestimos")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();
    if (ativos.filter((e) => e.status === "ATIVO").length >= LIMITE_EMPRESTIMOS) {
      throw new Error(`Limite de ${LIMITE_EMPRESTIMOS} emprestimos simultaneos`);
    }

    const hoje = new Date().toISOString().split("T")[0];
    const devolucao = new Date();
    devolucao.setDate(devolucao.getDate() + PERIODO_PADRAO_DIAS);
    const dataDevolucao = devolucao.toISOString().split("T")[0];

    const empId = await ctx.db.insert("emprestimos", {
      exemplarId: exemplarParaEmprestar._id,
      livroId: exemplarParaEmprestar.livroId,
      membroId: membro._id,
      dataEmprestimo: hoje,
      dataPrevistaDevolucao: dataDevolucao,
      status: "ATIVO",
      selfService: true,
      registradoPor: membro._id,
    });

    await ctx.db.patch(exemplarParaEmprestar._id, { status: "EMPRESTADO" });

    const entidade: any = await ctx.db.get(membro.entidadeId);
    const nome = entidade?.nomeCompleto || "membro";

    await registrarEvento(
      ctx, exemplarParaEmprestar._id, exemplarParaEmprestar.livroId,
      "EMPRESTIMO", `Self-service: ${nome}`,
      membro._id, membro._id
    );

    await createActionAuditLog(ctx, "EMPRESTIMO_SELF_SERVICE", "emprestimos", empId as string);
    return empId;
  },
});

export const devolverSelfService = mutation({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const { membro } = await requireAuth(ctx);

    const exemplar = await ctx.db
      .query("exemplares")
      .withIndex("by_codigo", (q) => q.eq("codigo", codigo))
      .first();
    if (!exemplar) throw new Error("Exemplar nao encontrado");

    // Buscar emprestimo ativo do membro para este livro
    const emprestimos = await ctx.db
      .query("emprestimos")
      .withIndex("by_membro", (q) => q.eq("membroId", membro._id))
      .collect();

    const ativo = emprestimos.find(
      (e) => e.status === "ATIVO" && e.livroId === exemplar.livroId
    );

    if (!ativo) throw new Error("Voce nao tem emprestimo ativo deste livro");

    const hoje = new Date().toISOString().split("T")[0];
    await ctx.db.patch(ativo._id, { status: "DEVOLVIDO", dataDevolucao: hoje });
    await ctx.db.patch(ativo.exemplarId, { status: "DISPONIVEL" });

    await registrarEvento(
      ctx, ativo.exemplarId, ativo.livroId,
      "DEVOLUCAO", "Self-service",
      membro._id, membro._id
    );

    await createActionAuditLog(ctx, "DEVOLVER_SELF_SERVICE", "emprestimos", ativo._id as string);
  },
});

export const devolver = mutation({
  args: { emprestimoId: v.id("emprestimos") },
  handler: async (ctx, { emprestimoId }) => {
    const { membro } = await requireAuth(ctx);

    const emprestimo = await ctx.db.get(emprestimoId);
    if (!emprestimo) throw new Error("Emprestimo nao encontrado");
    if (emprestimo.status !== "ATIVO") throw new Error("Emprestimo ja devolvido");

    const hoje = new Date().toISOString().split("T")[0];
    await ctx.db.patch(emprestimoId, { status: "DEVOLVIDO", dataDevolucao: hoje });
    await ctx.db.patch(emprestimo.exemplarId, { status: "DISPONIVEL" });

    await registrarEvento(
      ctx, emprestimo.exemplarId, emprestimo.livroId,
      "DEVOLUCAO", "Devolvido",
      emprestimo.membroId, membro._id
    );
    await createActionAuditLog(ctx, "DEVOLVER", "emprestimos", emprestimoId as string);
  },
});
