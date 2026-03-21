export const TIPO_VISITA_OPTIONS = [
  { value: "DOMICILIAR", label: "Domiciliar" },
  { value: "HOSPITALAR", label: "Hospitalar" },
  { value: "ACOLHIMENTO", label: "Acolhimento" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const STATUS_PEDIDO_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "RESPONDIDO", label: "Respondido" },
  { value: "ARQUIVADO", label: "Arquivado" },
] as const;

export const TIPO_VISITA_COLORS: Record<string, string> = {
  DOMICILIAR: "bg-blue-100 text-blue-800",
  HOSPITALAR: "bg-red-100 text-red-800",
  ACOLHIMENTO: "bg-green-100 text-green-800",
  OUTRO: "bg-gray-100 text-gray-800",
};

export const STATUS_PEDIDO_COLORS: Record<string, string> = {
  ATIVO: "bg-yellow-100 text-yellow-800",
  RESPONDIDO: "bg-green-100 text-green-800",
  ARQUIVADO: "bg-gray-100 text-gray-800",
};
