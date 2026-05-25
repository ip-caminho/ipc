"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { AlertCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";

const MESES_ALERTA = 6;
const MS_ALERTA = MESES_ALERTA * 30 * 24 * 60 * 60 * 1000;

export function PerfilDesatualizadoCard() {
  const profile = useQuery(api.membros.selfService.getMyProfile);
  const [mountedAt] = useState(() => Date.now());

  if (!profile?.entidade) return null;

  const atualizadoEm = profile.entidade.perfilAtualizadoEm as number | undefined;
  const desatualizado = !atualizadoEm || mountedAt - atualizadoEm > MS_ALERTA;

  if (!desatualizado) return null;

  return (
    <Link
      href="/meu-perfil"
      className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 active:opacity-80 transition-opacity"
    >
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Atualize seu perfil</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {atualizadoEm
            ? "Seus dados nao sao confirmados ha mais de 6 meses"
            : "Seu cadastro nunca foi confirmado"}
        </p>
      </div>
    </Link>
  );
}
