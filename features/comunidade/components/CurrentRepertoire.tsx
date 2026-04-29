"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";

export function CurrentRepertoire() {
  const { can } = useAuth();
  const podeVerBoletim = can("escalas:read");
  const live = useQuery(
    api.boletim.queries.getLiveStatus,
    podeVerBoletim ? {} : "skip",
  );
  const cultoId = live?.proximoCulto?.cultoId ?? null;

  const setlist = useQuery(
    api.escalas.cultoLouvores.getCultoLouvoresEnriched,
    cultoId && podeVerBoletim ? { cultoId } : "skip",
  );

  if (!cultoId) return null;
  if (setlist === undefined) return null;

  const musicas = setlist.filter((item) => item.louvorId || item.titulo);
  if (musicas.length === 0) return null;

  return (
    <section className="px-4">
      <SectionLabel className="mb-2">Repertório de domingo</SectionLabel>

      <div className="rounded-md border p-2.5">
        <ol className="flex flex-col gap-1.5">
          {musicas.map((m, i) => {
            const tom = m.tomEscolhido || m.tomOriginal;
            const content = (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground tabular-nums w-5 shrink-0">
                  {i + 1}.
                </span>
                <span className="flex-1 min-w-0 truncate font-medium">
                  {m.titulo || "Sem título"}
                </span>
                {tom && (
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {tom}
                  </span>
                )}
              </div>
            );

            return (
              <li key={m._id}>
                {m.louvorId ? (
                  <Link
                    href={`/louvor/${m.louvorId as Id<"louvores">}`}
                    className="block py-0.5 active:opacity-70"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="py-0.5">{content}</div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-2 pt-2 border-t">
          <Link
            href="/louvor"
            className="text-[11px] text-primary font-medium active:opacity-70"
          >
            Ver cifras completas →
          </Link>
        </div>
      </div>
    </section>
  );
}
