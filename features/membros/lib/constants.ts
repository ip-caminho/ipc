export const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "TRANSFERIDO", label: "Transferido" },
  { value: "FALECIDO", label: "Falecido" },
  { value: "DESLIGADO", label: "Desligado" },
] as const;

export const CARGO_ECLESIASTICO_OPTIONS = [
  { value: "MEMBRO_COMUNGANTE", label: "Membro Comungante" },
  { value: "MEMBRO_NAO_COMUNGANTE", label: "Membro Nao Comungante" },
  { value: "DIACONO", label: "Diacono" },
  { value: "PRESBITERO", label: "Presbitero" },
  { value: "PASTOR", label: "Pastor" },
] as const;

export const FORMA_ADMISSAO_OPTIONS = [
  { value: "BATISMO", label: "Batismo" },
  { value: "PROFISSAO_FE", label: "Profissao de Fe" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "JURISDICAO", label: "Jurisdicao" },
] as const;

export const SEXO_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
] as const;

export const ESTADO_CIVIL_OPTIONS = [
  { value: "SOLTEIRO", label: "Solteiro(a)" },
  { value: "CASADO", label: "Casado(a)" },
  { value: "DIVORCIADO", label: "Divorciado(a)" },
  { value: "VIUVO", label: "Viuvo(a)" },
  { value: "UNIAO_ESTAVEL", label: "Uniao Estavel" },
] as const;

export const FORMACAO_OPTIONS = [
  { value: "FUNDAMENTAL", label: "Fundamental" },
  { value: "MEDIO", label: "Medio" },
  { value: "SUPERIOR", label: "Superior" },
  { value: "POS_GRADUACAO", label: "Pos-Graduacao" },
  { value: "MESTRADO", label: "Mestrado" },
  { value: "DOUTORADO", label: "Doutorado" },
] as const;

export const PAPEL_OPTIONS = [
  { value: "MEMBRO", label: "Membro" },
  { value: "VISITANTE", label: "Visitante" },
  { value: "CONTATO", label: "Contato" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "IGREJA_PARCEIRA", label: "Igreja Parceira" },
] as const;

export const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "secretaria", label: "Secretaria" },
  { value: "membro", label: "Membro" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-green-100 text-green-800",
  INATIVO: "bg-gray-100 text-gray-800",
  TRANSFERIDO: "bg-blue-100 text-blue-800",
  FALECIDO: "bg-gray-200 text-gray-600",
  DESLIGADO: "bg-red-100 text-red-800",
};
