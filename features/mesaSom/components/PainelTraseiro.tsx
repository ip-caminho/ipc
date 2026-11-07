"use client";

import { memo } from "react";
import { cn } from "@/shared/lib/utils/cn";
import type { AcaoMesa, Estado } from "../lib/simulador";
import st from "./mesa.module.css";

export interface PropsVista {
  s: Estado;
  agir: (acao: AcaoMesa) => void;
  alvos: ReadonlySet<string>;
}

export function Porta({ id, rotulo, simbolo, ligado, alvo, agir }: {
  id: string;
  rotulo: string | number;
  simbolo: string;
  ligado?: boolean;
  alvo: boolean;
  agir: (acao: AcaoMesa) => void;
}) {
  return (
    <button
      className={cn(st.pt, ligado && st.ligado, alvo && st.alvo)}
      id={id}
      data-porta={id}
      aria-label={`Porta ${rotulo}`}
      onClick={() => agir({ tipo: "porta", porta: id })}
    >
      {rotulo}
      <svg><use href={`#${simbolo}`} /></svg>
    </button>
  );
}

// Na mesma ordem da foto: numeração correndo da direita para a esquerda
const OMNI: readonly (readonly [string, number])[] = [["4", 4], ["3", 3], ["2", 2], ["1", 1], ["8(R)", 8], ["7(L)", 7], ["6", 6], ["5", 5]];
const INPUT = [8, 7, 6, 5, 4, 3, 2, 1, 16, 15, 14, 13, 12, 11, 10, 9];

export const PainelTraseiro = memo(function PainelTraseiro({ s, agir, alvos }: PropsVista) {
  const porta = (id: string) => ({
    id,
    "data-porta": id,
    onClick: () => agir({ tipo: "porta", porta: id }),
  });
  return (
    <>
      <div className={cn(st.tras, s.ligada && st.ligada)} id="vista-rear">
        <div className={st["tras-cima"]}>
          <div className={st.bloco}>
            <b>OMNI OUT +4dBu</b>
            <div className={cn(st.xlrs, st.p4)}>
              {OMNI.map(([rotulo, n]) => (
                <Porta key={n} id={`o-${n}`} rotulo={rotulo} simbolo="xlr-m" alvo={alvos.has(`o-${n}`)} agir={agir} />
              ))}
            </div>
          </div>
          <div className={st.bloco}>
            <b>INPUT</b>
            <div className={cn(st.xlrs, st.p8)}>
              {INPUT.map((n) => (
                <Porta key={n} id={`i-${n}`} rotulo={n} simbolo={n >= 13 ? "combo" : "xlr-f"} alvo={alvos.has(`i-${n}`)} agir={agir} />
              ))}
            </div>
          </div>
        </div>
        <div className={st["tras-baixo"]}>
          <button
            className={cn(st.pg, alvos.has("p-sw") && st.alvo)}
            id="p-sw"
            aria-label="Chave de energia"
            onClick={() => agir({ tipo: "chave" })}
          >
            <span className={st.rock}>
              <small><span>I</span><span>⏻</span></small>
              <span className={st.chave} />
            </span>
          </button>
          <button className={cn(st.pg, s.dc && st.ligado, alvos.has("p-dc") && st.alvo)} {...porta("p-dc")}>
            DC INPUT
            <svg><use href="#dc4" /></svg>
          </button>
          <div className={st.dante}>
            <button className={cn(st.pg, s.dante === "primary" && st.ligado, alvos.has("p-pri") && st.alvo)} {...porta("p-pri")}>
              PRIMARY
              <svg><use href="#ethercon" /></svg>
            </button>
            <button className={st.pg} {...porta("p-sec")}>
              SECONDARY
              <svg><use href="#ethercon" /></svg>
            </button>
            <span className={st["d-nome"]}>Dante</span>
          </div>
          <button className={cn(st.pg, st["caixa-usb"])} {...porta("p-host")}>
            USB TO HOST
            <svg><use href="#usbb" /></svg>
          </button>
          <button className={cn(st.pg, st["caixa-usb"])} {...porta("p-net")} aria-label="Porta de rede NETWORK">
            <svg style={{ height: 14, width: 36 }}><use href="#ic-rede" /></svg>
            <svg><use href="#rj45" /></svg>
          </button>
        </div>
      </div>
      <p className={st["legenda-tras"]}>Sem cabo escolhido, toque numa porta para saber para que ela serve.</p>
    </>
  );
});
