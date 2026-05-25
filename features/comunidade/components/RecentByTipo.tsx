"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";
import { AudioListItem, type AudioListItemData } from "@features/gravacoes/components/AudioListItem";

const LIMIT = 4;

interface RecentByTipoProps {
  titulo: string;
  tipo: string;
}

export function RecentByTipo({ titulo, tipo }: RecentByTipoProps) {
  const { can } = useAuth();
  const gravacoes = useQuery(
    api.gravacoes.queries.list,
    can("gravacoes:read")
      ? { tipo, status: "PUBLICADO" }
      : "skip",
  );

  if (gravacoes === undefined) return null;
  if (gravacoes.length === 0) return null;

  const recentes = (gravacoes as AudioListItemData[])
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, LIMIT);

  return (
    <section className="px-4">
      <SectionLabel
        className="mb-1"
        action={
          <Link
            href={`/gravacoes?tipo=${tipo}`}
            className="text-[11px] font-medium text-primary active:opacity-70"
          >
            Ver todos
          </Link>
        }
      >
        {titulo}
      </SectionLabel>

      <div className="divide-y divide-border">
        {recentes.map((g) => (
          <AudioListItem key={g._id} audio={g} />
        ))}
      </div>
    </section>
  );
}
