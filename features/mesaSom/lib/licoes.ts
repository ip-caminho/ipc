// As lições como dados, e o andamento do treino por cima do estado da mesa.
import { ENTRADAS, ZERO } from "./config";
import { aplicarCena, estadoBase, naMarca, reduzir, textoDb, type AcaoMesa, type Estado, type Mensagem, type Vista } from "./simulador";

export interface Passo {
  txt: string;
  nota?: string;
  vista?: Vista;
  alvo?: (s: Estado) => string[];
  feito: (s: Estado) => boolean;
  conta?: (s: Estado, agora: number) => string;
}

export interface Licao {
  id: string;
  nome: string;
  curto: string;
  prep: (s: Estado) => void;
  passos: Passo[];
}

const v: Vista = "top";
const so = (...ids: string[]) => () => ids;
const passou = (agora: number, t: number) => (agora - t) / 1000;

export const LICOES: readonly Licao[] = [
  {
    id: "cabos", nome: "Cabos", curto: "1 Cabos",
    prep(s) { s.dc = false; s.dante = null; s.mics = []; s.ligada = false; s.vista = "rear"; },
    passos: [
      { txt: "Pegue o cabo de energia e ligue na entrada DC INPUT.", nota: "Arraste o cabo até a porta, ou toque no cabo e depois na porta. Faça isso com a chave desligada (manual p.27).", vista: "rear",
        alvo: (s) => (s.cabo === "dc" ? ["p-dc"] : ["c-dc"]), feito: (s) => s.dc },
      { txt: "Agora o cabo de rede vai no PRIMARY.", nota: "Esse único cabo leva todo o som entre a mesa e o rack.", vista: "rear",
        alvo: (s) => (s.cabo === "rede" ? ["p-pri"] : ["c-rede"]), feito: (s) => s.dante === "primary" },
      { txt: "Vá até o rack, na frente do palco.", nota: "Microfones não entram na mesa, entram no rack.", alvo: so("v-rack"), feito: (s) => s.vista === "rack" },
      { txt: "Ligue o microfone do pastor na entrada 1.", nota: "O número da entrada é o número do canal na mesa.", vista: "rack",
        alvo: (s) => (s.cabo === "m0" ? ["r-1"] : ["c-m0"]), feito: (s) => s.mics.includes(0) },
      { txt: "Ligue o microfone sem fio na entrada 2.", vista: "rack",
        alvo: (s) => (s.cabo === "m1" ? ["r-2"] : ["c-m1"]), feito: (s) => s.mics.includes(1) },
      { txt: "Ligue o violão na entrada 5.", vista: "rack",
        alvo: (s) => (s.cabo === "m4" ? ["r-5"] : ["c-m4"]), feito: (s) => s.mics.includes(4) },
    ],
  },
  {
    id: "ligar", nome: "Ligar e desligar", curto: "2 Ligar",
    prep(s) { s.ligada = false; s.vista = "rear"; s.desligouEm = 0; },
    passos: [
      { txt: "Aperte a chave de energia, atrás da mesa, no canto esquerdo.", nota: "Rack e caixas já ficam ligados. Você só liga a mesa.", vista: "rear", alvo: so("p-sw"), feito: (s) => s.ligada },
      { txt: "Espere a tela terminar de iniciar.", nota: "Leva alguns segundos.", vista: "top", feito: (s) => s.ligada && !s.boot },
      { txt: "Hora de desligar. Espere 10 segundos sem mexer em nada e aperte a chave.", nota: "A espera deixa a mesa salvar o último ajuste (manual p.26).", vista: "rear", alvo: so("p-sw"), feito: (s) => !s.ligada,
        conta: (s, agora) => { const r = Math.ceil(10 - passou(agora, s.ultOp)); return r > 0 ? `Aguarde ${r} s` : "Pode desligar"; } },
      { txt: "Para religar, espere 6 segundos e aperte a chave de novo.", nota: "Ligar e desligar em seguida pode causar defeito (manual p.26).", vista: "rear", alvo: so("p-sw"), feito: (s) => s.ligada,
        conta: (s, agora) => { const r = Math.ceil(6 - passou(agora, s.desligouEm)); return r > 0 ? `Aguarde ${r} s` : "Pode ligar"; } },
    ],
  },
  {
    id: "mute", nome: "Canais e mute", curto: "3 Mute",
    prep(s) { s.ch.forEach((c) => { c.f = 0; c.on = false; c.send = [0.45, 0.45, 0.45, ZERO, ZERO, 0, 0, 0]; }); },
    passos: [
      { txt: "O microfone do pastor está mudo: a tecla ON do canal 1 está apagada. Aperte ON.", nota: "Regra da mesa: ON aceso toca, ON apagado está mudo.", vista: v, alvo: so("on-0"), feito: (s) => s.ch[0].on },
      { txt: "Suba o fader do canal 1 até a marca 0.", nota: "Olhe o PA acender no mapa.", vista: v, alvo: so("fader-0"), feito: (s) => naMarca(s.ch[0].f) },
      { txt: "Mute o pastor sem mexer no fader: aperte ON.", nota: "O volume fica guardado para quando voltar.", vista: v, alvo: so("on-0"), feito: (s) => !s.ch[0].on },
      { txt: "Desmute: aperte ON de novo.", vista: v, alvo: so("on-0"), feito: (s) => s.ch[0].on },
      { txt: "Aperte INPUT 9-16 e veja os faders mudarem de lugar sozinhos.", nota: "Os mesmos 8 faders controlam outros canais. Olhe sempre o nome na tela.", vista: v, alvo: so("bk-in2"), feito: (s) => s.banco === "in2" },
      { txt: "Volte para INPUT 1-8.", vista: v, alvo: so("bk-in1"), feito: (s) => s.banco === "in1" },
    ],
  },
  {
    id: "caixas", nome: "Controlar cada caixa", curto: "4 Caixas",
    prep() {},
    passos: [
      { txt: "O PA é o fader vermelho, MAIN. Mute o PA: aperte o ON do MAIN.", nota: "Só o PA cala. Monitores continuam tocando.", vista: v, alvo: so("on-main"), feito: (s) => !s.main.on },
      { txt: "Desmute o PA.", vista: v, alvo: so("on-main"), feito: (s) => s.main.on },
      { txt: "Baixe o MAIN até perto de -10.", vista: v, alvo: so("fader-main"), feito: (s) => s.main.f < 0.6 },
      { txt: "Volte o MAIN para a marca 0.", vista: v, alvo: so("fader-main"), feito: (s) => naMarca(s.main.f) },
      { txt: "Monitores e rears ficam na tecla OUTPUT. Aperte.", nota: "Agora os faders 1 a 5 são Mon 1, 2, 3 e Rear 1, 2.", vista: v, alvo: so("bk-out"), feito: (s) => s.banco === "out" },
      { txt: "Tire o Mon 2 do ar: baixe o fader 2 até o fim.", vista: v, alvo: so("fader-1"), feito: (s) => s.mix[1].f < 0.06 },
      { txt: "Devolva o Mon 2 à marca 0.", vista: v, alvo: so("fader-1"), feito: (s) => naMarca(s.mix[1].f) },
      { txt: "Mute a Rear 1: aperte o ON do fader 4.", vista: v, alvo: so("on-3"), feito: (s) => !s.mix[3].on },
      { txt: "Desmute a Rear 1.", vista: v, alvo: so("on-3"), feito: (s) => s.mix[3].on },
      { txt: "O pregador pede mais voz no monitor dele. Primeiro volte para INPUT 1-8.", vista: v, alvo: so("bk-in1"), feito: (s) => s.banco === "in1" },
      { txt: "Toque em Mon 1 na tela.", nota: "Agora cada fader diz quanto daquele canal vai só para o Mon 1 (manual p.296).", vista: v, alvo: so("snd-0"), feito: (s) => s.sof === 0 },
      { txt: "Suba o fader 1 (Pastor) até a marca 0.", nota: "Só o Mon 1 aumenta. O PA não muda.", vista: v, alvo: so("fader-0"), feito: (s) => s.ch[0].send[0] >= 0.7 },
      { txt: "Toque em Sair na tela para os faders voltarem ao normal.", nota: "Esquecer disso é o erro mais comum: você acha que mexe no PA e está mexendo no monitor.", vista: v, alvo: so("snd-exit"), feito: (s) => s.sof === null },
    ],
  },
  {
    id: "gravar", nome: "Gravar no pendrive", curto: "5 Gravar",
    prep() {},
    passos: [
      { txt: "Arraste o pendrive até o USB de cima da mesa.", nota: "Formato FAT32 ou exFAT. Teste antes: pendrive lento falha na gravação (manual p.63).", vista: v,
        alvo: (s) => (s.cabo === "usb" ? ["usb-top"] : ["c-usb"]), feito: (s) => s.usb },
      { txt: "Abra o gravador: toque no ícone de fita, no topo da tela.", vista: v, alvo: so("tb-rec"), feito: (s) => s.tela === "rec" },
      { txt: "Toque na bolinha vermelha.", nota: "Ela pisca: a mesa está pronta, mas ainda não grava.", vista: v, alvo: so("rc-rec"), feito: (s) => s.rec.e === "pronto" },
      { txt: "Quando o culto começar, toque em Play para gravar.", vista: v, alvo: so("rc-play"), feito: (s) => s.rec.e === "gravando" },
      { txt: "Deixe gravar uns 5 segundos e veja o tempo correr.", nota: "O medidor segue o que sai no PA.", vista: v, feito: (s) => s.rec.t >= 5,
        conta: (s) => `Gravando: ${Math.floor(s.rec.t)} s` },
      { txt: "Fim do culto: toque em Parar.", nota: "O arquivo recebe nome com data e hora (manual p.257).", vista: v, alvo: so("rc-stop"), feito: (s) => s.rec.e === "parado" && s.rec.arquivos.length > 0 },
      { txt: "Antes de tirar o pendrive, toque em Remover no topo da tela.", nota: "Tirar sem isso pode estragar o arquivo (manual p.25).", vista: v, alvo: so("tb-eject"), feito: (s) => s.usbSeguro },
      { txt: "Agora pode tirar: toque no USB.", vista: v, alvo: so("usb-top"), feito: (s) => !s.usb },
    ],
  },
  {
    id: "presets", nome: "Carregar presets", curto: "6 Presets",
    prep() {},
    passos: [
      { txt: "Toque no nome do preset, no canto superior esquerdo da tela.", nota: "Na mesa, preset se chama Scene. Cada um guarda faders, ON e retornos (manual p.249).", vista: v, alvo: so("tb-cena"), feito: (s) => s.tela === "cena" },
      { txt: "O louvor vai começar. Toque em A01 Louvor na lista.", nota: "Há um preset para cada momento do culto.", vista: v, alvo: so("cn-A01"), feito: (s) => s.cenaSel === "A01" },
      { txt: "Toque em Recall e olhe os faders.", nota: "Tudo muda de uma vez. Carregue na troca de momento, nunca no meio de uma música ou de uma fala.", vista: v, alvo: so("cn-recall"), feito: (s) => s.cena === "A01" },
      { txt: "Agora bagunce: baixe o fader 2 (Sem fio) até embaixo.", nota: "O preset salvo não muda. Só o ajuste atual.", vista: v, alvo: so("fader-1"), feito: (s) => s.ch[1].f < 0.1 },
      { txt: "Toque em Recall de novo para voltar ao que estava salvo.", nota: "Se a mesa ficar confusa, recarregar o preset é o caminho mais rápido de volta.", vista: v, alvo: so("cn-recall"), feito: (s) => s.cena === "A01" && !s.alterada && s.ch[1].f > 0.4 },
      { txt: "Terminou o louvor, vem a pregação. Selecione A05 Pregação.", vista: v, alvo: so("cn-A05"), feito: (s) => s.cenaSel === "A05" },
      { txt: "Toque em Recall.", nota: "A banda sai e o microfone do pastor fica aberto.", vista: v, alvo: so("cn-recall"), feito: (s) => s.cena === "A05" },
      { txt: "Hora das perguntas ao vivo. Selecione A06 Interação.", vista: v, alvo: so("cn-A06"), feito: (s) => s.cenaSel === "A06" },
      { txt: "Toque em Recall.", nota: "Canal 1 (Pastor) e canal 2 (Sem fio) ficam abertos. O sem fio roda pela igreja com as perguntas.", vista: v, alvo: so("cn-recall"), feito: (s) => s.cena === "A06" },
      { txt: "Feche a lista no X.", vista: v, alvo: so("cn-x"), feito: (s) => s.tela === "home" },
    ],
  },
  {
    id: "banda", nome: "Banda e retornos", curto: "7 Banda",
    prep(s) { aplicarCena(s, "A01"); s.sel = 1; },
    passos: [
      { txt: "A banda chegou e a voz do vocalista some no PA. Suba o Sem fio (fader 2) até a marca 0.", nota: "Olhe a mistura do PA: a voz precisa ficar acima dos instrumentos.", vista: v, alvo: so("fader-1"), feito: (s) => s.ch[1].f >= 0.72,
        conta: (s) => `Sem fio no PA: ${textoDb(s.ch[1].f)}` },
      { txt: "A guitarra está abafando. Ela fica em outro banco: aperte INPUT 9-16.", nota: "Bateria, baixo, guitarra e Vocal 3 estão aqui.", vista: v, alvo: so("bk-in2"), feito: (s) => s.banco === "in2" },
      { txt: "Baixe a guitarra (fader 5) até perto de -5.", vista: v, alvo: so("fader-4"), feito: (s) => s.ch[12].f <= 0.68,
        conta: (s) => `Guitarra no PA: ${textoDb(s.ch[12].f)}` },
      { txt: "O Vocal 3 não canta hoje. Mute o canal dele: ON do fader 6.", nota: "Microfone sem uso aberto só traz barulho do palco.", vista: v, alvo: so("on-5"), feito: (s) => !s.ch[13].on },
      { txt: "Agora os retornos. Quem canta no Mon 1 pede mais violão. Volte para INPUT 1-8.", vista: v, alvo: so("bk-in1"), feito: (s) => s.banco === "in1" },
      { txt: "Toque em Mon 1 na tela.", nota: "Os faders passam a mostrar só o que vai para esse retorno. A faixa azul na tela confirma.", vista: v, alvo: so("snd-0"), feito: (s) => s.sof === 0 },
      { txt: "Suba o violão (fader 5) até a marca 0.", nota: "O PA não muda. Só quem está no Mon 1 ouve a diferença.", vista: v, alvo: so("fader-4"), feito: (s) => s.ch[4].send[0] >= 0.7,
        conta: (s) => `Violão no Mon 1: ${textoDb(s.ch[4].send[0])}` },
      { txt: "A mesma pessoa pede menos guitarra. Aperte INPUT 9-16.", nota: "Você continua no Mon 1, só mudou de banco.", vista: v, alvo: so("bk-in2"), feito: (s) => s.banco === "in2" },
      { txt: "Baixe a guitarra (fader 5) até perto de -30.", vista: v, alvo: so("fader-4"), feito: (s) => s.ch[12].send[0] <= 0.34,
        conta: (s) => `Guitarra no Mon 1: ${textoDb(s.ch[12].send[0])}` },
      { txt: "O baterista, no Mon 3, pede mais baixo. Toque em Mon 3 na tela.", nota: "Dá para trocar de retorno direto, sem sair.", vista: v, alvo: so("snd-2"), feito: (s) => s.sof === 2 },
      { txt: "Suba o baixo (fader 4) até a marca 0.", vista: v, alvo: so("fader-3"), feito: (s) => s.ch[11].send[2] >= 0.7,
        conta: (s) => `Baixo no Mon 3: ${textoDb(s.ch[11].send[2])}` },
      { txt: "O Mon 2 está alto demais no palco. Toque em Mon 2 na tela.", vista: v, alvo: so("snd-1"), feito: (s) => s.sof === 1 },
      { txt: "Baixe o MAIN até perto de 0.", nota: "Neste modo, o fader MAIN é o volume geral do retorno, não o PA (manual p.20).", vista: v, alvo: so("fader-main"), feito: (s) => s.mix[1].f <= 0.8,
        conta: (s) => `Volume geral do Mon 2: ${textoDb(s.mix[1].f)}` },
      { txt: "Pronto. Toque em Sair para o MAIN voltar a ser o PA.", nota: "Antes de sair da mesa, sempre confira que não ficou nenhum retorno selecionado.", vista: v, alvo: so("snd-exit"), feito: (s) => s.sof === null },
    ],
  },
  { id: "livre", nome: "Modo livre", curto: "Livre", prep() {}, passos: [] },
];

