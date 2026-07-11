import { parseISO, format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Id } from "@/convex/_generated/dataModel";

export type AusenciaItem = {
  _id: Id<"avisosAusencia">;
  membroId: string;
  dataInicio: string;
  dataFim?: string;
  motivo?: string;
  nomeCompleto: string;
  podeRemover: boolean;
};

export type Bucket = "agora" | "semana" | "adiante";

export const BUCKET_LABEL: Record<Bucket, string> = {
  agora: "Ausente agora",
  semana: "Esta semana",
  adiante: "Mais adiante",
};

export const BUCKET_ORDER: Bucket[] = ["agora", "semana", "adiante"];

// Data de hoje (YYYY-MM-DD) no fuso do cliente (Brasil).
export function hojeISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// Classifica a ausencia por proximidade temporal em relacao a hoje.
export function bucketOf(
  a: { dataInicio: string; dataFim?: string },
  hoje: string,
): Bucket {
  const fim = a.dataFim || a.dataInicio;
  if (a.dataInicio <= hoje && hoje <= fim) return "agora";
  const dias = differenceInCalendarDays(parseISO(a.dataInicio), parseISO(hoje));
  return dias <= 7 ? "semana" : "adiante";
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Rotulo amigavel: "Dom, 26 jul" (dia unico), "26–30 jul" (mesmo mes),
// "26 jul – 2 ago" (meses diferentes).
export function dataRangeLabel(a: { dataInicio: string; dataFim?: string }): string {
  const ini = parseISO(a.dataInicio);
  const mesmoDia = !a.dataFim || a.dataFim === a.dataInicio;
  if (mesmoDia) return cap(format(ini, "EEE, d MMM", { locale: ptBR }));

  const fim = parseISO(a.dataFim!);
  const mesmoMes = format(ini, "yyyy-MM") === format(fim, "yyyy-MM");
  if (mesmoMes) {
    return `${format(ini, "d")}–${format(fim, "d MMM", { locale: ptBR })}`;
  }
  return `${format(ini, "d MMM", { locale: ptBR })} – ${format(fim, "d MMM", { locale: ptBR })}`;
}

// Iniciais para o avatar (primeiro + ultimo nome).
export function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
