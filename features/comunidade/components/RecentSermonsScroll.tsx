"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";
import { AudioListItem, type AudioListItemData } from "@features/gravacoes/components/AudioListItem";

const LIMIT = 6;

export function RecentSermonsScroll() {
  const { can } = useAuth();
  // listRecentesByTipo ja filtra PUBLICADO, ordena por data desc e limita no
  // servidor — evita baixar a tabela inteira para mostrar 6 itens
  const sermoes = useQuery(
    api.gravacoes.queries.listRecentesByTipo,
    can("gravacoes:read")
      ? { tipo: "SERMAO", limit: LIMIT }
      : "skip",
  );

  if (sermoes === undefined) return null;
  if (sermoes.length === 0) return null;

  const recentes = sermoes as AudioListItemData[];

  return (
    <section className="px-4">
      <SectionLabel
        className="mb-1"
        action={
          <Link
            href="/gravacoes"
            className="text-[11px] font-medium text-primary active:opacity-70"
          >
            Ver todos
          </Link>
        }
      >
        Sermões recentes
      </SectionLabel>

      <div className="divide-y divide-border">
        {recentes.map((s) => (
          <AudioListItem key={s._id} audio={s} />
        ))}
      </div>
    </section>
  );
}
