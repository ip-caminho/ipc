"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/components/ui/input-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Share2, Copy, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ShareGravacaoButton({
  gravacaoId,
  titulo,
}: {
  gravacaoId: Id<"gravacoes">;
  titulo: string;
}) {
  const info = useQuery(api.gravacoes.share.getShareInfo, { gravacaoId });
  const gerar = useMutation(api.gravacoes.share.gerarShareLink);
  const revogar = useMutation(api.gravacoes.share.revogarShareLink);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // null = sem permissao (query retorna null); undefined = carregando. Em ambos
  // oculta. So publicadas podem compartilhar.
  if (!info || !info.podeCompartilhar) return null;

  async function abrir() {
    setBusy(true);
    try {
      const { token } = await gerar({ gravacaoId });
      setUrl(`${window.location.origin}/g/${token}`);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar link");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevogar() {
    if (!confirm("Revogar o link? Quem tiver o link atual perde o acesso a esta gravação.")) return;
    setBusy(true);
    try {
      await revogar({ gravacaoId });
      setOpen(false);
      setUrl(null);
      toast.success("Link revogado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao revogar");
    } finally {
      setBusy(false);
    }
  }

  function enviarWa() {
    if (!url) return;
    const msg = encodeURIComponent(`Ouça "${titulo}": ${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-9" onClick={abrir} disabled={busy}>
        <Share2 className="mr-1.5 h-4 w-4" />
        Compartilhar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar gravação</DialogTitle>
            <DialogDescription>
              Link público para ouvir esta gravação sem login.
            </DialogDescription>
          </DialogHeader>
          {url && (
            <div className="space-y-3">
              <InputGroup>
                <InputGroupInput readOnly value={url} className="text-xs" />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-sm"
                    variant="outline"
                    aria-label="Copiar link"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      toast.success("Link copiado");
                    }}
                  >
                    <Copy />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-9" onClick={enviarWa}>
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-destructive"
                  onClick={handleRevogar}
                  disabled={busy}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Revogar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
