export const CATEGORIAS_PADRAO = [
  "Vida cristã", "Comentários bíblicos", "Teologia", "Pregação", "Igreja e liderança",
  "Cultura e sociedade", "Missões e evangelização", "Bíblias e referência", "Interpretação bíblica",
  "Aconselhamento e emoções", "Casamento e família", "Literatura e outros", "História e biografias",
  "Oração", "Educação",
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
