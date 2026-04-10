"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import type { Id } from "@/convex/_generated/dataModel";

function formatDateBR(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function MeusEmprestimosPage() {
  const router = useRouter();
  const emprestimos = useQuery(api.biblioteca.queries.meusEmprestimos);
  const devolverMut = useMutation(api.biblioteca.mutations.devolver);

  return (
    <ModuloGuard modulo="biblioteca">
      <div className="container max-w-2xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/biblioteca")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Meus empréstimos</h1>
          <p className="text-sm text-muted-foreground">
            {emprestimos?.length ?? 0} livro{(emprestimos?.length ?? 0) !== 1 ? "s" : ""} emprestado{(emprestimos?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {!emprestimos ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : emprestimos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Você não tem empréstimos ativos
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {emprestimos.map((e: any) => (
              <Card key={e._id}>
                <CardContent className="p-3 flex gap-3 items-center">
                  {e.livroCapaUrl ? (
                    <img src={e.livroCapaUrl} alt={e.livroTitulo} className="w-12 h-16 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{e.livroTitulo}</p>
                    <p className="text-xs text-muted-foreground font-mono">{e.exemplarCodigo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={
                        e.atrasado ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                      }>
                        Devolver até {formatDateBR(e.dataPrevistaDevolucao)}
                      </Badge>
                      {e.atrasado && (
                        <span className="text-xs text-red-600 font-medium">ATRASADO</span>
                      )}
                    </div>
                  </div>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModuloGuard>
  );
}
