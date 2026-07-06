// Helpers de idade e transicao de turma do Educacional Infantil.
// Extraidos de CriancaCard/CriancaDetalhe (antes duplicados) e estendidos com
// a previsao de mudanca de turma a partir da data de nascimento.

// Bordas etarias (em anos) que marcam troca de turma; 11 = saida do departamento.
const BORDAS = [3, 5, 7, 9, 11];

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "YYYY-MM-DD" -> "mar/2026". String vazia se invalida. */
export function formatarMesAno(data: string): string {
  const [y, m] = data.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) return "";
  return `${MESES_ABREV[m - 1]}/${y}`;
}

/** Idade em anos completos a partir de "YYYY-MM-DD". null se invalida. */
export function idadeEmAnos(dataNascimento: string | undefined): number | null {
  if (!dataNascimento) return null;
  const [by, bm, bd] = dataNascimento.split("-").map(Number);
  if ([by, bm, bd].some((n) => Number.isNaN(n))) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - by;
  const antesDoAniversario =
    hoje.getMonth() + 1 < bm ||
    (hoje.getMonth() + 1 === bm && hoje.getDate() < bd);
  if (antesDoAniversario) anos--;
  return anos < 0 ? null : anos;
}

/**
 * Idade formatada. `long` alterna entre "5a"/"8m" (compacto, card) e
 * "5 anos"/"8 meses" (detalhe).
 */
export function calcularIdade(
  dataNascimento: string,
  opts: { long?: boolean } = {}
): string {
  const nascimento = new Date(dataNascimento);
  const diff = Date.now() - nascimento.getTime();
  const anos = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  if (anos < 1) {
    const meses = Math.floor(diff / (30.44 * 24 * 60 * 60 * 1000));
    return opts.long ? `${meses} meses` : `${meses}m`;
  }
  if (opts.long) return `${anos} ano${anos !== 1 ? "s" : ""}`;
  return `${anos}a`;
}

/** Turma correta para uma idade (mesmos cortes do backend). null se >10. */
export function turmaPorIdade(idade: number): string | null {
  if (idade < 0) return null;
  if (idade <= 2) return "0-2";
  if (idade <= 4) return "3-4";
  if (idade <= 6) return "5-6";
  if (idade <= 8) return "7-8";
  if (idade <= 10) return "9-10";
  return null;
}

export interface TransicaoTurma {
  /** Turma para a qual vai passar; null quando sai do departamento (11 anos). */
  proximaTurma: string | null;
  /** Data "YYYY-MM-DD" em que a transicao ocorre (aniversario da borda). */
  data: string;
  /** true quando a transicao e a saida do departamento infantil. */
  saiDoDepartamento: boolean;
}

/**
 * Proxima mudanca de turma a partir da data de nascimento. Retorna null se ja
 * saiu do departamento (>=11) ou data invalida.
 */
export function proximaTransicaoTurma(
  dataNascimento: string | undefined
): TransicaoTurma | null {
  const idade = idadeEmAnos(dataNascimento);
  if (idade === null || idade >= 11) return null;
  const [by, bm, bd] = dataNascimento!.split("-").map(Number);

  const borda = BORDAS.find((b) => b > idade);
  if (!borda) return null;

  const data = `${by + borda}-${String(bm).padStart(2, "0")}-${String(bd).padStart(2, "0")}`;
  return {
    proximaTurma: turmaPorIdade(borda),
    data,
    saiDoDepartamento: borda === 11,
  };
}

/**
 * true quando a turma cadastrada (snapshot) diverge da turma correta para a
 * idade atual — sinaliza que a crianca precisa ser reenquadrada.
 */
export function turmaDivergente(
  turmaAtual: string,
  dataNascimento: string | undefined
): boolean {
  const idade = idadeEmAnos(dataNascimento);
  if (idade === null) return false;
  const esperada = turmaPorIdade(idade);
  return esperada !== null && esperada !== turmaAtual;
}
