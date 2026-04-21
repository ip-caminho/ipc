"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Plus, Search, Building2, User } from "lucide-react";
import Link from "next/link";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PAPEL_OPTIONS, STATUS_COLORS } from "@features/membros/lib/constants";

export default function EntidadesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const entidades = useQuery(api.entidades.queries.list, { search: debouncedSearch || undefined });

  return (
    <ModuloGuard modulo="entidades">
    <HeaderLayout>
    <div className="space-y-4">
      <PageHeader title="Entidades" />
      <div className="flex items-center justify-end">
        <PermissionGate permission="entidades:create">
          <Button asChild>
            <Link href="/entidades/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Entidade
            </Link>
          </Button>
        </PermissionGate>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {entidades === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {entidades.map((e: any) => (
            <Card key={e._id}>
              <CardContent className="p-4 flex items-center gap-3">
                {e.tipoEntidade === "PJ" ? (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {e.nomeCompleto || e.nomeRazaoSocial || "-"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{e.tipoEntidade}</Badge>
                    {e.papeis?.map((p: string) => {
                      const opt = PAPEL_OPTIONS.find((o) => o.value === p);
                      return (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {opt?.label || p}
                        </Badge>
                      );
                    })}
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[e.status] || ""}`}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{e.whatsapp || e.email || ""}</p>
              </CardContent>
            </Card>
          ))}
          {entidades.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Nenhuma entidade encontrada</p>
          )}
        </div>
      )}
    </div>
    </HeaderLayout>
    </ModuloGuard>
  );
}
