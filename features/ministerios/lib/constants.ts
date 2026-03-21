export const MINISTERIO_STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
] as const;

export const MINISTERIO_STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-green-100 text-green-800",
  INATIVO: "bg-gray-100 text-gray-800",
};

export const CBCM_OPTIONS = [
  { value: "NAO_INICIADO", label: "Nao Iniciado" },
  { value: "CURSANDO", label: "Cursando" },
  { value: "CONCLUIDO", label: "Concluido" },
] as const;

export const CBCM_COLORS: Record<string, string> = {
  NAO_INICIADO: "bg-red-100 text-red-800",
  CURSANDO: "bg-yellow-100 text-yellow-800",
  CONCLUIDO: "bg-green-100 text-green-800",
};

export const CBCM_LABELS: Record<string, string> = {
  NAO_INICIADO: "Nao Iniciado",
  CURSANDO: "Cursando",
  CONCLUIDO: "Concluido",
};
