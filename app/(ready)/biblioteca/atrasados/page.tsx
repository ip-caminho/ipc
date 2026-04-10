"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";

function formatDateBR(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function waLink(phone?: string) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("55") ? clean : "55" + clean;
  return `https://wa.me/${num}`;
}

export default function AtrasadosPage() {
  const router = useRouter();
  const atrasados = useQuery(api.biblioteca.queries.listAtrasados);
  const devolverMut = useMutation(api.biblioteca.mutations.devolver);

  return (
    <ModuloGuard modulo="biblioteca">
      <div className="container max-w-3xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/biblioteca")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Empréstimos atrasados</h1>
          <p className="text-sm text-muted-foreground">
            {atrasados?.length ?? 0} empréstimo{(atrasados?.length ?? 0) !== 1 ? "s" : ""} em atraso
          </p>
        </div>

        {!atrasados ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : atrasados.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum empréstimo em atraso
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {atrasados.map((e: any) => (
              <Card key={e._id} className="border-red-300">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{e.livroTitulo}</p>
                    <p className="text-xs text-muted-foreground">{e.membroNome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-red-100 text-red-800 text-[10px]">
                        {e.diasAtraso} dia{e.diasAtraso !== 1 ? "s" : ""} de atraso
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Devia: {formatDateBR(e.dataPrevistaDevolucao)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {waLink(e.membroWhatsapp) && (
                      <a href={waLink(e.membroWhatsapp)!} target="_blank" rel="noopener">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await devolverMut({ emprestimoId: e._id });
                        toast.success("Devolvido");
                      }}
                    >
                      Devolver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModuloGuard>
  );
}
