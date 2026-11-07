"use client";

import { memo, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils/cn";
import { ESCALA, type IdCaixa } from "../lib/config";
import { clamp, nomeFader, onDoFader, valorFader, vivo, type AcaoMesa, type Estado, type IdFader } from "../lib/simulador";
import { TelaTouch } from "./TelaTouch";
import st from "./mesa.module.css";

/* A escala impressa não muda: fica fora do render */
const MARCAS = [...ESCALA.map(([f, d]) => [f, String(Math.abs(d))] as const), [0, "∞"] as const].map(([f, rotulo]) => (
  <span key={f} className={st.marca} style={{ "--f": f } as React.CSSProperties}>
    <b>{rotulo}</b>
  </span>
));

const Tira = memo(function Tira({ id, f, on, selecionado, rotulo, nomeAria, alvoFader, alvoOn, agir }: {
  id: IdFader;
  f: number;
  on: boolean;
  selecionado: boolean;
  rotulo: string;
  nomeAria: string;
  alvoFader: boolean;
  alvoOn: boolean;
  agir: (acao: AcaoMesa) => void;
}) {
  const [arrastando, setArrastando] = useState(false);
  const cap = useRef<HTMLDivElement>(null);

  function mover(el: HTMLElement, clientY: number) {
    const r = el.getBoundingClientRect();
    const altura = cap.current?.offsetHeight ?? 0;
    let valor = 1 - clamp((clientY - r.top - altura / 2) / (r.height - altura), 0, 1);
    if (valor < 0.02) valor = 0;
    agir({ tipo: "fader", id, f: valor });
  }

  const faderId = `fader-${id}`;
  return (
    <div className={cn(st.tira, id === "main" && st["tira-main"])}>
      <button className={cn(st.k, st["k-sel"], selecionado && st.aceso)} id={`sel-${id}`} onClick={() => agir({ tipo: "sel", id })}>SEL</button>
      <button className={cn(st.k, st["k-cue"])} onClick={() => agir({ tipo: "fora" })}>CUE</button>
      <button className={cn(st.k, st["k-on"], on && st.aceso, alvoOn && st.alvo)} id={`on-${id}`} aria-pressed={on} onClick={() => agir({ tipo: "on", id })}>ON</button>
      <div
        className={cn(st.fader, arrastando && st.arrastando, alvoFader && st.alvo)}
        id={faderId}
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(f * 100)}
        aria-label={nomeAria}
        onPointerDown={(ev) => {
          ev.preventDefault();
          ev.currentTarget.setPointerCapture(ev.pointerId);
          setArrastando(true);
          mover(ev.currentTarget, ev.clientY);
        }}
        onPointerMove={(ev) => {
          if (arrastando) mover(ev.currentTarget, ev.clientY);
        }}
        onPointerUp={() => setArrastando(false)}
        onPointerCancel={() => setArrastando(false)}
        onKeyDown={(ev) => {
          const d = ({ ArrowUp: 0.02, ArrowDown: -0.02, PageUp: 0.1, PageDown: -0.1 } as Record<string, number>)[ev.key];
          if (!d) return;
          ev.preventDefault();
          agir({ tipo: "faderDelta", id, d });
        }}
      >
        {MARCAS}
        <div className={st.sulco} />
        <div className={st.cap} ref={cap} style={{ "--f": f } as React.CSSProperties} />
      </div>
      <span className={st.num}>{rotulo}</span>
    </div>
  );
});

function Banco({ rotulo, nome, aceso, alvo, id, aoTocar }: {
  rotulo: string;
  nome: string;
  aceso?: boolean;
  alvo?: boolean;
  id?: string;
  aoTocar: () => void;
}) {
  return (
    <div className={st["bk-cel"]}>
      {rotulo}
      <button className={cn(st.k, aceso && st.aceso, alvo && st.alvo)} id={id} aria-label={`Banco ${nome}`} onClick={aoTocar} />
    </div>
  );
}

