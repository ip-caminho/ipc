import { alvosAtuais, licaoPorId, type Treino } from "./licoes";
import type { Vista } from "./simulador";

/* No celular a mesa aparece por partes: cada zona é um pedaço da mesa real */
export type Zona = "tela" | "faders" | "atras" | "rack";

export const ZONAS: readonly { id: Zona; nome: string }[] = [
  { id: "tela", nome: "Tela" },
  { id: "faders", nome: "Faders" },
  { id: "atras", nome: "Atrás" },
  { id: "rack", nome: "Rack" },
];

const POR_PREFIXO: readonly [string, Zona][] = [
  ["fader-", "faders"],
  ["on-", "faders"],
  ["sel-", "faders"],
  ["bk-", "faders"],
  ["tb-", "tela"],
  ["cn-", "tela"],
  ["rc-", "tela"],
  ["snd-", "tela"],
  ["usb-top", "tela"],
  ["c-usb", "tela"],
  ["v-top", "tela"],
  ["p-", "atras"],
  ["c-dc", "atras"],
  ["c-rede", "atras"],
  ["v-rear", "atras"],
  ["r-", "rack"],
  ["c-m", "rack"],
  ["v-rack", "rack"],
];

export function zonaDoAlvo(id: string): Zona | null {
  return POR_PREFIXO.find(([p]) => id.startsWith(p))?.[1] ?? null;
}

// Onde está o que o passo pede; null quando não há o que destacar (modo livre, lição concluída)
export function zonaDoPasso(t: Treino): Zona | null {
  const alvo = alvosAtuais(t)[0];
  if (alvo) return zonaDoAlvo(alvo);
  // Passo de espera (a tela iniciando, a gravação correndo): mostra onde aquilo acontece
  const vista = t.concluida ? undefined : licaoPorId(t.licaoId).passos[t.passo]?.vista;
  return vista ? (zonaDaVista(vista) ?? "tela") : null;
}

export const zonaDaVista = (v: Vista): Zona | null => (v === "rear" ? "atras" : v === "rack" ? "rack" : null);
export const vistaDaZona = (z: Zona): Vista => (z === "atras" ? "rear" : z === "rack" ? "rack" : "top");
