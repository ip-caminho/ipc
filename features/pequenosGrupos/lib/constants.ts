export const DIA_SEMANA_OPTIONS = [
  { value: "SEGUNDA", label: "Segunda-feira" },
  { value: "TERCA", label: "Terca-feira" },
  { value: "QUARTA", label: "Quarta-feira" },
  { value: "QUINTA", label: "Quinta-feira" },
  { value: "SEXTA", label: "Sexta-feira" },
  { value: "SABADO", label: "Sabado" },
  { value: "DOMINGO", label: "Domingo" },
] as const;

export const PG_STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
] as const;

export const PG_STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-green-100 text-green-800",
  INATIVO: "bg-gray-100 text-gray-800",
};

export const DIA_SEMANA_LABELS: Record<string, string> = {
  SEGUNDA: "Segunda",
  TERCA: "Terca",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sabado",
  DOMINGO: "Domingo",
};
