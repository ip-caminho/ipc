const DIAS_SEMANA = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
];

/**
 * Datas das aulas semanais de uma turma, em YYYY-MM-DD.
 *
 * Se `diaSemana` for informado e nao cair no mesmo dia de `dataInicio`, a
 * primeira aula pula para o primeiro dia da semana correspondente. Sem
 * `diaSemana`, conta a partir da propria data de inicio.
 *
 * Aritmetica em UTC de proposito: sao datas puras (sem hora), entao nao ha
 * conversao de fuso a fazer — usar horario local do servidor deslocaria o dia.
 * Feriados nao sao tratados: a secretaria ajusta a aula na tela da turma.
 */
export function gerarDatasAulas(
  dataInicio: string,
  diaSemana: string | undefined,
  totalAulas: number
): string[] {
  if (!Number.isInteger(totalAulas) || totalAulas < 1) return [];

  const [ano, mes, dia] = dataInicio.split("-").map(Number);
  if (!ano || !mes || !dia) return [];

  const primeira = new Date(Date.UTC(ano, mes - 1, dia));
  if (Number.isNaN(primeira.getTime())) return [];

  const alvo = diaSemana ? DIAS_SEMANA.indexOf(diaSemana) : -1;
  if (alvo >= 0) {
    const deslocamento = (alvo - primeira.getUTCDay() + 7) % 7;
    primeira.setUTCDate(primeira.getUTCDate() + deslocamento);
  }

  const datas: string[] = [];
  for (let i = 0; i < totalAulas; i++) {
    const d = new Date(primeira);
    d.setUTCDate(d.getUTCDate() + i * 7);
    datas.push(d.toISOString().slice(0, 10));
  }
  return datas;
}
