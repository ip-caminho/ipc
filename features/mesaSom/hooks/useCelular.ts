"use client";

import { useSyncExternalStore } from "react";

// Mesmo corte do CSS da mesa: abaixo de 640 px a mesa aparece por zonas
const CONSULTA = "(max-width: 639px)";

function assinar(aviso: () => void) {
  const m = window.matchMedia(CONSULTA);
  m.addEventListener("change", aviso);
  return () => m.removeEventListener("change", aviso);
}

/* null enquanto a largura não é conhecida (no servidor e na hidratação) */
export function useCelular(): boolean | null {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches, () => null);
}
