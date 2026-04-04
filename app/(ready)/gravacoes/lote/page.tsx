"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { useFileUpload } from "@/shared/files/hooks/useFileUpload";
import { useAudioCompressor } from "@/shared/files/hooks/useAudioCompressor";
import {
  Upload, Check, X, Loader2, FileAudio,
  ArrowRight, ArrowLeft, Play,
} from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import Link from "next/link";

function getLastSunday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - diff);
  return sunday.toISOString().split("T")[0];
}

type FileStatus = "pendente" | "comprimindo" | "enviando" | "criando" | "concluido" | "erro";

interface BatchFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: FileStatus;
  progress: number;
  error?: string;
  gravacaoId?: string;
}

type Step = "config" | "files" | "processing";

export default function LoteGravacaoPage() {
  const createFromAudio = useMutation(api.gravacoes.ai.createFromAudio);
  const { upload } = useFileUpload();
  const { compress } = useAudioCompressor();

  const [step, setStep] = useState<Step>("config");
  const [tipo, setTipo] = useState<string>("SERMAO");
  const [data, setData] = useState(getLastSunday());
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: BatchFile[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("audio/"))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        status: "pendente" as FileStatus,
        progress: 0,
      }));

    if (newFiles.length === 0) {
      toast.error("Nenhum arquivo de audio selecionado");
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<BatchFile>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const processAll = useCallback(async () => {
    setProcessing(true);
    const pending = files.filter((f) => f.status === "pendente");

    for (const bf of pending) {
      try {
        // Comprimir
        updateFile(bf.id, { status: "comprimindo", progress: 20 });
        let fileToUpload = bf.file;
        if (bf.file.type.startsWith("audio/")) {
          fileToUpload = await compress(bf.file);
        }

        // Upload
        updateFile(bf.id, { status: "enviando", progress: 50 });
        const url = await upload(fileToUpload, "gravacoes-audio", "batch");

        // Criar gravacao
        updateFile(bf.id, { status: "criando", progress: 80 });
        const id = await createFromAudio({
          audioUrl: url,
          tipo: tipo as any,
          data,
        });

        updateFile(bf.id, { status: "concluido", progress: 100, gravacaoId: id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        updateFile(bf.id, { status: "erro", error: msg });
      }
    }

    setProcessing(false);
    toast.success("Lote finalizado");
  }, [files, tipo, data, compress, upload, createFromAudio, updateFile]);

  const completedCount = files.filter((f) => f.status === "concluido").length;
  const errorCount = files.filter((f) => f.status === "erro").length;
  const allDone = files.length > 0 && files.every((f) => f.status === "concluido" || f.status === "erro");

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Upload em lote</h1>

      {/* Step 1: Config */}
      {step === "config" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Todos os arquivos serao criados com o mesmo tipo e data. Voce pode alterar individualmente depois.
            </p>

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
                <Label>Data</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep("files")}>
              Continuar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Selecionar arquivos */}
      {step === "files" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Selecione os audios</h2>
              <p className="text-sm text-muted-foreground">
                Arraste ou clique para adicionar. Todos serao comprimidos e enviados um por um.
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors",
                "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
              }}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste audios aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">MP3, M4A, WAV</p>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              />
            </div>

            {/* Lista de arquivos */}
            {files.length > 0 && (
              <div className="border rounded-md divide-y">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3">
                    <FileAudio className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(f.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("config")} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button
                onClick={() => { setStep("processing"); processAll(); }}
                disabled={files.length === 0}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-1" />
                Processar {files.length} arquivo(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Processamento */}
      {step === "processing" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {allDone ? "Lote finalizado" : "Processando..."}
              </h2>
              <div className="flex gap-1.5">
                {completedCount > 0 && (
                  <Badge variant="default" className="text-xs">{completedCount} ok</Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{errorCount} erro(s)</Badge>
                )}
              </div>
            </div>

            {allDone && (
              <p className="text-sm text-muted-foreground">
                O processamento com IA continua em segundo plano. Voce pode fechar esta pagina.
              </p>
            )}

            {/* Lista com status */}
            <div className="border rounded-md divide-y">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3">
                  {/* Icone de status */}
                  <div className="shrink-0">
                    {f.status === "concluido" ? (
                      <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                    ) : f.status === "erro" ? (
                      <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </div>
                    ) : f.status === "pendente" ? (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <FileAudio className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    ) : (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.status === "comprimindo" && "Comprimindo audio..."}
                      {f.status === "enviando" && "Enviando para o servidor..."}
                      {f.status === "criando" && "Criando gravacao..."}
                      {f.status === "concluido" && "Enviado — IA processando em segundo plano"}
                      {f.status === "erro" && (f.error || "Erro")}
                      {f.status === "pendente" && "Aguardando..."}
                    </p>
                    {/* Barra de progresso */}
                    {f.status !== "pendente" && f.status !== "concluido" && f.status !== "erro" && (
                      <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Link gerenciar */}
                  {f.gravacaoId && (
                    <Button variant="ghost" size="sm" className="text-xs shrink-0" asChild>
                      <Link href={`/gravacoes/${f.gravacaoId}/admin`}>
                        Gerenciar
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {allDone && (
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/admin/gravacoes">Ver gravacoes</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setStep("config");
                    setFiles([]);
                  }}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Novo lote
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
