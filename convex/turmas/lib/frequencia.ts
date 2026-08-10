import { FREQUENCIA_MINIMA_PADRAO } from "./constants";

export type ResumoFrequencia = {
  aulasConsideradas: number;
  aulasPresentes: number;
  /** null quando nenhuma aula foi apurada ainda (denominador zero). */
  percentual: number | null;
  apto: boolean;
};

export type AulaApuravel = {
  _id: string;
  data: string; // YYYY-MM-DD
  presencaRegistradaEm?: number;
};

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
 */
export function calcularFrequencia(params: {
  aulas: AulaApuravel[];
  /** encontroId -> presente, apenas as presencas deste aluno. */
  presencaPorAula: Map<string, boolean>;
  /** YYYY-MM-DD da inscricao do aluno. */
  inscritoDesde: string;
  frequenciaMinima?: number;
}): ResumoFrequencia {
  const minima = params.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO;

  const apuraveis = params.aulas.filter(
    (a) => a.presencaRegistradaEm && a.data >= params.inscritoDesde
  );

  const aulasConsideradas = apuraveis.length;
  const aulasPresentes = apuraveis.filter(
    (a) => params.presencaPorAula.get(a._id) === true
  ).length;

  if (aulasConsideradas === 0) {
    return { aulasConsideradas: 0, aulasPresentes: 0, percentual: null, apto: false };
  }

  const percentual = Math.round((aulasPresentes / aulasConsideradas) * 100);
  return {
    aulasConsideradas,
    aulasPresentes,
    percentual,
    apto: percentual >= minima,
  };
}
