"use client";

import { cn } from "@/shared/lib/utils/cn";
import { CENAS, COR, SAIDAS, type IdCaixa } from "../lib/config";
import {
  canalDoFader,
  focoAtual,
  formatarTempo,
  ganho,
  medir,
  nomeFader,
  onDoFader,
  somOk,
  textoDb,
  valorCartao,
  valorFader,
  vivo,
  type AcaoMesa,
  type Estado,
} from "../lib/simulador";
import st from "./mesa.module.css";

const svgGrafico = { width: "100%", height: "100%", background: "#2a2c30", borderRadius: 2 };
const textoGrafico = { fill: "#fff", textAnchor: "middle", fontFamily: "var(--f-legenda)" } as const;

/* Gráficos decorativos da tela inicial, como na foto */
const GRAFICOS = (
  <>
    <svg viewBox="0 0 200 130" preserveAspectRatio="none" style={svgGrafico} aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => {
        const h = 22 + (Math.sin(i * 1.3) + 1) * 26 + (i % 5) * 4;
        return <rect key={i} x={6 + i * 7.3} y={118 - h} width="5" height={h} fill="#55595e" />;
      })}
      <path d="M6 118 L24 118 C36 118 38 72 54 70 C78 66 92 44 112 58 C128 66 150 72 176 66 L194 70 L194 118 Z" fill="rgba(70,190,110,.3)" />
      <path d="M6 118 C20 118 30 74 54 70 C78 66 92 44 112 58 C128 66 150 72 176 66 L194 70" fill="none" stroke="#60e080" strokeWidth="1.6" />
      <path d="M6 70H194" stroke="#d8dadd" strokeWidth=".8" />
      <rect x="6" y="6" width="26" height="14" rx="1" fill="#1e9c4e" />
      <rect x="36" y="6" width="26" height="14" rx="1" fill="#7cae32" />
      <text x="19" y="16.5" fontSize="9" {...textoGrafico}>EQ</text>
      <text x="49" y="16.5" fontSize="9" {...textoGrafico}>HPF</text>
    </svg>
    <svg viewBox="0 0 100 130" preserveAspectRatio="none" style={svgGrafico} aria-hidden="true">
      <rect x="4" y="4" width="28" height="13" rx="1" fill="#1e9c4e" />
      <text x="18" y="14" fontSize="8.5" {...textoGrafico}>DYN 1</text>
      <path d="M8 60 L46 56 L70 22 L90 22 L90 60 Z" fill="rgba(70,190,110,.25)" stroke="#60e080" />
      <rect x="4" y="68" width="28" height="13" rx="1" fill="#1e9c4e" />
      <text x="18" y="78" fontSize="8.5" {...textoGrafico}>DYN 2</text>
      <path d="M8 124 L60 92 L90 86 L90 124 Z" fill="rgba(70,190,110,.25)" stroke="#60e080" />
    </svg>
  </>
);

function Resumo({ s }: { s: Estado }) {
  let cor: string, topo: string, nome: string, texto: string;
  if (s.sof !== null) {
    cor = COR.saida;
    topo = "RETORNO";
    nome = SAIDAS[s.sof];
    texto = "Faders = quanto de cada canal vai para esta caixa. MAIN = volume geral dela.";
  } else if (s.sel === "main") {
    cor = COR.st;
    topo = "ST L/R";
    nome = "PA";
    texto = `${s.main.on ? "Tocando" : "Mudo"} em ${textoDb(s.main.f)}`;
  } else {
    const nf = nomeFader(s, s.sel);
    const on = s.banco === "out" ? s.mix[s.sel].on : s.ch[canalDoFader(s, s.sel)].on;
    cor = nf.cor;
    topo = nf.t;
    nome = nf.n;
    texto = `${on ? "Tocando" : "Mudo"} em ${textoDb(valorFader(s, s.sel))}`;
  }
  return (
    <div className={st.resumo}>
      <div className={st["ch-card"]} style={{ "--cc": cor } as React.CSSProperties}>
        <small>{topo}</small>
        <strong>{nome}</strong>
      </div>
      <p>{texto}</p>
    </div>
  );
}

function CartaoCanal({ tt, val, n, cor, medidor, sel, mudo }: {
  tt: string;
  val: string;
  n: string;
  cor: string;
  medidor: number;
  sel: boolean;
  mudo: boolean;
}) {
  return (
    <div className={cn(st.nm, sel && st.sel, mudo && st.mudo)} style={{ "--cc": cor } as React.CSSProperties}>
      <span className={st.tt}>{tt}</span>
      <span className={st.val}>{val}</span>
      <span className={st.med}><i style={{ height: `${medir(medidor) * 100}%` }} /></span>
      <span className={st.n}>{n}</span>
    </div>
  );
}

