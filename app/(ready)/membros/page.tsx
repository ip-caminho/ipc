"use client";

import { useQuery } from "convex/react";
import { parseAsString, useQueryState } from "nuqs";
import { api } from "@/convex/_generated/api";
import { MembroTable, type MembroRow } from "@features/membros/components/MembroTable";
import { MembrosFilterBar } from "@features/membros/components/MembrosFilterBar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useDebounce } from "@shared/hooks/useDebounce";

export default function MembrosPage() {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault(""));
  const [cargo, setCargo] = useQueryState("cargo", parseAsString.withDefault(""));
  const debouncedSearch = useDebounce(search, 300);

  const queryStatus = status === "TODOS" ? "TODOS" : status || undefined;
  // @ts-ignore Convex TS2589
  const membros = useQuery(api.membros.queries.list, {
    search: debouncedSearch || undefined,
    status: queryStatus,
    cargoEclesiastico: cargo && cargo !== "TODOS" ? cargo : undefined,
  });

  return (
    <ModuloGuard modulo="membros">
    <HeaderLayout>
    <div className="space-y-4">
      <PageHeader title="Membros" />

      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate permission="membros:create">
            <Button asChild size="sm">
              <Link href="/membros/novo">
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Novo Membro</span>
              </Link>
            </Button>
          </PermissionGate>
        </div>
      </div>

      <MembrosFilterBar
        status={status}
        onStatusChange={(v) => setStatus(v || null)}
        cargo={cargo}
        onCargoChange={(v) => setCargo(v === "TODOS" ? null : v)}
      />

      {membros !== undefined && (
        <p className="text-xs text-muted-foreground">
          {membros.length} membro{membros.length !== 1 && "s"} encontrado{membros.length !== 1 && "s"}
        </p>
      )}

      {membros === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <MembroTable data={membros as MembroRow[]} />
      )}
    </div>
    </HeaderLayout>
    </ModuloGuard>
  );
}
