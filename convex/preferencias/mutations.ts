import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membro = await ctx.db
    .query("membros")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();

  if (!membro || membro.role !== "admin") {
    throw new Error("Only admins can manage church info");
  }
  return { userId, membro };
}

export const upsertPreferencia = mutation({
  args: {
    chave: v.string(),
    valor: v.any(),
  },
  handler: async (ctx, { chave, valor }) => {
    const { membro } = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("preferencias")
      .withIndex("by_chave", (q) => q.eq("chave", chave))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        valor,
        atualizadoPor: membro._id,
        atualizadoEm: Date.now(),
      });
    } else {
      await ctx.db.insert("preferencias", {
        chave,
        valor,
        atualizadoPor: membro._id,
        atualizadoEm: Date.now(),
      });
    }
  },
});

export const seedIgrejaInfo = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults: Record<string, any> = {
      "igreja.nome": "Igreja Presbiteriana de Colombo",
      "igreja.descricao": "Uma igreja reformada, confessional e acolhedora em Colombo-PR.",
      "igreja.endereco": "Rua XV de Novembro, 4810 - Centro, Colombo - PR, 83414-000",
      "igreja.googleMapsEmbed": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3601.7!2d-49.2236!3d-25.2927!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDE3JzMzLjciUyA0OcKwMTMnMjUuMCJX!5e0!3m2!1spt-BR!2sbr!4v1",
      "igreja.horarios": [
        { dia: "Domingo", horario: "09:00", tipo: "Escola Biblica Dominical" },
        { dia: "Domingo", horario: "10:30", tipo: "Culto Dominical" },
        { dia: "Quarta-feira", horario: "20:00", tipo: "Culto de Oracao e Estudo" },
      ],
      "igreja.whatsapp": "41999999999",
      "igreja.telefone": "(41) 3666-0000",
      "igreja.email": "contato@ipcolombo.org.br",
      "igreja.banco": "Banco do Brasil",
      "igreja.agencia": "0000-0",
      "igreja.conta": "00000-0",
      "igreja.pix": "00.000.000/0001-00",
      "igreja.educacional": [
        { turma: "0-2 anos", responsavel: "A definir" },
        { turma: "3-4 anos", responsavel: "A definir" },
        { turma: "5-6 anos", responsavel: "A definir" },
        { turma: "7-8 anos", responsavel: "A definir" },
        { turma: "9-10 anos", responsavel: "A definir" },
      ],
    };

    for (const [chave, valor] of Object.entries(defaults)) {
      const existing = await ctx.db
        .query("preferencias")
        .withIndex("by_chave", (q) => q.eq("chave", chave))
        .unique();

      if (!existing) {
        await ctx.db.insert("preferencias", {
          chave,
          valor,
          atualizadoEm: Date.now(),
        });
      }
    }
  },
});
