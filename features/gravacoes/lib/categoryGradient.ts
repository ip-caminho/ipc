/**
 * Mapeamento fixo de categoria -> gradient.
 * Diferente do sermonGradient determinístico por série: aqui queremos
 * consistência visual por CATEGORIA.
 */

export type AudioTipo = "SERMAO" | "ESTUDO_BIBLICO" | "PALESTRA" | "OUTRO";

const GRADIENTS: Record<AudioTipo, string> = {
  SERMAO: "linear-gradient(135deg, #7c2d12 0%, #f97316 100%)",
  ESTUDO_BIBLICO: "linear-gradient(135deg, #581c87 0%, #6366f1 100%)",
  PALESTRA: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
  OUTRO: "linear-gradient(135deg, #27272a 0%, #71717a 100%)",
};

export const TIPO_LABEL: Record<AudioTipo, string> = {
  SERMAO: "PREGAÇÃO",
  ESTUDO_BIBLICO: "ESTUDO",
  PALESTRA: "PALESTRA",
  OUTRO: "OUTRO",
};

export function getCategoryGradient(tipo: string | null | undefined): string {
  const key = (tipo || "OUTRO") as AudioTipo;
  return GRADIENTS[key] ?? GRADIENTS.OUTRO;
}

export function getTipoLabel(tipo: string | null | undefined): string {
  const key = (tipo || "OUTRO") as AudioTipo;
  return TIPO_LABEL[key] ?? TIPO_LABEL.OUTRO;
}
