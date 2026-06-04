/**
 * Labels de categoria de audio por tipo.
 */

export type AudioTipo = "SERMAO" | "ESTUDO_BIBLICO" | "PALESTRA" | "OUTRO";

export const TIPO_LABEL: Record<AudioTipo, string> = {
  SERMAO: "PREGAÇÃO",
  ESTUDO_BIBLICO: "ESTUDO",
  PALESTRA: "PALESTRA",
  OUTRO: "OUTRO",
};

export function getTipoLabel(tipo: string | null | undefined): string {
  const key = (tipo || "OUTRO") as AudioTipo;
  return TIPO_LABEL[key] ?? TIPO_LABEL.OUTRO;
}
