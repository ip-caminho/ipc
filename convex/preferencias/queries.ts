import { query } from "../_generated/server";

// Query publica (sem auth) — retorna info da igreja para landing page
export const getIgrejaInfo = query({
  args: {},
  handler: async (ctx) => {
    const prefs = await ctx.db
      .query("preferencias")
      .collect();

    const igrejaPrefs = prefs.filter((p) => p.chave.startsWith("igreja."));

    const result: Record<string, any> = {};
    for (const p of igrejaPrefs) {
      const key = p.chave.replace("igreja.", "");
      result[key] = p.valor;
    }

    return result as {
      nome?: string;
      descricao?: string;
      foto?: string;
      endereco?: string;
      googleMapsEmbed?: string;
      horarios?: Array<{ dia: string; horario: string; tipo: string }>;
      whatsapp?: string;
      telefone?: string;
      email?: string;
      banco?: string;
      agencia?: string;
      conta?: string;
      pix?: string;
      educacional?: Array<{ turma: string; responsavel: string }>;
    };
  },
});
