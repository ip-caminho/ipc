"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/components/ui/empty";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { IaResultadoDisplay } from "@features/gravacoes/components/IaResultadoDisplay";
import { IaProcessarButton } from "@features/gravacoes/components/IaProcessarButton";
import { IaStatusBadge } from "@features/gravacoes/components/IaStatusBadge";
import { IaProgressPanel } from "@features/gravacoes/components/IaProgressPanel";
import { SegmentEditor } from "@features/gravacoes/components/SegmentEditor";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { ArrowLeft, Save, Plus, Trash2, Megaphone, Globe, GlobeLock, Play, Pause, MoreVertical, Sparkles, Download } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useIsMobile } from "@shared/hooks/use-mobile";

function DadosEditor({ gravacao }: { gravacao: any }) {
  // @ts-ignore Convex TS2589
  const updateGravacao = useMutation(api.gravacoes.mutations.update);
  const [form, setForm] = useState({
    titulo: gravacao.titulo || "",
    tipo: gravacao.tipo || "SERMAO",
    data: gravacao.data || "",
    pregadorNome: gravacao.pregadorNome || "",
    textoBase: gravacao.textoBase || "",
    descricao: gravacao.descricao || "",
    resumo: gravacao.resumo || "",
    tags: (gravacao.tags || []).join(", "),
  });
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      await updateGravacao({
        id: gravacao._id,
        data: {
          titulo: form.titulo,
          tipo: form.tipo,
          data: form.data,
          pregadorNome: form.pregadorNome || undefined,
          textoBase: form.textoBase || undefined,
          descricao: form.descricao || undefined,
          resumo: form.resumo || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      });
      toast.success("Dados salvos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Dados da gravacao</CardTitle>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Titulo</Label>
          <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_GRAVACAO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Pregador</Label>
            <Input value={form.pregadorNome} onChange={(e) => set("pregadorNome", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Texto base / Passagem</Label>
          <Input value={form.textoBase} onChange={(e) => set("textoBase", e.target.value)} placeholder="Ex: Romanos 8:28-30" />
        </div>

        <div className="space-y-1">
          <Label>Descricao</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-1">
          <Label>Resumo</Label>
          <Textarea
            value={form.resumo}
            onChange={(e) => set("resumo", e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-1">
          <Label>Tags</Label>
          <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="graca, salvacao, fe (separadas por virgula)" />
        </div>
      </CardContent>
    </Card>
  );
}

interface Aviso {
  titulo: string;
  descricao: string;
}

function AvisosEditor({ gravacaoId, avisos: initial }: { gravacaoId: Id<"gravacoes">; avisos: Aviso[] }) {
  // @ts-ignore Convex TS2589
  const updateGravacao = useMutation(api.gravacoes.mutations.update);
  const [avisos, setAvisos] = useState<Aviso[]>(initial);
  const [saving, setSaving] = useState(false);

  const update = (index: number, field: keyof Aviso, value: string) => {
    setAvisos((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const add = () => {
    setAvisos((prev) => [...prev, { titulo: "", descricao: "" }]);
  };

  const remove = (index: number) => {
    setAvisos((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const clean = avisos.filter((a) => a.titulo.trim() || a.descricao.trim());
    setSaving(true);
    try {
      await updateGravacao({
        id: gravacaoId,
        data: { iaAvisos: clean },
      });
      toast.success("Avisos salvos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Avisos ({avisos.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={add}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {avisos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum aviso. Clique em Adicionar para criar.</p>
        )}
        {avisos.map((aviso, i) => (
          <div key={i} className="space-y-2 p-3 rounded-md border">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Aviso {i + 1}</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              placeholder="Titulo do aviso"
              value={aviso.titulo}
              onChange={(e) => update(i, "titulo", e.target.value)}
            />
            <Textarea
              placeholder="Descricao"
              value={aviso.descricao}
              onChange={(e) => update(i, "descricao", e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AudioTab({ gravacao }: { gravacao: any }) {
  const globalPlayer = useAudioPlayer();
  const [baixando, setBaixando] = useState(false);

  const isFullTrack = globalPlayer.track?.gravacaoId === gravacao._id
    && globalPlayer.track?.inicioSermao == null
    && globalPlayer.track?.fimSermao == null;
  const isFullPlaying = isFullTrack && globalPlayer.isPlaying;

  const handlePlay = () => {
    if (isFullPlaying) {
      globalPlayer.pause();
    } else if (isFullTrack) {
      globalPlayer.resume();
    } else {
      globalPlayer.play({
        url: gravacao.audioUrl!,
        title: `${gravacao.titulo} (completo)`,
        artist: gravacao.pregadorNome || undefined,
        gravacaoId: gravacao._id,
      });
    }
  };

  const handleDownload = async () => {
    if (!gravacao.audioUrl) return;
    setBaixando(true);
    try {
      const res = await fetch(gravacao.audioUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // nome amigavel: titulo + data, sanitizado, .mp3
      const slug = `${gravacao.titulo}-${gravacao.data}`
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").toLowerCase();
      a.download = `${slug || "audio"}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar audio");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Audio completo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePlay}>
            {isFullPlaying ? <Pause className="h-4 w-4 mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
            {isFullPlaying ? "Pausar" : "Ouvir audio completo"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={baixando}>
            <Download className="h-4 w-4 mr-1.5" />
            {baixando ? "Baixando..." : "Baixar audio"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GravacaoAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { can } = useAuth();
  const isMobile = useIsMobile();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const gravacao = useQuery(api.gravacoes.queries.getById, { id: id as Id<"gravacoes"> });
  const publishGravacao = useMutation(api.gravacoes.mutations.publish);
  // @ts-ignore Convex TS2589
  const unpublishGravacao = useMutation(api.gravacoes.mutations.update);
  const removeGravacao = useMutation(api.gravacoes.mutations.remove);

  if (gravacao === undefined) {
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  }
  if (!gravacao) {
    return <p className="text-muted-foreground">Gravacao nao encontrada</p>;
  }

  const isManager = can("gravacoes:update") || can("gravacoes:process_ai");
  if (!isManager) {
    return <p className="text-muted-foreground">Sem permissao</p>;
  }

  const handlePublish = async () => {
    try {
      await publishGravacao({ id: gravacao._id });
      toast.success("Gravacao publicada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao publicar");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishGravacao({ id: gravacao._id, data: { status: "RASCUNHO" } });
      toast.success("Gravacao despublicada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao despublicar");
    }
  };

  const handleRemove = async () => {
    try {
      await removeGravacao({ id: gravacao._id });
      toast.success("Gravacao excluida");
      router.push("/admin/gravacoes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href={`/gravacoes/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{gravacao.titulo}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Administracao</p>
              <IaStatusBadge iaStatus={gravacao.iaStatus} iaErro={gravacao.iaErro} />
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <PermissionGate permission="gravacoes:process_ai">
              <IaProcessarButton
                gravacaoId={gravacao._id}
                iaStatus={gravacao.iaStatus}
                hasAudio={!!gravacao.audioUrl}
              />
            </PermissionGate>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {can("gravacoes:update") && (
                  <DropdownMenuItem onClick={gravacao.status === "RASCUNHO" ? handlePublish : handleUnpublish}>
                    {gravacao.status === "RASCUNHO" ? (
                      <><Globe className="h-4 w-4" />Publicar</>
                    ) : (
                      <><GlobeLock className="h-4 w-4" />Despublicar</>
                    )}
                  </DropdownMenuItem>
                )}
                {can("gravacoes:delete") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <PermissionGate permission="gravacoes:process_ai">
              <IaProcessarButton
                gravacaoId={gravacao._id}
                iaStatus={gravacao.iaStatus}
                hasAudio={!!gravacao.audioUrl}
              />
            </PermissionGate>
            <PermissionGate permission="gravacoes:update">
              {gravacao.status === "RASCUNHO" ? (
                <Button variant="outline" size="sm" onClick={handlePublish}>
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  Publicar
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleUnpublish}>
                  <GlobeLock className="h-3.5 w-3.5 mr-1.5" />
                  Despublicar
                </Button>
              )}
            </PermissionGate>
            <PermissionGate permission="gravacoes:delete">
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Excluir
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      <IaProgressPanel
        gravacaoId={gravacao._id}
        iaStatus={gravacao.iaStatus}
        iaErro={gravacao.iaErro}
        iaTranscricao={gravacao.iaTranscricao}
        youtubeUrl={gravacao.youtubeUrl}
        audioUrl={gravacao.audioUrl}
      />

      <Tabs defaultValue="dados">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none">
          <TabsTrigger value="dados" className="shrink-0">Dados</TabsTrigger>
          <TabsTrigger value="avisos" className="shrink-0">Avisos</TabsTrigger>
          <TabsTrigger value="resultado" className="shrink-0">Resultado IA</TabsTrigger>
          <TabsTrigger value="segmentos" className="shrink-0">Trechos</TabsTrigger>
          {gravacao.audioUrl && (
            <TabsTrigger value="audio" className="shrink-0">Audio</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dados" forceMount className="mt-4 data-[state=inactive]:hidden">
          <DadosEditor gravacao={gravacao} />
        </TabsContent>

        <TabsContent value="avisos" forceMount className="mt-4 data-[state=inactive]:hidden">
          <AvisosEditor
            gravacaoId={gravacao._id}
            avisos={gravacao.iaAvisos || []}
          />
        </TabsContent>

        <TabsContent value="resultado" className="mt-4">
          {gravacao.iaResultado ? (
            <IaResultadoDisplay
              iaResultado={gravacao.iaResultado}
              iaTranscricao={gravacao.iaTranscricao}
            />
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles />
                </EmptyMedia>
                <EmptyTitle>Sem resultado de IA</EmptyTitle>
                <EmptyDescription>
                  Processe a gravacao para gerar tema, pontos-chave e frases.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>

        <TabsContent value="segmentos" className="mt-4">
          {gravacao.audioUrl ? (
            <SegmentEditor
              gravacaoId={gravacao._id}
              audioUrl={gravacao.audioUrl}
              inicioSermao={gravacao.inicioSermao}
              fimSermao={gravacao.fimSermao}
              inicioAvisos={gravacao.inicioAvisos}
              fimAvisos={gravacao.fimAvisos}
            />
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhum audio disponivel</EmptyTitle>
                <EmptyDescription>
                  Faca upload do audio para editar os trechos.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>

        {gravacao.audioUrl && (
          <TabsContent value="audio" className="mt-4">
            <AudioTab gravacao={gravacao} />
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir gravacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A gravacao e seus dados serao removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
