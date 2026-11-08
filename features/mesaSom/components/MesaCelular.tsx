"use client";

import { useState, type ReactNode } from "react";
import { Cable, ChevronDown, Monitor, Server, SlidersVertical, Speaker } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/shared/components/ui/drawer";
import { cn } from "@/shared/lib/utils/cn";
import type { IdCaixa } from "../lib/config";
import { LICOES, licaoPorId, type Treino } from "../lib/licoes";
import type { AcaoMesa, Estado } from "../lib/simulador";
import { vistaDaZona, zonaDaVista, zonaDoPasso, ZONAS, type Zona } from "../lib/zonas";
import { FadersCelular } from "./FadersCelular";
import { MapaPalco, NiveisCaixas } from "./MapaPalco";
import { MiniMapaMesa } from "./MiniMapaMesa";
import { FendaUsb, PlacaHome } from "./PainelSuperior";
import { PainelTraseiro } from "./PainelTraseiro";
import { PassoAPasso } from "./PassoAPasso";
import { RackPalco } from "./RackPalco";
import { TelaTouch } from "./TelaTouch";
import st from "./mesa.module.css";

const ICONE: Record<Zona, typeof Monitor> = { tela: Monitor, faders: SlidersVertical, atras: Cable, rack: Server };
// Ids que os passos usam para pedir a troca de lado da mesa
const ID_ABA: Partial<Record<Zona, string>> = { tela: "v-top", atras: "v-rear", rack: "v-rack" };
const ehDeCima = (z: Zona | null): z is "tela" | "faders" => z === "tela" || z === "faders";

