export type JanelaInscricao = {
  aberta: boolean;
  motivo?: "NAO_ABERTA" | "AINDA_NAO_COMECOU" | "ENCERRADA";
};

/**
 * A turma esta aceitando inscricao nesta data?
 *
 * Datas em YYYY-MM-DD e comparadas como string (a ordem lexicografica coincide
 * com a cronologica nesse formato) — nada de Date, para nao reintroduzir fuso.
 * `hoje` deve vir de getSaoPauloDateString(): o servidor roda em UTC e a partir
 * das 21h locais viraria o dia antes da hora.
 *
 * A janela e inclusiva: no dia de `inscricoesAte` ainda da para se inscrever.
 * Campos vazios = sem restricao de data (fecha so por status/vagas).
 */
export function avaliarJanelaInscricao(
  turma: { status: string; inscricoesDe?: string; inscricoesAte?: string },
  hoje: string
): JanelaInscricao {
  if (turma.status !== "ABERTA") return { aberta: false, motivo: "NAO_ABERTA" };
  if (turma.inscricoesDe && hoje < turma.inscricoesDe) {
    return { aberta: false, motivo: "AINDA_NAO_COMECOU" };
  }
  if (turma.inscricoesAte && hoje > turma.inscricoesAte) {
    return { aberta: false, motivo: "ENCERRADA" };
  }
  return { aberta: true };
}
