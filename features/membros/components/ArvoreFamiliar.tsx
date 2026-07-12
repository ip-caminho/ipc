"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hierarchy, tree } from "d3-hierarchy";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition"; // habilita selection.transition()
import { ExternalLink, ArrowLeft, Plus, Minus, Maximize2, Locate } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components/ui/avatar";
import { cn } from "@/shared/lib/utils/cn";

// Espelha o retorno de convex/membros/familia.ts (redeFamiliar). Tipos locais —
// nao ha `Doc<"pessoas">` no IPC; a arvore e derivada de entidades + vinculos.
export type PessoaLite = {
  _id: Id<"entidades">;
  nomeCompleto: string;
  foto?: string;
  sexo?: "M" | "F";
  dataNascimento?: string;
  status: string;
  membroId?: Id<"membros">;
};

export type VinculoLite = {
  pessoaA: Id<"entidades">;
  pessoaB: Id<"entidades">;
  tipo: "conjuge" | "pai_filho";
};

type Rede = {
  pessoas: PessoaLite[];
  vinculos: VinculoLite[];
};

const UNIT_W = 300;
const NODE_H = 104; // circulo (foto) + nome embaixo
const LEVEL_H = 168;
const MEMBRO_W = 96; // largura de cada pessoa no no (w-24)
const CIRCULO = 64; // diametro do avatar (size-16)

