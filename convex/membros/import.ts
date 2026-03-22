import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const importMembros = mutation({
  args: {
    membros: v.array(v.any()),
  },
  handler: async (ctx, { membros }) => {
    let created = 0;
    let skipped = 0;

    for (const m of membros) {
      // Dedup by CPF
      if (m.cpf) {
        const existing = await ctx.db
          .query("entidades")
          .withIndex("by_cpf", (q) => q.eq("cpf", m.cpf))
          .first();
        if (existing) {
          skipped++;
          continue;
        }
      }

      // Build entidade — only include defined fields
      const entidade: Record<string, any> = {
        tipoEntidade: "PF",
        papeis: ["MEMBRO"],
        status: m.entityStatus || "ATIVO",
        nomeCompleto: m.nomeCompleto,
      };

      const optionalFields = [
        "cpf", "rg", "dataNascimento", "sexo", "estadoCivil",
        "nacionalidade", "naturalidade", "pai", "mae", "profissao",
        "foto", "formacao", "whatsapp", "endereco",
      ];
      for (const field of optionalFields) {
        if (m[field] !== undefined && m[field] !== null && m[field] !== "") {
          entidade[field] = m[field];
        }
      }

      const entidadeId = await ctx.db.insert("entidades", entidade as any);

      const membro: Record<string, any> = {
        entidadeId,
        role: "membro",
      };
      if (m.rol) membro.rol = m.rol;
      if (m.cargoEclesiastico) membro.cargoEclesiastico = m.cargoEclesiastico;

      await ctx.db.insert("membros", membro as any);
      created++;
    }

    return { created, skipped, total: membros.length };
  },
});
