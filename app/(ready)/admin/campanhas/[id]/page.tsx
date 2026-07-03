"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { CampaignStats } from "@features/campanhas/components/CampaignStats";
import { Send, RefreshCw, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_EXECUCAO: "Em execucao",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluida",
};

const ENVIO_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  ENVIADO: "Enviado",
  FALHOU: "Falhou",
  ATUALIZOU: "Atualizou",
};

const ENVIO_STATUS_COLOR: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-800",
  PROCESSANDO: "bg-blue-100 text-blue-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  FALHOU: "bg-red-100 text-red-800",
  ATUALIZOU: "bg-green-100 text-green-800",
};

export default function CampanhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const campanhaId = id as Id<"campanhas">;
  const { isAdmin, isLoading } = useAuth();
  const campanha = useQuery(api.messaging.campanhas.getCampanha, { campanhaId });
  const disparar = useMutation(api.messaging.campanhas.dispararCampanha);
  const reenviar = useMutation(api.messaging.campanhas.reenviarPendentes);
  const pausar = useMutation(api.messaging.campanhas.pausarCampanha);
  const retomar = useMutation(api.messaging.campanhas.retomarCampanha);

  const [busy, setBusy] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  if (campanha === undefined) return <Skeleton className="h-64 w-full" />;
  if (campanha === null) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Campanha nao encontrada.</p>
          </CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  const handleDisparar = async () => {
    if (!confirm(`Disparar campanha para ${campanha.totalDestinatarios} destinatarios?`)) return;
    setBusy(true);
    try {
      await disparar({ campanhaId });
      toast.success("Campanha iniciada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao disparar");
    } finally {
      setBusy(false);
    }
  };

  const handleReenviar = async () => {
    if (!confirm(`Reenviar para ${campanha.stats.falhados} envios que falharam?`)) return;
    setBusy(true);
    try {
      const result = await reenviar({ campanhaId });
      toast.success(`${result.reabertos} envios reagendados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reenviar");
    } finally {
      setBusy(false);
    }
  };

  const handlePausar = async () => {
    setBusy(true);
    try {
      await pausar({ campanhaId });
      toast.success("Campanha pausada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao pausar");
    } finally {
      setBusy(false);
    }
  };

  const handleRetomar = async () => {
    setBusy(true);
    try {
      await retomar({ campanhaId });
      toast.success("Campanha retomada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao retomar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <HeaderLayout>
      <DetailHeader title={campanha.titulo} backHref="/admin/campanhas" />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>{STATUS_LABEL[campanha.status]}</Badge>
            {campanha.iniciadoEm && (
              <Badge variant="outline">
                Iniciada {format(campanha.iniciadoEm, "dd/MM 'as' HH:mm", { locale: ptBR })}
              </Badge>
            )}
            {campanha.concluidoEm && (
              <Badge variant="outline">
                Concluida {format(campanha.concluidoEm, "dd/MM 'as' HH:mm", { locale: ptBR })}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {campanha.status === "RASCUNHO" && (
              <Button onClick={handleDisparar} disabled={busy}>
                <Send className="h-4 w-4 mr-1" /> Disparar
              </Button>
            )}
            {campanha.status === "EM_EXECUCAO" && (
              <Button variant="outline" onClick={handlePausar} disabled={busy}>
                <Pause className="h-4 w-4 mr-1" /> Pausar
              </Button>
            )}
            {campanha.status === "PAUSADA" && (
              <Button onClick={handleRetomar} disabled={busy}>
                <Play className="h-4 w-4 mr-1" /> Retomar
              </Button>
            )}
            {campanha.stats.falhados > 0 && campanha.status !== "EM_EXECUCAO" && (
              <Button variant="outline" onClick={handleReenviar} disabled={busy}>
                <RefreshCw className="h-4 w-4 mr-1" /> Reenviar falhados
              </Button>
            )}
          </div>
        </div>

        <CampaignStats stats={campanha.stats} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded">
              {campanha.template}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Envios ({campanha.envios.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table containerClassName="max-h-[calc(100vh-18rem)] overflow-y-auto rounded-b-xl">
              <TableHeader className="sticky top-0 z-20 bg-background">
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Atualizou</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanha.envios.map((e) => (
                  <TableRow key={e._id}>
                    <TableCell className="font-medium">{e.nomeEntidade}</TableCell>
                    <TableCell className="text-muted-foreground">{e.telefone}</TableCell>
                    <TableCell>
                      <Badge className={ENVIO_STATUS_COLOR[e.status]} variant="outline">
                        {ENVIO_STATUS_LABEL[e.status]}
                      </Badge>
                      {e.erro && (
                        <p className="text-[10px] text-red-600 mt-0.5 max-w-xs truncate" title={e.erro}>
                          {e.erro}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.enviadoEm ? format(e.enviadoEm, "dd/MM HH:mm", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.atualizouEm ? format(e.atualizouEm, "dd/MM HH:mm", { locale: ptBR }) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </HeaderLayout>
  );
}
