// Evento do calendário retornado por calendario.queries.list (Doc + ministerioNome).
export type CalendarioEvento = {
  _id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  dataFim?: string;
  tipo?: "pg" | "evento" | "reuniao";
  ministerioId?: string;
  ministerioNome?: string | null;
  descricao?: string;
  publicadoNoSite?: boolean;
  exibirNoSiteDe?: string;
  exibirNoSiteAte?: string;
};

export const TIPO_EVENTO_LABEL: Record<string, string> = {
  pg: "PG",
  evento: "Evento",
  reuniao: "Reunião",
};

// Cor por tipo (usada nos chips/dots das visões).
export const TIPO_EVENTO_COR: Record<string, string> = {
  pg: "bg-emerald-500",
  evento: "bg-sky-500",
  reuniao: "bg-amber-500",
};
