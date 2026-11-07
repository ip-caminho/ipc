"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/lib/utils/cn";
import { useArrasteCabo, type Fio } from "../hooks/useArrasteCabo";
import { useSinal } from "../hooks/useSinal";
import { useTreino } from "../hooks/useTreino";
import { alvosAtuais, cabosNaBandeja, LICOES } from "../lib/licoes";
import { niveisDasCaixas, type Vista } from "../lib/simulador";
import { MapaPalco, NiveisCaixas } from "./MapaPalco";
import { PainelSuperior } from "./PainelSuperior";
import { PainelTraseiro } from "./PainelTraseiro";
import { PassoAPasso } from "./PassoAPasso";
import { RackPalco } from "./RackPalco";
import { SimbolosConectores } from "./SimbolosConectores";
import st from "./mesa.module.css";

const VISTAS: readonly { id: Vista; nome: string }[] = [
  { id: "top", nome: "Mesa por cima" },
  { id: "rear", nome: "Atrás da mesa" },
  { id: "rack", nome: "Rack do palco" },
];

const A_CONFERIR = [
  "Número no rack igual ao canal na mesa (rack 1 = canal 1).",
  "Canal 1 (Pastor) e canal 2 (Sem fio) são os da igreja. Os outros 12 canais e os níveis de cada preset são exemplos.",
  "Os presets por momento do culto precisam existir na mesa real, ajustados de ouvido.",
  "Quem usa cada retorno: Mon 1 vocais, Mon 2 violão e teclado, Mon 3 bateria e baixo.",
  "Se a tela da mesa mostra Mon 1 a 3 e Rear 1 e 2. Aqui, Mon são os Mix 1 a 3 e Rear os Mix 4 e 5.",
  "Monitores pré-fader, rears pós-fader, e mutar um canal corta o som dele em todas as caixas.",
  "Baixar ou mutar o MAIN afeta a gravação. O gravador lê o STEREO, mas o manual não diz se é antes ou depois do fader.",
  "Espera de 10 s antes de desligar: o texto do manual (p.26) é confuso. O formato MP3 256 kbps é só uma sugestão.",
  "Presets guardados na própria mesa (Scene). Carregar de pendrive (Save/Load) não está no treino.",
];

function DesenhoFio({ fio }: { fio: Fio }) {
  const { x, y, x0, y0, cor } = fio;
  return (
    <svg className={st.fio} aria-hidden="true">
      {fio.id === "usb" ? (
        <>
          <rect x={x - 9} y={y - 26} width="18" height="30" rx="3" fill={cor} stroke="#111" strokeWidth="1.5" />
          <rect x={x - 6} y={y + 4} width="12" height="10" fill="#c9ced4" stroke="#111" />
        </>
      ) : (
        <>
          <path d={`M${x0} ${y0} Q${(x0 + x) / 2} ${Math.max(y0, y) + 40} ${x} ${y}`} fill="none" stroke={cor} strokeWidth="4" strokeLinecap="round" />
          <circle cx={x} cy={y} r="11" fill={cor} stroke="#111" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export function MesaSimulador() {
  const { treino, agir, recomecar, pular, abrirLicao } = useTreino();
  const { s } = treino;
  const aoTique = useCallback((dt: number) => agir({ tipo: "tempo", dt }), [agir]);
  const { sig, agora } = useSinal(s.mics, aoTique);
  const [conferirAberto, setConferirAberto] = useState(false);

  const alvos = useMemo(() => new Set(alvosAtuais(treino)), [treino]);
  const niveis = niveisDasCaixas(s, sig);
  const cabos = cabosNaBandeja(s, treino.licaoId);

  const { fio, iniciar, barrarCliqueDoArraste } = useArrasteCabo({
    aoPegar: (id) => agir({ tipo: "pegarCabo", id }),
    aoSoltar: (porta) => {
      if (porta) agir({ tipo: "porta", porta });
      // Soltou fora ou na porta errada: o cabo volta para a bandeja; o aviso continua na tela
      agir({ tipo: "largarCabo" });
    },
    aoCancelar: () => agir({ tipo: "largarCabo" }),
    classePorta: st["solta-aqui"],
  });

  return (
    <div
      className={cn(st.raiz, fio && st["arrastando-cabo"])}
      onClickCapture={barrarCliqueDoArraste}
    >
      <SimbolosConectores />
      <div className={st.app}>
        <header className={st.topo}>
          <h1>Treino da mesa de som</h1>
          <p>Yamaha DM3 da IP do Caminho. Errar aqui não desliga nada no culto.</p>
        </header>

        <nav className={st.licoes} aria-label="Lições">
          {LICOES.map((l) => (
            <Button
              key={l.id}
              variant="ghost"
              id={`licao-${l.id}`}
              aria-current={l.id === treino.licaoId}
              className={cn(treino.feitas.includes(l.id) && st.feita)}
              onClick={() => (l.id === treino.licaoId ? recomecar() : abrirLicao(l.id))}
            >
              {l.curto}
            </Button>
          ))}
        </nav>

        <main className={st.grade}>
          <section className={st.guia} aria-label="Instrução">
            <PassoAPasso treino={treino} agora={agora} aoRecomecar={recomecar} aoPular={pular} aoAbrir={abrirLicao} />
            <NiveisCaixas s={s} niveis={niveis} agir={agir} />
          </section>

          <section className={st.bancada} aria-label="Mesa">
            <div className={st.vistas} role="group" aria-label="Lado da mesa">
              {VISTAS.map((v) => (
                <Button
                  key={v.id}
                  variant="ghost"
                  id={`v-${v.id}`}
                  aria-pressed={s.vista === v.id}
                  className={cn(alvos.has(`v-${v.id}`) && st.alvo)}
                  onClick={() => agir({ tipo: "vista", vista: v.id })}
                >
                  {v.nome}
                </Button>
              ))}
            </div>

            {cabos.length > 0 && (
              <div className={st.bandeja}>
                {cabos.map((c) => (
                  <button
                    key={c.id}
                    id={`c-${c.id}`}
                    className={cn(st.cabo, c.ligado && st.ligado, alvos.has(`c-${c.id}`) && st.alvo)}
                    style={{ "--cor": c.cor } as React.CSSProperties}
                    aria-pressed={s.cabo === c.id}
                    disabled={c.ligado}
                    onPointerDown={(ev) => iniciar(ev, c.id, c.cor)}
                    onClick={() => agir({ tipo: "cabo", id: c.id })}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            )}

            {s.vista === "top" && <PainelSuperior s={s} sig={sig} niveis={niveis} agora={agora} agir={agir} alvos={alvos} />}
            {s.vista === "rear" && <PainelTraseiro s={s} agir={agir} alvos={alvos} />}
            {s.vista === "rack" && <RackPalco s={s} agir={agir} alvos={alvos} />}
          </section>

          <MapaPalco s={s} sig={sig} niveis={niveis} agir={agir} />

          <Collapsible open={conferirAberto} onOpenChange={setConferirAberto} className={st.sups}>
            <CollapsibleTrigger className={st["sups-tit"]}>
              <ChevronDown className={cn(st["sups-seta"], conferirAberto && st.aberta)} aria-hidden="true" />
              Para quem cuida da mesa: a conferir
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul>
                {A_CONFERIR.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </main>
      </div>
      {fio && <DesenhoFio fio={fio} />}
    </div>
  );
}
