// Estado da mesa e tudo que muda esse estado. Sem navegador, para poder testar.
import { CAIXAS, CENAS, COR, ENTRADAS, ESCALA, SAIDAS, ZERO, type Canal, type IdCaixa, type MisturaCena, type Saida } from "./config";

export type Vista = "top" | "rear" | "rack";
export type Banco = "in1" | "in2" | "out";
export type Tela = "home" | "rec" | "cena";
export type IdFader = number | "main";

export interface Gravador {
  e: "parado" | "pronto" | "gravando" | "pausa";
  t: number;
  arquivos: { nome: string; t: number }[];
}

export interface Estado extends MisturaCena {
  vista: Vista;
  dc: boolean;
  dante: "primary" | null;
  mics: number[];
  usb: boolean;
  usbSeguro: boolean;
  ligada: boolean;
  boot: boolean;
  banco: Banco;
  // Retorno aberto nos faders (SENDS ON FADER); null = faders normais
  sof: number | null;
  tela: Tela;
  sel: IdFader;
  foco: IdCaixa;
  rec: Gravador;
  cena: string;
  cenaSel: string;
  alterada: boolean;
  ultOp: number;
  desligouEm: number;
  cabo: string | null;
}

export interface Mensagem {
  t: string;
  k: "info" | "erro" | "ok";
}

export type AcaoMesa =
  | { tipo: "vista"; vista: Vista }
  | { tipo: "cabo"; id: string }
  | { tipo: "pegarCabo"; id: string }
  | { tipo: "largarCabo" }
  | { tipo: "foco"; foco: IdCaixa }
  | { tipo: "porta"; porta: string }
  | { tipo: "selecionarCena"; id: string }
  | { tipo: "chave" }
  | { tipo: "fimBoot" }
  | { tipo: "abrirRec" }
  | { tipo: "abrirCena" }
  | { tipo: "fecharTela" }
  | { tipo: "home" }
  | { tipo: "sair" }
  | { tipo: "recall" }
  | { tipo: "ejetar" }
  | { tipo: "recRec" }
  | { tipo: "recPlay" }
  | { tipo: "recStop" }
  | { tipo: "banco"; banco: Banco }
  | { tipo: "on"; id: IdFader }
  | { tipo: "sel"; id: IdFader }
  | { tipo: "envio"; i: number }
  | { tipo: "fader"; id: IdFader; f: number }
  | { tipo: "faderDelta"; id: IdFader; d: number }
  | { tipo: "tempo"; dt: number }
  | { tipo: "fora" }
  | { tipo: "salvarPreset" };

