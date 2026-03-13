"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { Sparkles, Upload, Youtube } from "lucide-react";

function getLastSunday(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - diff);
  return sunday.toISOString().split("T")[0];
}

function isValidYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)/.test(url);
}

export default function NovaGravacaoPage() {
  const createFromAudio = useMutation(api.gravacoes.ai.createFromAudio);
  const createFromYouTube = useMutation(api.gravacoes.ai.createFromYouTube);
  const router = useRouter();
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tipo, setTipo] = useState<string>("SERMAO");
  const [data, setData] = useState(getLastSunday());
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

  const handleYouTubeImport = async () => {
    if (!isValidYouTubeUrl(youtubeUrl)) {
      toast.error("URL do YouTube invalida");
      return;
    }

    setCreating(true);
    try {
      const id = await createFromYouTube({
        youtubeUrl,
        tipo: tipo as any,
        data,
      });
      toast.success("Importacao iniciada — baixando audio do YouTube");
      router.push(`/gravacoes/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar do YouTube");
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova Gravacao</CardTitle>
          <CardDescription>
            Envie o audio ou importe do YouTube. A IA vai extrair titulo, resumo, texto base e conteudo para redes sociais automaticamente.
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

          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload de audio
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex-1 gap-1.5">
                <Youtube className="h-3.5 w-3.5" />
                Importar do YouTube
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-2 mt-3">
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
            </TabsContent>

            <TabsContent value="youtube" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label htmlFor="youtube-url">URL do YouTube</Label>
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={creating}
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link do video. O audio sera extraido e processado automaticamente.
                </p>
              </div>
              <Button
                onClick={handleYouTubeImport}
                disabled={creating || !youtubeUrl}
                className="w-full"
              >
                <Youtube className="h-4 w-4 mr-1.5" />
                Importar audio do YouTube
              </Button>
            </TabsContent>
          </Tabs>

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
