export const STATUS_TURMA = [
  { value: "ABERTA", label: "Aberta", color: "bg-green-100 text-green-800" },
  { value: "EM_ANDAMENTO", label: "Em andamento", color: "bg-blue-100 text-blue-800" },
  { value: "ENCERRADA", label: "Encerrada", color: "bg-gray-100 text-gray-800" },
  { value: "CANCELADA", label: "Cancelada", color: "bg-red-100 text-red-800" },
] as const;

export const DIA_SEMANA_OPTIONS = [
  "DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO",
] as const;

export const DIA_SEMANA_LABELS: Record<string, string> = {
  DOMINGO: "Domingo",
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
};

export const CAMPOS_SISTEMA_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "dataNascimento", label: "Data de nascimento" },
  { value: "sexo", label: "Sexo" },
] as const;

export const TIPOS_TURMA = [
  {
    value: "NOVOS_MEMBROS",
    label: "Novos membros",
    descricaoTemplate: "Template Novos membros",
  },
  {
    value: "CATACUMENOS",
    label: "Catacúmenos",
    descricaoTemplate: "Template Catacúmenos",
  },
  {
    value: "OUTRO",
    label: "Outro",
    descricaoTemplate: "",
  },
] as const;

export type TipoTurma = (typeof TIPOS_TURMA)[number]["value"];
