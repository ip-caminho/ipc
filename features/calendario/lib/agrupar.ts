import { eachDayOfInterval, parseISO, format, isValid } from "date-fns";
import type { CalendarioEvento } from "./types";

// Expande eventos por dia: um evento com data inicio/fim aparece em TODAS as
// datas do intervalo, nao so na data inicial. Retorna Map iso(YYYY-MM-DD) -> eventos.
export function eventosPorDia(eventos: CalendarioEvento[]): Map<string, CalendarioEvento[]> {
  const porDia = new Map<string, CalendarioEvento[]>();
  const add = (iso: string, ev: CalendarioEvento) => {
    const arr = porDia.get(iso);
    if (arr) arr.push(ev);
    else porDia.set(iso, [ev]);
  };

  for (const ev of eventos) {
    const fim = ev.dataFim && ev.dataFim >= ev.data ? ev.dataFim : ev.data;
    if (fim === ev.data) {
      add(ev.data, ev);
      continue;
    }
    const inicioD = parseISO(ev.data);
    const fimD = parseISO(fim);
    if (!isValid(inicioD) || !isValid(fimD)) {
      add(ev.data, ev);
      continue;
    }
    // Guarda contra intervalos absurdos (cap ~370 dias).
    const dias = eachDayOfInterval({ start: inicioD, end: fimD }).slice(0, 370);
    for (const d of dias) add(format(d, "yyyy-MM-dd"), ev);
  }

  return porDia;
}
