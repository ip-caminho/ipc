"use client";

import { useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { brl, parseReais } from "../lib/format";

// Envio publico do comprovante (membro ou visitante) — link tokenizado, sem
// login. Apenas anexa: a secretaria confere o valor e registra o recebimento.
// Suporta parcelado (varios envios pelo mesmo link).
export function ComprovanteForm({ codigo }: { codigo: string }) {
  const token = codigo;

  const info = useQuery(api.public.retiro.getComprovanteInfo, { token });
  const getUploadUrl = useAction(api.files.upload.getPublicComprovanteUploadUrl);
  const enviar = useMutation(api.public.retiro.enviarComprovante);

  const [file, setFile] = useState<File | null>(null);
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [step, setStep] = useState<"idle" | "enviando" | "ok">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = step === "enviando";

  function aceitarArquivo(f: File | undefined | null) {
    if (!f) return;
    const ok = f.type.startsWith("image/") || f.type === "application/pdf";
    if (!ok) {
      toast.error("Envie uma imagem ou PDF do comprovante");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10MB)");
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Selecione o comprovante");
      return;
    }
    try {
      setStep("enviando");
      // 1. Presigned + upload direto pro B2
      const { uploadUrl, publicUrl, cacheControl } = await getUploadUrl({
        token,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
      });
      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Cache-Control": cacheControl,
        },
        body: file,
      });
      if (!resp.ok) throw new Error(`Upload falhou (${resp.status})`);

      // 2. Anexa o comprovante a inscricao (a conferir pela secretaria)
      await enviar({
        token,
        comprovanteUrl: publicUrl,
        valorInformado: valor.trim() ? parseReais(valor) : undefined,
        obs: obs.trim() || undefined,
      });

      setStep("ok");
    } catch (err) {
      setStep("idle");
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    }
  }

  // Carregando
  if (info === undefined) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Link invalido / inscricao cancelada
  if (info === null) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link inválido</CardTitle>
            <CardDescription>
              Este link não é válido ou a inscrição foi cancelada. Peça o link atualizado
              à secretaria.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  // Sucesso — permite enviar outro (parcelado)
  if (step === "ok") {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <CardTitle>Comprovante enviado!</CardTitle>
            <CardDescription>
              A secretaria vai conferir e registrar o pagamento. Pagou outra parcela? Você
              pode enviar mais um comprovante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setValor("");
                setObs("");
                setStep("idle");
              }}
            >
              Enviar outro comprovante
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
          <CardTitle>Comprovante de pagamento</CardTitle>
          <CardDescription>
            {info.responsavelNome} · {info.retiroTitulo}
            <br />
            Valor da inscrição: {brl(info.valorFinal)}
            {info.saldo > 0 && ` · falta ${brl(info.saldo)}`}
            {info.saldo <= 0 && info.recebido > 0 && " · pagamento em dia"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Comprovante (imagem ou PDF)</Label>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-accent"
              >
                <UploadCloud className="h-6 w-6" />
                {file ? file.name : "Toque para escolher o arquivo"}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => aceitarArquivo(e.target.files?.[0])}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor pago (opcional)</Label>
              <Input
                id="valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                rows={2}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Pix, 1ª parcela…"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !file}>
              {busy ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar comprovante"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
