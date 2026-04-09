export const STATUS_OPTIONS = [
  { value: "ABERTA", label: "Aberta", color: "bg-blue-100 text-blue-800" },
  { value: "EM_ANDAMENTO", label: "Em andamento", color: "bg-yellow-100 text-yellow-800" },
  { value: "CONCLUIDA", label: "Concluída", color: "bg-green-100 text-green-800" },
  { value: "CANCELADA", label: "Cancelada", color: "bg-gray-100 text-gray-800" },
] as const;

export const PRIORIDADE_OPTIONS = [
  { value: "BAIXA", label: "Baixa", color: "bg-slate-100 text-slate-700" },
  { value: "MEDIA", label: "Média", color: "bg-blue-100 text-blue-700" },
  { value: "ALTA", label: "Alta", color: "bg-orange-100 text-orange-700" },
  { value: "URGENTE", label: "Urgente", color: "bg-red-100 text-red-700" },
] as const;

export const MODULO_OPTIONS = [
  { value: "ministerios", label: "Ministérios" },
  { value: "escalas", label: "Escalas" },
  { value: "calendario", label: "Calendário" },
  { value: "pequenos-grupos", label: "Pequenos Grupos" },
  { value: "pastoreio", label: "Pastoreio" },
  { value: "gravacoes", label: "Gravações" },
  { value: "pedidos-oracao", label: "Pedidos de Oração" },
] as const;

export type TarefaStatus = (typeof STATUS_OPTIONS)[number]["value"];
export type TarefaPrioridade = (typeof PRIORIDADE_OPTIONS)[number]["value"];
