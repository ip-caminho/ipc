"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeToE164 } from "@convex/messaging/phoneUtils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Copy, KeyRound, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function AcessoSection({ membroId }: { membroId: Id<"membros"> }) {
  const status = useQuery(api.membros.acesso.getStatusAcesso, { membroId });
  const gerarLink = useMutation(api.membros.acesso.gerarLink);
  const resetar = useMutation(api.membros.acesso.resetarAcesso);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetando, setResetando] = useState(false);

  async function handleResetar() {
    if (!confirm("Resetar o acesso? A pessoa perde o login atual e podera se cadastrar de novo (criar nova senha).")) return;
    setResetando(true);
    try {
      await resetar({ membroId });
      toast.success("Acesso resetado — pode fazer o primeiro acesso de novo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao resetar");
    } finally {
      setResetando(false);
    }
  }

  if (status === undefined || status === null) return null;

  async function handleGerar() {
    setLoading(true);
    try {
      const { token } = await gerarLink({ membroId });
      setLink(`${window.location.origin}/ativar/${token}`);
      setOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar link");
    } finally {
      setLoading(false);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  function enviarWhatsApp() {
    const fone = status?.whatsapp ? normalizeToE164(status.whatsapp).replace(/\D/g, "") : "";
    const msg = `Ola, ${status?.nome?.split(" ")[0] || ""}! Seu acesso ao sistema da igreja esta pronto. Crie sua senha neste link (valido por 7 dias): ${link}`;
    const url = fone
      ? `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Acesso ao sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {status.ativado ? (
            <Badge variant="default">Acesso ativado</Badge>
          ) : (
            <Badge variant="secondary">Sem acesso</Badge>
          )}
          {status.ativado && !status.onboardingCompleto && (
            <Badge variant="outline">Dados nao confirmados</Badge>
          )}
          {!status.ativado && status.temLinkPendente && (
            <Badge variant="outline">Link pendente</Badge>
          )}
        </div>

        {!status.ativado && (
          <Button onClick={handleGerar} disabled={loading} variant="outline" size="sm">
            {loading ? "Gerando..." : status.temLinkPendente ? "Gerar novo link" : "Gerar link de acesso"}
          </Button>
        )}

        {status.ativado && (
          <Button onClick={handleResetar} disabled={resetando} variant="outline" size="sm" className="text-destructive">
            {resetando ? "Resetando..." : "Resetar acesso (tratar como novo)"}
          </Button>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link de acesso</DialogTitle>
              <DialogDescription>
                Envie este link para o membro criar a senha. Valido por 7 dias.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button type="button" size="icon" variant="outline" onClick={copiar}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button type="button" onClick={enviarWhatsApp} className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar pelo WhatsApp
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
