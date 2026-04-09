export const CATEGORIAS_PADRAO = [
  "Teologia", "Devocional", "Infantil", "Biografias", "Ficcao Crista",
  "Estudo Biblico", "Familia", "Lideranca", "Missoes", "Aconselhamento",
] as const;

export const CONDICOES = [
  { value: "NOVO", label: "Novo" },
  { value: "BOM", label: "Bom" },
  { value: "REGULAR", label: "Regular" },
  { value: "RUIM", label: "Ruim" },
] as const;

export const STATUS_EXEMPLAR = [
  { value: "DISPONIVEL", label: "Disponível", color: "bg-green-100 text-green-800" },
  { value: "EMPRESTADO", label: "Emprestado", color: "bg-blue-100 text-blue-800" },
  { value: "PERDIDO", label: "Perdido", color: "bg-red-100 text-red-800" },
  { value: "DANIFICADO", label: "Danificado", color: "bg-yellow-100 text-yellow-800" },
] as const;

export const LIMITE_EMPRESTIMOS = 3;
export const PERIODO_PADRAO_DIAS = 14;
