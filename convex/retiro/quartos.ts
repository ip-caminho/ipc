import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog } from "../_shared/auditHelpers";

// Alocacao de quartos do retiro (fase 5). Capacidade base por tipo; +1
// tolerancia p/ cama extra — acima disso a mutation recusa.

type TipoQuarto = "INDIVIDUAL" | "DUPLO" | "TRIPLO" | "QUADRUPLO";

const CAPACIDADE: Record<TipoQuarto, number> = {
  INDIVIDUAL: 1,
  DUPLO: 2,
  TRIPLO: 3,
  QUADRUPLO: 4,
};

const tipoValidator = v.union(
  v.literal("INDIVIDUAL"),
  v.literal("DUPLO"),
  v.literal("TRIPLO"),
  v.literal("QUADRUPLO"),
);

type Ocupante = { inscricaoId: string; participanteIndex: number };

function chaveOcupante(o: Ocupante): string {
  return `${o.inscricaoId}:${o.participanteIndex}`;
}

// Resumo compacto do pedido de quartos (so os tipos com quantidade > 0).
function resumoPedido(q: {
  individual: number;
  duplo: number;
  triplo: number;
  quadruplo: number;
}): string {
  const parts: string[] = [];
  if (q.individual) parts.push(`${q.individual}I`);
  if (q.duplo) parts.push(`${q.duplo}D`);
  if (q.triplo) parts.push(`${q.triplo}T`);
  if (q.quadruplo) parts.push(`${q.quadruplo}Q`);
  return parts.join("+") || "—";
}

// Quartos com nomes resolvidos + participantes de inscricoes ATIVAS ainda sem
// quarto (com preferencia de colega p/ orientar a montagem manual).
export const listarQuartos = query({
  args: { retiroId: v.id("retiros") },
  handler: async (ctx, { retiroId }) => {
    await requirePermission(ctx, "retiro:manage");

    const [quartos, inscricoes] = await Promise.all([
      ctx.db
        .query("quartosRetiro")
        .withIndex("by_retiro", (q) => q.eq("retiroId", retiroId))
        .collect(),
      ctx.db
        .query("inscricoesRetiro")
        .withIndex("by_retiro_status", (q) =>
          q.eq("retiroId", retiroId).eq("status", "ATIVA"),
        )
        .collect(),
    ]);

    const inscPorId = new Map(inscricoes.map((i) => [i._id as string, i]));
    const alocados = new Set<string>();

    const quartosOut = quartos.map((qd) => ({
      _id: qd._id,
      tipo: qd.tipo,
      identificacao: qd.identificacao,
      capacidade: CAPACIDADE[qd.tipo],
      ocupantes: qd.ocupantes.flatMap((o) => {
        alocados.add(chaveOcupante(o));
        const insc = inscPorId.get(o.inscricaoId);
        const p = insc?.participantes[o.participanteIndex];
        // Ocupante de inscricao cancelada/removida nao aparece (limpa ao mover)
        if (!insc || !p) return [];
        return [
          {
            inscricaoId: o.inscricaoId,
            participanteIndex: o.participanteIndex,
            nome: p.nome,
            responsavel: insc.responsavel.nome,
          },
        ];
      }),
    }));

    const semQuarto = inscricoes.flatMap((insc) =>
      insc.participantes.flatMap((p, idx) => {
        const chave = chaveOcupante({ inscricaoId: insc._id, participanteIndex: idx });
        if (alocados.has(chave)) return [];
        return [
          {
            inscricaoId: insc._id,
            participanteIndex: idx,
            nome: p.nome,
            responsavel: insc.responsavel.nome,
            colegaDeQuarto: insc.extras?.colegaDeQuarto,
            pediu: resumoPedido(insc.hospedagem.quartos),
          },
        ];
      }),
    );

    return { quartos: quartosOut, semQuarto };
  },
});

