"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandLoader } from "@shared/components/layout/BrandLoader";

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
      router.push("/dashboard");
    }
  }, [isLoading, isAtivo, router]);

  if (isLoading) {
    return <BrandLoader />;
  }

  if (!isAtivo) return null;

  return <>{children}</>;
}
