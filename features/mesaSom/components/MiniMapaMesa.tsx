import { cn } from "@/shared/lib/utils/cn";
import type { Zona } from "../lib/zonas";
import st from "./mesa.module.css";

const ONDE: Record<Zona, string> = {
  tela: "a tela fica no alto, à esquerda",
  faders: "os faders ficam embaixo, na frente de quem opera",
  atras: "as portas ficam na traseira da mesa",
  rack: "o rack fica no palco, longe da mesa",
};

/* Silhueta da DM3 vista de cima, com o pedaço mostrado agora aceso: o celular mostra a mesa por partes */
export function MiniMapaMesa({ zona }: { zona: Zona }) {
  const a = (z: Zona) => cn(st["mm-parte"], zona === z && st["mm-aceso"]);
  return (
    <svg className={st["mini-mapa"]} viewBox="0 0 84 48" role="img" aria-label={`Na mesa real, ${ONDE[zona]}`}>
      <path className={st["mm-corpo"]} d="M4 6h52v38H4z" />
      <rect className={a("atras")} x="4" y="2" width="52" height="3" rx="1" />
      <rect className={a("tela")} x="8" y="9" width="32" height="15" rx="1" />
      <rect className={st["mm-parte"]} x="43" y="9" width="9" height="31" rx="1" />
      <rect className={a("faders")} x="8" y="27" width="32" height="13" rx="1" />
      <g className={a("rack")}>
        <rect x="64" y="10" width="16" height="30" rx="2" />
      </g>
      <path className={st["mm-cabo"]} d="M56 8 C 60 8, 60 14, 64 14" />
    </svg>
  );
}
