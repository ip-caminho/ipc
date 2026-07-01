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

// Textos editáveis do site (chaves `site.*`) — público, sem auth. Hoje: hero da
// home (heroTitulo, heroSub). Conteúdo editorial denso continua em MDX.
export const getTextosSite = query({
  args: {},
  handler: async (ctx) => {
    const prefs = await ctx.db.query("preferencias").collect();
    const result: Record<string, string> = {};
    for (const p of prefs) {
      if (p.chave.startsWith("site.")) result[p.chave.replace("site.", "")] = String(p.valor ?? "");
    }
    return result as { heroTitulo?: string; heroSub?: string };
  },
});
