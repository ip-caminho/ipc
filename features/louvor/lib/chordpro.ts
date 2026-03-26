import ChordSheetJS from "chordsheetjs";

/**
 * Detecta se o texto e ChordPro ou plain text (chords-over-lyrics).
 *
 * ChordPro: acordes em colchetes COLADOS na letra — [G]Amazing [C]Grace
 * Plain (Cifra Club): acordes em linhas separadas acima das letras
 */
export function detectFormat(text: string): "chordpro" | "plain" {
  if (/\[[A-G][#b]?[a-z0-9()\/*]*\]\S/.test(text)) return "chordpro";
  return "plain";
}

/**
 * Regex estrita para acordes: apenas notacao por letra (A-G), sem solfege.
 * Evita falsos positivos com palavras em portugues (Do, Ao, Em, etc).
 */
const STRICT_CHORD =
  /^[A-G][#b]?(m|M|min|maj|dim|aug|sus[24]?|add|[0-9]+|\/[A-G][#b]?)*$/;

/** Regex para seções com colchetes: [Intro], [Verso 1], [Refrão], etc */
const SECTION_RE = /^\[.*?\]\s*/;

/** Regex para seções sem colchetes: Verso 1:, Refrão:, Pre-Refrão:, etc */
const SECTION_LABEL_RE = /^(verso|verse|refrão|refrao|pre-refrão|pre-refrao|pré-refrão|pre-chorus|ponte|bridge|intro|outro|final|coro|chorus|interlude|solo|tag|ending|vamp|hook|instrumental)(\s*\d*)?\s*:/i;

/** Tradução de labels em ingles para portugues */
const SECTION_TRANSLATION: Record<string, string> = {
  verse: "Verso",
  chorus: "Refrão",
  "pre-chorus": "Pré-Refrão",
  bridge: "Ponte",
  outro: "Final",
  ending: "Final",
  hook: "Refrão",
  interlude: "Interlúdio",
  instrumental: "Instrumental",
  tag: "Tag",
  vamp: "Vamp",
};

/** Traduz label de seção do ingles para portugues se necessario */
function translateSectionLabel(line: string): string {
  // Formato com colchetes: [Verse 1] → [Verso 1]
  const bracketMatch = line.match(/^\[([a-zA-ZÀ-ú-]+)(\s*\d*)\](.*)$/);
  if (bracketMatch) {
    const translated = translateLabel(bracketMatch[1]);
    return `[${translated}${bracketMatch[2]}]${bracketMatch[3]}`;
  }
  // Formato sem colchetes: Verse 1: → Verso 1:
  const labelMatch = line.match(/^([a-zA-ZÀ-ú-]+)(\s*\d*)\s*:(.*)$/);
  if (labelMatch) {
    const translated = translateLabel(labelMatch[1]);
    return `${translated}${labelMatch[2]}:${labelMatch[3]}`;
  }
  return line;
}

function translateLabel(label: string): string {
  const key = label.toLowerCase().trim();
  return SECTION_TRANSLATION[key] || label;
}

/** Detecta se uma linha contem APENAS acordes (sem letra) */
export function isChordLine(line: string): boolean {
  let text = line.trim();
  if (!text) return false;
  // Linhas de secao com acordes: [Intro] G Em C D
  const sectionMatch = text.match(SECTION_RE);
  if (sectionMatch) {
    text = text.slice(sectionMatch[0].length).trim();
    if (!text) return false; // secao sem acordes: [Verso 1]
  }
  // Limpar parenteses — (Am G/B) e notacao comum em cifras
  text = text.replace(/[()]/g, "");
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => STRICT_CHORD.test(t));
}

/**
 * Transpoe todos os acordes numa linha de texto.
 * Preserva espaçamento original.
 */
function transposeChordLine(line: string, semitones: number): string {
  if (semitones === 0) return line;

  return line.replace(/[A-G][#b]?(m|M|min|maj|dim|aug|sus[24]?|add|[0-9]+|\/[A-G][#b]?)*/g, (match) => {
    const chord = ChordSheetJS.Chord.parse(match);
    if (!chord) return match;
    const transposed = chord.transpose(semitones);
    if (!transposed) return match;
    const result = transposed.toString();

    // Preservar largura original para manter alinhamento
    if (result.length < match.length) {
      return result + " ".repeat(match.length - result.length);
    }
    return result;
  });
}

/**
 * Transpoe acordes no formato ChordPro usando o parser nativo.
 */
function transposeChordPro(text: string, semitones: number): string {
  if (semitones === 0) return text;
  const song = new ChordSheetJS.ChordProParser().parse(text);
  const transposed = song.transpose(semitones);
  return new ChordSheetJS.ChordProFormatter().format(transposed);
}

export type LineType = "chord" | "lyrics" | "section" | "empty";

export interface TypedLine {
  type: LineType;
  text: string;
}

/**
 * Renderiza texto como array de linhas tipadas.
 * Permite estilizar acordes e letras de forma independente.
 */
export function renderLines(
  text: string,
  showChords: boolean,
  semitones: number = 0
): TypedLine[] {
  if (!text) return [];

  const format = detectFormat(text);
  const lines = format === "chordpro"
    ? renderChordProLines(text, showChords, semitones)
    : renderPlainLines(text, showChords, semitones);

  if (!showChords) {
    // Colapsar linhas vazias consecutivas (sobras de linhas de acorde removidas)
    const result: TypedLine[] = [];
    for (const line of lines) {
      if (line.type === "empty" && (result.length === 0 || result[result.length - 1].type === "empty")) {
        continue;
      }
      result.push(line);
    }
    if (result.length > 0 && result[result.length - 1].type === "empty") {
      result.pop();
    }
    return result;
  }

  return lines;
}

/**
 * Renderiza como string pura (para preview do form).
 */
export function renderText(
  text: string,
  showChords: boolean,
  semitones: number = 0
): string {
  return renderLines(text, showChords, semitones)
    .map((l) => l.text)
    .join("\n");
}

/** Classifica o tipo de uma linha */
function classifyLine(line: string): LineType {
  const trimmed = line.trim();
  if (!trimmed) return "empty";
  if (isChordLine(line)) return "chord";
  // [Intro], [Verso 1], etc
  if (SECTION_RE.test(trimmed) && !trimmed.slice(trimmed.indexOf("]") + 1).trim()) return "section";
  // Verso 1:, Refrão:, Pre-Refrão:, etc
  if (SECTION_LABEL_RE.test(trimmed)) return "section";
  return "lyrics";
}

/**
 * Renderiza texto plain (Cifra Club) como linhas tipadas.
 */
function renderPlainLines(
  text: string,
  showChords: boolean,
  semitones: number
): TypedLine[] {
  const lines = text.split("\n");
  const result: TypedLine[] = [];

  for (const line of lines) {
    const type = classifyLine(line);

    if (type === "chord") {
      if (!showChords) continue;

      const sectionMatch = line.match(SECTION_RE);
      if (sectionMatch) {
        const rest = line.slice(sectionMatch[0].length);
        const transposed = semitones !== 0 ? transposeChordLine(rest, semitones) : rest;
        const translatedLabel = translateSectionLabel(sectionMatch[0].trimEnd());
        result.push({ type: "chord", text: translatedLabel + " " + transposed });
      } else {
        const transposed = semitones !== 0 ? transposeChordLine(line, semitones) : line;
        result.push({ type: "chord", text: transposed });
      }
    } else if (type === "section") {
      result.push({ type: "section", text: translateSectionLabel(line) });
    } else if (type === "empty") {
      result.push({ type: "empty", text: "" });
    } else {
      // Sem cifras: comprimir espacos multiplos que existiam para alinhar acordes
      const text = !showChords ? line.replace(/ {2,}/g, " ").trimEnd() : line;
      result.push({ type: "lyrics", text });
    }
  }

  return result;
}

/**
 * Renderiza texto ChordPro como linhas tipadas.
 */
function renderChordProLines(
  text: string,
  showChords: boolean,
  semitones: number
): TypedLine[] {
  let source = text;
  if (semitones !== 0) {
    source = transposeChordPro(source, semitones);
  }

  const song = new ChordSheetJS.ChordProParser().parse(source);
  const formatted = new ChordSheetJS.ChordsOverWordsFormatter().format(song);

  return formatted.split("\n").map((line) => {
    const type = classifyLine(line);
    if (type === "chord" && !showChords) return null;
    return { type, text: line };
  }).filter((l): l is TypedLine => l !== null);
}
