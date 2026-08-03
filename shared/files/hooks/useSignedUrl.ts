"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { doCache, precisaResolver, resolverUrl } from "../lib/signedUrls";

/**
 * URL exibivel a partir da URL salva no banco. Arquivo do bucket fechado vira
 * URL assinada temporaria; CDN e host externo passam direto.
 *
 * Retorna null enquanto assina (quem chama mostra placeholder/fallback) e
 * tambem quando a leitura nao e permitida.
 *
 * IMPORTANTE: isto e camada de EXIBICAO. O que vai para formulario e banco
 * continua sendo a URL canonica — nunca salve o retorno daqui.
 */
export function useSignedUrl(url: string | null | undefined): string | null {
  const getReadUrls = useAction(api.files.upload.getReadUrls);
  const [resolvida, setResolvida] = useState<string | null>(() => inicial(url));

  useEffect(() => {
    if (!url) {
      setResolvida(null);
      return;
    }
    if (!precisaResolver(url)) {
      setResolvida(url);
      return;
    }
    const pronta = doCache(url);
    if (pronta !== undefined) {
      setResolvida(pronta);
      return;
    }

    let vivo = true;
    setResolvida(null);
    resolverUrl(url, getReadUrls).then((v) => {
      if (vivo) setResolvida(v);
    });
    return () => {
      vivo = false;
    };
  }, [url, getReadUrls]);

  return resolvida;
}

// Evita um frame com a imagem vazia quando a URL ja esta em cache.
function inicial(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!precisaResolver(url)) return url;
  return doCache(url) ?? null;
}
