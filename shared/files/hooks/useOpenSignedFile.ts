"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

/**
 * Abre documento do bucket fechado (comprovante, carta, certificado) numa aba
 * nova. Como a URL do banco nao e mais acessivel direto, o link deixa de ser
 * um <a href> estatico: assina no clique e so entao abre.
 */
export function useOpenSignedFile() {
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const getReadUrl = useAction(api.files.upload.getReadUrl);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  async function abrir(url: string | null | undefined) {
    if (!url) return;
    // A aba precisa ser aberta AGORA, ainda dentro do clique: depois do await
    // da assinatura o browser ja perdeu a ativacao do usuario e bloqueia o
    // popup (Safari e Firefox silenciosamente).
    const aba = window.open("", "_blank", "noopener,noreferrer");
    try {
      setAbrindo(url);
      const assinada = await getReadUrl({ url });
      if (!assinada) {
        aba?.close();
        toast.error("Você não tem permissão para abrir este arquivo");
        return;
      }
      if (aba) {
        aba.location.href = assinada;
      } else {
        // Popup bloqueado mesmo assim: navega na propria aba.
        window.location.href = assinada;
      }
    } catch {
      aba?.close();
      toast.error("Não foi possível abrir o arquivo");
    } finally {
      setAbrindo(null);
    }
  }

  return { abrir, abrindo };
}
