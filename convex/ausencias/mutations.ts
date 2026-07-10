import { mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";

// Push de aviso de ausencia para a lideranca. DESLIGADO por enquanto
// (requer VAPID configurado). Trocar para true para reativar a notificacao.
const PUSH_AUSENCIA_ENABLED = false;

// Papeis que recebem o push de aviso de ausencia ("obreiro para cima").
const ROLES_LIDERANCA = [
  "obreiro",
  "secretaria",
  "secretario_executivo",
  "presbitero",
  "pastor",
  "admin",
];

function getPushRef() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { internal } = require("../_generated/api");
  return internal.notifications.actions.sendPushToRoles;
}

// Domingos (YYYY-MM-DD) dentro do intervalo [inicio, fim], inclusivo.
// Usa UTC day-of-week pra evitar problemas de timezone.
function getDomingosNoIntervalo(inicio: string, fim: string): string[] {
  const domingos: string[] = [];
  let cur = inicio;
  const end = fim;

  while (cur <= end) {
    // Parse como UTC pra calcular day-of-week consistentemente
    const dt = new Date(cur + "T00:00:00Z");
    if (dt.getUTCDay() === 0) {
      domingos.push(cur);
    }
    // Avancar pra proxima data
    const [y, m, d] = cur.split("-").map(Number);
    const nextDt = new Date(Date.UTC(y, m - 1, d + 1));
    cur = nextDt.toISOString().split("T")[0];
  }
  return domingos;
}

function formatBR(data: string): string {
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
}

// Verifica se o membro ja esta escalado em algum culto naquela data.
async function estaEscaladoNaData(
  ctx: any,
  membroId: string,
  data: string
): Promise<boolean> {
  const cultos = await ctx.db
    .query("cultos")
    .withIndex("by_data", (q: any) => q.eq("data", data))
    .collect();
  for (const culto of cultos) {
    const escalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_culto_funcao", (q: any) => q.eq("cultoId", culto._id))
      .collect();
    if (escalas.some((e: any) => e.membroId === membroId)) return true;
  }
  return false;
}

export const criarAusencia = mutation({
  args: {
    dataInicio: v.string(),
    dataFim: v.optional(v.string()),
    motivo: v.optional(v.string()),
  },
  handler: async (ctx, { dataInicio, dataFim, motivo }) => {
    const { membro } = await requirePermission(ctx, "ausencias:manage");

    const fim = dataFim && dataFim > dataInicio ? dataFim : dataInicio;

    // Trava 1: nao deixar marcar ausencia se ja esta escalado em algum domingo do intervalo.
    const domingos = getDomingosNoIntervalo(dataInicio, fim);
    for (const domingo of domingos) {
      if (await estaEscaladoNaData(ctx, membro._id, domingo)) {
        throw new ConvexError(
          `Você já está escalado em ${formatBR(domingo)}. Fale com o coordenador antes de registrar ausência.`
        );
      }
    }

    const id = await ctx.db.insert("avisosAusencia", {
      membroId: membro._id,
      dataInicio,
      dataFim: fim !== dataInicio ? fim : undefined,
      motivo,
      criadoEm: Date.now(),
    });

    // Unificacao com escala: marca indisponibilidade nos domingos do intervalo,
    // para o gerador de escala pular a pessoa automaticamente.
    for (const domingo of domingos) {
      const existing = await ctx.db
        .query("indisponibilidades")
        .withIndex("by_membro_data", (q: any) =>
          q.eq("membroId", membro._id).eq("data", domingo)
        )
        .first();
      if (!existing) {
        await ctx.db.insert("indisponibilidades", {
          membroId: membro._id,
          data: domingo,
          motivo,
          criadoEm: Date.now(),
        });
      }
    }

    // Push segmentado para a lideranca (desligado por enquanto — ver flag acima).
    if (PUSH_AUSENCIA_ENABLED) {
      const entidade: any = await ctx.db.get(membro.entidadeId);
      const nome = entidade?.nomeCompleto || "Um membro";
      const periodo =
        fim !== dataInicio
          ? `${formatBR(dataInicio)} a ${formatBR(fim)}`
          : formatBR(dataInicio);
      await ctx.scheduler.runAfter(0, getPushRef(), {
        roles: ROLES_LIDERANCA,
        title: "Aviso de ausencia",
        body: `${nome} estara ausente em ${periodo}${motivo ? ` — ${motivo}` : ""}`,
        url: "/ausencias",
      });
    }

    return { id };
  },
});

export const removerAusencia = mutation({
  args: { id: v.id("avisosAusencia") },
  handler: async (ctx, { id }) => {
    const { membro } = await requirePermission(ctx, "ausencias:manage");

    const aviso = await ctx.db.get(id);
    if (!aviso) throw new ConvexError("Ausência não encontrada");
    if (aviso.membroId !== membro._id) {
      throw new ConvexError("Você só pode remover a sua própria ausência");
    }

    await ctx.db.delete(id);

    // Remove as indisponibilidades criadas por este aviso, exceto as que ainda
    // sejam cobertas por outro aviso do mesmo membro.
    const fim = aviso.dataFim || aviso.dataInicio;
    const outrosAvisos = await ctx.db
      .query("avisosAusencia")
      .withIndex("by_membro", (q: any) => q.eq("membroId", membro._id))
      .collect();

    for (const domingo of getDomingosNoIntervalo(aviso.dataInicio, fim)) {
      const coberto = outrosAvisos.some(
        (a: any) => domingo >= a.dataInicio && domingo <= (a.dataFim || a.dataInicio)
      );
      if (coberto) continue;
      const indisp = await ctx.db
        .query("indisponibilidades")
        .withIndex("by_membro_data", (q: any) =>
          q.eq("membroId", membro._id).eq("data", domingo)
        )
        .first();
      if (indisp) await ctx.db.delete(indisp._id);
    }

    return { ok: true };
  },
});
