"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAudioCompressor } from "@shared/files/hooks/useAudioCompressor";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";

const TIPOS = [
  { value: "SERMAO", label: "Sermão / Pregação" },
  { value: "ESTUDO_BIBLICO", label: "Estudo bíblico" },
  { value: "PALESTRA", label: "Palestra" },
  { value: "OUTRO", label: "Outro" },
] as const;

export function SubirAudioForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("k") ?? "";

  const check = useQuery(api.gravacoes.publicUpload.checkToken, { token });
  const getUploadUrl = useAction(api.files.upload.getPublicAudioUploadUrl);
  const createRascunho = useMutation(api.gravacoes.publicUpload.createRascunho);
  const { compress, isCompressing, progress } = useAudioCompressor();

  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>("SERMAO");
  const [nome, setNome] = useState("");
  const [observacao, setObservacao] = useState("");
  const [step, setStep] = useState<"idle" | "comprimindo" | "enviando" | "ok">("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = step === "comprimindo" || step === "enviando" || isCompressing;

  // Aceita arquivo do drop ou do seletor — exige tipo de audio
  function aceitarArquivo(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio");
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Selecione um arquivo de áudio");
      return;
    }
    try {
      // 1. Compressão client-side (qualquer áudio -> 64kbps mono MP3)
      setStep("comprimindo");
      const comprimido = await compress(file);

      // 2. Presigned + upload direto pro B2
      setStep("enviando");
      const { uploadUrl, publicUrl } = await getUploadUrl({
        token,
        mimeType: comprimido.type || "audio/mpeg",
        fileName: comprimido.name,
      });
      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": comprimido.type || "audio/mpeg",
          "Cache-Control": "public, max-age=31536000",
        },
        body: comprimido,
      });
      if (!resp.ok) throw new Error(`Upload falhou (${resp.status})`);

      // 3. Cria o rascunho (sem IA)
      await createRascunho({
        token,
        tipo: tipo as (typeof TIPOS)[number]["value"],
        audioUrl: publicUrl,
        nome: nome.trim() || undefined,
        observacao: observacao.trim() || undefined,
      });

      setStep("ok");
    } catch (err) {
      setStep("idle");
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    }
  }

  // Token ainda carregando
  if (check === undefined) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Link sem token válido
  if (!check.valid) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>
              Este link de envio não é válido ou expirou. Peça o link atualizado à
              secretaria.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  // Sucesso
  if (step === "ok") {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Áudio enviado!</CardTitle>
            <CardDescription>
              Recebido como rascunho. A equipe vai revisar e publicar. Obrigado!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setFile(null);
                setNome("");
                setObservacao("");
                setTipo("SERMAO");
                setStep("idle");
              }}
            >
              Enviar outro áudio
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <UploadCloud className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-center">Enviar áudio</CardTitle>
          <CardDescription className="text-center">
            Igreja Presbiteriana do Caminho — gravações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="audio">Arquivo de áudio</Label>
              <input
                ref={inputRef}
                id="audio"
                type="file"
                accept="audio/*"
                className="sr-only"
                disabled={busy}
                onChange={(e) => aceitarArquivo(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (!busy) aceitarArquivo(e.dataTransfer.files?.[0]);
                }}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50 hover:bg-accent/40"
                } ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
                {file ? (
                  <span className="text-sm font-medium break-all">
                    {file.name}{" "}
                    <span className="text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Arraste o áudio aqui ou{" "}
                    <span className="font-medium text-foreground">toque para escolher</span>
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={tipo} onValueChange={setTipo} disabled={busy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Seu nome (opcional)</Label>
              <Input
                id="nome"
                value={nome}
                disabled={busy}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Quem está enviando"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                value={observacao}
                disabled={busy}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: pregador, data do culto, trecho a cortar…"
                rows={3}
              />
            </div>

            <Button type="submit" className="h-11 w-full" disabled={busy || !file}>
              {step === "comprimindo" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comprimindo… {progress}%
                </>
              )}
              {step === "enviando" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              )}
              {step === "idle" && "Enviar áudio"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              O áudio é compactado no seu aparelho antes de subir. Pode demorar um
              pouco em arquivos grandes.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
