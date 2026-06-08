"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import { Play, Headphones } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/shared/components/ui/card";
import { SecureAudioPlayer } from "@/shared/files/components/SecureAudioPlayer";
import { getTipoLabel } from "@features/gravacoes/lib/categoryGradient";

type Gravacao = {
  _id: string;
  titulo: string;
  tipo: string;
  data: string;
  pregadorNome: string;
  audioUrl: string | null;
  inicioConteudo?: number | null;
  fimConteudo?: number | null;
  inicioSermao?: number | null;
  fimSermao?: number | null;
};

function dataCurta(data: string): string {
  try {
    return format(parseISO(data), "d MMM yyyy", { locale: ptBR }).replace(".", "");
  } catch {
    return "";
  }
}

export default function ConvidadoPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const data = useQuery(api.gravacoes.publico.listConvidado, { codigo });
  const [sel, setSel] = useState<Gravacao | null>(null);

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
              Este link de convidado expirou ou foi desativado. Peça um novo à igreja.
            </p>
            <Link href="/" className="text-xs underline inline-block">Ir ao site</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gravacoes = data.gravacoes as Gravacao[];

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold leading-none">Pregações</p>
            <p className="text-xs text-muted-foreground">Igreja Presbiteriana do Caminho</p>
          </div>
        </div>
      </header>

      {/* Player do item selecionado (fixo no topo) */}
      {sel && sel.audioUrl && (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-3 space-y-2">
            <p className="text-sm font-medium leading-tight">{sel.titulo}</p>
            <SecureAudioPlayer
              url={sel.audioUrl}
              inicioSermao={sel.inicioConteudo ?? sel.inicioSermao}
              fimSermao={sel.fimConteudo ?? sel.fimSermao}
            />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 py-4">
        {gravacoes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma pregação publicada ainda.
          </p>
        ) : (
          <ul className="divide-y">
            {gravacoes.map((g) => {
              const ativo = sel?._id === g._id;
              const meta = [g.pregadorNome, dataCurta(g.data)].filter(Boolean).join(" · ");
              return (
                <li key={g._id}>
                  <button
                    type="button"
                    onClick={() => setSel(ativo ? null : g)}
                    disabled={!g.audioUrl}
                    className="flex w-full items-center gap-3 py-3 text-left active:opacity-80 disabled:opacity-50"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {getTipoLabel(g.tipo)}
                      </p>
                      <p className="text-sm font-medium leading-tight line-clamp-2">{g.titulo}</p>
                      {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
