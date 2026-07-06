import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog } from "../_shared/auditHelpers";

// Alocacao de quartos do acampamento (fase 5). Capacidade base: DUPLO=2,
// TRIPLO=3; +1 tolerancia p/ cama extra — acima disso a mutation recusa.

const CAPACIDADE: Record<"DUPLO" | "TRIPLO", number> = { DUPLO: 2, TRIPLO: 3 };

type Ocupante = { inscricaoId: string; participanteIndex: number };

function chaveOcupante(o: Ocupante): string {
  return `${o.inscricaoId}:${o.participanteIndex}`;
}

// Quartos com nomes resolvidos + participantes de inscricoes ATIVAS ainda sem
// quarto (com preferencia de colega p/ orientar a montagem manual).
export const listarQuartos = query({
  args: { acampamentoId: v.id("acampamentos") },
  handler: async (ctx, { acampamentoId }) => {
    await requirePermission(ctx, "inscricoes:manage");

    const [quartos, inscricoes] = await Promise.all([
      ctx.db
        .query("quartosAcampamento")
        .withIndex("by_acampamento", (q) => q.eq("acampamentoId", acampamentoId))
        .collect(),
      ctx.db
        .query("inscricoesAcampamento")
        .withIndex("by_acampamento_status", (q) =>
          q.eq("acampamentoId", acampamentoId).eq("status", "ATIVA"),
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
            pediu: `${insc.hospedagem.quartosDuplos}D+${insc.hospedagem.quartosTriplos}T`,
          },
        ];
      }),
    );

    return { quartos: quartosOut, semQuarto };
  },
});

// Gera quartos a partir do pedido das inscricoes ATIVAS que ainda nao tem
// nenhum participante alocado: cria os N duplos/triplos pedidos e distribui
// os participantes da propria inscricao na ordem (o ajuste fino e manual).
export const gerarQuartosDoPedido = mutation({
  args: { acampamentoId: v.id("acampamentos") },
  handler: async (ctx, { acampamentoId }) => {
    await requirePermission(ctx, "inscricoes:manage");

    const [quartos, inscricoes] = await Promise.all([
      ctx.db
        .query("quartosAcampamento")
        .withIndex("by_acampamento", (q) => q.eq("acampamentoId", acampamentoId))
        .collect(),
      ctx.db
        .query("inscricoesAcampamento")
        .withIndex("by_acampamento_status", (q) =>
          q.eq("acampamentoId", acampamentoId).eq("status", "ATIVA"),
        )
        .collect(),
    ]);

    const inscricoesJaAlocadas = new Set(
      quartos.flatMap((qd) => qd.ocupantes.map((o) => o.inscricaoId as string)),
    );

    let criados = 0;
    for (const insc of inscricoes) {
      if (inscricoesJaAlocadas.has(insc._id)) continue;
      const pedidos: ("DUPLO" | "TRIPLO")[] = [
        ...Array<"DUPLO">(insc.hospedagem.quartosDuplos).fill("DUPLO"),
        ...Array<"TRIPLO">(insc.hospedagem.quartosTriplos).fill("TRIPLO"),
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
        await ctx.db.insert("quartosAcampamento", {
          acampamentoId,
          tipo,
          identificacao: insc.responsavel.nome.split(" ")[0],
          ocupantes,
        });
        criados++;
      }
    }
    if (criados > 0) {
      await createActionAuditLog(ctx, "QUARTOS_GERADOS", "quartosAcampamento", acampamentoId);
    }
    return { criados };
  },
});

export const criarQuarto = mutation({
  args: {
    acampamentoId: v.id("acampamentos"),
    tipo: v.union(v.literal("DUPLO"), v.literal("TRIPLO")),
    identificacao: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "inscricoes:manage");
    const id = await ctx.db.insert("quartosAcampamento", { ...args, ocupantes: [] });
    await createActionAuditLog(ctx, "CREATE", "quartosAcampamento", id);
    return id;
  },
});

export const renomearQuarto = mutation({
  args: { quartoId: v.id("quartosAcampamento"), identificacao: v.string() },
  handler: async (ctx, { quartoId, identificacao }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const qd = await ctx.db.get(quartoId);
    if (!qd) throw new Error("Quarto não encontrado");
    await ctx.db.patch(quartoId, { identificacao: identificacao.trim() || undefined });
    return quartoId;
  },
});

export const removerQuarto = mutation({
  args: { quartoId: v.id("quartosAcampamento") },
  handler: async (ctx, { quartoId }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const qd = await ctx.db.get(quartoId);
    if (!qd) return quartoId;
    await createActionAuditLog(ctx, "DELETE", "quartosAcampamento", quartoId);
    await ctx.db.delete(quartoId);
    return quartoId;
  },
});

// Move um participante para um quarto (ou desaloca, quartoId=null). Remove de
// onde estiver antes; valida capacidade + 1 (tolerancia p/ cama extra).
export const moverOcupante = mutation({
  args: {
    acampamentoId: v.id("acampamentos"),
    inscricaoId: v.id("inscricoesAcampamento"),
    participanteIndex: v.number(),
    quartoId: v.union(v.id("quartosAcampamento"), v.null()),
  },
  handler: async (ctx, { acampamentoId, inscricaoId, participanteIndex, quartoId }) => {
    await requirePermission(ctx, "inscricoes:manage");
    const chave = chaveOcupante({ inscricaoId, participanteIndex });

    const quartos = await ctx.db
      .query("quartosAcampamento")
      .withIndex("by_acampamento", (q) => q.eq("acampamentoId", acampamentoId))
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
      if (atuais.length >= CAPACIDADE[destino.tipo] + 1) {
        throw new Error(
          `Quarto ${destino.tipo === "DUPLO" ? "duplo" : "triplo"} cheio (máx ${CAPACIDADE[destino.tipo] + 1} com cama extra)`,
        );
      }
      await ctx.db.patch(quartoId, {
        ocupantes: [...atuais, { inscricaoId, participanteIndex }],
      });
    }
    return quartoId;
  },
});
