"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ModuloGuardProps {
  modulo: string;
  children: React.ReactNode;
}

export function ModuloGuard({ modulo, children }: ModuloGuardProps) {
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);
  const router = useRouter();

  const isLoading = modulosAtivos === undefined;
  const isAtivo = modulosAtivos?.includes(modulo) ?? false;

  useEffect(() => {
    if (!isLoading && !isAtivo) {
      router.push("/");
    }
  }, [isLoading, isAtivo, router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAtivo) return null;

  return <>{children}</>;
}
