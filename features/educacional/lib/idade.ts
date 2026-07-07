// Helpers de idade e transicao de turma do Educacional Infantil.
//
// Enturmacao e por COORTE (ano civil): a turma e definida pela idade que a
// crianca COMPLETA no ano corrente (ano atual - ano de nascimento), nao pela
// idade ja completada. Ex.: quem nasceu em dez/2023, em 2026 faz 3 anos ->
// turma "3-4" desde o inicio de 2026, mesmo antes do aniversario.

// Bordas de coorte (em anos) que marcam troca de turma; 11 = saida do depto.
const BORDAS = [3, 5, 7, 9, 11];

/** Idade REAL em anos completos a partir de "YYYY-MM-DD". null se invalida. */
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
 * Idade da coorte: idade que a crianca faz no ano de referencia (ano civil).
 * E a base da enturmacao. null se data invalida.
 */
export function coorteIdade(
  dataNascimento: string | undefined,
  anoReferencia?: number
): number | null {
  if (!dataNascimento) return null;
  const by = Number(dataNascimento.split("-")[0]);
  if (Number.isNaN(by)) return null;
  const ano = anoReferencia ?? new Date().getFullYear();
  const idade = ano - by;
  return idade < 0 ? null : idade;
}

/**
 * Idade real formatada. `long` alterna entre "5a"/"8m" (compacto, card) e
 * "5 anos"/"8 meses" (detalhe). Deriva de idadeEmAnos para os anos, para nao
 * divergir do calculo de calendario usado na enturmacao.
 */
export function calcularIdade(
  dataNascimento: string,
  opts: { long?: boolean } = {}
): string {
  const anos = idadeEmAnos(dataNascimento);
  if (anos === null) return "";
  if (anos < 1) {
    // Menos de 1 ano: aproxima os meses a partir da diferenca de tempo.
    const diff = Date.now() - new Date(dataNascimento).getTime();
    const meses = Math.max(0, Math.floor(diff / (30.44 * 24 * 60 * 60 * 1000)));
    return opts.long ? `${meses} meses` : `${meses}m`;
  }
  if (opts.long) return `${anos} ano${anos !== 1 ? "s" : ""}`;
  return `${anos}a`;
}

/** Turma correta para uma idade de coorte. null se >10 (saiu do depto). */
export function turmaPorCoorte(coorte: number): string | null {
  if (coorte < 0) return null;
  if (coorte <= 2) return "0-2";
  if (coorte <= 4) return "3-4";
  if (coorte <= 6) return "5-6";
  if (coorte <= 8) return "7-8";
  if (coorte <= 10) return "9-10";
  return null;
}

export interface TransicaoTurma {
  /** Turma para a qual vai passar; null quando sai do departamento. */
  proximaTurma: string | null;
  /** Ano civil em que a transicao ocorre (a coorte muda na virada do ano). */
  ano: number;
  /** true quando a transicao e a saida do departamento infantil. */
  saiDoDepartamento: boolean;
}

/**
 * Proxima mudanca de turma por coorte. A transicao ocorre no inicio do ano
 * civil em que a crianca atinge a proxima borda (3/5/7/9/11). Retorna null se
 * ja saiu do departamento (>=11) ou data invalida.
 */
export function proximaTransicaoTurma(
  dataNascimento: string | undefined
): TransicaoTurma | null {
  const coorte = coorteIdade(dataNascimento);
  if (coorte === null || coorte >= 11) return null;
  const by = Number(dataNascimento!.split("-")[0]);

  const borda = BORDAS.find((b) => b > coorte);
  if (!borda) return null;

  return {
    proximaTurma: turmaPorCoorte(borda),
    ano: by + borda, // ano civil em que a crianca faz `borda` anos
    saiDoDepartamento: borda === 11,
  };
}

/**
 * true quando a turma cadastrada diverge da turma correta para a coorte atual
 * — sinaliza que a crianca precisa ser reenquadrada.
 */
export function turmaDivergente(
  turmaAtual: string,
  dataNascimento: string | undefined
): boolean {
  const coorte = coorteIdade(dataNascimento);
  if (coorte === null) return false;
  const esperada = turmaPorCoorte(coorte);
  return esperada !== null && esperada !== turmaAtual;
}
