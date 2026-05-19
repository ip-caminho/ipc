"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { MembroList } from "@features/secretarioExecutivo/components/MembroList";
import { cn } from "@shared/lib/utils/cn";

export default function SecretarioExecutivoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const selectedId =
    typeof params.id === "string" ? params.id : undefined;
  const hasSelection = !!selectedId;

  return (
    <PermissionGate permission="membros:update_eclesiastico">
      <HeaderLayout>
        <div className="flex flex-col h-[calc(100dvh-var(--header-h,4rem))]">
          <div className="px-4 md:px-6 py-3 border-b shrink-0">
            <PageHeader
              title="Secretario Executivo"
              subtitle="Consulta de dados basicos e edicao de dados eclesiasticos"
            />
          </div>

          <div className="flex-1 min-h-0 md:grid md:grid-cols-[320px_1fr]">
            <aside
              className={cn(
                "border-r md:block",
                hasSelection ? "hidden" : "block",
              )}
            >
              <MembroList selectedId={selectedId} />
            </aside>
            <section
              className={cn(
                "min-h-0 overflow-y-auto",
                hasSelection ? "block" : "hidden md:block",
              )}
            >
              {children}
            </section>
          </div>
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
