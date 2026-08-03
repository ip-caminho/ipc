"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils/cn";
import { useOpenSignedFile } from "../hooks/useOpenSignedFile";

/**
 * Link para documento do bucket fechado (comprovante, carta, certificado).
 * Substitui o <a href> estatico: a URL salva no banco nao abre sozinha, entao
 * assina no clique e so entao abre a aba.
 */
export function SignedFileLink({
  url,
  className,
  children,
}: {
  url: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  const { abrir, abrindo } = useOpenSignedFile();
  const carregando = abrindo === url;

  return (
    <button
      type="button"
      onClick={() => abrir(url)}
      disabled={carregando}
      className={cn("cursor-pointer disabled:opacity-60", className)}
    >
      {children}
    </button>
  );
}
