import { format, isSunday, nextSunday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProximoCulto {
  data: string;
  horario: string | null;
}

/**
 * Monta o rótulo do cartão "Próximo culto".
 * Só mostra hora quando o culto tem `horario`; nunca inventa uma.
 */
export function proximoCultoLabel(
  proximoCulto: ProximoCulto | null | undefined,
  hoje: Date,
): string {
  if (!proximoCulto) {
    const domingo = isSunday(hoje) ? hoje : nextSunday(hoje);
    return format(domingo, "EEEE", { locale: ptBR });
  }
  const dia = format(parseISO(proximoCulto.data), "EEEE", { locale: ptBR });
  return proximoCulto.horario ? `${dia}, ${proximoCulto.horario}` : dia;
}