export interface Resultado {
  s: Estado;
  // undefined mantém a mensagem atual; null apaga
  msg?: Mensagem | null;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ---------- Escala do fader ---------- */
export function db(f: number): number {
  if (f <= 0) return -Infinity;
  if (f < 0.052) return -60 - (0.052 - f) * 800;
  for (let i = 0; i < ESCALA.length - 1; i++) {
    const [fa, da] = ESCALA[i];
    const [fb, dbb] = ESCALA[i + 1];
    if (f <= fa && f >= fb) return dbb + ((f - fb) / (fa - fb)) * (da - dbb);
  }
  return 10;
}
export const ganho = (f: number) => (f <= 0 ? 0 : Math.pow(10, db(f) / 20));
export const textoDb = (f: number) => {
  const d = db(f);
  return d === -Infinity ? "-∞" : (d > 0 ? "+" : "") + d.toFixed(1).replace(".", ",") + " dB";
};
export const valorCartao = (f: number) => {
  const d = db(f);
  return d === -Infinity ? "-∞" : d.toFixed(1);
};
export const naMarca = (f: number) => Math.abs(f - ZERO) < 0.07;

/* ---------- Presets ---------- */
function canaisVazios(): Canal[] {
  return Array.from({ length: 16 }, () => ({
    f: 0,
    on: false,
    send: [0.3, 0.3, 0.3, ZERO, ZERO, 0, 0, 0],
    sendOn: Array<boolean>(8).fill(true),
  }));
}
function mixPadrao(): Saida[] {
  return Array.from({ length: 8 }, (_, i) => ({ f: i < 5 ? 0.75 : 0, on: i < 5 }));
}
export function aplicarCena(st: Estado, id: string) {
  const cena = CENAS.find((x) => x.id === id);
  if (!cena) return;
  const t: MisturaCena = { ch: canaisVazios(), mix: mixPadrao(), main: { f: ZERO, on: true } };
  cena.monta(t);
  st.ch = t.ch;
  st.mix = t.mix;
  st.main = t.main;
  st.cena = id;
  st.cenaSel = id;
  st.alterada = false;
  st.sof = null;
}

export function estadoBase(): Estado {
  const st: Estado = {
    ch: [],
    mix: [],
    main: { f: 0, on: true },
    vista: "top",
    dc: true,
    dante: "primary",
    mics: ENTRADAS.map((_, i) => i),
    usb: false,
    usbSeguro: false,
    ligada: true,
    boot: false,
    banco: "in1",
    sof: null,
    tela: "home",
    sel: 0,
    foco: "pa",
    rec: { e: "parado", t: 0, arquivos: [] },
    cena: "A05",
    cenaSel: "A05",
    alterada: false,
    ultOp: 0,
    desligouEm: 0,
    cabo: null,
  };
  aplicarCena(st, "A05");
  return st;
}

/* ---------- Leitura do estado ---------- */
export const somOk = (s: Estado) => s.ligada && !s.boot && s.dc && s.dante === "primary";
export const canalDoFader = (s: Estado, i: number) => (s.banco === "in2" ? i + 8 : i);
export const vivo = (s: Estado) => s.ligada && !s.boot;

export function valorFader(s: Estado, id: IdFader): number {
  if (id === "main") return s.sof !== null ? s.mix[s.sof].f : s.main.f;
  if (s.banco === "out") return s.mix[id].f;
  const c = s.ch[canalDoFader(s, id)];
  return s.sof !== null ? c.send[s.sof] : c.f;
}

function definirFader(s: Estado, id: IdFader, x: number) {
  if (id === "main") {
    if (s.sof !== null) s.mix[s.sof].f = x;
    else s.main.f = x;
    return;
  }
  if (s.banco === "out") {
    s.mix[id].f = x;
    return;
  }
  const c = s.ch[canalDoFader(s, id)];
  if (s.sof !== null) c.send[s.sof] = x;
  else c.f = x;
}

export function onDoFader(s: Estado, id: IdFader): boolean {
  if (id === "main") return s.sof !== null ? s.mix[s.sof].on : s.main.on;
  if (s.banco === "out") return s.mix[id].on;
  const c = s.ch[canalDoFader(s, id)];
  return s.sof !== null ? c.sendOn[s.sof] : c.on;
}

function alternarOn(s: Estado, id: IdFader) {
  if (id === "main") {
    if (s.sof !== null) s.mix[s.sof].on = !s.mix[s.sof].on;
    else s.main.on = !s.main.on;
    return;
  }
  if (s.banco === "out") {
    s.mix[id].on = !s.mix[id].on;
    return;
  }
  const c = s.ch[canalDoFader(s, id)];
  if (s.sof !== null) c.sendOn[s.sof] = !c.sendOn[s.sof];
  else c.on = !c.on;
}

export function nomeFader(s: Estado, i: number): { t: string; n: string; cor: string } {
  if (s.banco === "out") {
    return {
      t: i < 5 ? `SAÍDA ${i + 1}` : i === 5 ? "SAÍDA 6" : `MTX ${i - 5}`,
      n: SAIDAS[i].replace("Matrix", "Mtx"),
      cor: i < 5 ? COR.saida : COR.livre,
    };
  }
  const c = canalDoFader(s, i);
  const entrada = ENTRADAS[c];
  return entrada
    ? { t: `CH ${c + 1}`, n: entrada.nome, cor: COR[entrada.grupo] }
    : { t: `CH ${c + 1}`, n: "livre", cor: COR.livre };
}

export const focoAtual = (s: Estado): IdCaixa => (s.sof !== null ? (`m${s.sof}` as IdCaixa) : s.foco);
export const nomeCaixa = (id: IdCaixa) => CAIXAS.find((c) => c.id === id)?.nome ?? "";
export const saidaDaCaixa = (s: Estado, id: IdCaixa): Saida => (id === "pa" ? s.main : s.mix[Number(id[1])]);

/* ---------- Som simulado ---------- */
export function parteMix(s: Estado, sig: readonly number[], i: number, m: number): number {
  const c = s.ch[i];
  if (!c.on || !c.sendOn[m]) return 0;
  // Monitores (1-3) pré-fader; rears (4-5) pós-fader: suposição a conferir na mesa real
  return sig[i] * ganho(c.send[m]) * (m >= 3 ? ganho(c.f) : 1);
}
export const partePA = (s: Estado, sig: readonly number[], i: number) => (s.ch[i].on ? sig[i] * ganho(s.ch[i].f) : 0);

export function nivelPA(s: Estado, sig: readonly number[]): number {
  if (!somOk(s) || !s.main.on) return 0;
  let t = 0;
  for (let i = 0; i < 16; i++) t += partePA(s, sig, i) ** 2;
  return Math.sqrt(t) * ganho(s.main.f);
}
export function nivelMix(s: Estado, sig: readonly number[], m: number): number {
  if (!somOk(s) || !s.mix[m].on) return 0;
  let t = 0;
  for (let i = 0; i < 16; i++) t += parteMix(s, sig, i, m) ** 2;
  return Math.sqrt(t) * ganho(s.mix[m].f);
}
export const medir = (x: number) => clamp(Math.pow(Math.max(x, 0) * 0.62, 0.7), 0, 1);

export function niveisDasCaixas(s: Estado, sig: readonly number[]): Record<IdCaixa, number> {
  return {
    pa: nivelPA(s, sig),
    m0: nivelMix(s, sig, 0),
    m1: nivelMix(s, sig, 1),
    m2: nivelMix(s, sig, 2),
    m3: nivelMix(s, sig, 3),
    m4: nivelMix(s, sig, 4),
  };
}

// Bumbo e caixa batem em pulsos; o resto varia como fala e música
export function proximoSinal(sig: readonly number[], mics: readonly number[], fase: number, aleatorio: () => number = Math.random): number[] {
  return sig.map((atual, i) => {
    const entrada = ENTRADAS[i];
    let alvo = 0;
    if (entrada && mics.includes(i)) {
      if (i === 8) alvo = entrada.energia * (Math.sin(fase * 7.5) > 0.7 ? 1 : 0.15);
      else if (i === 9) alvo = entrada.energia * (Math.sin(fase * 7.5 + 1.6) > 0.75 ? 1 : 0.1);
      else alvo = entrada.energia * (0.55 + aleatorio() * 0.6);
    }
    return atual + (alvo - atual) * 0.35;
  });
}

export const formatarTempo = (t: number) => {
  const z = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return `${z(t / 3600)}:${z((t / 60) % 60)}:${z(t % 60)}`;
};

/* ---------- Ações ---------- */
const FORA = "Essa função não faz parte deste treino.";
const INFO_PORTA: Record<string, string> = {
  "p-dc": "DC INPUT: entrada do adaptador de energia.",
  "p-pri": "PRIMARY: cabo de rede Dante que liga a mesa ao rack. É o que a igreja usa.",
  "p-sec": "SECONDARY: linha reserva do Dante. Aqui não usamos.",
  "p-host": "USB TO HOST: liga a mesa a um computador. O pendrive não vai aqui.",
  "p-net": "Porta com ícone de rede (NETWORK): controle da mesa por computador ou aplicativo. Não leva som.",
};

const aviso = (t: string, k: Mensagem["k"] = "info"): Mensagem => ({ t, k });
const segundosDesde = (agora: number, t: number) => (agora - t) / 1000;

function naoOperavel(s: Estado): Mensagem | null {
  if (!s.ligada) return aviso("A mesa está desligada. A chave fica atrás, no canto esquerdo.", "erro");
  if (s.boot) return aviso("Espere a tela terminar de iniciar.", "erro");
  return null;
}

function nomeDoArquivo(agora: number) {
  const d = new Date(agora);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.mp3`;
}

function tocarPorta(st: Estado, p: string, agora: number): Resultado {
  const parado = (msg: Mensagem): Resultado => ({ s: st, msg });
  const muda = (fn: (s: Estado) => void, msg?: Mensagem): Resultado => {
    const s = structuredClone(st);
    fn(s);
    s.ultOp = agora;
    return msg ? { s, msg } : { s };
  };
  const omniOuEntrada = /^(o|i)-/.test(p);
  const rack = p.match(/^r-(\d+)$/);
  const entradaRack = rack ? Number(rack[1]) : 0;
  const cabo = st.cabo;

  if (!cabo) {
    if (p === "p-dc" && st.dc) {
      if (st.ligada) return parado(aviso("Desligue a chave antes de tirar o cabo de energia (manual p.27).", "erro"));
      return muda((s) => { s.dc = false; });
    }
    if (p === "p-pri" && st.dante === "primary") {
      return muda((s) => { s.dante = null; }, aviso("Sem o cabo de rede, nenhum som chega ao rack.", "erro"));
    }
    if (p === "usb-top" && st.usb) {
      if (st.rec.e !== "parado") return parado(aviso("Pare a gravação antes de mexer no pendrive.", "erro"));
      if (!st.usbSeguro) return parado(aviso("Antes de tirar, toque em Remover no topo da tela. Tirar direto pode estragar o arquivo.", "erro"));
      return muda((s) => {
        s.usb = false;
        s.usbSeguro = false;
        if (s.tela === "rec") s.tela = "home";
      });
    }
    if (rack && st.mics.includes(entradaRack - 1)) {
      return muda((s) => { s.mics = s.mics.filter((m) => m !== entradaRack - 1); });
    }
    if (INFO_PORTA[p]) return parado(aviso(INFO_PORTA[p]));
    if (omniOuEntrada) return parado(aviso("Aqui nada entra nas portas OMNI OUT e INPUT da mesa. Tudo passa pelo cabo de rede até o rack."));
    if (rack) return parado(aviso(`Entrada ${entradaRack} do rack. Escolha um microfone ou instrumento e toque aqui.`));
    if (p === "usb-top") return parado(aviso("Conector para pendrive. Escolha o pendrive e toque aqui."));
    return { s: st };
  }

  if (cabo === "dc") {
    if (p !== "p-dc") return parado(aviso("O cabo de energia só encaixa no DC INPUT.", "erro"));
    return muda((s) => { s.dc = true; s.cabo = null; });
  }
  if (cabo === "rede") {
    if (p === "p-sec") return parado(aviso("O SECONDARY é a linha reserva. Aqui o cabo vai no PRIMARY.", "erro"));
    if (p === "p-net") return parado(aviso("A porta com ícone de rede é para controlar a mesa por computador e não leva som. Use o PRIMARY.", "erro"));
    if (p !== "p-pri") return parado(aviso("O cabo de rede vai no PRIMARY.", "erro"));
    return muda((s) => { s.dante = "primary"; s.cabo = null; });
  }
  if (cabo === "usb") {
    if (p === "p-host") return parado(aviso("USB TO HOST é para computador. O pendrive vai no USB de cima da mesa.", "erro"));
    if (p !== "usb-top") return parado(aviso("O pendrive vai no USB de cima da mesa.", "erro"));
    return muda((s) => { s.usb = true; s.usbSeguro = false; s.cabo = null; });
  }
  // Cabo de microfone ou instrumento: "m0", "m1"...
  const m = Number(cabo.slice(1));
  if (!rack) return parado(aviso("Microfones e instrumentos entram no rack, não na mesa.", "erro"));
  if (entradaRack !== m + 1) {
    return parado(aviso(`${ENTRADAS[m].nome} é o canal ${m + 1}. Ligue na entrada ${m + 1}, ou o nome na tela vai ficar errado.`, "erro"));
  }
  return muda((s) => { s.mics.push(m); s.cabo = null; });
}

function alternarChave(st: Estado, agora: number): Resultado {
  const s = structuredClone(st);
  if (st.ligada) {
    if (st.boot) return { s: st, msg: aviso("Espere terminar de iniciar.", "erro") };
    if (st.rec.e !== "parado") return { s: st, msg: aviso("Pare a gravação antes de desligar.", "erro") };
    const r = Math.ceil(10 - segundosDesde(agora, st.ultOp));
    if (r > 0) return { s: st, msg: aviso(`Você mexeu na mesa há pouco. Espere mais ${r} s para ela salvar o último ajuste.`, "erro") };
    s.ligada = false;
    s.desligouEm = agora;
    s.sof = null;
    s.tela = "home";
    return { s };
  }
  if (!st.dc) return { s: st, msg: aviso("Sem energia. Ligue o cabo no DC INPUT primeiro.", "erro") };
  const r = Math.ceil(6 - segundosDesde(agora, st.desligouEm));
  if (st.desligouEm && r > 0) return { s: st, msg: aviso(`Espere mais ${r} s antes de religar. Ligar em seguida pode causar defeito.`, "erro") };
  s.ligada = true;
  s.boot = true;
  return { s };
}

export function reduzir(st: Estado, acao: AcaoMesa, agora: number): Resultado {
  // Muda uma cópia; com `conta`, a ação vale como último ajuste para a espera de 10 s
  const muda = (fn: (s: Estado) => void, msg?: Mensagem | null, conta = true): Resultado => {
    const s = structuredClone(st);
    fn(s);
    if (conta) s.ultOp = agora;
    return msg === undefined ? { s } : { s, msg };
  };
  const bloqueio = naoOperavel(st);

  switch (acao.tipo) {
    case "vista":
      return muda((s) => { s.vista = acao.vista; s.cabo = null; }, null, false);
    case "cabo":
      return muda((s) => { s.cabo = s.cabo === acao.id ? null : acao.id; }, null, false);
    case "pegarCabo":
      // A mensagem fica: apagá-la encolhe o cartão e tira a porta de baixo do dedo
      return muda((s) => { s.cabo = acao.id; }, undefined, false);
    case "largarCabo":
      return st.cabo ? muda((s) => { s.cabo = null; }, undefined, false) : { s: st };
    case "foco":
      return muda((s) => { s.foco = acao.foco; }, undefined, false);
    case "porta":
      return tocarPorta(st, acao.porta, agora);
    case "selecionarCena":
      return muda((s) => { s.cenaSel = acao.id; });
    case "chave":
      return alternarChave(st, agora);
    case "fimBoot":
      return muda((s) => { s.boot = false; });
    case "abrirRec":
      return bloqueio ? { s: st, msg: bloqueio } : muda((s) => { s.tela = "rec"; });
    case "abrirCena":
      return bloqueio ? { s: st, msg: bloqueio } : muda((s) => { s.tela = "cena"; s.cenaSel = s.cena; });
    case "fecharTela":
      return muda((s) => { s.tela = "home"; });
    case "home":
      return bloqueio ? { s: st, msg: bloqueio } : muda((s) => { s.tela = "home"; s.sof = null; });
    case "sair":
      return st.sof === null ? { s: st } : muda((s) => { s.sof = null; });
    case "recall":
      return muda((s) => aplicarCena(s, s.cenaSel), aviso(`Preset ${st.cenaSel} carregado.`, "ok"));
    case "ejetar":
      if (st.rec.e !== "parado") return { s: st, msg: aviso("Pare a gravação antes de remover o pendrive.", "erro") };
      return muda((s) => { s.usbSeguro = true; }, aviso("Pronto. Já pode tirar o pendrive com segurança."));
    case "recRec":
      if (!st.usb) return { s: st, msg: aviso("Coloque um pendrive primeiro.", "erro") };
      if (st.rec.e === "gravando" || st.rec.e === "pausa") return { s: st, msg: aviso("Já está gravando. Para encerrar, toque em Parar.") };
      return muda((s) => { s.rec.e = "pronto"; s.rec.t = 0; });
    case "recPlay":
      if (st.rec.e === "parado") return { s: st, msg: aviso("Toque antes na bolinha vermelha para preparar a gravação.", "erro") };
      return muda((s) => { s.rec.e = st.rec.e === "gravando" ? "pausa" : "gravando"; });
    case "recStop":
      if (st.rec.e === "parado") return { s: st };
      return muda((s) => {
        if (s.rec.t > 0) s.rec.arquivos.unshift({ nome: nomeDoArquivo(agora), t: s.rec.t });
        s.rec.e = "parado";
        s.rec.t = 0;
      });
    case "tempo":
      return st.rec.e === "gravando" ? muda((s) => { s.rec.t += acao.dt; }, undefined, false) : { s: st };
    case "fora":
      return { s: st, msg: aviso(FORA) };
    case "salvarPreset":
      return { s: st, msg: aviso("Salvar e editar presets fica com quem cuida da mesa. Neste treino você só carrega.") };
  }

  // Daqui para baixo, só com a mesa ligada e pronta
  if (bloqueio) return { s: st, msg: bloqueio };
  switch (acao.tipo) {
    case "banco":
      return muda((s) => {
        s.banco = acao.banco;
        if (acao.banco === "out") s.sof = null;
      });
    case "on":
      return muda((s) => { alternarOn(s, acao.id); s.alterada = true; });
    case "sel":
      return muda((s) => { s.sel = acao.id; });
    case "envio":
      if (acao.i > 4) return { s: st, msg: aviso("Esta saída não está em uso na igreja.") };
      return muda((s) => {
        s.sof = acao.i;
        if (s.banco === "out") s.banco = "in1";
      });
    case "fader":
      return muda((s) => { definirFader(s, acao.id, acao.f); s.alterada = true; });
    case "faderDelta":
      return muda((s) => {
        definirFader(s, acao.id, clamp(valorFader(s, acao.id) + acao.d, 0, 1));
        s.alterada = true;
      });
  }
}
