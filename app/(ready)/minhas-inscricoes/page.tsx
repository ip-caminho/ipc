"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EnviarComprovanteDialog } from "@features/acampamento/components/EnviarComprovanteDialog";
import { brl, dataBR } from "@features/acampamento/lib/format";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ATIVA: { label: "Ativa", variant: "default" },
  LISTA_ESPERA: { label: "Lista de espera", variant: "secondary" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
};

export default function MinhasInscricoesPage() {
  const inscricoes = useQuery(api.public.acampamento.minhasInscricoes, {});

  return (
    <HeaderLayout>
      <div className="-m-4 md:-m-6 md:max-w-2xl md:mx-auto">
        <div className="flex flex-col gap-5 py-4 md:py-6">
          <div className="px-4">
            <PageHeader
              title="Minhas inscrições"
              subtitle="Acampamentos e retiros — envie aqui o comprovante de pagamento"
            />
          </div>

          <div className="px-4">
            {inscricoes === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : inscricoes.length === 0 ? (
              <p className="rounded-lg border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                Você ainda não tem inscrições em acampamentos.
              </p>
            ) : (
              <ul className="space-y-3">
                {inscricoes.map((i) => {
                  const cancelada = i.status === "CANCELADA";
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
                        <Badge variant={STATUS[i.status].variant}>{STATUS[i.status].label}</Badge>
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

                      {!cancelada && (
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
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
}
