"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EnviarComprovanteDialog } from "@features/acampamento/components/EnviarComprovanteDialog";
import { brl, dataBR } from "@features/acampamento/lib/format";

type BadgeVariant = "default" | "secondary" | "destructive";
const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  ATIVA: { label: "Ativa", variant: "default" },
  CONFIRMADA: { label: "Confirmada", variant: "default" },
  LISTA_ESPERA: { label: "Lista de espera", variant: "secondary" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, variant: "secondary" as BadgeVariant };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

export default function MinhasInscricoesPage() {
  const acampamentos = useQuery(api.public.acampamento.minhasInscricoes, {});
  const inscricoes = useQuery(api.public.inscricoesEvento.minhasRespostas, {});
  const turmas = useQuery(api.turmas.queries.minhasInscricoes, {});

  const carregando =
    acampamentos === undefined || inscricoes === undefined || turmas === undefined;
  const vazio =
    !carregando &&
    (acampamentos?.length ?? 0) === 0 &&
    (inscricoes?.length ?? 0) === 0 &&
    (turmas?.length ?? 0) === 0;

  return (
    <HeaderLayout>
      <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
        <div className="flex flex-col gap-6 py-4 md:py-6">
          <div className="px-4">
            <PageHeader
              title="Minhas inscrições"
              subtitle="Acampamentos, eventos e turmas em que você está inscrito"
            />
          </div>

          <div className="space-y-6 px-4">
            {carregando ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : vazio ? (
              <p className="rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                Você ainda não tem inscrições.
              </p>
            ) : (
              <>
                {acampamentos && acampamentos.length > 0 && (
                  <Secao titulo="Acampamentos e retiros">
                    <ul className="space-y-3">
                      {acampamentos.map((i) => {
                        return (
                          <li key={i._id} className="rounded-lg border p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold">{i.acampamentoTitulo}</p>
                                {i.dataInicio && (
                                  <p className="text-xs text-muted-foreground">
                                    {dataBR(i.dataInicio)}
                                    {i.dataFim ? ` a ${dataBR(i.dataFim)}` : ""}
                                  </p>
                                )}
                              </div>
                              <StatusBadge status={i.status} />
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                              {[
                                ["Valor", brl(i.valorFinal)],
                                ["Pago", brl(i.recebido)],
                                ["Falta", brl(Math.max(0, i.saldo))],
                              ].map(([label, valor]) => (
                                <div key={label} className="rounded-md border p-2">
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="text-sm font-semibold tabular-nums">{valor}</p>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                {i.comprovantesEnviados > 0
                                  ? `${i.comprovantesEnviados} comprovante(s) em conferência`
                                  : "Nenhum comprovante enviado ainda"}
                              </p>
                              {i.comprovanteToken && (
                                <EnviarComprovanteDialog
                                  token={i.comprovanteToken}
                                  titulo={i.acampamentoTitulo}
                                />
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Secao>
                )}

                {inscricoes && inscricoes.length > 0 && (
                  <Secao titulo="Inscrições">
                    <ul className="space-y-2">
                      {inscricoes.map((r) => (
                        <li
                          key={r._id}
                          className="flex items-center justify-between gap-2 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{r.titulo}</p>
                            <p className="text-xs text-muted-foreground">{dataBR(new Date(r.criadoEm).toISOString().slice(0, 10))}</p>
                          </div>
                          <StatusBadge status={r.status} />
                        </li>
                      ))}
                    </ul>
                  </Secao>
                )}

                {turmas && turmas.length > 0 && (
                  <Secao titulo="Turmas">
                    <ul className="space-y-2">
                      {turmas.map((t) => (
                        <li
                          key={t._id}
                          className="flex items-center justify-between gap-2 rounded-lg border p-3"
                        >
                          <p className="min-w-0 truncate text-sm font-medium">{t.turmaNome}</p>
                          <StatusBadge status={t.status} />
                        </li>
                      ))}
                    </ul>
                  </Secao>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
}
