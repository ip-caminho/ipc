export const TURMA_OPTIONS = [
  { value: "0-2", label: "0 a 2 anos" },
  { value: "3-4", label: "3 a 4 anos" },
  { value: "5-6", label: "5 a 6 anos" },
  { value: "7-8", label: "7 a 8 anos" },
  { value: "9-10", label: "9 a 10 anos" },
];

export const TURMA_COLORS: Record<string, string> = {
  "0-2": "bg-pink-100 text-pink-800",
  "3-4": "bg-purple-100 text-purple-800",
  "5-6": "bg-blue-100 text-blue-800",
  "7-8": "bg-green-100 text-green-800",
  "9-10": "bg-orange-100 text-orange-800",
};

export const USO_IMAGEM_OPTIONS = [
  { value: "AUTORIZADO", label: "Autorizado" },
  { value: "NAO_AUTORIZADO", label: "Nao autorizado" },
  { value: "PENDENTE", label: "Pendente" },
];

export const USO_IMAGEM_COLORS: Record<string, string> = {
  AUTORIZADO: "bg-green-100 text-green-800",
  NAO_AUTORIZADO: "bg-red-100 text-red-800",
  PENDENTE: "bg-yellow-100 text-yellow-800",
};

export const TIPO_RESPONSAVEL_OPTIONS = [
  { value: "MAE", label: "Mae" },
  { value: "PAI", label: "Pai" },
  { value: "AVO", label: "Avo/Avo" },
  { value: "TUTOR", label: "Tutor(a)" },
  { value: "RESPONSAVEL", label: "Responsavel" },
];

export const TIPO_RESPONSAVEL_LABELS: Record<string, string> = {
  MAE: "Mae",
  PAI: "Pai",
  AVO: "Avo/Avo",
  TUTOR: "Tutor(a)",
  RESPONSAVEL: "Responsavel",
};

export const PAPEL_ESCALA_OPTIONS = [
  { value: "Professor", label: "Professor(a)" },
  { value: "Auxiliar", label: "Auxiliar" },
];
