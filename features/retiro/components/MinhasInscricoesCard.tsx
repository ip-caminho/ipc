"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tent } from "lucide-react";
import { EnviarComprovanteDialog } from "./EnviarComprovanteDialog";
import { brl } from "../lib/format";

// Card do dashboard: aparece só quando o membro tem inscrição ativa em
// retiro. Atalho pra enviar o comprovante sem ir atrás de link/código.
export function MinhasInscricoesCard() {
  // Backend ja exclui canceladas
  // @ts-ignore Convex TS2589
  const inscricoes = useQuery(api.public.retiro.minhasInscricoes, {});
  const ativas = inscricoes ?? [];
  if (ativas.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tent className="h-4 w-4 text-muted-foreground" /> Minhas inscrições
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ativas.map((i) => (
          <div
            key={i._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{i.retiroTitulo}</p>
              <p className="text-xs text-muted-foreground">
                {i.saldo > 0 ? `Falta ${brl(i.saldo)}` : "Pagamento em dia"}
                {i.comprovantesEnviados > 0 && ` · ${i.comprovantesEnviados} em conferência`}
              </p>
            </div>
            {i.comprovanteToken && (
              <EnviarComprovanteDialog token={i.comprovanteToken} titulo={i.retiroTitulo} />
            )}
          </div>
        ))}
        <Link
          href="/minhas-inscricoes"
          className="block text-right text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Ver todas
        </Link>
      </CardContent>
    </Card>
  );
}
