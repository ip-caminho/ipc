"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TIPO_GRAVACAO_OPTIONS } from "@features/gravacoes/lib/constants";
import { useFileUpload } from "@/shared/files/hooks/useFileUpload";
import { useAudioCompressor } from "@/shared/files/hooks/useAudioCompressor";
import {
  Upload, Check, X, Loader2, FileAudio, Play,
} from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import Link from "next/link";

type FileStatus = "pendente" | "comprimindo" | "enviando" | "criando" | "concluido" | "erro";

interface BatchFile {
  id: string;
  file: File;
  name: string;
  size: number;
  data: string;
  tipo: string;
  status: FileStatus;
  progress: number;
  error?: string;
  gravacaoId?: string;
}

/** Extrai data YYYY-MM-DD do inicio do nome (formato "YYYY MM DD" ou "YYYY-MM-DD" ou "YYYYMMDD") */
function extractDateFromName(name: string): string {
  // "2025 03 30 titulo.mp3" → "2025-03-30"
  const spaced = name.match(/^(\d{4})\s+(\d{2})\s+(\d{2})/);
  if (spaced) return `${spaced[1]}-${spaced[2]}-${spaced[3]}`;

  // "2025-03-30 titulo.mp3"
  const dashed = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;

  // "20250330 titulo.mp3"
  const compact = name.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  return new Date().toISOString().split("T")[0];
}

export default function LoteGravacaoPage() {
  const createFromAudio = useMutation(api.gravacoes.ai.createFromAudio);
  const { upload } = useFileUpload();
  const { compress } = useAudioCompressor();

  const [files, setFiles] = useState<BatchFile[]>([]);
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: BatchFile[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("audio/"))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        data: extractDateFromName(f.name),
        tipo: "SERMAO",
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
    setStarted(true);
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

        // Criar gravacao com tipo e data individuais
        updateFile(bf.id, { status: "criando", progress: 80 });
        // Ler estado mais recente
        const current = files.find((f) => f.id === bf.id);
        const id = await createFromAudio({
          audioUrl: url,
          tipo: (current?.tipo || bf.tipo) as any,
          data: current?.data || bf.data,
        });

        updateFile(bf.id, { status: "concluido", progress: 100, gravacaoId: id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        updateFile(bf.id, { status: "erro", error: msg });
      }
    }

    toast.success("Lote finalizado");
  }, [files, compress, upload, createFromAudio, updateFile]);

  const pendingCount = files.filter((f) => f.status === "pendente").length;
  const completedCount = files.filter((f) => f.status === "concluido").length;
  const errorCount = files.filter((f) => f.status === "erro").length;
  const allDone = started && files.length > 0 && files.every((f) => f.status === "concluido" || f.status === "erro");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Upload em lote</h1>

      {/* Drop zone */}
      {!started && (
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
          <p className="text-xs text-muted-foreground mt-1">
            MP3, M4A, WAV — a data e extraida do nome (ex: 2025 03 30 sermao.mp3)
          </p>
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
      )}

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {files.length} arquivo(s)
                {completedCount > 0 && <> — <span className="text-green-600">{completedCount} ok</span></>}
                {errorCount > 0 && <> — <span className="text-red-600">{errorCount} erro(s)</span></>}
              </p>
              {allDone && (
                <Badge variant="default" className="text-xs">Concluido</Badge>
              )}
            </div>

            {/* Linhas */}
            <div className="border rounded-md divide-y">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-2 p-2">
                  {/* Status */}
                  <div className="shrink-0 w-6">
                    {f.status === "concluido" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : f.status === "erro" ? (
                      <X className="h-4 w-4 text-red-600" />
                    ) : f.status === "pendente" ? (
                      <FileAudio className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>

                  {/* Nome */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" title={f.name}>{f.name}</p>
                    {f.status !== "pendente" && f.status !== "concluido" && f.status !== "erro" && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${f.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {f.status === "comprimindo" ? "Comprimindo" : f.status === "enviando" ? "Enviando" : "Criando"}
                        </span>
                      </div>
                    )}
                    {f.status === "erro" && (
                      <p className="text-[10px] text-red-600 mt-0.5">{f.error}</p>
                    )}
                    {f.status === "concluido" && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">IA processando em segundo plano</p>
                    )}
                  </div>

                  {/* Data */}
                  <Input
                    type="date"
                    value={f.data}
                    onChange={(e) => updateFile(f.id, { data: e.target.value })}
                    disabled={f.status !== "pendente"}
                    className="w-[130px] h-7 text-xs shrink-0"
                  />

                  {/* Tipo */}
                  <Select
                    value={f.tipo}
                    onValueChange={(v) => updateFile(f.id, { tipo: v })}
                    disabled={f.status !== "pendente"}
                  >
                    <SelectTrigger className="w-[110px] h-7 text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_GRAVACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Ações */}
                  {f.status === "pendente" && !started && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(f.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {f.gravacaoId && (
                    <Button variant="ghost" size="sm" className="text-[10px] h-7 shrink-0" asChild>
                      <Link href={`/gravacoes/${f.gravacaoId}/admin`}>Ver</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Botões */}
            {!started && pendingCount > 0 && (
              <Button onClick={processAll} className="w-full">
                <Play className="h-4 w-4 mr-1" />
                Processar {pendingCount} arquivo(s)
              </Button>
            )}

            {allDone && (
              <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/admin/gravacoes">Ver gravacoes</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => { setFiles([]); setStarted(false); }}
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