/* Celular em pé: a mesa aparece por zonas, e a zona acompanha o passo */
export function MesaCelular({ treino, s, sig, niveis, agora, agir, alvos, bandeja, conferir, recomecar, pular, abrirLicao, classeFontes }: {
  treino: Treino;
  s: Estado;
  sig: readonly number[];
  niveis: Record<IdCaixa, number>;
  agora: number;
  agir: (acao: AcaoMesa) => void;
  alvos: ReadonlySet<string>;
  bandeja: ReactNode;
  conferir: ReactNode;
  recomecar: () => void;
  pular: () => void;
  abrirLicao: (id: string) => void;
  classeFontes?: string;
}) {
  const [licoesAberto, setLicoesAberto] = useState(false);
  const [salaoAberto, setSalaoAberto] = useState(false);
  // Tela ou faders escolhidos à mão valem só até o passo mudar
  const [escolha, setEscolha] = useState<{ zona: "tela" | "faders"; chave: string } | null>(null);

  const chave = `${treino.licaoId}:${treino.passo}:${treino.concluida}`;
  const doPasso = zonaDoPasso(treino);
  const zona: Zona =
    zonaDaVista(s.vista) ??
    (escolha?.chave === chave ? escolha.zona : ehDeCima(doPasso) ? doPasso : (escolha?.zona ?? "tela"));

  function irPara(z: Zona) {
    if (ehDeCima(z)) setEscolha({ zona: z, chave });
    if (vistaDaZona(z) !== s.vista) agir({ tipo: "vista", vista: vistaDaZona(z) });
  }

  const licao = licaoPorId(treino.licaoId);
  const gaveta = cn(classeFontes, st.gaveta);

  return (
    <div className={st.cel}>
      <header className={st["cel-topo"]}>
        <button className={st["cel-licao"]} onClick={() => setLicoesAberto(true)} aria-haspopup="dialog">
          <span>Lição</span>
          <b>{licao.curto}</b>
          <ChevronDown aria-hidden="true" />
        </button>
        {/* Pular fica aqui em cima para a instrução ocupar menos altura; recomeçar é tocar na lição aberta */}
        {licao.passos.length > 0 && !treino.concluida ? (
          <button className={st["cel-pular"]} onClick={pular}>Pular passo</button>
        ) : (
          <span className={st["cel-titulo"]}>Treino da mesa de som</span>
        )}
      </header>

      <section className={st["cel-guia"]} aria-label="Instrução">
        <PassoAPasso treino={treino} agora={agora} aoRecomecar={recomecar} aoPular={pular} aoAbrir={abrirLicao} />
      </section>

      {/* Toque longo no fader não abre menu de copiar */}
      <section className={st["cel-zona"]} aria-label={`Mesa: ${ZONAS.find((z) => z.id === zona)?.nome}`} onContextMenu={(e) => e.preventDefault()}>
        <div className={st["cel-zona-cab"]}>
          <h2>{ZONAS.find((z) => z.id === zona)?.nome}</h2>
          <MiniMapaMesa zona={zona} />
        </div>

        {zona === "tela" && (
          <div className={cn(st["cel-tela"], st.mesa)}>
            <div className={st.moldura}>
              <TelaTouch s={s} sig={sig} niveis={niveis} agora={agora} agir={agir} alvos={alvos} />
            </div>
            <div className={st["cel-tela-lado"]}>
              <FendaUsb ligado={s.usb} alvo={alvos.has("usb-top")} agir={agir} />
              {bandeja}
              <PlacaHome agir={agir} />
            </div>
          </div>
        )}
        {zona === "faders" && (
          <div className={cn(st["cel-mesa"], st.mesa)}>
            <FadersCelular s={s} alvos={alvos} agir={agir} />
          </div>
        )}
        {zona === "atras" && (
          <>
            {bandeja}
            <PainelTraseiro s={s} agir={agir} alvos={alvos} />
          </>
        )}
        {zona === "rack" && (
          <>
            {bandeja}
            <RackPalco s={s} agir={agir} alvos={alvos} />
          </>
        )}
      </section>

      <div className={st["cel-base"]}>
        <NiveisCaixas s={s} niveis={niveis} agir={agir} />
        <nav className={st["cel-abas"]} aria-label="Partes da mesa">
          {ZONAS.map((z) => {
            const Icone = ICONE[z.id];
            return (
              <button
                key={z.id}
                id={ID_ABA[z.id]}
                aria-current={zona === z.id}
                className={cn(doPasso === z.id && zona !== z.id && st.alvo)}
                onClick={() => irPara(z.id)}
              >
                <Icone aria-hidden="true" />
                {z.nome}
              </button>
            );
          })}
          <button onClick={() => setSalaoAberto(true)} aria-haspopup="dialog">
            <Speaker aria-hidden="true" />
            Salão
          </button>
        </nav>
      </div>

      <Drawer open={licoesAberto} onOpenChange={setLicoesAberto}>
        <DrawerContent className={gaveta}>
          <DrawerHeader className={st["gaveta-cab"]}>
            <DrawerTitle>Lições</DrawerTitle>
            <DrawerDescription>O ponto verde marca as já feitas. Toque na lição aberta para recomeçá-la.</DrawerDescription>
          </DrawerHeader>
          <div className={st["gaveta-corpo"]}>
            <nav className={st["gaveta-licoes"]} aria-label="Lições">
              {LICOES.map((l, i) => (
                <button
                  key={l.id}
                  id={`licao-${l.id}`}
                  aria-current={l.id === treino.licaoId}
                  className={cn(treino.feitas.includes(l.id) && st.feita)}
                  onClick={() => {
                    setLicoesAberto(false);
                    if (l.id === treino.licaoId) recomecar();
                    else abrirLicao(l.id);
                  }}
                >
                  <span>{l.passos.length ? i + 1 : "–"}</span>
                  {l.nome}
                </button>
              ))}
            </nav>
            {conferir}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={salaoAberto} onOpenChange={setSalaoAberto}>
        <DrawerContent className={gaveta}>
          <DrawerHeader className={st["gaveta-cab"]}>
            <DrawerTitle>O que está tocando no salão</DrawerTitle>
            <DrawerDescription>Toque numa caixa, ou no nome dela embaixo, para ver a mistura que sai nela.</DrawerDescription>
          </DrawerHeader>
          <div className={st["gaveta-corpo"]}>
            <MapaPalco s={s} sig={sig} niveis={niveis} agir={agir} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
