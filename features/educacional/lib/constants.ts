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
  "9-10": "bg-cyan-100 text-cyan-800",
};

// Anel do avatar por turma (identidade visual sem badge extra).
export const TURMA_RING: Record<string, string> = {
  "0-2": "ring-pink-300",
  "3-4": "ring-purple-300",
  "5-6": "ring-blue-300",
  "7-8": "ring-green-300",
  "9-10": "ring-cyan-300",
};

export const USO_IMAGEM_OPTIONS = [
  { value: "AUTORIZADO", label: "Autorizado" },
  { value: "NAO_AUTORIZADO", label: "Nao autorizado" },
  { value: "PENDENTE", label: "Nao assinado" },
];

// Rotulo do estado de uso de imagem por valor (fonte unica para cards/detalhe).
export const USO_IMAGEM_LABELS: Record<string, string> = {
  AUTORIZADO: "Autorizado",
  NAO_AUTORIZADO: "Nao autorizado",
  PENDENTE: "Nao assinado",
};

// Rotulo curto para badges compactos (card).
export const USO_IMAGEM_LABELS_CURTO: Record<string, string> = {
  AUTORIZADO: "Img",
  NAO_AUTORIZADO: "S/Img",
  PENDENTE: "N/assin",
};

// Cor do icone de uso de imagem (verde/vermelho/ambar) para o card compacto.
export const USO_IMAGEM_ICON_COLORS: Record<string, string> = {
  AUTORIZADO: "text-green-600",
  NAO_AUTORIZADO: "text-red-600",
  PENDENTE: "text-yellow-500",
};

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

// ===== Voluntarios do educacional =====

export const PAPEL_VOLUNTARIO_OPTIONS = [
  { value: "PROFESSOR", label: "Professor(a)" },
  { value: "AUXILIAR", label: "Auxiliar" },
  { value: "APOIO", label: "Apoio" },
];

export const PAPEL_VOLUNTARIO_LABELS: Record<string, string> = {
  PROFESSOR: "Professor(a)",
  AUXILIAR: "Auxiliar",
  APOIO: "Apoio",
};

export const PAPEL_VOLUNTARIO_COLORS: Record<string, string> = {
  PROFESSOR: "bg-blue-100 text-blue-800",
  AUXILIAR: "bg-green-100 text-green-800",
  APOIO: "bg-gray-100 text-gray-800",
};

// Status do curso CBCM (espelha CBCM_OPTIONS de features/membros — labels
// alinhados: "Nao Iniciado" com I maiusculo, igual ao de membros).
export const CBCM_OPTIONS = [
  { value: "NAO_INICIADO", label: "Nao Iniciado" },
  { value: "CURSANDO", label: "Cursando" },
  { value: "CONCLUIDO", label: "Concluido" },
];

export const CBCM_LABELS: Record<string, string> = {
  NAO_INICIADO: "Nao Iniciado",
  CURSANDO: "Cursando",
  CONCLUIDO: "Concluido",
};

export const CBCM_COLORS: Record<string, string> = {
  CONCLUIDO: "bg-green-100 text-green-800",
  CURSANDO: "bg-yellow-100 text-yellow-800",
  NAO_INICIADO: "bg-gray-100 text-gray-700",
};
