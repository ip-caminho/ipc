"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TIPO_GRAVACAO_OPTIONS } from "../lib/constants";
import { FileUpload } from "@/shared/files/components/FileUpload";

function getLastSunday(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - diff);
  return sunday.toISOString().split("T")[0];
}

const gravacaoSchema = z.object({
  titulo: z.string().min(3, "Titulo deve ter pelo menos 3 caracteres"),
  tipo: z.enum(["SERMAO", "ESTUDO_BIBLICO", "PALESTRA", "TESTEMUNHO"]),
  serieId: z.string().optional(),
  pregadorNome: z.string().optional(),
  data: z.string().min(1, "Data e obrigatoria"),
  descricao: z.string().optional(),
  resumo: z.string().optional(),
  textoBase: z.string().optional(),
  audioUrl: z.string().optional(),
  tags: z.string().optional(),
});

type GravacaoFormValues = z.infer<typeof gravacaoSchema>;

interface GravacaoFormProps {
  defaultValues?: Partial<GravacaoFormValues>;
  onSubmit: (data: GravacaoFormValues) => Promise<void>;
  isEditing?: boolean;
  entityId?: string;
}

export function GravacaoForm({ defaultValues, onSubmit, isEditing, entityId }: GravacaoFormProps) {
  const [loading, setLoading] = useState(false);
  const series = useQuery(api.gravacoes.series.list);
  const form = useForm<GravacaoFormValues>({
    resolver: zodResolver(gravacaoSchema),
    defaultValues: {
      titulo: "",
      tipo: "SERMAO",
      data: getLastSunday(),
      ...defaultValues,
    },
  });

  const audioUrl = form.watch("audioUrl");

  const handleSubmit = async (data: GravacaoFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  const uploadEntityId = entityId || "new";

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Gravacao" : "Nova Gravacao"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input id="titulo" {...form.register("titulo")} />
              {form.formState.errors.titulo && (
                <p className="text-xs text-destructive">{form.formState.errors.titulo.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.watch("tipo")} onValueChange={(v) => form.setValue("tipo", v as any)}>
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
              <Label htmlFor="pregadorNome">Pregador/Ministrante</Label>
              <Input id="pregadorNome" {...form.register("pregadorNome")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" type="date" {...form.register("data")} />
              {form.formState.errors.data && (
                <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="textoBase">Texto Base (Referencia Biblica)</Label>
              <Input id="textoBase" placeholder="Ex: Joao 3:16" {...form.register("textoBase")} />
            </div>

            <div className="space-y-1">
              <Label>Serie</Label>
              <Select
                value={form.watch("serieId") || "NONE"}
                onValueChange={(v) => form.setValue("serieId", v === "NONE" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhuma</SelectItem>
                  {series?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tags">Tags (separadas por virgula)</Label>
              <Input id="tags" placeholder="fe, esperanca, amor" {...form.register("tags")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="descricao">Descricao</Label>
            <textarea
              id="descricao"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...form.register("descricao")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="resumo">Resumo</Label>
            <textarea
              id="resumo"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...form.register("resumo")}
            />
          </div>

          <div className="space-y-2">
            <Label>Audio</Label>
            <FileUpload
              folder="gravacoes-audio"
              entityId={uploadEntityId}
              accept="audio/*"
              maxSizeMB={100}
              value={audioUrl || undefined}
              onChange={(url) => form.setValue("audioUrl", url || "")}
              label="Arraste ou clique para enviar o audio (MP3, M4A, WAV)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : isEditing ? "Salvar Alteracoes" : "Criar Gravacao"}
        </Button>
      </div>
    </form>
  );
}
