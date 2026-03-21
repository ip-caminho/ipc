"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight, Church, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";

const LITURGIA_ORDER = ["ABERTURA", "CONFISSAO", "LOUVOR", "PREGACAO"] as const;
const EQUIPE_ORDER = ["HOSPITALIDADE", "SOM", "MULTIMIDIA"] as const;

const FUNCAO_LABELS: Record<string, string> = {
  ABERTURA: "Abertura",
  CONFISSAO: "Confissão",
  PREGACAO: "Palavra",
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimídia",
};

export default function BoletimPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string | undefined>();

  // @ts-ignore Convex TS2589
  const boletim = useQuery(api.escalas.queries.getBoletim, {
    data: dataSelecionada,
  });

  if (boletim === undefined) {
    return (
      <ModuloGuard modulo="boletim">
      <div className="flex justify-center py-12">
        <Skeleton className="w-full max-w-lg h-[600px] rounded-xl" />
      </div>
      </ModuloGuard>
    );
  }

  if (boletim === null) {
    return (
      <ModuloGuard modulo="boletim">
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
        <Church className="h-12 w-12" />
        <p>Nenhum culto dominical cadastrado</p>
      </div>
      </ModuloGuard>
    );
  }

  const parsedDate = parseISO(boletim.data);
  const dataFormatada = format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const getEscala = (funcao: string) =>
    boletim.escalas.filter((e: any) => e.funcao === funcao);

  return (
    <ModuloGuard modulo="boletim">
    <div className="flex flex-col items-center gap-4 pb-8">
      {/* Navegacao */}
      <div className="flex items-center gap-4 w-full max-w-lg print:hidden">
        <Button
          variant="ghost"
          size="icon"
          disabled={!boletim.navegacao.anterior}
          onClick={() => setDataSelecionada(boletim.navegacao.anterior!)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimir
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          disabled={!boletim.navegacao.proximo}
          onClick={() => setDataSelecionada(boletim.navegacao.proximo!)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Boletim */}
      <div className="w-full max-w-lg border rounded-xl bg-card shadow-sm print:shadow-none print:border-0">
        {/* Cabecalho */}
        <div className="text-center py-8 px-6 border-b">
          <Church className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h1 className="text-lg font-semibold tracking-wide uppercase text-primary">
            Igreja Presbiteriana do Caminho
          </h1>
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Culto Dominical
            </p>
            <p className="text-base mt-1 capitalize">{dataFormatada}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{boletim.horario || "10:00"}h</p>
          </div>
        </div>

        {/* Liturgia */}
        <div className="px-6 py-6 space-y-5 text-center">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Ordem do Culto
          </h2>

          {LITURGIA_ORDER.map((funcao) => {
            const escalas = getEscala(funcao);

            if (funcao === "LOUVOR") {
              const louvores = boletim.louvores || [];
              if (louvores.length === 0 && escalas.length === 0) return null;
              return (
                <div key={funcao} className="space-y-1.5">
                  <h3 className="text-sm font-semibold">{FUNCAO_LABELS[funcao]}</h3>
                  {louvores.length > 0 ? (
                    <div className="space-y-0.5">
                      {louvores.map((l: string, i: number) => (
                        <p key={i} className="text-sm text-muted-foreground">{l}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">—</p>
                  )}
                  {escalas.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {escalas.map((e: any) => e.membroNomeCompleto || e.membroNome).join(", ")}
                    </p>
                  )}
                </div>
              );
            }

            const escala = escalas[0];
            if (!escala) return null;

            return (
              <div key={funcao} className="space-y-0.5">
                <h3 className="text-sm font-semibold">{FUNCAO_LABELS[funcao]}</h3>
                {escala.passagemBiblica && (
                  <p className="text-sm">{escala.passagemBiblica}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {escala.membroNomeCompleto || escala.membroNome}
                </p>
              </div>
            );
          })}
        </div>

        {/* Equipe */}
        {(() => {
          const equipeItems = EQUIPE_ORDER.map((funcao) => ({
            funcao,
            escalas: getEscala(funcao),
          })).filter((item) => item.escalas.length > 0);

          if (equipeItems.length === 0) return null;

          return (
            <div className="px-6 py-5 border-t space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Equipe
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {equipeItems.map(({ funcao, escalas }) => (
                  <div key={funcao}>
                    <p className="text-xs font-medium text-muted-foreground">{FUNCAO_LABELS[funcao]}</p>
                    <p className="text-sm">
                      {escalas.map((e: any) => e.membroNome).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Avisos */}
        {boletim.avisos && boletim.avisos.length > 0 && (
          <div className="px-6 py-5 border-t space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Avisos
            </h2>
            <div className="space-y-4">
              {boletim.avisos.map((aviso: any, i: number) => (
                <div key={aviso._id} className={i > 0 ? "pt-3 border-t border-dashed" : ""}>
                  <p className="text-sm font-medium">{aviso.titulo}</p>
                  {aviso.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{aviso.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodape */}
        <div className="text-center py-4 border-t">
          <p className="text-[10px] text-muted-foreground">
            &ldquo;Alegrei-me quando me disseram: Vamos à Casa do Senhor&rdquo; — Salmo 122:1
          </p>
        </div>
      </div>
    </div>
    </ModuloGuard>
  );
}
