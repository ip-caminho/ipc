"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight, Church, Printer, BookOpen, Copy, Check, AArrowUp, AArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { useBibleLookup } from "@shared/bible/hooks/useBibleLookup";
import { BibleVersePreview } from "@shared/bible/components/BibleVersePreview";
import { renderLines } from "@features/louvor/lib/chordpro";
import { parseReference, formatReference } from "@shared/bible/lib/parser";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";

const EQUIPE_ORDER = ["PREGACAO", "ABERTURA", "CONFISSAO", "ORACAO", "AVISOS", "LOUVOR", "HOSPITALIDADE", "SOM", "MULTIMIDIA"] as const;

const FUNCAO_LABELS: Record<string, string> = {
  PREGACAO: "Palavra",
  ABERTURA: "Abertura",
  CONFISSAO: "Confissão",
  ORACAO: "Oração",
  AVISOS: "Avisos",
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimídia",
};

const PIX_CNPJ = "48792102000113";

function CopyPix() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(PIX_CNPJ);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors min-h-[44px]"
    >
      Pix (CNPJ): 48.792.102/0001-13
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}


function FontSizeControls({ fontSize, setFontSize }: { fontSize: number; setFontSize: (fn: (s: number) => number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={() => setFontSize((s) => Math.max(14, s - 2))}
      >
        <AArrowDown className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground w-6 text-center">{fontSize}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={() => setFontSize((s) => Math.min(32, s + 2))}
      >
        <AArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PalavraDrawer({ referencia }: { referencia: string }) {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const { loading, results, error } = useBibleLookup(open ? referencia : "");
  const parsed = parseReference(referencia);
  const nomeCompleto = parsed ? formatReference(parsed) : referencia;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/20 px-6 py-2.5 min-h-[44px] hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        {nomeCompleto}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-lg text-center">{nomeCompleto}</DrawerTitle>
          <FontSizeControls fontSize={fontSize} setFontSize={setFontSize} />
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
          <BibleVersePreview loading={loading} results={results} error={error} maxHeight="none" fontSize={fontSize} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function LouvorDrawer({ titulo, louvoresData }: { titulo: string; louvoresData: Array<{ titulo: string; conteudo?: string; tom?: string; artista?: string }> | undefined }) {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const data = louvoresData?.find((l) => l.titulo === titulo);

  if (!data?.conteudo) {
    return (
      <p className="text-sm text-blue-600/60 dark:text-blue-400/60 italic px-6 py-2.5 bg-blue-50/40 dark:bg-blue-950/10">
        ♪ {titulo}
      </p>
    );
  }

  const lines = renderLines(data.conteudo, false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 italic px-6 py-2.5 min-h-[44px] bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
      >
        ♪ {titulo}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-lg text-center italic">♪ {titulo}</DrawerTitle>
          {data.artista && <p className="text-base text-muted-foreground text-center">{data.artista}</p>}
          <FontSizeControls fontSize={fontSize} setFontSize={setFontSize} />
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto text-center">
          {lines.map((line, i) => {
            if (line.type === "empty") return <div key={i} className="h-4" />;
            if (line.type === "section") return <p key={i} className="font-semibold text-blue-500/70 mt-3 uppercase tracking-wider" style={{ fontSize: fontSize * 0.75 }}>{line.text}</p>;
            return <p key={i} className="leading-relaxed" style={{ fontSize }}>{line.text}</p>;
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function BoletimContent() {
  const [dataSelecionada, setDataSelecionada] = useState<string | undefined>();

  // @ts-ignore Convex TS2589
  const boletim = useQuery(api.escalas.queries.getBoletim, {
    data: dataSelecionada,
  });

  const titulosMusicas = useMemo(() => {
    if (!boletim?.louvores) return [];
    return boletim.louvores.filter((l: string) => !l.startsWith("---"));
  }, [boletim?.louvores]);

  // @ts-ignore Convex TS2589
  const louvoresData = useQuery(
    api.louvor.queries.getByTitulos,
    titulosMusicas.length > 0 ? { titulos: titulosMusicas } : "skip"
  );

  if (boletim === undefined) {
    return (
      <div className="flex justify-center py-12">
        <Skeleton className="w-full max-w-lg h-[600px] rounded-xl" />
      </div>
    );
  }

  if (boletim === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
        <Church className="h-12 w-12" />
        <p>Nenhum culto dominical cadastrado</p>
      </div>
    );
  }

  const parsedDate = parseISO(boletim.data);
  const dataFormatada = format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const getEscala = (funcao: string) =>
    boletim.escalas.filter((e: any) => e.funcao === funcao);

  return (
    <div className="flex flex-col items-center gap-4 pb-8 -mx-4 -mt-4 md:mx-0 md:mt-0">

      {/* Boletim */}
      <div className="w-full max-w-lg overflow-hidden">
        {/* Cabecalho com gradiente */}
        <div className="text-center py-8 px-6 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent border-b">
          <Church className="h-10 w-10 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
          <h1 className="text-lg font-semibold tracking-wide uppercase text-blue-800 dark:text-blue-200">
            Igreja Presbiteriana do Caminho
          </h1>
          <div className="mt-4">
            <p className="text-sm font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">
              Culto Dominical
            </p>
            <p className="text-lg mt-1 capitalize text-foreground">{dataFormatada}</p>
            <p className="text-base text-muted-foreground mt-0.5">{boletim.horario || "10:00"}h</p>
          </div>
        </div>

        {/* Liturgia */}
        <div className="py-6 space-y-5 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-600/70 dark:text-blue-400/70 px-6">
            Ordem do Culto
          </h2>
          <p className="text-xs text-muted-foreground/40">Toque nos itens destacados para ler o texto completo</p>

          {(() => {
            const louvores = boletim.louvores || [];
            const items: React.ReactNode[] = [];

            const ESCALA_MAP: Record<string, { label: string; funcao: string }> = {
              "Abertura": { label: "Abertura", funcao: "ABERTURA" },
              "Confissão": { label: "Confissão", funcao: "CONFISSAO" },
            };

            let pregacaoInserida = false;
            for (let i = 0; i < louvores.length; i++) {
              const item = louvores[i];
              if (item.startsWith("---")) {
                const label = item.slice(3);

                if (!pregacaoInserida && (label === "Ceia" || label === "Oferta")) {
                  const pregacao = getEscala("PREGACAO")[0];
                  if (pregacao) {
                    items.push(
                      <div key="pregacao" className="py-3 px-6 border-b border-border">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-foreground">Palavra</h3>
                          <p className="text-sm text-muted-foreground">{pregacao.membroNomeCompleto || pregacao.membroNome}</p>
                        </div>
                        {pregacao.passagemBiblica && (
                          <div className="mt-1">
                            <PalavraDrawer referencia={pregacao.passagemBiblica} />
                          </div>
                        )}
                      </div>
                    );
                  }
                  pregacaoInserida = true;
                }

                const escala = ESCALA_MAP[label];
                if (escala) {
                  const e = getEscala(escala.funcao)[0];
                  if (e) {
                    items.push(
                      <div key={`sep-${i}`} className="py-3 px-6 border-b border-border">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-foreground">{escala.label}</h3>
                          <p className="text-sm text-muted-foreground">{e.membroNomeCompleto || e.membroNome}</p>
                        </div>
                        {e.passagemBiblica && (
                          <div className="mt-1">
                            <PalavraDrawer referencia={e.passagemBiblica} />
                          </div>
                        )}
                      </div>
                    );
                    continue;
                  }
                }

                // Separador simples (Ceia, Oferta, etc.)
                if (label === "Oferta") {
                  items.push(
                    <div key={`sep-${i}`} className="py-3 px-6 border-b border-border text-left">
                      <h3 className="text-base font-semibold text-foreground">{label}</h3>
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        <CopyPix />
                        <p>Igreja Presbiteriana do Caminho</p>
                        <p>Santander (033) · Ag. 0108 · Cc. 13007643-7</p>
                      </div>
                    </div>
                  );
                } else {
                  items.push(
                    <div key={`sep-${i}`} className="py-3 px-6 border-b border-border">
                      <h3 className="text-base font-semibold text-foreground">{label}</h3>
                    </div>
                  );
                }

                // Após Oferta: coletar músicas restantes, depois Avisos + Bênção
                if (label === "Oferta") {
                  let j = i + 1;
                  while (j < louvores.length && !louvores[j].startsWith("---")) {
                    items.push(
                      <LouvorDrawer key={`m-${j}`} titulo={louvores[j]} louvoresData={louvoresData} />
                    );
                    j++;
                  }
                  i = j - 1;

                  items.push(
                    <div key="liturgia-avisos" className="py-3 px-6 border-b border-border text-left space-y-2">
                      <h3 className="text-base font-semibold text-foreground">Avisos</h3>
                      {boletim.avisos && boletim.avisos.length > 0 && (
                        boletim.avisos.map((aviso: any) => (
                          <p key={aviso._id} className="text-sm text-muted-foreground">• {aviso.titulo}</p>
                        ))
                      )}
                    </div>
                  );
                  items.push(
                    <div key="bencao" className="py-3 px-6">
                      <h3 className="text-base font-semibold text-foreground">Bênção Final</h3>
                    </div>
                  );
                }
              } else {
                items.push(
                  <LouvorDrawer key={`m-${i}`} titulo={item} louvoresData={louvoresData} />
                );
              }
            }

            if (!pregacaoInserida) {
              const pregacao = getEscala("PREGACAO")[0];
              if (pregacao) {
                items.push(
                  <div key="pregacao" className="py-3 px-6 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-foreground">Palavra</h3>
                      <p className="text-sm text-muted-foreground">{pregacao.membroNomeCompleto || pregacao.membroNome}</p>
                    </div>
                    {pregacao.passagemBiblica && (
                      <div className="mt-1">
                        <PalavraDrawer referencia={pregacao.passagemBiblica} />
                      </div>
                    )}
                  </div>
                );
              }
            }

            if (!louvores.some((l) => l.startsWith("---")) && louvores.length > 0) {
              for (const l of louvores) {
                if (!l.startsWith("---")) {
                  items.push(
                    <LouvorDrawer key={`fb-${l}`} titulo={l} louvoresData={louvoresData} />
                  );
                }
              }
            }

            return items;
          })()}
        </div>

        {/* Equipe */}
        {(() => {
          const pessoas: Array<{ nome: string; funcao: string; foto?: string }> = [];
          const seen = new Set<string>();

          for (const funcao of EQUIPE_ORDER) {
            for (const e of getEscala(funcao)) {
              const nome = (e as any).membroNome;
              const key = `${funcao}-${nome}`;
              if (seen.has(key)) continue;
              seen.add(key);
              pessoas.push({
                nome,
                funcao: FUNCAO_LABELS[funcao] || funcao,
                foto: (e as any).membroFoto,
              });
            }
          }

          if (pessoas.length === 0) return null;

          return (
            <div className="px-6 py-5 border-t space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Equipe
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {pessoas.map((p, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <Avatar className="h-12 w-12">
                      {p.foto && <AvatarImage src={p.foto} />}
                      <AvatarFallback className="text-sm bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        {p.nome?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium text-center leading-tight">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.funcao}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Rodape */}
        <div className="text-center py-4 border-t bg-gradient-to-t from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent">
          <p className="text-xs text-muted-foreground">
            &ldquo;Alegrei-me quando me disseram: Vamos à Casa do Senhor&rdquo; — Salmo 122:1
          </p>
        </div>
      </div>
    </div>
  );
}
