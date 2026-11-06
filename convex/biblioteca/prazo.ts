// Sem imports do servidor: usado pelo backend e pelas telas.

export const PRAZO_EMPRESTIMO_DIAS = 28;

/** Data "YYYY-MM-DD" somada de `dias`, sem depender do fuso de quem calcula. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split("T")[0];
}

export function dataPrevistaDevolucao(dataEmprestimo: string): string {
  return somarDias(dataEmprestimo, PRAZO_EMPRESTIMO_DIAS);
}
