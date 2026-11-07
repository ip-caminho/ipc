"use client";

import { cn } from "@/shared/lib/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { CAIXAS, COR, ENTRADAS, type IdCaixa } from "../lib/config";
import {
  clamp,
  focoAtual,
  medir,
  nomeCaixa,
  parteMix,
  partePA,
  saidaDaCaixa,
  somOk,
  textoDb,
  type AcaoMesa,
  type Estado,
} from "../lib/simulador";
import st from "./mesa.module.css";

function Caixa({ x, y, nome, tipo, ly = 22, nivel, mudo }: {
  x: number;
  y: number;
  nome: string;
  tipo: "mon" | "cx";
  ly?: number;
  nivel: number;
  mudo: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={11 + nivel * 13} fill="var(--verde)" opacity={nivel * 0.3} />
      <circle r={14 + nivel * 18} fill="none" stroke="var(--verde)" strokeWidth="1.5" opacity={nivel * 0.7} />
      {tipo === "mon" ? (
        <path d="M-10 6 L10 6 L6 -6 L-6 -6 Z" fill="#3a3f46" stroke="#a3acb6" />
      ) : (
        <>
          <rect x="-8" y="-11" width="16" height="22" rx="2" fill="#3a3f46" stroke="#a3acb6" />
          <circle r="4.5" cy="3" fill="#15181c" stroke="#a3acb6" />
        </>
      )}
      <text y={ly} textAnchor="middle" fill="var(--txt)" fontSize="12.5" fontWeight="600">{nome}</text>
      <text y={ly + 11} textAnchor="middle" fill="var(--verm)" fontSize="11" fontWeight="700" opacity={mudo ? 1 : 0}>MUDO</text>
    </g>
  );
}

const FILEIRAS = [0, 1, 2, 3, 4].flatMap((l) => [0, 1].map((c) => (
  <rect key={`${l}-${c}`} x={86 + c * 104} y={142 + l * 15} width="84" height="8" rx="1" fill="#22262b" />
)));

export function MapaPalco({ s, sig, niveis, agir }: {
  s: Estado;
  sig: readonly number[];
  niveis: Record<IdCaixa, number>;
  agir: (acao: AcaoMesa) => void;
}) {
  const ok = somOk(s);
  const caixa = (id: IdCaixa, x: number, y: number, tipo: "mon" | "cx", ly?: number) => (
    <Caixa
      x={x}
      y={y}
      nome={nomeCaixa(id)}
      tipo={tipo}
      ly={ly}
      nivel={medir(niveis[id])}
      mudo={ok && !saidaDaCaixa(s, id).on}
    />
  );
  const foco = focoAtual(s);
  const saidaFoco = saidaDaCaixa(s, foco);
  const redeViva = s.dante === "primary" && s.ligada && !s.boot;

  return (
    <section className={st["mapa-box"]} aria-label="Mapa do palco e mistura">
      <h3>O que está tocando no salão</h3>
      <svg viewBox="0 0 360 292" role="img" aria-label="Planta do salão com palco, caixas, rack e mesa">
        <rect x="62" y="8" width="236" height="92" rx="3" fill="#20242a" stroke="#3a3f46" />
        <text x="180" y="24" textAnchor="middle" fill="var(--txt-2)" fontSize="12" letterSpacing="2">PALCO</text>
        {FILEIRAS}
        <text x="180" y="226" textAnchor="middle" fill="var(--txt-2)" fontSize="12" letterSpacing="2">SALÃO</text>
        <path d="M180 252 L180 124" stroke={redeViva ? "#35d07f" : "#4b5158"} strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
        <rect x="158" y="104" width="44" height="18" rx="2" fill="#2a2e33" stroke="#a3acb6" />
        <text x="180" y="117" textAnchor="middle" fill="var(--txt)" fontSize="12" fontWeight="600">RACK</text>
        <rect x="150" y="252" width="60" height="26" rx="3" fill="#2a2e33" stroke="#a3acb6" />
        <text x="180" y="270" textAnchor="middle" fill="var(--txt)" fontSize="13" fontWeight="700">MESA</text>
        {caixa("m0", 110, 62, "mon", 20)}
        {caixa("m1", 180, 62, "mon", 20)}
        {caixa("m2", 250, 62, "mon", 20)}
        {caixa("pa", 34, 106, "cx")}
        {caixa("pa", 326, 106, "cx")}
        {caixa("m3", 40, 248, "cx")}
        {caixa("m4", 320, 248, "cx")}
      </svg>

      <h3>Mistura de cada caixa</h3>
      <div className={st["mist-abas"]}>
        {CAIXAS.map((c) => (
          <Button
            key={c.id}
            variant="ghost"
            className={cn(foco === c.id && st.sel)}
            onClick={() => agir({ tipo: "foco", foco: c.id })}
          >
            {c.nome}
          </Button>
        ))}
      </div>
      <div className={st["mist-cab"]}>
        <b>{nomeCaixa(foco)}</b>: volume geral {textoDb(saidaFoco.f)}
        {!saidaFoco.on && <> <span className={st["mudo-tx"]}>MUDO</span></>}
      </div>
      <div className={st.mistura}>
        {ENTRADAS.map((e, i) => {
          const val = !ok ? 0 : foco === "pa" ? partePA(s, sig, i) : parteMix(s, sig, i, Number(foco[1]));
          const dbv = val > 0 ? 20 * Math.log10(val) : -99;
          const largura = saidaFoco.on ? clamp((dbv + 42) / 46, 0, 1) * 100 : 0;
          return (
            <div
              key={e.nome}
              className={cn(st.mx, (val <= 0.0005 || !saidaFoco.on) && st.mudo)}
              style={{ "--cc": COR[e.grupo] } as React.CSSProperties}
            >
              <span>{e.nome}</span>
              <span className={st.b}><i style={{ width: `${largura}%` }} /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function NiveisCaixas({ s, niveis, agir }: {
  s: Estado;
  niveis: Record<IdCaixa, number>;
  agir: (acao: AcaoMesa) => void;
}) {
  const ok = somOk(s);
  const foco = focoAtual(s);
  return (
    <div className={st.chips} aria-label="Nível de cada caixa">
      {CAIXAS.map((c) => (
        <Button
          key={c.id}
          variant="ghost"
          className={cn(st.chip, foco === c.id && st.foco, ok && !saidaDaCaixa(s, c.id).on && st.mudo)}
          onClick={() => agir({ tipo: "foco", foco: c.id })}
        >
          {c.nome}
          <span className={st.bar}><i style={{ width: `${medir(niveis[c.id]) * 100}%` }} /></span>
        </Button>
      ))}
    </div>
  );
}
