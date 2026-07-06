import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Migracao unica: acampamento* -> retiro*, remapeando as FKs (novos _id).
// Idempotente: limpa as tabelas NOVAS antes de copiar. As antigas ficam
// intactas ate a limpeza final (retiroMigracao.limpar).
export const migrar = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Zera destino (permite reexecutar sem duplicar)
    for (const t of ["retiros", "inscricoesRetiro", "quartosRetiro"] as const) {
      for (const d of await ctx.db.query(t).collect()) await ctx.db.delete(d._id);
    }

    // 1) eventos
    const mapEvento = new Map<string, Id<"retiros">>();
    for (const a of await ctx.db.query("acampamentos").collect()) {
      const { _id, _creationTime, ...rest } = a;
      void _creationTime;
      const novo = await ctx.db.insert("retiros", rest);
      mapEvento.set(_id, novo);
    }

    // 2) inscricoes (remapeia acampamentoId -> retiroId)
    const mapInsc = new Map<string, Id<"inscricoesRetiro">>();
    for (const i of await ctx.db.query("inscricoesAcampamento").collect()) {
      const { _id, _creationTime, acampamentoId, ...rest } = i;
      void _creationTime;
      const retiroId = mapEvento.get(acampamentoId);
      if (!retiroId) throw new Error(`Inscricao ${_id} sem retiro correspondente`);
      const novo = await ctx.db.insert("inscricoesRetiro", { ...rest, retiroId });
      mapInsc.set(_id, novo);
    }

    // 3) quartos (remapeia acampamentoId + ocupantes[].inscricaoId)
    let quartos = 0;
    for (const q of await ctx.db.query("quartosAcampamento").collect()) {
      const { _id, _creationTime, acampamentoId, ocupantes, ...rest } = q;
      void _id;
      void _creationTime;
      const retiroId = mapEvento.get(acampamentoId);
      if (!retiroId) throw new Error(`Quarto ${_id} sem retiro correspondente`);
      const ocup = ocupantes.map((o) => {
        const nova = mapInsc.get(o.inscricaoId);
        if (!nova) throw new Error(`Ocupante sem inscricao correspondente (${o.inscricaoId})`);
        return { inscricaoId: nova, participanteIndex: o.participanteIndex };
      });
      await ctx.db.insert("quartosRetiro", { ...rest, retiroId, ocupantes: ocup });
      quartos++;
    }

    return { retiros: mapEvento.size, inscricoes: mapInsc.size, quartos };
  },
});

// Limpeza final (Fase 3): apaga os dados das tabelas antigas para o deploy que
// remove essas tabelas do schema nao falhar. So rodar apos migrar + cutover.
export const limpar = internalMutation({
  args: {},
  handler: async (ctx) => {
    let n = 0;
    for (const t of ["quartosAcampamento", "inscricoesAcampamento", "acampamentos"] as const) {
      for (const d of await ctx.db.query(t).collect()) {
        await ctx.db.delete(d._id);
        n++;
      }
    }
    return { apagados: n };
  },
});
