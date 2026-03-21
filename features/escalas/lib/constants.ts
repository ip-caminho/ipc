export const TIPO_CULTO_OPTIONS = [
  { value: "DOMINICAL", label: "Dominical" },
  { value: "ESPECIAL", label: "Especial" },
] as const;

export const HORARIO_PADRAO: Record<string, string> = {
  DOMINICAL: "10:00",
  ESPECIAL: "10:00",
};

export type ViewMode = "escala" | "liturgia" | "avisos";

export const FUNCAO_LITURGIA_OPTIONS = [
  { value: "ABERTURA", label: "Abertura", multiplo: false, views: ["escala", "liturgia"] as ViewMode[], temPassagem: true },
  { value: "CONFISSAO", label: "Confissão", multiplo: false, views: ["escala", "liturgia"] as ViewMode[], temPassagem: true },
  { value: "PREGACAO", label: "Pregação", multiplo: false, views: ["escala", "liturgia"] as ViewMode[], temPassagem: true },
  { value: "LOUVOR", label: "Louvor", multiplo: true, views: ["escala", "liturgia"] as ViewMode[], temPassagem: false },
  { value: "HOSPITALIDADE", label: "Hospitalidade", multiplo: true, views: ["escala"] as ViewMode[], temPassagem: false },
  { value: "SOM", label: "Som", multiplo: false, views: ["escala"] as ViewMode[], temPassagem: false },
  { value: "MULTIMIDIA", label: "Multimídia", multiplo: false, views: ["escala"] as ViewMode[], temPassagem: false },
] as const;