// Gera quartos a partir do pedido das inscricoes ATIVAS que ainda nao tem
// nenhum participante alocado: cria os quartos pedidos e distribui os
// participantes da propria inscricao na ordem (o ajuste fino e manual).
export const gerarQuartosDoPedido = mutation({
  args: { retiroId: v.id("retiros") },
  handler: async (ctx, { retiroId }) => {
    await requirePermission(ctx, "retiro:manage");

    const [quartos, inscricoes] = await Promise.all([
      ctx.db
        .query("quartosRetiro")
        .withIndex("by_retiro", (q) => q.eq("retiroId", retiroId))
        .collect(),
      ctx.db
        .query("inscricoesRetiro")
        .withIndex("by_retiro_status", (q) =>
          q.eq("retiroId", retiroId).eq("status", "ATIVA"),
        )
        .collect(),
    ]);

    const inscricoesJaAlocadas = new Set(
      quartos.flatMap((qd) => qd.ocupantes.map((o) => o.inscricaoId as string)),
    );

    let criados = 0;
    for (const insc of inscricoes) {
      if (inscricoesJaAlocadas.has(insc._id)) continue;
      const q = insc.hospedagem.quartos;
      const pedidos: TipoQuarto[] = [
        ...Array<TipoQuarto>(q.individual).fill("INDIVIDUAL"),
        ...Array<TipoQuarto>(q.duplo).fill("DUPLO"),
        ...Array<TipoQuarto>(q.triplo).fill("TRIPLO"),
        ...Array<TipoQuarto>(q.quadruplo).fill("QUADRUPLO"),
      ];
      if (pedidos.length === 0) continue;

      let idx = 0;
      for (const tipo of pedidos) {
        const capacidade = CAPACIDADE[tipo] + (insc.hospedagem.camasExtras > 0 ? 1 : 0);
        const ocupantes: { inscricaoId: typeof insc._id; participanteIndex: number }[] = [];
        while (idx < insc.participantes.length && ocupantes.length < capacidade) {
          ocupantes.push({ inscricaoId: insc._id, participanteIndex: idx });
          idx++;
        }
        await ctx.db.insert("quartosRetiro", {
          retiroId,
          tipo,
          identificacao: insc.responsavel.nome.split(" ")[0],
          ocupantes,
        });
        criados++;
      }
    }
    if (criados > 0) {
      await createActionAuditLog(ctx, "QUARTOS_GERADOS", "quartosRetiro", retiroId);
    }
    return { criados };
  },
});

export const criarQuarto = mutation({
  args: {
    retiroId: v.id("retiros"),
    tipo: tipoValidator,
    identificacao: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "retiro:manage");
    const id = await ctx.db.insert("quartosRetiro", { ...args, ocupantes: [] });
    await createActionAuditLog(ctx, "CREATE", "quartosRetiro", id);
    return id;
  },
});

export const renomearQuarto = mutation({
  args: { quartoId: v.id("quartosRetiro"), identificacao: v.string() },
  handler: async (ctx, { quartoId, identificacao }) => {
    await requirePermission(ctx, "retiro:manage");
    const qd = await ctx.db.get(quartoId);
    if (!qd) throw new Error("Quarto não encontrado");
    await ctx.db.patch(quartoId, { identificacao: identificacao.trim() || undefined });
    return quartoId;
  },
});

export const removerQuarto = mutation({
  args: { quartoId: v.id("quartosRetiro") },
  handler: async (ctx, { quartoId }) => {
    await requirePermission(ctx, "retiro:manage");
    const qd = await ctx.db.get(quartoId);
    if (!qd) return quartoId;
    await createActionAuditLog(ctx, "DELETE", "quartosRetiro", quartoId);
    await ctx.db.delete(quartoId);
    return quartoId;
  },
});

// Move um participante para um quarto (ou desaloca, quartoId=null). Remove de
// onde estiver antes; valida capacidade + 1 (tolerancia p/ cama extra).
export const moverOcupante = mutation({
  args: {
    retiroId: v.id("retiros"),
    inscricaoId: v.id("inscricoesRetiro"),
    participanteIndex: v.number(),
    quartoId: v.union(v.id("quartosRetiro"), v.null()),
  },
  handler: async (ctx, { retiroId, inscricaoId, participanteIndex, quartoId }) => {
    await requirePermission(ctx, "retiro:manage");
    const chave = chaveOcupante({ inscricaoId, participanteIndex });

    const quartos = await ctx.db
      .query("quartosRetiro")
      .withIndex("by_retiro", (q) => q.eq("retiroId", retiroId))
      .collect();

    // Remove de qualquer quarto atual
    for (const qd of quartos) {
      if (qd.ocupantes.some((o) => chaveOcupante(o) === chave)) {
        await ctx.db.patch(qd._id, {
          ocupantes: qd.ocupantes.filter((o) => chaveOcupante(o) !== chave),
        });
      }
    }

    if (quartoId) {
      const destino = quartos.find((qd) => qd._id === quartoId);
      if (!destino) throw new Error("Quarto não encontrado");
      const atuais = destino.ocupantes.filter((o) => chaveOcupante(o) !== chave);
      const maximo = CAPACIDADE[destino.tipo] + 1;
      if (atuais.length >= maximo) {
        throw new Error(`Quarto cheio (máx ${maximo} com cama extra)`);
      }
      await ctx.db.patch(quartoId, {
        ocupantes: [...atuais, { inscricaoId, participanteIndex }],
      });
    }
    return quartoId;
  },
});
