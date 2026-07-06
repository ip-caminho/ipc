/**
 * Extrai as frases pequenas do resultado bruto da IA (fraseChave +
 * frasesRedesSociais) para denormalizar em gravacoes.iaFrases — assim o
 * listFrases/carrossel nao precisa ler o iaResultado pesado.
 */
export function extrairFrases(resultado: unknown): string[] | undefined {
  if (!resultado || typeof resultado !== "object") return undefined;
  const r = resultado as { fraseChave?: unknown; frasesRedesSociais?: unknown };
  const frases: string[] = [];

  if (typeof r.fraseChave === "string" && r.fraseChave.trim()) {
    frases.push(r.fraseChave);
  }
  if (Array.isArray(r.frasesRedesSociais)) {
    for (const f of r.frasesRedesSociais) {
      if (typeof f === "string" && f.trim()) frases.push(f);
    }
  }

  return frases.length > 0 ? frases : undefined;
}

// Stopwords PT curtas ignoradas na comparacao de titulos de avisos.
const STOPWORDS_TITULO = new Set([
  "de", "da", "do", "dos", "das", "e", "o", "a", "os", "as",
  "no", "na", "nos", "nas", "com", "para", "pra", "um", "uma",
]);

/**
 * Normaliza um titulo de aviso para comparacao: remove acentos, caixa,
 * pontuacao e espacos redundantes. Mesmo padrao usado em
 * membros/mesclarDuplicados.ts para dedup de nomes.
 */
export function normalizarTitulo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Tokens significativos (sem stopwords) do titulo normalizado.
function tokensSignificativos(s: string): string[] {
  return normalizarTitulo(s)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS_TITULO.has(t));
}

/**
 * Decide se dois titulos de aviso se referem a mesma coisa. Usado no dedup de
 * eventos de calendario gerados pela IA — o Claude parafraseia o titulo a cada
 * semana ("Retiro de Jovens" vs "Retiro dos Jovens"), entao igualdade exata nao
 * basta. A comparacao de data (identica) fica a cargo de quem chama.
 */
export function titulosSimilares(a: string, b: string): boolean {
  // 1. Iguais apos normalizar (acento/caixa/pontuacao)
  if (normalizarTitulo(a) === normalizarTitulo(b)) return true;

  const ta = new Set(tokensSignificativos(a));
  const tb = new Set(tokensSignificativos(b));
  // Sem tokens significativos de um dos lados: so a regra (1) vale
  if (ta.size === 0 || tb.size === 0) return false;

  // 2. Um conjunto e subconjunto do outro (ex: "...- inscricoes abertas")
  const [menor, maior] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  if ([...menor].every((t) => maior.has(t))) return true;

  // 3. Jaccard dos tokens significativos >= 0.6
  let intersecao = 0;
  for (const t of ta) if (tb.has(t)) intersecao++;
  const uniao = ta.size + tb.size - intersecao;
  return uniao > 0 && intersecao / uniao >= 0.6;
}