export const IDS_LICAO = LICOES.map((l) => l.id);
export const licaoPorId = (id: string): Licao => LICOES.find((l) => l.id === id) ?? LICOES[0];

export interface Treino {
  licaoId: string;
  passo: number;
  concluida: boolean;
  // Passo cumprido, mostrando "Certo." antes de avançar
  aguardando: boolean;
  msg: Mensagem | null;
  s: Estado;
  feitas: string[];
}

export type AcaoTreino =
  | { tipo: "abrir"; id: string; agora: number }
  | { tipo: "mesa"; acao: AcaoMesa; agora: number }
  | { tipo: "avancar" }
  | { tipo: "pular" }
  | { tipo: "feitas"; ids: string[] };

export function criarTreino(id: string, agora: number, feitas: string[]): Treino {
  const licao = licaoPorId(id);
  const s = estadoBase();
  s.ultOp = agora;
  licao.prep(s);
  return { licaoId: licao.id, passo: 0, concluida: false, aguardando: false, msg: null, s, feitas };
}

// O que a ação disse continua junto do "Certo.", em vez de ser trocado por ele
function checar(t: Treino, daAcao?: Mensagem | null): Treino {
  if (t.concluida || t.aguardando) return t;
  const p = licaoPorId(t.licaoId).passos[t.passo];
  if (!p?.feito(t.s)) return t;
  const texto = daAcao && daAcao.k !== "erro" ? `Certo. ${daAcao.t}` : "Certo.";
  return { ...t, aguardando: true, msg: { t: texto, k: "ok" } };
}

