import { query } from "../_generated/server";
import { requirePermission } from "../_shared/requirePermission";
import { getSaoPauloDateString } from "../_shared/datetime";
import type { Doc } from "../_generated/dataModel";

// Gravacao cujo iaAvisos alimenta "Esta semana" no site (mesma varredura de
// public/avisos.ts:listUltimoCulto, mas admin: retorna iaAvisos COMPLETO,
// incluindo contato/dataEvento, para a curadoria poder preserva-los).
// Exige site_publico:manage.
export const getGravacaoDoSite = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "site_publico:manage");
    let culto: Doc<"gravacoes"> | null = null;
    let scanned = 0;
    for await (const g of ctx.db
      .query("gravacoes")
      .withIndex("by_data")
      .order("desc")) {
      if (++scanned > 40) break;
      if (
        g.status === "PUBLICADO" &&
        g.tipo === "SERMAO" &&
        Array.isArray(g.iaAvisos) &&
        g.iaAvisos.length > 0
      ) {
        culto = g;
        break;
      }
    }
    if (!culto) return null;
    return {
      gravacaoId: culto._id,
      data: culto.data,
      titulo: culto.titulo,
      avisos: culto.iaAvisos ?? [],
    };
  },
});

// Agenda para o painel admin: cultos publicados futuros (leitura, geridos em
// /cultos) + eventos do calendário futuros com os campos COMPLETOS, para editar
// inline sem sair da página. Exige site_publico:manage.
export const getAgendaAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "site_publico:manage");
    const hoje = getSaoPauloDateString();

    type Item = {
      id: string;
      tipo: string;
      titulo: string;
      subtitulo?: string;
      data: string;
      horario?: string;
      editavel: boolean;
      publicadoNoSite?: boolean;
      // Status na agenda pública HOJE: visivel | oculto (despublicado) |
      // agendado (janela ainda não começou) | expirado (janela terminou).
      statusSite?: "visivel" | "oculto" | "agendado" | "expirado";
      evento?: {
        id: string;
        titulo: string;
        data: string;
        dataFim?: string;
        ministerioId?: string;
        descricao?: string;
        tipo: string;
        publicadoNoSite: boolean;
        exibirNoSiteDe?: string;
        exibirNoSiteAte?: string;
      };
    };

    const itens: Item[] = [];

    const cultos = await ctx.db
      .query("cultos")
      .withIndex("by_status_data", (q) => q.eq("status", "PUBLICADO").gte("data", hoje))
      .collect();
    for (const c of cultos) {
      itens.push({
        id: c._id,
        tipo: "culto",
        titulo: c.titulo ?? (c.tipo === "DOMINICAL" ? "Culto Dominical" : "Culto"),
        subtitulo: c.observacoes,
        data: c.data,
        horario: c.horario,
        editavel: false,
      });
    }

    const eventos = await ctx.db
      .query("calendarioEventos")
      .withIndex("by_data", (q) => q.gte("data", hoje))
      .collect();
    for (const e of eventos) {
      const tipo = e.tipo ?? "evento";
      const publicado = e.publicadoNoSite !== false;
      const de = e.exibirNoSiteDe || "";
      const ate = e.exibirNoSiteAte || "";
      const statusSite: "visivel" | "oculto" | "agendado" | "expirado" = !publicado
        ? "oculto"
        : de && de > hoje
          ? "agendado"
          : ate && ate < hoje
            ? "expirado"
            : "visivel";
      itens.push({
        id: e._id,
        tipo,
        titulo: e.titulo,
        subtitulo: e.descricao,
        data: e.data,
        editavel: true,
        publicadoNoSite: publicado,
        statusSite,
        evento: {
          id: e._id,
          titulo: e.titulo,
          data: e.data,
          dataFim: e.dataFim,
          ministerioId: e.ministerioId,
          descricao: e.descricao,
          tipo,
          publicadoNoSite: publicado,
          exibirNoSiteDe: e.exibirNoSiteDe,
          exibirNoSiteAte: e.exibirNoSiteAte,
        },
      });
    }

    itens.sort((a, b) => a.data.localeCompare(b.data));
    return itens;
  },
});
