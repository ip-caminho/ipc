"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";
import { EventCard, type EventCardData } from "./EventCard";

const LIMIT = 5;

const MASK =
  "linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)";

export function UpcomingEventsScroll() {
  const { can } = useAuth();
  const hoje = useMemo(() => new Date().toISOString().split("T")[0], []);
  const eventos = useQuery(
    api.calendario.queries.list,
    can("calendario:read") ? { dataInicio: hoje } : "skip",
  );

  if (eventos === undefined) return null;
  if (eventos.length === 0) return null;

  const proximos = (eventos as EventCardData[]).slice(0, LIMIT);

  return (
    <section>
      <SectionLabel
        className="mb-2 px-4"
        action={
          <Link
            href="/calendario"
            className="text-[11px] font-medium text-primary active:opacity-70"
          >
            Ver todos
          </Link>
        }
      >
        Próximos eventos
      </SectionLabel>

      <ul
        className="flex gap-2.5 overflow-x-auto scrollbar-none px-4 pr-6 pb-1 pt-1"
        style={{ maskImage: MASK, WebkitMaskImage: MASK }}
      >
        {proximos.map((e) => (
          <li key={e._id} className="shrink-0">
            <EventCard evento={e} />
          </li>
        ))}
      </ul>
    </section>
  );
}
