"use client";

import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Loader2, UploadCloud } from "lucide-react";
import { parseReais } from "../lib/format";

// Envio de comprovante pelo MEMBRO logado, direto no app (sem URL/codigo). Usa
// o token da propria inscricao pela via publica (getPublicComprovanteUploadUrl
// + enviarComprovante) — o membro nao tem inscricoes:manage p/ a via logada.
export function EnviarComprovanteDialog({
  token,
  titulo,
}: {
  token: string;
  titulo: string;
}) {
  // @ts-ignore Convex TS2589
  const getUploadUrl = useAction(api.files.upload.getPublicComprovanteUploadUrl);
  // @ts-ignore Convex TS2589
  const enviar = useMutation(api.public.acampamento.enviarComprovante);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleEnviar() {
    if (!file) {
      toast.error("Selecione o comprovante");
      return;
    }
    try {
      setEnviando(true);
      const { uploadUrl, publicUrl } = await getUploadUrl({
        token,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
      });
      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000",
        },
        body: file,
      });
      if (!resp.ok) throw new Error(`Upload falhou (${resp.status})`);
      await enviar({
        token,
        comprovanteUrl: publicUrl,
        valorInformado: valor.trim() ? parseReais(valor) : undefined,
        obs: obs.trim() || undefined,
      });
      toast.success("Comprovante enviado! A secretaria vai conferir.");
      setFile(null);
      setValor("");
      setObs("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9">
          <UploadCloud className="mr-1 h-4 w-4" /> Enviar comprovante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprovante — {titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Comprovante (imagem ou PDF)</Label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[88px] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-accent"
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
            <Label htmlFor="mi-valor">Valor pago (opcional)</Label>
            <Input
              id="mi-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mi-obs">Observação (opcional)</Label>
            <Textarea
              id="mi-obs"
              rows={2}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Pix, 1ª parcela…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={handleEnviar} disabled={enviando || !file}>
              {enviando ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
