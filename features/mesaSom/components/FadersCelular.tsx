"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/utils/cn";
import { SAIDAS } from "../lib/config";
import { nomeFader, type AcaoMesa, type Banco, type Estado } from "../lib/simulador";
import { dadosDaTira, Tira } from "./PainelSuperior";
import st from "./mesa.module.css";

const BANCOS: readonly { id: Banco; rotulo: string; nome: string }[] = [
  { id: "in1", rotulo: "IN 1-8", nome: "INPUT 1 a 8" },
  { id: "in2", rotulo: "IN 9-16", nome: "INPUT 9 a 16" },
  { id: "out", rotulo: "OUTPUT", nome: "OUTPUT" },
];
const CANAIS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/* Zona de faders no celular: FADER BANK em cima, 8 tiras que deslizam de lado e o MAIN sempre à vista */
export function FadersCelular({ s, alvos, agir }: {
  s: Estado;
  alvos: ReadonlySet<string>;
  agir: (acao: AcaoMesa) => void;
}) {
  const rolagem = useRef<HTMLDivElement>(null);

  // Tira que o passo pede, para trazê-la à vista quando estiver fora (5 a 8)
  const pedida = CANAIS.find((i) => alvos.has(`fader-${i}`) || alvos.has(`on-${i}`));
  useEffect(() => {
    const caixa = rolagem.current;
    const tira = pedida === undefined ? null : (caixa?.children[pedida] as HTMLElement | undefined);
    if (!caixa || !tira) return;
    const esq = tira.offsetLeft;
    const dir = esq + tira.offsetWidth;
    if (esq < caixa.scrollLeft || dir > caixa.scrollLeft + caixa.clientWidth) {
      caixa.scrollTo({ left: esq, behavior: "smooth" });
    }
  }, [pedida]);

  return (
    <div className={st["cel-faders"]}>
      <div className={st["cel-bancos"]} role="group" aria-label="Fader bank">
        {BANCOS.map((b) => (
          <button
            key={b.id}
            id={`bk-${b.id}`}
            aria-label={`Banco ${b.nome}`}
            aria-pressed={s.banco === b.id}
            className={cn(alvos.has(`bk-${b.id}`) && st.alvo)}
            onClick={() => agir({ tipo: "banco", banco: b.id })}
          >
            {b.rotulo}
          </button>
        ))}
      </div>
      {s.sof !== null && (
        <p className={st["cel-sof"]}>Faders mandando para o <b>{SAIDAS[s.sof]}</b> · Sair fica na tela</p>
      )}
      <div className={st["cel-tiras"]}>
        <div className={st["cel-rolagem"]} ref={rolagem}>
          {CANAIS.map((i) => {
            const n = nomeFader(s, i);
            return <Tira key={i} {...dadosDaTira(s, i, alvos)} nome={n.n} cor={n.cor} canal={n.t} agir={agir} />;
          })}
        </div>
        <Tira {...dadosDaTira(s, "main", alvos)} nome={s.sof !== null ? SAIDAS[s.sof] : "PA"} cor="#ef5350" agir={agir} />
      </div>
    </div>
  );
}