// Quanto tempo o "Certo." fica na tela antes do próximo passo: mais quando há o que ler
export const tempoDoCerto = (msg: Mensagem | null) => (msg && msg.t.length > "Certo.".length ? 2600 : 1100);

export function reduzirTreino(t: Treino, a: AcaoTreino): Treino {
  switch (a.tipo) {
    case "abrir":
      return criarTreino(a.id, a.agora, t.feitas);
    case "mesa": {
      const r = reduzir(t.s, a.acao, a.agora);
      if (r.s === t.s && r.msg === undefined) return t;
      // Enquanto o "Certo." está na tela, outra ação não o apaga antes da leitura
      if (t.aguardando) return { ...t, s: r.s };
      return checar({ ...t, s: r.s, msg: r.msg === undefined ? t.msg : r.msg }, r.msg);
    }
    case "avancar": {
      if (!t.aguardando) return t;
      const licao = licaoPorId(t.licaoId);
      const passo = t.passo + 1;
      const concluida = passo >= licao.passos.length;
      const feitas = concluida && !t.feitas.includes(t.licaoId) ? [...t.feitas, t.licaoId] : t.feitas;
      return checar({ ...t, passo, concluida, feitas, aguardando: false, msg: null, s: { ...t.s, cabo: null } });
    }
    case "pular": {
      if (t.concluida) return t;
      const passo = t.passo + 1;
      const concluida = passo >= licaoPorId(t.licaoId).passos.length;
      return checar({ ...t, passo, concluida, aguardando: false, msg: null, s: { ...t.s, cabo: null } });
    }
    case "feitas":
      return { ...t, feitas: a.ids };
  }
}

