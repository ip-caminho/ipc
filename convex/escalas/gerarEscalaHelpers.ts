/**
 * Lógica pura de scoring e geração automática de escalas.
 * Sem dependências do Convex — testável com Vitest.
 */

export interface MembroDisponivel {
  membroId: string;
  totalEscalas: number;        // Quantas vezes já serviu nesta função
  ultimaEscala: number | null; // Timestamp da última vez que serviu nesta função
  condutor?: boolean;          // Para LOUVOR: true = conduz o louvor
}

export interface FuncaoConfig {
  funcao: string;
  multiplo: boolean;
  qtd: number; // Quantos membros selecionar (1 para singular, N para múltiplo)
  temCondutores?: boolean; // true se a equipe completa tem membros marcados como condutor
}

/**
 * Score: menor = mais prioritário.
 * - Quem serviu menos vezes tem prioridade absoluta (totalEscalas * 1000)
 * - Em caso de empate, quem não serve há mais tempo ganha (subtrai dias desde última escala)
 */
export function calcularScore(m: MembroDisponivel, hoje: number): number {
  const daysSinceLastServed = m.ultimaEscala
    ? Math.floor((hoje - m.ultimaEscala) / (1000 * 60 * 60 * 24))
    : 9999; // Nunca serviu = máxima prioridade de descanso

  return m.totalEscalas * 1000 - daysSinceLastServed;
}

export interface ResultadoEscala {
  selecionados: string[];
  alertaSemCondutor?: boolean; // true se nenhum condutor disponível
}

/**
 * Para cada função, filtra membros disponíveis, ordena por score, seleciona os N necessários.
 *
 * Regras especiais para LOUVOR:
 * - Condutores têm prioridade absoluta (pelo menos 1 deve ser escalado)
 * - Acompanhantes preenchem os slots restantes
 * - Condutor pode ficar sozinho se não houver acompanhante disponível
 * - Se nenhum condutor disponível, retorna alerta
 *
 * Retorna Map de funcao -> ResultadoEscala.
 */
export function gerarEscalaParaData(
  funcoes: FuncaoConfig[],
  equipePorFuncao: Map<string, MembroDisponivel[]>,
  indisponiveisPorData: Set<string>,
  hoje: number,
): Map<string, ResultadoEscala> {
  const resultado = new Map<string, ResultadoEscala>();

  for (const config of funcoes) {
    const equipe = equipePorFuncao.get(config.funcao) || [];

    // Filtrar indisponíveis
    const disponiveis = equipe.filter(
      (m) => !indisponiveisPorData.has(m.membroId)
    );

    // Verificar se a equipe usa regra de condutor (vem do config, baseado na equipe completa)
    const temRegraCondutor = config.temCondutores ?? false;

    if (temRegraCondutor) {
      // Separar condutores e acompanhantes
      const condutores = disponiveis.filter((m) => m.condutor);
      const acompanhantes = disponiveis.filter((m) => !m.condutor);

      if (condutores.length === 0) {
        // Nenhum condutor disponível — alerta
        resultado.set(config.funcao, { selecionados: [], alertaSemCondutor: true });
        continue;
      }

      // Selecionar 1 condutor (menor score)
      const scoredCondutores = condutores.map((m) => ({
        ...m,
        score: calcularScore(m, hoje),
      }));
      scoredCondutores.sort((a, b) => a.score - b.score);
      const condutorSelecionado = scoredCondutores[0];

      const selecionados = [condutorSelecionado.membroId];

      // Preencher restante com acompanhantes
      const slotsRestantes = config.qtd - 1;
      if (slotsRestantes > 0 && acompanhantes.length > 0) {
        const scoredAcomp = acompanhantes.map((m) => ({
          ...m,
          score: calcularScore(m, hoje),
        }));
        scoredAcomp.sort((a, b) => a.score - b.score);
        selecionados.push(
          ...scoredAcomp.slice(0, slotsRestantes).map((m) => m.membroId)
        );
      }

      resultado.set(config.funcao, { selecionados });
    } else {
      // Lógica padrão (sem regra de condutor)
      const scored = disponiveis.map((m) => ({
        ...m,
        score: calcularScore(m, hoje),
      }));
      scored.sort((a, b) => a.score - b.score);
      const selecionados = scored.slice(0, config.qtd).map((m) => m.membroId);
      resultado.set(config.funcao, { selecionados });
    }
  }

  return resultado;
}
