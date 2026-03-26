export const TOM_OPTIONS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
] as const;

export const TOM_CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const TAG_SUGGESTIONS = [
  "adoracao",
  "louvor",
  "natal",
  "pascoa",
  "ceia",
  "batismo",
  "infantil",
  "congregacional",
  "contemporaneo",
  "hino",
] as const;

export const ESTRUTURA_SECOES = [
  { abbr: "i", label: "Intro" },
  { abbr: "v1", label: "Verso 1" },
  { abbr: "v2", label: "Verso 2" },
  { abbr: "v3", label: "Verso 3" },
  { abbr: "pc", label: "Pré-Refrão" },
  { abbr: "r", label: "Refrão" },
  { abbr: "p", label: "Ponte" },
  { abbr: "il", label: "Interlúdio" },
  { abbr: "f", label: "Final" },
] as const;

export const STATUS_LOUVOR_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
] as const;

/**
 * Calcula semitons entre dois tons.
 * Ex: semitonesBetween("G", "E") = -3
 */
export function semitonesBetween(from: string, to: string): number {
  const normalize = (t: string) => t.replace("m", "");
  const fromIdx = TOM_CHROMATIC.indexOf(normalize(from) as any);
  const toIdx = TOM_CHROMATIC.indexOf(normalize(to) as any);
  if (fromIdx === -1 || toIdx === -1) return 0;
  let diff = toIdx - fromIdx;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}
