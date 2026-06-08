"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Headphones } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/shared/components/ui/card";
import { SecureAudioPlayer } from "@/shared/files/components/SecureAudioPlayer";
import { getTipoLabel } from "@features/gravacoes/lib/categoryGradient";

function dataCurta(data: string): string {
  try {
    return format(parseISO(data), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return "";
  }
}

export default function GravacaoPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const data = useQuery(api.gravacoes.share.getCompartilhada, { codigo: token });

  if (data === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!data.valido) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm font-medium">Link indisponível</p>
            <p className="text-xs text-muted-foreground">
              Esta gravação não está mais disponível por este link.
            </p>
            <Link href="/" className="text-xs underline inline-block">Ir ao site</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const g = data.gravacao;
  const meta = [g.pregadorNome, dataCurta(g.data)].filter(Boolean).join(" · ");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground">Igreja Presbiteriana do Caminho</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {getTipoLabel(g.tipo)}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight">{g.titulo}</h1>
          {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
        </div>

        {g.audioUrl ? (
          <SecureAudioPlayer
            url={g.audioUrl}
            inicioSermao={g.inicioConteudo ?? g.inicioSermao}
            fimSermao={g.fimConteudo ?? g.fimSermao}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Áudio indisponível.</p>
        )}

        {(g.resumo || g.descricao) && (
          <Card>
            <CardContent className="p-4">
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {g.resumo || g.descricao}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
