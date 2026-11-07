"use client";

import { useEffect, useRef, useState } from "react";
import { proximoSinal } from "../lib/simulador";

const INTERVALO_MS = 90;

interface Medicao {
  sig: readonly number[];
  agora: number;
}

/* Relógio dos medidores: banda e voz simuladas. `aoTique` recebe os segundos passados. */
export function useSinal(mics: readonly number[], aoTique: (dt: number) => void): Medicao {
  const [medicao, setMedicao] = useState<Medicao>({ sig: Array<number>(16).fill(0), agora: 0 });
  const ultimos = useRef({ mics, aoTique });

  useEffect(() => {
    ultimos.current = { mics, aoTique };
  });

  useEffect(() => {
    let anterior = performance.now();
    let fase = 0;
    const id = setInterval(() => {
      const agora = performance.now();
      const dt = (agora - anterior) / 1000;
      anterior = agora;
      fase += dt;
      ultimos.current.aoTique(dt);
      setMedicao((m) => ({ sig: proximoSinal(m.sig, ultimos.current.mics, fase), agora: Date.now() }));
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  return medicao;
}
