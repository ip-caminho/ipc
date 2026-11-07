"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent as PointerDoReact } from "react";

export interface Fio {
  id: string;
  cor: string;
  x0: number;
  y0: number;
  x: number;
  y: number;
}

interface Opcoes {
  aoPegar: (id: string) => void;
  aoSoltar: (porta: string | null) => void;
  aoCancelar: () => void;
  classePorta: string;
}

const LIMIAR_PX = 6;
const BORDA_ROLAGEM_PX = 56;

const portaEm = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-porta]") ?? null;

/* Arrastar cabo ou pendrive até a porta. Tocar no cabo e depois na porta continua valendo. */
export function useArrasteCabo(opcoes: Opcoes) {
  const [fio, setFio] = useState<Fio | null>(null);
  const opcoesRef = useRef(opcoes);
  const encerrarRef = useRef<(() => void) | null>(null);
  // O clique que o navegador dispara ao soltar não pode virar outra ação
  const ignorarClique = useRef(false);

  useEffect(() => {
    opcoesRef.current = opcoes;
  });
  useEffect(() => () => encerrarRef.current?.(), []);

  const iniciar = useCallback((ev: PointerDoReact<HTMLButtonElement>, id: string, cor: string) => {
    if (ev.button !== 0) return;
    const el = ev.currentTarget;
    const ponteiro = ev.pointerId;
    const inicio = { x: ev.clientX, y: ev.clientY };
    let pos = inicio;
    let ativo = false;
    let rolagem: ReturnType<typeof setInterval> | undefined;
    let portaSob: HTMLElement | null = null;

    const marcarPorta = (p: HTMLElement | null) => {
      if (portaSob === p) return;
      portaSob?.classList.remove(opcoesRef.current.classePorta);
      portaSob = p;
      p?.classList.add(opcoesRef.current.classePorta);
    };
    const desenhar = () => {
      const o = el.getBoundingClientRect();
      setFio({ id, cor, x0: o.left + o.width / 2, y0: o.top + o.height / 2, x: pos.x, y: pos.y });
      marcarPorta(portaEm(pos.x, pos.y));
    };
    const encerrar = () => {
      clearInterval(rolagem);
      marcarPorta(null);
      setFio(null);
      document.removeEventListener("pointermove", aoMover);
      document.removeEventListener("pointerup", aoSoltar);
      document.removeEventListener("pointercancel", aoCancelar);
      encerrarRef.current = null;
    };
    const aoMover = (e: PointerEvent) => {
      if (e.pointerId !== ponteiro) return;
      pos = { x: e.clientX, y: e.clientY };
      if (!ativo) {
        if (Math.hypot(pos.x - inicio.x, pos.y - inicio.y) < LIMIAR_PX) return;
        ativo = true;
        opcoesRef.current.aoPegar(id);
        // Rola a página enquanto o dedo fica perto da borda, para alcançar portas fora da tela
        rolagem = setInterval(() => {
          const d = pos.y > window.innerHeight - BORDA_ROLAGEM_PX ? 8 : pos.y < BORDA_ROLAGEM_PX ? -8 : 0;
          if (!d) return;
          window.scrollBy(0, d);
          desenhar();
        }, 30);
      }
      desenhar();
    };
    const aoSoltar = (e: PointerEvent) => {
      if (e.pointerId !== ponteiro) return;
      const eraArraste = ativo;
      const porta = eraArraste ? portaEm(e.clientX, e.clientY) : null;
      encerrar();
      if (!eraArraste) return;
      ignorarClique.current = true;
      setTimeout(() => {
        ignorarClique.current = false;
      }, 60);
      opcoesRef.current.aoSoltar(porta?.dataset.porta ?? null);
    };
    const aoCancelar = (e: PointerEvent) => {
      if (e.pointerId !== ponteiro) return;
      const eraArraste = ativo;
      encerrar();
      if (eraArraste) opcoesRef.current.aoCancelar();
    };

    document.addEventListener("pointermove", aoMover);
    document.addEventListener("pointerup", aoSoltar);
    document.addEventListener("pointercancel", aoCancelar);
    encerrarRef.current = encerrar;
  }, []);

  const barrarCliqueDoArraste = useCallback((ev: MouseEvent<HTMLElement>) => {
    if (!ignorarClique.current) return;
    ignorarClique.current = false;
    ev.stopPropagation();
  }, []);

  return { fio, iniciar, barrarCliqueDoArraste };
}
