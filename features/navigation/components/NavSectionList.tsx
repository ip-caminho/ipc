"use client";

// IMPORTANTE: paginas que consomem este componente devem ser Client Components
// (ter "use client" no topo). As constantes NavSection contem referencias a
// componentes LucideIcon, que nao sao serializaveis atraves da fronteira RSC.
// Sem "use client" na pagina, acessar a rota lanca server-side exception.

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { NavSection } from "@shared/constants/navigation";

interface NavSectionListProps {
  sections: NavSection[];
  emptyMessage?: string;
}

export function NavSectionList({ sections, emptyMessage }: NavSectionListProps) {
  const { can } = useAuth();
  // @ts-ignore Convex TS2589
  const modulosAtivos = useQuery(api.modulos.queries.listModulosAtivos);

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.modulo && modulosAtivos && !modulosAtivos.includes(item.modulo)) {
          return false;
        }
        if (item.permission && !can(item.permission)) {
          return false;
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  if (visibleSections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {emptyMessage ?? "Nenhum item disponível."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {visibleSections.map((section) => (
        <section key={section.titulo}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {section.titulo}
          </h2>
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {section.items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 min-h-[64px] hover:bg-muted/50 active:bg-muted transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-foreground leading-tight">
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
