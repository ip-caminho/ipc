"use client";

import { useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Upload, X, Loader2, FileAudio, FileVideo, File as FileIcon } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { useFileUpload } from "../hooks/useFileUpload";
import { useAudioCompressor } from "../hooks/useAudioCompressor";
import { toast } from "sonner";

interface FileUploadProps {
  folder: string;
  entityId: string;
  accept?: string;
  maxSizeMB?: number;
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}

function getFileIcon(accept?: string) {
  if (accept?.includes("audio")) return FileAudio;
  if (accept?.includes("video")) return FileVideo;
  return FileIcon;
}

export function FileUpload({
  folder,
  entityId,
  accept,
  maxSizeMB = 50,
  value,
  onChange,
  label,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress: uploadProgress } = useFileUpload();
  const { compress, isCompressing, progress: compressProgress } = useAudioCompressor();
  const [dragOver, setDragOver] = useState(false);
  const Icon = getFileIcon(accept);
  const isAudio = accept?.includes("audio");

  const handleFile = async (file: File) => {
    // For audio, validate size AFTER compression (raw files can be huge)
    if (!isAudio && file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande (max ${maxSizeMB}MB)`);
      return;
    }

    try {
      let fileToUpload = file;

      // Compress audio files client-side (64kbps mono MP3)
      if (isAudio && file.type.startsWith("audio/")) {
        const originalSize = (file.size / 1024 / 1024).toFixed(1);
        fileToUpload = await compress(file);
        const compressedSize = (fileToUpload.size / 1024 / 1024).toFixed(1);
        if (fileToUpload !== file) {
          toast.info(`Audio comprimido: ${originalSize}MB → ${compressedSize}MB`);
        }
        // Validate after compression
        if (fileToUpload.size > maxSizeMB * 1024 * 1024) {
          toast.error(`Audio comprimido ainda muito grande (${compressedSize}MB, max ${maxSizeMB}MB)`);
          return;
        }
      }

      const url = await upload(fileToUpload, folder, entityId);
      onChange(url);
      toast.success("Arquivo enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar arquivo");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (value) {
    const fileName = decodeURIComponent(value.split("/").pop() || "arquivo");
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs flex-1 truncate">{fileName}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onChange(undefined)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const isBusy = isCompressing || isUploading;

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
        isBusy && "pointer-events-none opacity-60"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
      {isBusy ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isCompressing
              ? `Comprimindo audio... ${compressProgress}%`
              : `Enviando... ${uploadProgress}%`}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {label || "Clique ou arraste o arquivo"}
          </span>
        </div>
      )}
    </div>
  );
}
