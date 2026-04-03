import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { createActionAuditLog } from "../_shared/auditHelpers";
import { requirePermission } from "../_shared/requirePermission";

// Garante que existem cultos dominicais para os próximos N meses
export const garantirCultosFuturos = mutation({
  args: {},
  handler: async (ctx) => {
    const hoje = new Date();
    const limite = new Date(hoje.getFullYear(), 11, 31);
    const limiteStr = limite.toISOString().split("T")[0];

    // Buscar cultos existentes
    const cultos = await ctx.db.query("cultos").collect();
    const datasExistentes = new Set(cultos.map((c) => c.data));

    // Gerar domingos faltantes
    const dia = new Date(hoje);
    // Avançar para o próximo domingo
    dia.setDate(dia.getDate() + ((7 - dia.getDay()) % 7 || 7));
    // Se hoje é domingo, incluir hoje
    if (hoje.getDay() === 0) {
      dia.setDate(hoje.getDate());
    }

    let criados = 0;
    while (dia.toISOString().split("T")[0] <= limiteStr) {
      const dataStr = dia.toISOString().split("T")[0];
      if (!datasExistentes.has(dataStr)) {
        await ctx.db.insert("cultos", {
          data: dataStr,
          tipo: "DOMINICAL",
          horario: "10:00",
          status: "RASCUNHO",
        });
        criados++;
      }
      dia.setDate(dia.getDate() + 7);
    }

    return { criados };
  },
});

export const createCulto = mutation({
  args: {
    data: v.string(),
    tipo: v.union(
      v.literal("DOMINICAL"),
      v.literal("ESPECIAL")
    ),
    titulo: v.optional(v.string()),
    horario: v.optional(v.string()),
    observacoes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "escalas:create");

    const id = await ctx.db.insert("cultos", {
      ...args,
      status: "RASCUNHO",
    });

    await createActionAuditLog(ctx, "CREATE", "cultos", id);
    return id;
  },
});

export const updateCulto = mutation({
  args: {
    id: v.id("cultos"),
    data: v.optional(v.string()),
    tipo: v.optional(v.union(
      v.literal("DOMINICAL"),
      v.literal("ESPECIAL")
    )),
    titulo: v.optional(v.string()),
    horario: v.optional(v.string()),
    observacoes: v.optional(v.string()),
    temCeia: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await requirePermission(ctx, "escalas:update");

    const culto = await ctx.db.get(id);
    if (!culto) throw new Error("Culto nao encontrado");

    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

export const publishCulto = mutation({
  args: { id: v.id("cultos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:update");
    const culto = await ctx.db.get(id);
    if (!culto) throw new Error("Culto nao encontrado");
    await ctx.db.patch(id, { status: "PUBLICADO" });
  },
});

export const unpublishCulto = mutation({
  args: { id: v.id("cultos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:update");
    const culto = await ctx.db.get(id);
    if (!culto) throw new Error("Culto nao encontrado");
    await ctx.db.patch(id, { status: "RASCUNHO" });
  },
});

export const deleteCulto = mutation({
  args: { id: v.id("cultos") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:delete");

    const culto = await ctx.db.get(id);
    if (!culto) throw new Error("Culto nao encontrado");

    // Cascade delete escalas
    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto", (q) => q.eq("cultoId", id))
      .collect();
    for (const e of escalas) {
      await ctx.db.delete(e._id);
    }

    await ctx.db.delete(id);
    await createActionAuditLog(ctx, "DELETE", "cultos", id);
  },
});

// Para funcoes singulares — substitui o existente
export const upsertEscala = mutation({
  args: {
    cultoId: v.id("cultos"),
    funcao: v.string(),
    membroId: v.optional(v.id("membros")),
    nomeCustom: v.optional(v.string()),
    passagemBiblica: v.optional(v.string()),
  },
  handler: async (ctx, { cultoId, funcao, membroId, nomeCustom, passagemBiblica }) => {
    await requirePermission(ctx, "escalas:update");

    const culto = await ctx.db.get(cultoId);
    if (!culto) throw new Error("Culto nao encontrado");

    let outrasFuncoes: string[] = [];
    if (membroId) {
      const todasEscalas = await ctx.db
        .query("cultoEscalas")
        .withIndex("by_culto_funcao", (q: any) => q.eq("cultoId", cultoId))
        .collect();
      outrasFuncoes = todasEscalas
        .filter((e) => e.membroId === membroId && e.funcao !== funcao)
        .map((e) => e.funcao);
    }

    const existing = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto_funcao", (q) => q.eq("cultoId", cultoId).eq("funcao", funcao))
      .first();

    const data: Record<string, any> = {};
    if (membroId !== undefined) data.membroId = membroId || undefined;
    if (nomeCustom !== undefined) data.nomeCustom = nomeCustom || undefined;
    if (passagemBiblica !== undefined) data.passagemBiblica = passagemBiblica || undefined;

    let id;
    if (existing) {
      await ctx.db.patch(existing._id, data);
      id = existing._id;
    } else {
      id = await ctx.db.insert("cultoEscalas", {
        cultoId,
        funcao,
        ...data,
      });
    }

    return { id, outrasFuncoes };
  },
});

// Atualizar apenas a passagem biblica de uma escala existente
export const updatePassagem = mutation({
  args: {
    id: v.id("cultoEscalas"),
    passagemBiblica: v.string(),
  },
  handler: async (ctx, { id, passagemBiblica }) => {
    await requirePermission(ctx, "escalas:update");
    const escala = await ctx.db.get(id);
    if (!escala) throw new Error("Escala nao encontrada");
    await ctx.db.patch(id, { passagemBiblica: passagemBiblica || undefined });
  },
});

// Atualizar louvores do culto (liturgia)
export const updateLouvores = mutation({
  args: {
    cultoId: v.id("cultos"),
    louvores: v.array(v.string()),
  },
  handler: async (ctx, { cultoId, louvores }) => {
    await requirePermission(ctx, "escalas:update");
    const culto = await ctx.db.get(cultoId);
    if (!culto) throw new Error("Culto nao encontrado");
    await ctx.db.patch(cultoId, { louvores });
  },
});

// Para funcoes multiplas — adiciona mais um membro
export const addEscala = mutation({
  args: {
    cultoId: v.id("cultos"),
    funcao: v.string(),
    membroId: v.id("membros"),
  },
  handler: async (ctx, { cultoId, funcao, membroId }) => {
    await requirePermission(ctx, "escalas:update");

    const culto = await ctx.db.get(cultoId);
    if (!culto) throw new Error("Culto nao encontrado");

    // Verificar se membro já está em outra função neste culto
    const todasEscalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto_funcao", (q: any) => q.eq("cultoId", cultoId))
      .collect();
    const existing = todasEscalas.filter((e) => e.funcao === funcao);
    if (existing.some((e) => e.membroId === membroId)) return;

    const outrasFuncoes = todasEscalas
      .filter((e) => e.membroId === membroId && e.funcao !== funcao)
      .map((e) => e.funcao);

    const id = await ctx.db.insert("cultoEscalas", {
      cultoId,
      funcao,
      membroId,
    });

    return { id, outrasFuncoes };
  },
});

export const removeEscala = mutation({
  args: { id: v.id("cultoEscalas") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "escalas:update");
    const escala = await ctx.db.get(id);
    if (!escala) throw new Error("Escala nao encontrada");
    await ctx.db.delete(id);
  },
});
