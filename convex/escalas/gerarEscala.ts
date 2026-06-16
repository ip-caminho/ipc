import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requirePermission } from "../_shared/requirePermission";
import { gerarEscalaParaData, type MembroDisponivel, type FuncaoConfig, type ResultadoEscala } from "./gerarEscalaHelpers";

const FUNCOES_CONFIG: Record<string, FuncaoConfig> = {
  LOUVOR: { funcao: "LOUVOR", multiplo: true, qtd: 3, temCondutores: true },
  HOSPITALIDADE: { funcao: "HOSPITALIDADE", multiplo: true, qtd: 3 },
  SOM: { funcao: "SOM", multiplo: false, qtd: 1 },
  MULTIMIDIA: { funcao: "MULTIMIDIA", multiplo: false, qtd: 1 },
};

export const gerarEscalaPorEquipe = mutation({
  args: {
    funcao: v.string(),
    dataInicio: v.string(), // YYYY-MM-DD
    dataFim: v.string(),    // YYYY-MM-DD
  },
  handler: async (ctx, { funcao, dataInicio, dataFim }) => {
    await requirePermission(ctx, "escalas:update");

    const config = FUNCOES_CONFIG[funcao];
    if (!config) throw new Error("Funcao invalida");

    // 1. Buscar cultos no período
    const allCultos = await ctx.db.query("cultos").order("asc").collect();
    const cultosNoPeriodo = allCultos.filter(
      (c) => c.data >= dataInicio && c.data <= dataFim
    );

    if (cultosNoPeriodo.length === 0) {
      return { totalAtribuidos: 0, cultosProcessados: 0, detalhes: [] };
    }

    // 2. Buscar membros ativos da equipe (com info de condutor)
    const allEquipe = await ctx.db.query("equipeMembros").collect();
    const membrosEquipe = allEquipe.filter((em) => em.funcao === funcao && em.ativo);
    const membrosAtivos = membrosEquipe.map((em) => em.membroId);
    const condutorMap = new Map<string, boolean>();
    for (const em of membrosEquipe) {
      if (em.condutor) condutorMap.set(em.membroId, true);
    }

    if (membrosAtivos.length === 0) {
      return { totalAtribuidos: 0, cultosProcessados: 0, detalhes: [] };
    }

    // 3. Buscar indisponibilidades do período direto pelo índice
    const indispsNoPeriodo = await ctx.db
      .query("indisponibilidades")
      .withIndex("by_data", (q: any) => q.gte("data", dataInicio).lte("data", dataFim))
      .collect();
    const indispPorData = new Map<string, Set<string>>();
    for (const i of indispsNoPeriodo) {
      if (!indispPorData.has(i.data)) indispPorData.set(i.data, new Set());
      indispPorData.get(i.data)!.add(i.membroId);
    }

    // 4. Histórico de escalas DESTA função para scores (sem ler outras funções)
    const allEscalas = await ctx.db
      .query("cultoEscalas")
      .withIndex("by_funcao", (q: any) => q.eq("funcao", funcao))
      .collect();
    const cultoMap = new Map<string, string>(); // cultoId -> data
    for (const c of allCultos) {
      cultoMap.set(c._id, c.data);
    }

    // Stats iniciais
    const statsMap = new Map<string, { total: number; ultima: number | null }>();
    for (const e of allEscalas) {
      if (!e.membroId) continue;
      const key = e.membroId;
      const cultoData = cultoMap.get(e.cultoId);
      const ts = cultoData ? new Date(cultoData).getTime() : 0;

      if (!statsMap.has(key)) statsMap.set(key, { total: 0, ultima: null });
      const stats = statsMap.get(key)!;
      stats.total++;
      if (ts > (stats.ultima || 0)) stats.ultima = ts;
    }

    // 5. Processar culto por culto em ordem cronológica
    const detalhes: Array<{ data: string; atribuidos: string[]; alertaSemCondutor?: boolean }> = [];
    let totalAtribuidos = 0;
    const alertas: string[] = [];

    for (const culto of cultosNoPeriodo) {
      // Todas as escalas deste culto (para verificar conflito entre equipes)
      const todasEscalasCulto = await ctx.db
        .query("cultoEscalas")
        .withIndex("by_culto_funcao", (q: any) =>
          q.eq("cultoId", culto._id)
        )
        .collect();

      // Membros já escalados em OUTRA função neste culto
      const escaladosOutraFuncao = new Set(
        todasEscalasCulto
          .filter((e) => e.membroId && e.funcao !== funcao)
          .map((e) => e.membroId!)
      );

      const escalasExistentes = todasEscalasCulto.filter((e) => e.funcao === funcao);

      const jaAtribuidos = new Set(
        escalasExistentes.filter((e) => e.membroId).map((e) => e.membroId!)
      );

      const slotsFaltando = Math.max(0, config.qtd - jaAtribuidos.size);
      if (slotsFaltando === 0) {
        detalhes.push({ data: culto.data, atribuidos: [] });
        continue;
      }

      // Montar lista de disponíveis com scores atualizados
      const indispHoje = indispPorData.get(culto.data) || new Set<string>();
      const disponiveis: MembroDisponivel[] = membrosAtivos
        .filter((id) => !jaAtribuidos.has(id) && !indispHoje.has(id) && !escaladosOutraFuncao.has(id))
        .map((membroId) => {
          const stats = statsMap.get(membroId);
          return {
            membroId,
            totalEscalas: stats?.total || 0,
            ultimaEscala: stats?.ultima || null,
            condutor: condutorMap.get(membroId) || false,
          };
        });

      // Gerar
      const resultadoGerado = gerarEscalaParaData(
        [{ ...config, qtd: slotsFaltando }],
        new Map([[funcao, disponiveis]]),
        new Set<string>(), // já filtrados acima
        Date.now(),
      );

      const resultadoFuncao = resultadoGerado.get(funcao);
      const selecionados = resultadoFuncao?.selecionados || [];

      if (resultadoFuncao?.alertaSemCondutor) {
        alertas.push(culto.data);
      }

      // Inserir
      for (const membroId of selecionados) {
        if (config.multiplo) {
          if (!escalasExistentes.some((e) => e.membroId === membroId)) {
            await ctx.db.insert("cultoEscalas", {
              cultoId: culto._id,
              funcao,
              membroId: membroId as any,
            });
          }
        } else {
          const existing = escalasExistentes[0];
          if (existing && !existing.membroId) {
            await ctx.db.patch(existing._id, { membroId: membroId as any });
          } else if (!existing) {
            await ctx.db.insert("cultoEscalas", {
              cultoId: culto._id,
              funcao,
              membroId: membroId as any,
            });
          }
        }

        // Atualizar stats para o próximo culto (distribuição progressiva)
        if (!statsMap.has(membroId)) statsMap.set(membroId, { total: 0, ultima: null });
        const stats = statsMap.get(membroId)!;
        stats.total++;
        stats.ultima = new Date(culto.data).getTime();
      }

      detalhes.push({
        data: culto.data,
        atribuidos: selecionados,
        alertaSemCondutor: resultadoFuncao?.alertaSemCondutor,
      });
      totalAtribuidos += selecionados.length;
    }

    return {
      totalAtribuidos,
      cultosProcessados: cultosNoPeriodo.length,
      detalhes,
      alertas, // datas sem condutor disponível
    };
  },
});