// O que destacar agora na mesa
export function alvosAtuais(t: Treino): string[] {
  if (t.concluida) return [];
  const p = licaoPorId(t.licaoId).passos[t.passo];
  if (!p) return [];
  if (p.vista && p.vista !== t.s.vista) return [`v-${p.vista}`];
  if (!p.alvo) return [];
  const ids = p.alvo(t.s);
  // Lista de presets fechada: o alvo passa a ser o nome do preset
  return ids.some((id) => id.startsWith("cn-")) && t.s.tela !== "cena" ? ["tb-cena"] : ids;
}

// Cabos à mão na bandeja, conforme a vista e a lição
export function cabosNaBandeja(s: Estado, licaoId: string): { id: string; nome: string; ligado: boolean; cor: string }[] {
  if (s.vista === "rear") {
    const cabos = [
      { id: "dc", nome: "Energia", ligado: s.dc, cor: "#ef5350" },
      { id: "rede", nome: "Cabo de rede", ligado: s.dante === "primary", cor: "#5cb8ff" },
    ];
    return licaoId === "cabos" ? cabos : [...cabos, { id: "usb", nome: "Pendrive", ligado: s.usb, cor: "#ffb02e" }];
  }
  if (s.vista === "rack") {
    return ENTRADAS.map((e, i) => ({ id: `m${i}`, nome: e.nome, ligado: s.mics.includes(i), cor: "#35d07f" }));
  }
  return licaoId === "gravar" || licaoId === "livre" ? [{ id: "usb", nome: "Pendrive", ligado: s.usb, cor: "#ffb02e" }] : [];
}
