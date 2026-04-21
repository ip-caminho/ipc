"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MembroTable } from "@features/membros/components/MembroTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useDebounce } from "@shared/hooks/useDebounce";

export default function MembrosPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const membros = useQuery(api.membros.queries.list, { search: debouncedSearch || undefined });

  return (
    <ModuloGuard modulo="membros">
    <HeaderLayout>
    <div className="space-y-4">
      <PageHeader title="Membros" />
      <div className="flex items-center justify-end">
        <PermissionGate permission="membros:create">
          <Button asChild>
            <Link href="/membros/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Link>
          </Button>
        </PermissionGate>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {membros === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <MembroTable data={membros as any} />
      )}
    </div>
    </HeaderLayout>
    </ModuloGuard>
  );
}
