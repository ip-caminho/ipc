"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/shared/components/ui/input-group";
import { Copy, MessageCircle, Headphones, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RelatorioAcessosDialog } from "./RelatorioAcessosDialog";

export function LinkConvidadoCard() {
  const data = useQuery(api.appConfig.queries.getConvidadoToken, {});
  const gerar = useMutation(api.appConfig.mutations.gerarTokenConvidado);
  const revogar = useMutation(api.appConfig.mutations.revogarTokenConvidado);
  const [busy, setBusy] = useState(false);

  // undefined = carregando; null = nao-admin (query retorna null). Em ambos, oculta.
  if (!data) return null;

  const token = data.token ?? null;
  const url = token ? `${window.location.origin}/convidado/${token}` : null;

  async function handleGerar() {
    setBusy(true);
    try {
      await gerar({});
      toast.success(token ? "Novo link gerado (o anterior parou de funcionar)" : "Link de convidado criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevogar() {
    if (!confirm("Revogar o link? Quem tiver o link atual perde o acesso.")) return;
    setBusy(true);
    try {
      await revogar({});
      toast.success("Link revogado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao revogar");
    } finally {
      setBusy(false);
    }
  }

  function enviarWa() {
    if (!url) return;
    const msg = encodeURIComponent(`Ouça as pregações da Igreja Presbiteriana do Caminho: ${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium leading-none">Link de convidado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Acesso às pregações sem login. Compartilhe o link único abaixo.
            </p>
          </div>
        </div>

        {url ? (
          <>
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
              <Button size="sm" variant="outline" className="h-9" onClick={handleGerar} disabled={busy}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Gerar novo
              </Button>
              <RelatorioAcessosDialog />
              <Button size="sm" variant="outline" className="h-9 text-destructive" onClick={handleRevogar} disabled={busy}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Revogar
              </Button>
            </div>
          </>
        ) : (
          <Button size="sm" className="h-9" onClick={handleGerar} disabled={busy}>
            <Headphones className="mr-1.5 h-4 w-4" />
            Criar link de convidado
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
