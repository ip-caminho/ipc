export const TIPO_ARQUIVO_OPTIONS = [
  { value: "APRESENTACAO", label: "Apresentação (PPT/PDF)" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "IMAGEM", label: "Imagem" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const STATUS_ARQUIVO = [
  { value: "RECEBIDO", label: "Recebido", color: "bg-yellow-100 text-yellow-800" },
  { value: "REVISADO", label: "Revisado", color: "bg-blue-100 text-blue-800" },
  { value: "APROVADO", label: "Aprovado", color: "bg-green-100 text-green-800" },
] as const;
