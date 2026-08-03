"use client";

import * as React from "react";
import { AvatarImage } from "@/shared/components/ui/avatar";
import { useSignedUrl } from "../hooks/useSignedUrl";

/**
 * Troca direta do <AvatarImage> para foto de pessoa, que vive no bucket
 * fechado. Assina a leitura sob demanda; enquanto nao resolve (ou se a leitura
 * nao for permitida) nao renderiza nada e o <AvatarFallback> irmao aparece
 * sozinho, que ja e o comportamento do Avatar quando falta imagem.
 */
export function PrivateAvatarImage({
  src,
  ...props
}: React.ComponentProps<typeof AvatarImage>) {
  const resolvida = useSignedUrl(typeof src === "string" ? src : undefined);
  if (!resolvida) return null;
  return <AvatarImage src={resolvida} {...props} />;
}

/**
 * Troca direta do <img> para imagem do bucket fechado. Sem URL resolvida,
 * renderiza `fallback` (ou nada) em vez de um icone de imagem quebrada.
 */
export function PrivateImage({
  src,
  fallback = null,
  ...props
}: Omit<React.ComponentProps<"img">, "src"> & {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}) {
  const resolvida = useSignedUrl(src);
  if (!resolvida) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvida} {...props} alt={props.alt ?? ""} />;
}
