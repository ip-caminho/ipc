"use client";

import { memo } from "react";
import { cn } from "@/shared/lib/utils/cn";
import { CAIXAS } from "../lib/config";
import { Porta, type PropsVista } from "./PainelTraseiro";
import st from "./mesa.module.css";

export const RackPalco = memo(function RackPalco({ s, agir, alvos }: PropsVista) {
  return (
    <div className={st.rack} id="vista-rack">
      <div className={st["rack-cab"]}>
        <span>Rack na frente do palco</span>
        <span className={cn(st.led, s.ligada && !s.boot && s.dante === "primary" && st.on)}>Rede da mesa</span>
      </div>
      <div className={st.bloco}>
        <b>ENTRADAS: MICROFONES E INSTRUMENTOS</b>
        <div className={cn(st.xlrs, st.p8)}>
          {Array.from({ length: 16 }, (_, i) => (
            <Porta
              key={i}
              id={`r-${i + 1}`}
              rotulo={i + 1}
              simbolo="xlr-f"
              ligado={s.mics.includes(i)}
              alvo={alvos.has(`r-${i + 1}`)}
              agir={agir}
            />
          ))}
        </div>
      </div>
      <div className={st.bloco}>
        <b>SAÍDAS: JÁ FICAM LIGADAS NAS CAIXAS</b>
        <div className={st.saidas}>
          {CAIXAS.map((c) => <span key={c.id}>{c.nome}</span>)}
        </div>
      </div>
    </div>
  );
});
