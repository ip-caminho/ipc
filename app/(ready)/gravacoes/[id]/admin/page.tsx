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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { IaResultadoDisplay } from "@features/gravacoes/components/IaResultadoDisplay";
import { IaProcessarButton } from "@features/gravacoes/components/IaProcessarButton";
import { IaStatusBadge } from "@features/gravacoes/components/IaStatusBadge";
import { IaProgressPanel } from "@features/gravacoes/components/IaProgressPanel";
import { SegmentEditor } from "@features/gravacoes/components/SegmentEditor";
import { SecureAudioPlayer } from "@/shared/files/components/SecureAudioPlayer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { ArrowLeft, Save, Plus, Trash2, Megaphone, Globe, GlobeLock } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

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
          <textarea
            value={form.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-1">
          <Label>Resumo</Label>
          <textarea
            value={form.resumo}
            onChange={(e) => set("resumo", e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <textarea
              placeholder="Descricao"
              value={aviso.descricao}
              onChange={(e) => update(i, "descricao", e.target.value)}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function GravacaoAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { can } = useAuth();

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

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/gravacoes/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">{gravacao.titulo}</h1>
            <p className="text-xs text-muted-foreground">Administracao da gravacao</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IaStatusBadge iaStatus={gravacao.iaStatus} iaErro={gravacao.iaErro} />
          <PermissionGate permission="gravacoes:process_ai">
            <IaProcessarButton
              gravacaoId={gravacao._id}
              iaStatus={gravacao.iaStatus}
              hasAudio={!!gravacao.audioUrl}
            />
          </PermissionGate>
          <PermissionGate permission="gravacoes:update">
            {gravacao.status === "RASCUNHO" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await publishGravacao({ id: gravacao._id });
                    toast.success("Gravacao publicada");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro ao publicar");
                  }
                }}
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Publicar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await unpublishGravacao({ id: gravacao._id, data: { status: "RASCUNHO" } });
                    toast.success("Gravacao despublicada");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro ao despublicar");
                  }
                }}
              >
                <GlobeLock className="h-3.5 w-3.5 mr-1.5" />
                Despublicar
              </Button>
            )}
          </PermissionGate>
          <PermissionGate permission="gravacoes:delete">
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!confirm("Tem certeza que deseja excluir esta gravacao? Esta acao nao pode ser desfeita.")) return;
                try {
                  await removeGravacao({ id: gravacao._id });
                  toast.success("Gravacao excluida");
                  router.push("/admin/gravacoes");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao excluir");
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </Button>
          </PermissionGate>
        </div>
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
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="avisos">Avisos</TabsTrigger>
          <TabsTrigger value="resultado">Resultado IA</TabsTrigger>
          <TabsTrigger value="segmentos">Segmentos</TabsTrigger>
          {gravacao.audioUrl && (
            <TabsTrigger value="audio">Audio completo</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <DadosEditor gravacao={gravacao} />
        </TabsContent>

        <TabsContent value="avisos" className="mt-4">
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
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground text-center">
                  Nenhum resultado de IA disponivel. Processe a gravacao primeiro.
                </p>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground text-center">
                  Nenhum audio disponivel.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {gravacao.audioUrl && (
          <TabsContent value="audio" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Audio completo</CardTitle>
              </CardHeader>
              <CardContent>
                <SecureAudioPlayer url={gravacao.audioUrl} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
