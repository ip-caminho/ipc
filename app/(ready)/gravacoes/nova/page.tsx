"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { Sparkles } from "lucide-react";

export default function NovaGravacaoPage() {
  const createFromAudio = useMutation(api.gravacoes.ai.createFromAudio);
  const router = useRouter();
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [tipo, setTipo] = useState<string>("SERMAO");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [creating, setCreating] = useState(false);

  const handleAudioUploaded = async (url: string | undefined) => {
    setAudioUrl(url);
    if (!url) return;

    setCreating(true);
    try {
      const id = await createFromAudio({
        audioUrl: url,
        tipo: tipo as any,
        data,
      });
      toast.success("Audio enviado — processamento com IA iniciado");
      router.push(`/gravacoes/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar gravacao");
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova Gravacao</CardTitle>
          <CardDescription>
            Envie o audio e a IA vai extrair titulo, resumo, texto base e conteudo para redes sociais automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
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
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Audio</Label>
            <FileUpload
              folder="gravacoes-audio"
              entityId="new"
              accept="audio/*"
              maxSizeMB={100}
              value={audioUrl}
              onChange={handleAudioUploaded}
              label="Arraste ou clique para enviar o audio (MP3, M4A, WAV)"
            />
          </div>

          {creating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Criando gravacao e iniciando processamento com IA...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