type Unit = { key: string; membros: PessoaLite[]; anchor: string };
type NodeData = { key: string; children: NodeData[] };
type UnitPos = { x: number; y: number; unit: Unit };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ArvoreFamiliar({
  rede,
  focusId,
  altura = "h-[70vh]",
}: {
  rede: Rede;
  focusId?: Id<"entidades"> | null;
  // Classe de altura do canvas (menor quando embutido no perfil).
  altura?: string;
}) {
  const router = useRouter();
  // Zoom aplicado ao container; linhas em SVG, nos em HTML sobreposto.
  const containerRef = useRef<HTMLDivElement>(null);
  const linksGRef = useRef<SVGGElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);

  // Foco em ESTADO (nao navega): clicar empilha, "voltar" desempilha. Mudar o
  // foco so transiciona opacidade + desliza o zoom — a arvore nao re-monta.
  const [pilha, setPilha] = useState<string[]>(focusId ? [focusId] : []);
  const [prevFocus, setPrevFocus] = useState(focusId);
  if (focusId !== prevFocus) {
    setPrevFocus(focusId);
    setPilha(focusId ? [focusId] : []);
  }
  const foco = pilha[pilha.length - 1] ?? null;
  const podeVoltar = pilha.length > 1;

  // Layout (posicoes) depende so da rede — re-focar nao recalcula.
  const layout = useMemo(() => {
    const { pessoas, vinculos } = rede;
    const pById = new Map(pessoas.map((p) => [p._id as string, p]));
    const has = (id: string) => pById.has(id);

    const conjugeDe = new Map<string, string>();
    for (const vlink of vinculos) {
      if (vlink.tipo !== "conjuge") continue;
      if (!conjugeDe.has(vlink.pessoaA)) conjugeDe.set(vlink.pessoaA, vlink.pessoaB);
      if (!conjugeDe.has(vlink.pessoaB)) conjugeDe.set(vlink.pessoaB, vlink.pessoaA);
    }

    const paisDe = new Map<string, string[]>();
    for (const vlink of vinculos) {
      if (vlink.tipo !== "pai_filho") continue;
      const arr = paisDe.get(vlink.pessoaB) ?? [];
      arr.push(vlink.pessoaA);
      paisDe.set(vlink.pessoaB, arr);
    }
    const temPais = (id: string) => (paisDe.get(id) ?? []).some(has);

    // Ordem do casal na caixa: homem a esquerda; senao ordem estavel por id.
    const sexoDe = (id: string) => pById.get(id)?.sexo;
    const ordenarCasal = (a: string, b: string): [string, string] => {
      if (sexoDe(a) === "M" && sexoDe(b) !== "M") return [a, b];
      if (sexoDe(b) === "M" && sexoDe(a) !== "M") return [b, a];
      return a < b ? [a, b] : [b, a];
    };

    const unidadeDe = new Map<string, string>();
    const unidades = new Map<string, Unit>();
    const visitado = new Set<string>();
    for (const p of pessoas) {
      const pid = p._id as string;
      if (visitado.has(pid)) continue;
      const conj = conjugeDe.get(pid);
      let ids: string[];
      if (conj && has(conj) && !visitado.has(conj)) {
        ids = ordenarCasal(pid, conj);
      } else {
        ids = [pid];
      }
      const key = ids.join("+");
      const membros = ids
        .map((id) => pById.get(id))
        .filter((m): m is PessoaLite => Boolean(m));
      // Ancora = membro do casal que conecta aos pais (tem vinculo pai_filho para
      // cima). Desempate (ambos com pais) replica chefeDoCasal: homem, senao id menor.
      const comPais = ids.filter(temPais);
      const anchor =
        comPais.length > 1
          ? (comPais.find((id) => sexoDe(id) === "M") ??
            [...comPais].sort()[0])
          : (comPais[0] ?? ids[0]);
      unidades.set(key, { key, membros, anchor });
      for (const id of ids) {
        unidadeDe.set(id, key);
        visitado.add(id);
      }
    }

    const childrenU = new Map<string, string[]>();
    const temPaiU = new Set<string>();
    for (const u of unidades.values()) {
      const paiPresente = (paisDe.get(u.anchor) ?? []).find(has);
      if (!paiPresente) continue;
      const pk = unidadeDe.get(paiPresente);
      if (!pk || pk === u.key) continue;
      const arr = childrenU.get(pk) ?? [];
      arr.push(u.key);
      childrenU.set(pk, arr);
      temPaiU.add(u.key);
    }

    const raizes = [...unidades.keys()].filter((k) => !temPaiU.has(k));
    const build = (k: string): NodeData => ({
      key: k,
      children: (childrenU.get(k) ?? []).map(build),
    });
    const rootData: NodeData = { key: "__root__", children: raizes.map(build) };

    const root = hierarchy<NodeData>(rootData, (d) => d.children);
    tree<NodeData>()
      .nodeSize([UNIT_W, LEVEL_H])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.3))(root);

    const upos = new Map<string, UnitPos>();
    for (const node of root.descendants()) {
      if (node.data.key === "__root__") continue;
      const unit = unidades.get(node.data.key);
      if (!unit) continue;
      upos.set(node.data.key, {
        x: node.x ?? 0,
        y: (node.y ?? 0) - LEVEL_H,
        unit,
      });
    }

    const links: {
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      sourceKey: string;
      targetKey: string;
    }[] = [];
    for (const node of root.links()) {
      if (node.source.data.key === "__root__") continue;
      const s = upos.get(node.source.data.key);
      const t = upos.get(node.target.data.key);
      if (s && t)
        links.push({
          sx: s.x,
          sy: s.y,
          tx: t.x,
          ty: t.y,
          sourceKey: node.source.data.key,
          targetKey: node.target.data.key,
        });
    }

    const units = [...upos.values()];

    // Conector do casal: linha horizontal ligando os circulos, no nivel do
    // centro deles.
    const conectores = units
      .filter((u) => u.unit.membros.length >= 2)
      .map((u) => ({
        key: u.unit.key,
        x1: u.x - MEMBRO_W / 2,
        x2: u.x + MEMBRO_W / 2,
        y: u.y - NODE_H / 2 + CIRCULO / 2,
      }));

    const xs = units.map((u) => u.x);
    const ys = units.map((u) => u.y);
    const bounds = {
      minX: Math.min(...xs, 0) - UNIT_W / 2,
      maxX: Math.max(...xs, 0) + UNIT_W / 2,
      minY: Math.min(...ys, 0),
      maxY: Math.max(...ys, 0),
    };

    return { units, links, conectores, pById, conjugeDe, bounds };
  }, [rede]);

  // Ativos (nucleo do foco) e a caixa em destaque — dependem do foco, recalculam
  // a cada clique sem recriar o layout. Sem tabela de nucleos: o "nucleo" do foco
  // e ele + o conjuge; ficam nitidos tambem os filhos biologicos (descendentes
  // diretos), mesmo casados. `unidadeAtiva` = a caixa tem algum ativo.
  const { ativaPessoa, unidadeAtiva, destaqueKey } = useMemo(() => {
    const membrosNucleo = new Set<string>();
    if (foco) {
      membrosNucleo.add(foco);
      const conj = layout.conjugeDe.get(foco);
      if (conj) membrosNucleo.add(conj);
    }
    const descendentes = new Set<string>();
    for (const vlink of rede.vinculos) {
      if (vlink.tipo === "pai_filho" && membrosNucleo.has(vlink.pessoaA))
        descendentes.add(vlink.pessoaB);
    }
    const ativaPessoa = (id: string) =>
      !foco || membrosNucleo.has(id) || descendentes.has(id);
    const unidadeAtiva = new Map<string, boolean>();
    let destaque: string | null = null;
    for (const u of layout.units) {
      unidadeAtiva.set(u.unit.key, u.unit.membros.some((m) => ativaPessoa(m._id)));
      if (foco && u.unit.membros.some((m) => m._id === foco))
        destaque = u.unit.key;
    }
    return { ativaPessoa, unidadeAtiva, destaqueKey: destaque };
  }, [foco, layout, rede]);

  // Transform alvo: centra no foco (k=0.9) ou enquadra tudo (fit) sem foco.
  function transformAlvo(fit = false, alvoId: string | null = foco) {
    const el = containerRef.current!;
    // getBoundingClientRect: clientWidth/Height retorna 0 para <svg> no Safari iOS.
    const rect = el.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    const fu = !fit && alvoId
      ? layout.units.find((u) => u.unit.membros.some((m) => m._id === alvoId))
      : undefined;
    if (fu) {
      const k = 0.9;
      return zoomIdentity.translate(w / 2 - fu.x * k, h / 2 - fu.y * k).scale(k);
    }
    const { bounds } = layout;
    const margin = 80;
    const gw = bounds.maxX - bounds.minX + margin * 2;
    const gh = bounds.maxY - bounds.minY + margin * 2 + NODE_H;
    const k = Math.min(w / gw, h / gh, 1.1);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return zoomIdentity.translate(w / 2 - cx * k, h / 2 - cy * k).scale(k);
  }

  // Setup do zoom (uma vez). Aplica o mesmo transform as linhas (SVG) e aos nos
  // (HTML). foreignObject nao acompanha o transform do <g> no Safari iOS, por
  // isso os nos sao HTML sobreposto transformado via CSS.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = select(containerRef.current);
    const zb = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.15, 2.5])
      // No mobile, 1 dedo rola a pagina; so pinca (2 dedos) da zoom.
      .filter((event: Event) => {
        if (event.type === "wheel") return !(event as WheelEvent).button;
        if (event.type.startsWith("touch"))
          return (event as TouchEvent).touches.length >= 2;
        return !(event as MouseEvent).button;
      })
      .on("zoom", (event) => {
        const t = event.transform;
        linksGRef.current?.setAttribute("transform", t.toString());
        if (nodesRef.current)
          nodesRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
      });
    container.call(zb);
    zoomRef.current = zb;
    return () => {
      container.on(".zoom", null);
    };
  }, []);

  // Posiciona: instantaneo quando a rede muda; animado quando so o foco muda.
  const ultimo = useRef<{ layout: unknown; foco: string | null }>({
    layout: null,
    foco: null,
  });
  // Alvo logico da camera, para re-enquadrar quando o canvas muda de tamanho.
  const cameraRef = useRef<{ fit: boolean; alvo: string | null }>({
    fit: true,
    alvo: null,
  });
  useEffect(() => {
    if (!containerRef.current || !zoomRef.current) return;
    const el = select(containerRef.current);
    const mudouLayout = ultimo.current.layout !== layout;
    const mudouFoco = ultimo.current.foco !== foco;
    if (mudouLayout) {
      cameraRef.current = { fit: true, alvo: null };
      el.call(zoomRef.current.transform, transformAlvo(true));
    } else if (mudouFoco && foco) {
      cameraRef.current = { fit: false, alvo: foco };
      el.transition().duration(450).call(zoomRef.current.transform, transformAlvo());
    }
    ultimo.current = { layout, foco };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, foco]);

  // Re-enquadra quando o canvas muda de tamanho (mobile: largura correta so chega
  // apos o layout e muda na rotacao).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!zoomRef.current) return;
      const c = cameraRef.current;
      select(el).call(zoomRef.current.transform, transformAlvo(c.fit, c.alvo));
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Controles de zoom.
  function aplicarZoom(fator: number) {
    if (containerRef.current && zoomRef.current)
      select(containerRef.current).call(zoomRef.current.scaleBy, fator);
  }
  function enquadrar() {
    cameraRef.current = { fit: true, alvo: null };
    if (containerRef.current && zoomRef.current)
      select(containerRef.current)
        .transition()
        .duration(450)
        .call(zoomRef.current.transform, transformAlvo(true));
  }
  function recentrarNaPessoa() {
    if (!focusId || !containerRef.current || !zoomRef.current) return;
    setPilha([focusId]);
    cameraRef.current = { fit: false, alvo: focusId };
    select(containerRef.current)
      .transition()
      .duration(450)
      .call(zoomRef.current.transform, transformAlvo(false, focusId));
  }

  if (layout.units.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Sem vinculos familiares ainda.
      </p>
    );
  }

  const link = (l: { sx: number; sy: number; tx: number; ty: number }) => {
    const mid = (l.sy + NODE_H / 2 + (l.ty - NODE_H / 2)) / 2;
    return `M${l.sx},${l.sy + NODE_H / 2} V${mid} H${l.tx} V${l.ty - NODE_H / 2}`;
  };

  return (
    <div className="relative">
      {podeVoltar && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-3 top-3 z-10"
          onClick={() => setPilha((p) => p.slice(0, -1))}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      )}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full touch-pan-y overflow-hidden rounded-xl border bg-muted/20",
          altura,
        )}
        role="group"
        aria-label="Arvore familiar"
      >
        {/* fundo: clicar no vazio limpa a selecao (pan continua via arrastar) */}
        <div className="absolute inset-0" onClick={() => setPilha([])} />

        {/* linhas (SVG nativo) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <g ref={linksGRef}>
            {layout.links.map((l, i) => {
              const ativa =
                (unidadeAtiva.get(l.sourceKey) ?? true) &&
                (unidadeAtiva.get(l.targetKey) ?? true);
              return (
                <path
                  key={`l${i}`}
                  d={link(l)}
                  className={cn(
                    "fill-none stroke-muted-foreground/50 transition-opacity duration-500",
                    !ativa && "opacity-15",
                  )}
                  strokeWidth={1.5}
                />
              );
            })}
            {layout.conectores.map((c) => (
              <line
                key={`c${c.key}`}
                x1={c.x1}
                y1={c.y}
                x2={c.x2}
                y2={c.y}
                className={cn(
                  "stroke-muted-foreground/50 transition-opacity duration-500",
                  !(unidadeAtiva.get(c.key) ?? true) && "opacity-15",
                )}
                strokeWidth={1.5}
              />
            ))}
          </g>
        </svg>

        {/* nos (HTML sobreposto) — acompanham o transform via CSS (Safari) */}
        <div
          ref={nodesRef}
          className="pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform"
        >
          {layout.units.map((u) => (
            <div
              key={u.unit.key}
              className="absolute -translate-x-1/2"
              style={{ left: u.x, top: u.y - NODE_H / 2 }}
            >
              <div className="flex items-start">
                {u.unit.membros.map((p) => (
                  <div key={p._id} className="flex items-start">
                    <div
                      className={cn(
                        "group/card pointer-events-auto flex w-24 flex-col items-center gap-1.5 transition-opacity duration-500",
                        !ativaPessoa(p._id) && "opacity-20",
                      )}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPilha((pl) => [...pl, p._id])}
                          aria-label={p.nomeCompleto}
                          className="block rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Avatar
                            className={cn(
                              "size-16 ring-2 ring-transparent transition group-hover/card:ring-border",
                              p._id === foco &&
                                "ring-primary ring-offset-2 ring-offset-background",
                              u.unit.key === destaqueKey &&
                                p._id !== foco &&
                                "ring-primary/40",
                            )}
                          >
                            <AvatarImage src={p.foto} alt={p.nomeCompleto} />
                            <AvatarFallback>{initials(p.nomeCompleto)}</AvatarFallback>
                          </Avatar>
                        </button>
                        {p.membroId && (
                          <button
                            type="button"
                            aria-label="Abrir perfil"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/membros/${p.membroId}`);
                            }}
                            className="absolute -right-1 -top-1 rounded-full bg-background/90 p-1 text-muted-foreground opacity-0 shadow-sm transition hover:text-foreground focus-visible:opacity-100 group-hover/card:opacity-100"
                          >
                            <ExternalLink className="size-3" />
                          </button>
                        )}
                      </div>
                      <span className="flex flex-col items-center leading-tight">
                        <span className="max-w-[92px] truncate text-xs font-medium">
                          {p.nomeCompleto}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => aplicarZoom(1.3)}
          aria-label="Aproximar"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => aplicarZoom(1 / 1.3)}
          aria-label="Afastar"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={enquadrar}
          aria-label="Enquadrar"
        >
          <Maximize2 className="size-4" />
        </Button>
        {focusId && (
          <Button
            variant="outline"
            size="icon"
            onClick={recentrarNaPessoa}
            aria-label="Recentrar na pessoa"
          >
            <Locate className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