export function PainelSuperior({ s, sig, niveis, agora, agir, alvos }: {
  s: Estado;
  sig: readonly number[];
  niveis: Record<IdCaixa, number>;
  agora: number;
  agir: (acao: AcaoMesa) => void;
  alvos: ReadonlySet<string>;
}) {
  const fora = () => agir({ tipo: "fora" });
  const ids: IdFader[] = [0, 1, 2, 3, 4, 5, 6, 7, "main"];
  return (
    <div className={cn(st["vista-mesa"], !vivo(s) && st.desl)} id="vista-top">
      <div className={st.mesa}>
        <div className={st.moldura}>
          <TelaTouch s={s} sig={sig} niveis={niveis} agora={agora} agir={agir} alvos={alvos} />
        </div>

        <div className={st["col-cima"]}>
          <button
            className={cn(st["caixa-p"], st.usb, s.usb && st.ligado, alvos.has("usb-top") && st.alvo)}
            id="usb-top"
            data-porta="usb-top"
            aria-label="Conector USB para pendrive"
            onClick={() => agir({ tipo: "porta", porta: "usb-top" })}
          >
            <svg viewBox="0 0 40 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 8h34M34 5l4 3-4 3M12 8l6-5h6M18 8l5 5h5" />
              <circle cx="4" cy="8" r="2" fill="currentColor" />
            </svg>
            <span className={st.fenda} />
          </button>
          <button className={cn(st["caixa-p"], st.fones, st["so-tela-grande"])} aria-label="Fones de ouvido" onClick={fora}>
            <span className={st.jack} />
            PHONES
            <span className={st["botao-nivel"]} />
            LEVEL
          </button>
          <div className={cn(st["marca-dm3"], st["so-tela-grande"])}>
            <small>DIGITAL MIXING CONSOLE</small>
            <b>DM3</b>
          </div>
        </div>

        <div className={st["col-baixo"]}>
          <button className={cn(st["placa-touch"], st["so-tela-grande"])} onClick={fora}>
            <span>TOUCH<br />AND<br />TURN</span>
            <span className={st.encoder} />
          </button>
          <div className={st.grupo}>
            <span className={st["grupo-tit"]}>FADER BANK</span>
            <div className={st.bancos}>
              <Banco rotulo="INPUT 1-8" nome="INPUT 1 a 8" id="bk-in1" aceso={s.banco === "in1"} alvo={alvos.has("bk-in1")} aoTocar={() => agir({ tipo: "banco", banco: "in1" })} />
              <Banco rotulo="INPUT 9-16" nome="INPUT 9 a 16" id="bk-in2" aceso={s.banco === "in2"} alvo={alvos.has("bk-in2")} aoTocar={() => agir({ tipo: "banco", banco: "in2" })} />
              <Banco rotulo="FX/MON" nome="FX e MON" aoTocar={fora} />
              <Banco rotulo="OUTPUT" nome="OUTPUT" id="bk-out" aceso={s.banco === "out"} alvo={alvos.has("bk-out")} aoTocar={() => agir({ tipo: "banco", banco: "out" })} />
              <Banco rotulo="CUSTOM 1" nome="Custom 1" aoTocar={fora} />
              <Banco rotulo="CUSTOM 2" nome="Custom 2" aoTocar={fora} />
            </div>
          </div>
          <div className={st["placa-home"]}>
            <svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></svg>
            <button className={st["k-azul"]} aria-label="Tecla Home" onClick={() => agir({ tipo: "home" })} />
          </div>
          <div className={cn(st.grupo, st["so-tela-grande"])}>
            <span className={st["grupo-tit"]}>USER DEFINED KEYS</span>
            <div className={st.usuario}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} className={cn(st.k, st["k-user"])} onClick={fora}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div className={st.tiras}>
          {ids.map((id) => {
            const nome = id === "main" ? (s.sof !== null ? "retorno" : "PA") : nomeFader(s, id).n;
            return (
              <Tira
                key={id}
                id={id}
                f={valorFader(s, id)}
                on={onDoFader(s, id)}
                selecionado={s.sel === id}
                rotulo={id === "main" ? "MAIN" : String(id + 1)}
                nomeAria={id === "main" ? `Fader MAIN: ${nome}` : `Fader ${id + 1}: ${nome}`}
                alvoFader={alvos.has(`fader-${id}`)}
                alvoOn={alvos.has(`on-${id}`)}
                agir={agir}
              />
            );
          })}
        </div>
        <div className={st.aba} />
      </div>
    </div>
  );
}
