"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ArrowLeft, Calendar, Copy, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { STATUS_TURMA, DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import type { Id } from "@/convex/_generated/dataModel";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function TurmaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const turma = useQuery(api.turmas.queries.getById, { id: id as Id<"turmas"> });
  const inscricoes = useQuery(api.turmas.queries.listInscricoes, { turmaId: id as Id<"turmas"> });
  const encontros = useQuery(api.turmas.queries.listEncontros, { turmaId: id as Id<"turmas"> });
  const updateStatus = useMutation(api.turmas.mutations.updateStatus);
  const cancelarInscricao = useMutation(api.turmas.mutations.cancelarInscricao);

  if (turma === undefined) return <div className="p-6">Carregando...</div>;
  if (turma === null) return <div className="p-6">Turma nao encontrada</div>;

  const statusOpt = STATUS_TURMA.find((s) => s.value === turma.status);
  const shareUrl = turma.token ? `${window.location.origin}/inscricao/${turma.token}` : "";

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatus({ id: id as Id<"turmas">, status: newStatus as "ABERTA" | "EM_ANDAMENTO" | "ENCERRADA" | "CANCELADA" });
      toast.success("Status atualizado");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  return (
    <ModuloGuard modulo="turmas">
      <div className="container max-w-4xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/turmas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-xl">{turma.nome}</CardTitle>
              <Badge variant="outline" className={statusOpt?.color ?? ""}>
                {statusOpt?.label ?? turma.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(turma.dataInicio)}
                {turma.diaSemana && ` - ${DIA_SEMANA_LABELS[turma.diaSemana] ?? turma.diaSemana}`}
                {turma.horario && ` ${turma.horario}`}
              </span>
              {turma.local && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {turma.local}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {turma.totalInscritos} inscritos
                {turma.totalListaEspera > 0 && ` (${turma.totalListaEspera} na espera)`}
              </span>
            </div>

            {turma.descricao && <p className="text-sm">{turma.descricao}</p>}

            <div className="flex gap-2 flex-wrap">
              {can("turmas:update") && (
                <Select value={turma.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_TURMA.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {shareUrl && (
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Link de inscrição
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="inscricoes">
          <TabsList>
            <TabsTrigger value="inscricoes">Inscrições ({inscricoes?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="presenca">Presença ({encontros?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="inscricoes" className="mt-4">
            {!inscricoes ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : inscricoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma inscrição</p>
            ) : (
              <div className="space-y-2">
                {inscricoes.map((i) => (
                  <Card key={i._id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{i.dadosSistema.nomeCompleto}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {i.dadosSistema.whatsapp && <span>{i.dadosSistema.whatsapp}</span>}
                          {i.dadosSistema.email && <span>{i.dadosSistema.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          i.status === "CONFIRMADA" ? "bg-green-100 text-green-800" :
                          i.status === "LISTA_ESPERA" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {i.status === "CONFIRMADA" ? "Confirmada" :
                           i.status === "LISTA_ESPERA" ? "Espera" : "Cancelada"}
                        </Badge>
                        {can("turmas:manage_inscricoes") && i.status !== "CANCELADA" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-500"
                            onClick={async () => {
                              await cancelarInscricao({ id: i._id });
                              toast.success("Inscrição cancelada");
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="presenca" className="mt-4">
            {!encontros ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : encontros.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum encontro registrado</p>
            ) : (
              <div className="space-y-2">
                {encontros.map((e) => (
                  <Card key={e._id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{formatDate(e.data)}</p>
                        {e.titulo && <p className="text-xs text-muted-foreground">{e.titulo}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {e.totalPresentes} presentes / {e.totalAusentes} ausentes
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ModuloGuard>
  );
}
