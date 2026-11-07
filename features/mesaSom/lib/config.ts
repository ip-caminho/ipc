// Mapa da igreja. Se a instalação mudar, este é o único arquivo a trocar.

export const COR = {
  voz: "#2fae86",
  cordas: "#8a4fc4",
  tecla: "#e0409a",
  pc: "#2b9be0",
  bat: "#d9822b",
  baixo: "#b8931d",
  livre: "#555a60",
  saida: "#3d6fb8",
  st: "#d9434a",
} as const;

export interface Entrada {
  nome: string;
  grupo: keyof typeof COR;
  // Nível típico da fonte, de 0 a 1, usado só para animar os medidores
  energia: number;
}

// Canal 1 e canal 2 são os da igreja; os demais são exemplos
export const ENTRADAS: readonly Entrada[] = [
  { nome: "Pastor", grupo: "voz", energia: 0.55 },
  { nome: "Sem fio", grupo: "voz", energia: 0.5 },
  { nome: "Vocal 1", grupo: "voz", energia: 0.6 },
  { nome: "Vocal 2", grupo: "voz", energia: 0.55 },
  { nome: "Violão", grupo: "cordas", energia: 0.55 },
  { nome: "Tecl L", grupo: "tecla", energia: 0.5 },
  { nome: "Tecl R", grupo: "tecla", energia: 0.5 },
  { nome: "PC", grupo: "pc", energia: 0.4 },
  { nome: "Bumbo", grupo: "bat", energia: 0.85 },
  { nome: "Caixa", grupo: "bat", energia: 0.75 },
  { nome: "Over", grupo: "bat", energia: 0.45 },
  { nome: "Baixo", grupo: "baixo", energia: 0.65 },
  { nome: "Guitarra", grupo: "cordas", energia: 0.7 },
  { nome: "Vocal 3", grupo: "voz", energia: 0.5 },
];

// Mix 1-3 = monitores; Mix 4-5 = rears; o resto não está em uso
export const SAIDAS = ["Mon 1", "Mon 2", "Mon 3", "Rear 1", "Rear 2", "Livre", "Matrix 1", "Matrix 2"] as const;

export const CAIXAS = [
  { id: "pa", nome: "PA" },
  { id: "m0", nome: "Mon 1" },
  { id: "m1", nome: "Mon 2" },
  { id: "m2", nome: "Mon 3" },
  { id: "m3", nome: "Rear 1" },
  { id: "m4", nome: "Rear 2" },
] as const;

export type IdCaixa = (typeof CAIXAS)[number]["id"];

// Posições medidas na escala impressa da mesa: [posição do fader, dB]
export const ESCALA: readonly (readonly [number, number])[] = [
  [1, 10],
  [0.883, 5],
  [0.766, 0],
  [0.646, -5],
  [0.532, -10],
  [0.415, -20],
  [0.292, -30],
  [0.169, -40],
  [0.114, -50],
  [0.052, -60],
];

export const ZERO = 0.766;

export interface Canal {
  f: number;
  on: boolean;
  send: number[];
  sendOn: boolean[];
}

export interface Saida {
  f: number;
  on: boolean;
}

export interface MisturaCena {
  ch: Canal[];
  mix: Saida[];
  main: Saida;
}

export interface Cena {
  id: string;
  nome: string;
  trava?: boolean;
  monta: (t: MisturaCena) => void;
}

function poe(ch: Canal[], i: number, f: number, m1: number, m2: number, m3: number) {
  ch[i].f = f;
  ch[i].on = true;
  ch[i].send = [m1, m2, m3, ZERO, ZERO, 0, 0, 0];
}

// Um preset por momento do culto. Os níveis são exemplos até serem ajustados de ouvido na mesa real.
export const CENAS: readonly Cena[] = [
  {
    id: "A00",
    nome: "Initial Data",
    trava: true,
    monta(t) {
      t.ch.forEach((c) => {
        c.on = true;
        c.send = [0, 0, 0, 0, 0, 0, 0, 0];
      });
      t.mix.forEach((m) => {
        m.f = 0;
        m.on = true;
      });
      t.main = { f: 0, on: true };
    },
  },
  {
    id: "A01",
    nome: "Louvor",
    monta(t) {
      // O vocalista canta no canal 2 (sem fio)
      poe(t.ch, 1, 0.532, 0.7, 0.5, 0.55);
      poe(t.ch, 2, 0.5, 0.65, 0.5, 0.4);
      poe(t.ch, 3, 0.5, 0.65, 0.5, 0.4);
      poe(t.ch, 13, 0.5, 0.65, 0.45, 0.4);
      poe(t.ch, 4, 0.7, 0.35, 0.7, 0.4);
      poe(t.ch, 5, 0.66, 0.45, 0.7, 0.4);
      poe(t.ch, 6, 0.66, 0.45, 0.7, 0.4);
      poe(t.ch, 8, 0.72, 0.2, 0.4, 0.7);
      poe(t.ch, 9, 0.7, 0.2, 0.4, 0.6);
      poe(t.ch, 10, 0.6, 0.15, 0.3, 0.45);
      poe(t.ch, 11, 0.7, 0.35, 0.5, 0.35);
      poe(t.ch, 12, 0.82, 0.6, 0.45, 0.45);
      t.mix[1].f = 0.85;
      t.mix[3].f = t.mix[4].f = 0.7;
      t.main.f = 0.75;
    },
  },
  {
    id: "A02",
    nome: "Chamada à adoração",
    monta(t) {
      poe(t.ch, 0, ZERO, 0.4, 0.4, 0.3);
      poe(t.ch, 1, 0.7, 0.4, 0.4, 0.3);
      poe(t.ch, 5, 0.5, 0.3, 0.4, 0.2);
      poe(t.ch, 6, 0.5, 0.3, 0.4, 0.2);
    },
  },
  {
    id: "A03",
    nome: "Confissão",
    monta(t) {
      poe(t.ch, 0, ZERO, 0.4, 0.4, 0.3);
      poe(t.ch, 5, 0.42, 0.3, 0.4, 0.2);
      poe(t.ch, 6, 0.42, 0.3, 0.4, 0.2);
    },
  },
  {
    id: "A04",
    nome: "Oração",
    monta(t) {
      poe(t.ch, 0, ZERO, 0.4, 0.4, 0.3);
      poe(t.ch, 5, 0.3, 0.2, 0.3, 0.1);
      poe(t.ch, 6, 0.3, 0.2, 0.3, 0.1);
    },
  },
  {
    id: "A05",
    nome: "Pregação",
    monta(t) {
      poe(t.ch, 0, ZERO, 0.3, 0.3, 0.3);
      poe(t.ch, 7, 0.5, 0.1, 0.1, 0.1);
      t.mix[0].f = t.mix[1].f = t.mix[2].f = 0.6;
    },
  },
  {
    id: "A06",
    nome: "Interação",
    monta(t) {
      // O sem fio roda pelo salão: nada dele nos monitores e pouco nas rears, para evitar microfonia
      poe(t.ch, 0, ZERO, 0.3, 0.3, 0.3);
      poe(t.ch, 1, ZERO, 0, 0, 0);
      t.ch[1].send[3] = t.ch[1].send[4] = 0.42;
      t.mix[0].f = t.mix[1].f = t.mix[2].f = 0.6;
    },
  },
];