export function TelaTouch({ s, sig, niveis, agora, agir, alvos }: {
  s: Estado;
  sig: readonly number[];
  niveis: Record<IdCaixa, number>;
  agora: number;
  agir: (acao: AcaoMesa) => void;
  alvos: ReadonlySet<string>;
}) {
  const a = (id: string) => alvos.has(id) && st.alvo;
  const cenaAtual = CENAS.find((c) => c.id === s.cena) ?? CENAS[0];
  const barrasAcesas = Math.round(medir(niveis.pa) * 30);
  const foraDoTreino = () => agir({ tipo: "fora" });
  const r = s.rec;

  const medidorDoFader = (i: number) => {
    if (!somOk(s)) return 0;
    if (s.banco === "out") return i < 5 ? niveis[`m${i}` as IdCaixa] : 0;
    const k = canalDoFader(s, i);
    const c = s.ch[k];
    if (s.sof !== null) return c.on && c.sendOn[s.sof] ? sig[k] * ganho(c.send[s.sof]) : 0;
    return c.on ? sig[k] * ganho(c.f) : 0;
  };

  return (
    <div className={st.tela}>
      <div className={st.tb}>
        <button className={cn(st["tb-cena"], a("tb-cena"))} id="tb-cena" aria-label="Abrir presets" onClick={() => agir({ tipo: "abrirCena" })}>
          <small>SCENE</small>
          <b>{cenaAtual.id}</b>
          <span>{cenaAtual.nome}</span>
        </button>
        <div className={cn(st["med-tb"], st["so-tela-grande"])}>
          {Array.from({ length: 30 }, (_, i) => <i key={i} className={cn(i < barrasAcesas && st.v)} />)}
        </div>
        <button className={cn(st["ic-b"], r.e === "gravando" && st.ativo, a("tb-rec"))} id="tb-rec" aria-label="Abrir gravador" onClick={() => agir({ tipo: "abrirRec" })}>
          <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" /></svg>
        </button>
        <button className={cn(st["ic-b"], st["so-tela-grande"])} aria-label="Monitor" onClick={foraDoTreino}>
          <svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1" /><rect x="17" y="14" width="4" height="6" rx="1" /></svg>
        </button>
        <button className={cn(st["ic-b"], st["so-tela-grande"])} aria-label="Configurações" onClick={foraDoTreino}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></svg>
        </button>
        {s.usb && !s.usbSeguro && (
          <button className={cn(st["ic-b"], a("tb-eject"))} id="tb-eject" aria-label="Remover pendrive com segurança" onClick={() => agir({ tipo: "ejetar" })}>
            <svg viewBox="0 0 24 24"><path d="M12 5l7 8H5z" /><path d="M5 18h14" /></svg>
          </button>
        )}
        <span className={st.hora}>{agora ? new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
        <button className={st["ic-b"]} aria-label="Tela inicial" onClick={() => agir({ tipo: "home" })}>
          <svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></svg>
        </button>
      </div>

      {s.tela === "home" && (
        <div className={st.corpo}>
          <Resumo s={s} />
          <div className={cn(st.graficos, st["so-tela-grande"])} onClick={foraDoTreino}>{GRAFICOS}</div>
          <div className={st.envios}>
            <button className={cn(st["so-grande"], st.fraco)} onClick={foraDoTreino}>Rev</button>
            <button className={cn(st["so-grande"], st.fraco)} onClick={foraDoTreino}>Delay</button>
            {SAIDAS.map((nome, i) => (
              <button
                key={nome}
                id={`snd-${i}`}
                className={cn(s.sof === i && st.sel, i > 4 && st.fraco, i > 4 && st["so-grande"], a(`snd-${i}`))}
                onClick={() => agir({ tipo: "envio", i })}
              >
                {nome}
              </button>
            ))}
            <button id="snd-exit" className={cn(st.sair, a("snd-exit"))} onClick={() => agir({ tipo: "sair" })}>Sair</button>
          </div>
          <div className={cn(st.medst, st["so-tela-grande"])}>
            <div><i style={{ height: `${medir(niveis.pa) * 100}%` }} /></div>
            <div><i style={{ height: `${medir(niveis.pa * 0.96) * 100}%` }} /></div>
          </div>
        </div>
      )}

      {s.tela === "rec" && (
        <div className={st.grav}>
          <div className={st["grav-cab"]}>
            <b>RECORDER</b>
            <span>{s.usb ? "Pendrive: 28,4 GB livres" : "Sem pendrive"}</span>
            <button className={st.fx} aria-label="Fechar gravador" onClick={() => agir({ tipo: "fecharTela" })}>X</button>
          </div>
          <div className={st.lista}>
            {!s.usb ? <p>Coloque um pendrive para gravar.</p>
              : r.arquivos.length ? r.arquivos.map((arq) => <div key={arq.nome}><span>{arq.nome}</span><span>{formatarTempo(arq.t)}</span></div>)
              : <p>Nenhuma gravação ainda.</p>}
          </div>
          <div className={st.transp}>
            <div className={st["st-rec"]}>
              <small>MP3 48 kHz / 256 kbps</small>
              <div>{formatarTempo(r.t)}</div>
              <div className={st.medrec}><i style={{ width: `${r.e === "gravando" ? medir(niveis.pa) * 100 : 0}%` }} /></div>
            </div>
            <button id="rc-stop" className={cn(a("rc-stop"))} aria-label="Parar" onClick={() => agir({ tipo: "recStop" })}><span className={st["ic-st"]} /></button>
            <button id="rc-play" className={cn(a("rc-play"))} aria-label="Iniciar ou pausar" onClick={() => agir({ tipo: "recPlay" })}>
              <span className={r.e === "gravando" ? st["ic-pa"] : st["ic-pl"]} />
            </button>
            <button
              id="rc-rec"
              className={cn(r.e === "pronto" && st.piscando, (r.e === "gravando" || r.e === "pausa") && st.gravando, a("rc-rec"))}
              aria-label="Gravar"
              onClick={() => agir({ tipo: "recRec" })}
            >
              <span className={st["ic-rec"]} />
            </button>
          </div>
        </div>
      )}

      {s.tela === "cena" && (
        <div className={st.cenas}>
          <div className={st["grav-cab"]}>
            <div className={st.abas}>
              <button className={st.sel}>SCENE A</button>
              <button onClick={foraDoTreino}>SCENE B</button>
            </div>
            <button className={cn(st.fx, a("cn-x"))} id="cn-x" aria-label="Fechar presets" onClick={() => agir({ tipo: "fecharTela" })}>X</button>
          </div>
          <div className={st["tab-cenas"]}>
            {CENAS.map((c) => (
              <button
                key={c.id}
                id={`cn-${c.id}`}
                className={cn(st.cn, s.cenaSel === c.id && st.sel, a(`cn-${c.id}`))}
                onClick={() => agir({ tipo: "selecionarCena", id: c.id })}
              >
                <span className={st.agora}>{s.cena === c.id ? "▶" : ""}</span>
                <span>{c.id}</span>
                <span>{c.nome}</span>
                <span className={st.cad}>
                  {c.trava && (
                    <svg viewBox="0 0 12 14" width="10" height="12" aria-label="Protegido">
                      <rect x="1" y="6" width="10" height="7" rx="1" fill="currentColor" />
                      <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className={st["cn-acoes"]}>
            <button className={st.fraco} onClick={() => agir({ tipo: "salvarPreset" })}>Store</button>
            <button id="cn-recall" className={cn(a("cn-recall"))} onClick={() => agir({ tipo: "recall" })}>Recall</button>
            <button className={st.fraco} onClick={() => agir({ tipo: "salvarPreset" })}>Edit</button>
          </div>
        </div>
      )}

      <div className={st.nomes}>
        {Array.from({ length: 8 }, (_, i) => {
          const nf = nomeFader(s, i);
          return (
            <CartaoCanal
              key={i}
              tt={s.sof !== null ? `→ ${SAIDAS[s.sof]}` : nf.t}
              val={valorCartao(valorFader(s, i))}
              n={nf.n}
              cor={nf.cor}
              medidor={medidorDoFader(i)}
              sel={s.sel === i}
              mudo={!onDoFader(s, i)}
            />
          );
        })}
        <CartaoCanal
          tt={s.sof !== null ? "GERAL" : "ST L"}
          val={valorCartao(valorFader(s, "main"))}
          n={s.sof !== null ? SAIDAS[s.sof] : "PA"}
          cor={s.sof !== null ? COR.saida : COR.st}
          medidor={niveis[s.sof !== null ? focoAtual(s) : "pa"]}
          sel={s.sel === "main"}
          mudo={!onDoFader(s, "main")}
        />
      </div>

      {!vivo(s) && (
        <div className={st.apagada}>
          {s.boot ? <div className={st.ini}><span>Iniciando a mesa</span><i /></div> : "Mesa desligada"}
        </div>
      )}
    </div>
  );
}
