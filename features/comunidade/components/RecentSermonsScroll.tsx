"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";
import { SermonCard, type SermonCardData } from "./SermonCard";

const LIMIT = 4;

const MASK =
  "linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)";

export function RecentSermonsScroll() {
  const sermoes = useQuery(api.gravacoes.queries.list, {
    tipo: "SERMAO",
    status: "PUBLICADO",
  });

  if (sermoes === undefined) return null;
  if (sermoes.length === 0) return null;

  const recentes = (sermoes as SermonCardData[]).slice(0, LIMIT);

  return (
    <section>
      <SectionLabel
        className="mb-2 px-4"
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

      <ul
        className="flex gap-2.5 overflow-x-auto scrollbar-none px-4 pr-6 pb-1 pt-1"
        style={{ maskImage: MASK, WebkitMaskImage: MASK }}
      >
        {recentes.map((s) => (
          <li key={s._id} className="shrink-0">
            <SermonCard sermon={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}
