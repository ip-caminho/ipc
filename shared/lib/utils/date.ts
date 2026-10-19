import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ISO (YYYY-MM-DD) -> dd/MM/yyyy; devolve o valor cru se invalido
export function formatDataBR(iso?: string) {
  if (!iso) return undefined;
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd/MM/yyyy") : iso;
}

// "Domingo, 5 de outubro" (so a inicial maiuscula)
export function formatDataExtenso(date: Date) {
  const s = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
