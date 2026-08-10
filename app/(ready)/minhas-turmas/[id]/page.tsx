"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Calendar, MapPin, MessageCircle, ChevronDown } from "lucide-react";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";
import { RespostasChart } from "@features/turmas/components/RespostasChart";
import { cleanPhoneForWhatsApp, formatPhone } from "@shared/lib/validations/brazilian";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function linkWhatsApp(whatsapp: string, nome: string, turmaNome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  const texto = `Olá, ${primeiro}! Sou o instrutor da turma ${turmaNome}.`;
  return `https://wa.me/${cleanPhoneForWhatsApp(whatsapp)}?text=${encodeURIComponent(texto)}`;
}

/** Numero grande com rotulo — para 3-4 medidas, isto le melhor que grafico. */
function Indicador({ valor, rotulo }: { valor: number | string; rotulo: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-2xl font-semibold tabular-nums leading-none">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-snug">{rotulo}</p>
    </div>
  );
}

export default function MinhaTurmaPage() {
  const { id } = useParams<{ id: string }>();
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const painel = useQuery(api.turmas.instrutor.painel, { turmaId: id as Id<"turmas"> });

  if (painel === undefined) return <div className="p-6 text-sm">Carregando...</div>;
  if (painel === null) {
    return (
      <HeaderLayout>
        <div className="container max-w-2xl py-6">
          <DetailHeader backHref="/minhas-turmas" />
          <p className="mt-6 text-sm text-muted-foreground">
            Turma não encontrada ou você não é instrutor dela.
          </p>
        </div>
      </HeaderLayout>
    );
  }

  const { turma, resumo, resumoRespostas, inscritos } = painel;

  return (
    <HeaderLayout>
      <div className="container max-w-2xl py-6 space-y-6">
        <DetailHeader backHref="/minhas-turmas" />

        <header className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{turma.nome}</h1>
          {turma.cursoNome && (
            <p className="text-sm text-muted-foreground">{turma.cursoNome}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(turma.dataInicio)}
              {turma.diaSemana && ` · ${DIA_SEMANA_LABELS[turma.diaSemana] ?? turma.diaSemana}`}
              {turma.horario && ` ${turma.horario}`}
            </span>
            {turma.local && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {turma.local}
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Indicador valor={resumo.confirmados} rotulo="Inscritos confirmados" />
          <Indicador valor={resumo.listaEspera} rotulo="Na lista de espera" />
          <Indicador valor={resumo.aulas} rotulo="Aulas previstas" />
          <Indicador
            valor={`${resumo.aulasComChamada}/${resumo.aulas}`}
            rotulo="Chamadas feitas"
          />
        </div>

        {resumoRespostas.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-6">
              <div>
                <h2 className="font-semibold">Perfil da turma</h2>
                <p className="text-sm text-muted-foreground">
                  Respostas de quem se inscreveu ({resumo.confirmados + resumo.listaEspera}{" "}
                  {resumo.confirmados + resumo.listaEspera === 1 ? "pessoa" : "pessoas"})
                </p>
              </div>
              {resumoRespostas.map((r) => (
                <RespostasChart
                  key={r.perguntaId}
                  label={r.label}
                  contagens={r.contagens}
                  multipla={r.multipla}
                  totalRespondentes={resumo.confirmados + resumo.listaEspera}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold">
            Inscritos{" "}
            <span className="font-normal text-muted-foreground">({inscritos.length})</span>
          </h2>

          {inscritos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Ninguém se inscreveu ainda.
            </p>
          ) : (
            inscritos.map((i) => (
              <Card key={i._id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{i.nome}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {i.whatsapp && <span>{formatPhone(i.whatsapp)}</span>}
                        {i.email && <span>{i.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.status === "LISTA_ESPERA" && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Espera
                        </Badge>
                      )}
                      {i.whatsapp && (
                        <Button variant="outline" size="sm" className="h-10 px-3" asChild>
                          <a
                            href={linkWhatsApp(i.whatsapp, i.nome, turma.nome)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Conversar
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {i.respostas.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 px-2 text-xs text-muted-foreground"
                        >
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Ver o que respondeu ({i.respostas.length})
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 border-t pt-2">
                        {i.respostas.map((r, idx) => (
                          <div key={`${i._id}-${idx}`}>
                            <p className="text-xs font-medium">{r.label}</p>
                            {r.valores && r.valores.length > 1 ? (
                              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                                {r.valores.map((v) => (
                                  <li key={v}>{v}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {r.valor}
                              </p>
                            )}
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </HeaderLayout>
  );
}
