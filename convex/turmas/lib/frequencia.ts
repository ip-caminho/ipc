import { FREQUENCIA_MINIMA_PADRAO } from "./constants";

export type CriterioAprovacao = "PERCENTUAL" | "MAX_FALTAS";

export type ResumoFrequencia = {
  aulasConsideradas: number;
  aulasPresentes: number;
  faltas: number;
  /** null quando nenhuma aula foi apurada ainda (denominador zero). */
  percentual: number | null;
  apto: boolean;
};

export type AulaApuravel = {
  _id: string;
  data: string; // YYYY-MM-DD
  presencaRegistradaEm?: number;
};

export type RegraAprovacao = {
  criterio?: CriterioAprovacao;
  frequenciaMinima?: number;
  maxFaltas?: number;
};

/** Texto curto da regra, para tela e certificado impresso. */
export function descreverRegra(regra: RegraAprovacao): string {
  if (regra.criterio === "MAX_FALTAS") {
    const max = regra.maxFaltas ?? 0;
    return `maximo de ${max} ${max === 1 ? "falta" : "faltas"}`;
  }
  return `frequencia minima de ${regra.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO}%`;
}

/**
 * Frequencia de um aluno na turma. Regra unica, usada na tela e na emissao do
 * certificado — se divergirem, o papel sai com numero diferente do que a
 * secretaria viu.
 *
 * Duas exclusoes do denominador, ambas deliberadas:
 *
 * 1. Aula sem chamada (`presencaRegistradaEm` vazio) nao conta para ninguem.
 *    Esquecimento do instrutor nao pode virar falta da turma inteira.
 * 2. Aula anterior a inscricao do aluno nao conta para ele. Quem entrou na 3a
 *    aula nao carrega 2 faltas.
 *
 * Ausencia de registro de presenca numa aula COM chamada conta como falta: a
 * chamada foi feita e ele nao estava na lista.
 *
 * Dois criterios de aprovacao:
 * - PERCENTUAL (padrao): percentual >= frequenciaMinima
 * - MAX_FALTAS: faltas <= maxFaltas. E como a igreja comunica ("limite de 3
 *   faltas nos 8 encontros") e nao quebra quando uma aula e cancelada.
 */
export function calcularFrequencia(params: {
  aulas: AulaApuravel[];
  /** encontroId -> presente, apenas as presencas deste aluno. */
  presencaPorAula: Map<string, boolean>;
  /** YYYY-MM-DD da inscricao do aluno. */
  inscritoDesde: string;
  regra?: RegraAprovacao;
}): ResumoFrequencia {
  const regra = params.regra ?? {};
  const minima = regra.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO;

  const apuraveis = params.aulas.filter(
    (a) => a.presencaRegistradaEm && a.data >= params.inscritoDesde
  );

  const aulasConsideradas = apuraveis.length;
  const aulasPresentes = apuraveis.filter(
    (a) => params.presencaPorAula.get(a._id) === true
  ).length;
  const faltas = aulasConsideradas - aulasPresentes;

  if (aulasConsideradas === 0) {
    return {
      aulasConsideradas: 0,
      aulasPresentes: 0,
      faltas: 0,
      percentual: null,
      apto: false,
    };
  }

  const percentual = Math.round((aulasPresentes / aulasConsideradas) * 100);
  const apto =
    regra.criterio === "MAX_FALTAS"
      ? faltas <= (regra.maxFaltas ?? 0)
      : percentual >= minima;

  return { aulasConsideradas, aulasPresentes, faltas, percentual, apto };
}
