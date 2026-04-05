import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { createActionAuditLog } from "../_shared/auditHelpers";

export const createReserva = mutation({
  args: {
    salaId: v.id("salas"),
    data: v.string(),
    horaInicio: v.string(),
    horaFim: v.string(),
    motivo: v.string(),
  },
  handler: async (ctx, args) => {
    const { membro } = await requirePermission(ctx, "salas:create");

    if (args.horaFim <= args.horaInicio) {
      throw new Error("Horario de termino deve ser posterior ao inicio");
    }

    const sala = await ctx.db.get(args.salaId);
    if (!sala || sala.status !== "ATIVO") throw new Error("Sala nao encontrada");

    // Conflict detection
    const existing = await ctx.db
      .query("reservas")
      .withIndex("by_sala_data", (q) => q.eq("salaId", args.salaId).eq("data", args.data))
      .collect();

    const hasConflict = existing
      .filter((r) => r.status === "ATIVA")
      .some((r) => args.horaInicio < r.horaFim && args.horaFim > r.horaInicio);

    if (hasConflict) {
      throw new Error("Horario conflita com uma reserva existente");
    }

    const id = await ctx.db.insert("reservas", {
      ...args,
      membroId: membro._id,
      status: "ATIVA",
      criadoEm: Date.now(),
    });

    await createActionAuditLog(ctx, "CREATE", "reservas", id);
    return id;
  },
});

export const cancelReserva = mutation({
  args: { id: v.id("reservas") },
  handler: async (ctx, { id }) => {
    const { membro } = await requirePermission(ctx, "salas:create");

    const reserva = await ctx.db.get(id);
    if (!reserva) throw new Error("Reserva nao encontrada");
    if (reserva.status !== "ATIVA") throw new Error("Reserva ja cancelada");

    // Não permitir cancelar reservas passadas
    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];
    const horaAtual = agora.toTimeString().slice(0, 5);
    if (reserva.data < hoje || (reserva.data === hoje && reserva.horaFim <= horaAtual)) {
      throw new Error("Nao e possivel cancelar uma reserva que ja passou");
    }

    // Owner or salas:delete permission
    if (reserva.membroId !== membro._id) {
      await requirePermission(ctx, "salas:delete");
    }

    await ctx.db.patch(id, { status: "CANCELADA" });
    await createActionAuditLog(ctx, "CANCEL", "reservas", id);
  },
});

export const seedSalas = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("salas").collect();
    if (existing.length > 0) return;

    for (const nome of ["Sala 1", "Sala 2", "Sala 3"]) {
      await ctx.db.insert("salas", {
        nome,
        status: "ATIVO",
        criadoEm: Date.now(),
      });
    }
  },
});
