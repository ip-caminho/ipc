"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Church, ChevronLeft, ChevronRight, UserX, AlertCircle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { useBibleLookup } from "@/shared/bible/hooks/useBibleLookup";
import { BibleVersePreview } from "@/shared/bible/components/BibleVersePreview";

const EQUIPE_ORDER = ["HOSPITALIDADE", "SOM", "MULTIMIDIA"] as const;

const FUNCAO_LABELS: Record<string, string> = {
  ABERTURA: "Abertura",
  CONFISSAO: "Confissão de Fé",
  PREGACAO: "Pregação",
  ORACAO: "Oração",
  AVISOS: "Avisos",
  LOUVOR: "Louvor",
  HOSPITALIDADE: "Hospitalidade",
  SOM: "Som",
  MULTIMIDIA: "Multimídia",
};

function PassagemTexto({ referencia }: { referencia: string }) {
  const { loading, results, error } = useBibleLookup(referencia);

  return (
    <div className="mt-1">
      <BibleVersePreview loading={loading} results={results} error={error} maxHeight="200px" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function ProximoDomingoPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string | undefined>();

  // @ts-ignore Convex TS2589
  const domingo = useQuery(api.escalas.queries.getProximoDomingo, {
    data: dataSelecionada,
  });

  if (domingo === undefined) {
    return (
      <ModuloGuard modulo="escalas">
        <HeaderLayout>
          <div className="space-y-4">
            <PageHeader title="Próximo domingo" />
            <Skeleton className="h-96 w-full" />
          </div>
        </HeaderLayout>
      </ModuloGuard>
    );
  }

  if (domingo === null) {
    return (
      <ModuloGuard modulo="escalas">
        <HeaderLayout>
          <PageHeader title="Próximo domingo" />
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
            <Church className="h-12 w-12" />
            <p>Nenhum culto dominical cadastrado</p>
          </div>
        </HeaderLayout>
      </ModuloGuard>
    );
  }

  const parsedDate = parseISO(domingo.data);
  const dataFormatada = format(parsedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const getEscala = (funcao: string) =>
    domingo.escalas.filter((e: any) => e.funcao === funcao);

  return (
    <ModuloGuard modulo="escalas">
      <HeaderLayout>
      <div className="space-y-6 max-w-3xl">
        <PageHeader title="Próximo domingo" />
        {/* Header com seletor de data */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!domingo.navegacao.anterior}
              onClick={() => setDataSelecionada(domingo.navegacao.anterior!)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select
              value={domingo.data}
              onValueChange={(v) => setDataSelecionada(v)}
            >
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domingo.datasDisponiveis.map((d: string) => (
                  <SelectItem key={d} value={d}>
                    {format(parseISO(d), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!domingo.navegacao.proximo}
              onClick={() => setDataSelecionada(domingo.navegacao.proximo!)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Data destaque */}
        <div className="text-center py-4 border rounded-lg bg-muted/30">
          <Church className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-lg font-medium capitalize">{dataFormatada}</p>
          <p className="text-sm text-muted-foreground">{domingo.horario || "10:00"}h</p>
        </div>

        {/* Ordem do Culto */}
        <Section title="Ordem do Culto">
          {(() => {
            const louvores = domingo.louvores || [];
            const louvorEscalas = getEscala("LOUVOR");
            const items: React.ReactNode[] = [];

            const ESCALA_MAP: Record<string, { label: string; funcao: string }> = {
              "Abertura": { label: "Abertura", funcao: "ABERTURA" },
              "Confissão": { label: "Confissão de Fé", funcao: "CONFISSAO" },
            };

            // Helper para renderizar escala liturgica com passagem
            const renderEscalaCard = (key: string, label: string, escala: any) => (
              <div key={key} className="border rounded-lg p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="text-sm text-muted-foreground">{escala.membroNomeCompleto || escala.membroNome}</span>
                </div>
                {escala.passagemBiblica && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{escala.passagemBiblica}</p>
                    <PassagemTexto referencia={escala.passagemBiblica} />
                  </div>
                )}
              </div>
            );

            // Equipe de louvor
            if (louvorEscalas.length > 0) {
              items.push(
                <p key="louvor-equipe" className="text-xs text-muted-foreground mb-2">
                  Louvor: {louvorEscalas.map((e: any) => e.membroNomeCompleto || e.membroNome).join(", ")}
                </p>
              );
            }

            // Iterar sobre separadores + musicas
            let pregacaoInserida = false;
            for (let i = 0; i < louvores.length; i++) {
              const item = louvores[i];
              if (item.startsWith("---")) {
                const label = item.slice(3);

                // Inserir Pregacao antes da Ceia ou Oferta
                if (!pregacaoInserida && (label === "Ceia" || label === "Oferta")) {
                  const pregacao = getEscala("PREGACAO")[0];
                  if (pregacao) {
                    items.push(renderEscalaCard("pregacao", "Pregação", pregacao));
                  }
                  pregacaoInserida = true;
                }

                const escala = ESCALA_MAP[label];
                if (escala) {
                  const e = getEscala(escala.funcao)[0];
                  if (e) {
                    items.push(renderEscalaCard(`sep-${i}`, escala.label, e));
                    continue;
                  }
                }

                // Separador simples (Ceia, Oferta)
                items.push(
                  <div key={`sep-${i}`} className="border rounded-lg p-3 text-center">
                    <h3 className="text-sm font-semibold">{label}</h3>
                  </div>
                );
              } else {
                items.push(<p key={`m-${i}`} className="text-sm text-muted-foreground italic px-1">♪ {item}</p>);
              }
            }

            // Pregacao no final se nao foi inserida
            if (!pregacaoInserida) {
              const pregacao = getEscala("PREGACAO")[0];
              if (pregacao) {
                items.push(renderEscalaCard("pregacao", "Pregação", pregacao));
              }
            }

            // Fallback sem separadores
            if (!louvores.some((l) => l.startsWith("---"))) {
              const fallback: React.ReactNode[] = [];
              const allEscalas = [
                { label: "Abertura", funcao: "ABERTURA" },
                { label: "Confissão de Fé", funcao: "CONFISSAO" },
                { label: "Pregação", funcao: "PREGACAO" },
              ];
              for (const { label, funcao } of allEscalas) {
                const e = getEscala(funcao)[0];
                if (e) fallback.push(renderEscalaCard(funcao, label, e));
              }
              items.unshift(...fallback);
            }

            return <div className="space-y-3">{items}</div>;
          })()}
        </Section>

        {/* Equipe */}
        {(() => {
          const equipeItems = EQUIPE_ORDER
            .map((funcao) => ({
              funcao,
              escalas: getEscala(funcao),
            }))
            .filter((item) => item.escalas.length > 0);

          if (equipeItems.length === 0) return null;

          return (
            <Section title="Equipe">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {equipeItems.map(({ funcao, escalas }) => (
                  <div key={funcao} className="border rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {FUNCAO_LABELS[funcao]}
                    </p>
                    {escalas.map((e: any) => (
                      <p key={e._id} className="text-sm">{e.membroNomeCompleto || e.membroNome}</p>
                    ))}
                  </div>
                ))}
              </div>
            </Section>
          );
        })()}

        {/* Avisos */}
        {domingo.avisos && domingo.avisos.length > 0 && (
          <Section title="Avisos">
            <div className="space-y-2">
              {domingo.avisos.map((aviso: any) => (
                <div key={aviso._id} className="border rounded-lg p-3">
                  <p className="text-sm font-medium">{aviso.titulo}</p>
                  {aviso.descricao && (
                    <p className="text-sm text-muted-foreground mt-0.5">{aviso.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Indisponibilidades */}
        {domingo.indisponibilidades && domingo.indisponibilidades.length > 0 && (
          <Section title="Indisponíveis">
            <div className="flex flex-wrap gap-2">
              {domingo.indisponibilidades.map((i: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs gap-1.5 font-normal">
                  <UserX className="h-3 w-3" />
                  {i.nome}
                  {i.motivo && (
                    <span className="text-muted-foreground">({i.motivo})</span>
                  )}
                </Badge>
              ))}
            </div>
          </Section>
        )}
      </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}
