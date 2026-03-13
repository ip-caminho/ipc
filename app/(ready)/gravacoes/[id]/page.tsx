"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GravacaoForm } from "@features/gravacoes/components/GravacaoForm";
import { IaProcessarButton } from "@features/gravacoes/components/IaProcessarButton";
import { IaStatusBadge } from "@features/gravacoes/components/IaStatusBadge";
import { IaProgressPanel } from "@features/gravacoes/components/IaProgressPanel";
import { SecureAudioPlayer } from "@/shared/files/components/SecureAudioPlayer";
import { Reacoes } from "@features/gravacoes/components/Reacoes";
import { Comentarios } from "@features/gravacoes/components/Comentarios";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { Id } from "@/convex/_generated/dataModel";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useEscutaTracker } from "@features/gravacoes/hooks/useEscutaTracker";

// ===== Visao simples para membros =====
function GravacaoViewer({ gravacao }: { gravacao: any }) {
  const { onTimeUpdate } = useEscutaTracker(gravacao._id);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{gravacao.titulo}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {gravacao.pregadorNome || gravacao.pregadorInfo?.nome
            ? <span>{gravacao.pregadorNome || gravacao.pregadorInfo?.nome}</span>
            : null}
          <span>{format(parseISO(gravacao.data), "dd/MM/yyyy", { locale: ptBR })}</span>
          {gravacao.serieInfo && (
            <Badge variant="outline" className="text-xs">{gravacao.serieInfo.nome}</Badge>
          )}
        </div>
        {gravacao.textoBase && (
          <p className="text-sm text-muted-foreground">{gravacao.textoBase}</p>
        )}
      </div>

      {gravacao.audioUrl && (
        <SecureAudioPlayer url={gravacao.audioUrl} onTimeUpdate={onTimeUpdate} />
      )}

      {gravacao.resumo && (
        <div>
          <p className="text-xs font-medium mb-1">Resumo</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{gravacao.resumo}</p>
        </div>
      )}

      {gravacao.tags && gravacao.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {gravacao.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      <Reacoes gravacaoId={gravacao._id} />

      <Comentarios gravacaoId={gravacao._id} />
    </div>
  );
}

// ===== Visao completa para gestores =====
export default function GravacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { can } = useAuth();
  const { onTimeUpdate } = useEscutaTracker(id as Id<"gravacoes">);

  const gravacao = useQuery(api.gravacoes.queries.getById, { id: id as Id<"gravacoes"> });
  const updateGravacao = useMutation(api.gravacoes.mutations.update);
  const publishGravacao = useMutation(api.gravacoes.mutations.publish);
  const removeGravacao = useMutation(api.gravacoes.mutations.remove);

  if (gravacao === undefined) {
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  }
  if (!gravacao) {
    return <p className="text-muted-foreground">Gravacao nao encontrada</p>;
  }

  // Membros sem permissao de edicao veem a visao simples
  const isManager = can("gravacoes:update") || can("gravacoes:process_ai");
  if (!isManager) {
    return <GravacaoViewer gravacao={gravacao} />;
  }

  if (editing) {
    const defaultValues = {
      titulo: gravacao.titulo,
      tipo: gravacao.tipo as any,
      pregadorNome: gravacao.pregadorNome || "",
      serieId: gravacao.serieId || undefined,
      data: gravacao.data,
      descricao: gravacao.descricao || "",
      resumo: gravacao.resumo || "",
      textoBase: gravacao.textoBase || "",
      audioUrl: gravacao.audioUrl || "",
      tags: gravacao.tags?.join(", ") || "",
    };

    const handleSubmit = async (data: any) => {
      try {
        await updateGravacao({
          id: id as Id<"gravacoes">,
          data: {
            titulo: data.titulo,
            tipo: data.tipo,
            serieId: data.serieId || undefined,
            pregadorNome: data.pregadorNome || undefined,
            data: data.data,
            descricao: data.descricao || undefined,
            resumo: data.resumo || undefined,
            textoBase: data.textoBase || undefined,
            audioUrl: data.audioUrl || undefined,
            tags: data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined,
          },
        });
        toast.success("Gravacao atualizada");
        setEditing(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
      }
    };

    return (
      <div className="max-w-4xl">
        <GravacaoForm defaultValues={defaultValues} onSubmit={handleSubmit} isEditing entityId={id} />
        <Button variant="outline" onClick={() => setEditing(false)} className="mt-2">Cancelar</Button>
      </div>
    );
  }

  const tipoLabel = TIPO_GRAVACAO_OPTIONS.find((o) => o.value === gravacao.tipo)?.label || gravacao.tipo;

  return (
    <div className="max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{gravacao.titulo}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={gravacao.status === "PUBLICADO" ? "default" : "secondary"}>
                {gravacao.status}
              </Badge>
              <IaStatusBadge iaStatus={gravacao.iaStatus} iaErro={gravacao.iaErro} />
              <PermissionGate permission="gravacoes:process_ai">
                <IaProcessarButton
                  gravacaoId={gravacao._id}
                  iaStatus={gravacao.iaStatus}
                  hasAudio={!!gravacao.audioUrl}
                />
              </PermissionGate>
              <PermissionGate permission="gravacoes:update">
                {gravacao.status === "RASCUNHO" && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      await publishGravacao({ id: id as Id<"gravacoes"> });
                      toast.success("Gravacao publicada");
                    }}
                  >
                    Publicar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Editar
                </Button>
              </PermissionGate>
              <PermissionGate permission="gravacoes:delete">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir gravacao?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acao nao pode ser desfeita. A gravacao &quot;{gravacao.titulo}&quot; sera excluida permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            await removeGravacao({ id: id as Id<"gravacoes"> });
                            toast.success("Gravacao excluida");
                            router.push("/gravacoes");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Erro ao excluir");
                          }
                        }}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGate>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm">{tipoLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pregador</p>
              <p className="text-sm">{gravacao.pregadorNome || gravacao.pregadorInfo?.nome || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="text-sm">{format(parseISO(gravacao.data), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Texto Base</p>
              <p className="text-sm">{gravacao.textoBase || "-"}</p>
            </div>
            {gravacao.serieInfo && (
              <div>
                <p className="text-xs text-muted-foreground">Serie</p>
                <p className="text-sm">{gravacao.serieInfo.nome}</p>
              </div>
            )}
          </div>

          {gravacao.resumo && (
            <div>
              <p className="text-xs text-muted-foreground">Resumo</p>
              <p className="text-sm whitespace-pre-wrap">{gravacao.resumo}</p>
            </div>
          )}

          {gravacao.audioUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Audio</p>
              <SecureAudioPlayer url={gravacao.audioUrl} onTimeUpdate={onTimeUpdate} />
            </div>
          )}

          {gravacao.tags && gravacao.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {gravacao.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IA Progress (while processing) */}
      <IaProgressPanel iaStatus={gravacao.iaStatus} iaErro={gravacao.iaErro} />

      {/* Reacoes */}
      <Reacoes gravacaoId={gravacao._id} />

      {/* Comentarios */}
      <Comentarios gravacaoId={gravacao._id} />
    </div>
  );
}
