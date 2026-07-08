"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Check, X, Baby, Heart } from "lucide-react";
import { toast } from "sonner";

function formatData(iso?: string) {
  if (!iso) return "—";
  return iso.split("-").reverse().join("/");
}

export function SolicitacoesPanel() {
  // @ts-ignore Convex TS2589
  const solicitacoes = useQuery(api.membros.solicitacoes.listSolicitacoes);
  const aprovar = useMutation(api.membros.solicitacoes.aprovarSolicitacao);
  const rejeitar = useMutation(api.membros.solicitacoes.rejeitarSolicitacao);

  const [rejeitando, setRejeitando] = useState<Id<"solicitacoesCadastro"> | null>(null);
  const [motivo, setMotivo] = useState("");
  const [processando, setProcessando] = useState(false);

  const handleAprovar = async (id: Id<"solicitacoesCadastro">) => {
    setProcessando(true);
    try {
      await aprovar({ solicitacaoId: id });
      toast.success("Cadastro aprovado e vinculado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aprovar");
    } finally {
      setProcessando(false);
    }
  };

  const handleRejeitar = async () => {
    if (!rejeitando) return;
    setProcessando(true);
    try {
      await rejeitar({ solicitacaoId: rejeitando, motivo: motivo.trim() || undefined });
      toast.success("Solicitacao rejeitada");
      setRejeitando(null);
      setMotivo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao rejeitar");
    } finally {
      setProcessando(false);
    }
  };

  if (solicitacoes === undefined) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (solicitacoes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nenhuma solicitacao pendente.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Familiar</TableHead>
                  <TableHead>Vinculo</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="text-sm">{s.solicitanteNome}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {s.dados.nomeCompleto}
                      {s.dados.batizadoNestaIgreja && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Batizado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {s.tipoVinculo === "FILHO" ? (
                          <Baby className="h-3 w-3" />
                        ) : (
                          <Heart className="h-3 w-3" />
                        )}
                        {s.tipoVinculo === "FILHO" ? "Filho(a)" : "Conjuge"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatData(s.dados.dataNascimento)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={processando}
                        onClick={() => {
                          setRejeitando(s._id);
                          setMotivo("");
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        disabled={processando}
                        onClick={() => handleAprovar(s._id)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={rejeitando !== null} onOpenChange={(o) => !o && setRejeitando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar solicitacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Nenhum cadastro sera criado. Voce pode registrar um motivo (opcional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRejeitar();
              }}
              disabled={processando}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
