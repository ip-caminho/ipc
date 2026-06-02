"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, BookMarked, Users } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { cn } from "@shared/lib/utils/cn";
import {
  SecretarioExecutivoTabela,
  type MembroEclesiastico,
} from "@features/secretarioExecutivo/components/SecretarioExecutivoTabela";

export default function SecretarioExecutivoPage() {
  const [search, setSearch] = useState("");
  const [agrupar, setAgrupar] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const membros = useQuery(api.membros.eclesiastico.listParaSecretario, {
    search: debouncedSearch || undefined,
  });

  return (
    <PermissionGate permission="membros:update_eclesiastico">
      <HeaderLayout>
        <div className="space-y-4">
          <PageHeader
            title="Secretario Executivo"
            subtitle="Edicao tabular de dados eclesiasticos"
          />

          <div className="rounded-md border bg-muted/30 p-3 flex items-start gap-2">
            <BookMarked className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Edite cargo, rol, matricula e datas sacramentais direto na tabela
              (salva automaticamente ao sair do campo). Agrupe por familia para
              revisar por nucleo (chefe, conjuge e filhos). Para admissao,
              demissao, atos e cargos, abra o detalhe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant={agrupar ? "default" : "outline"}
              size="sm"
              onClick={() => setAgrupar((v) => !v)}
              className={cn(agrupar && "shadow-sm")}
            >
              <Users className="h-4 w-4 mr-1.5" />
              {agrupar ? "Agrupado por familia" : "Agrupar por familia"}
            </Button>
          </div>

          {membros === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : membros.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum membro encontrado.
            </p>
          ) : (
            <SecretarioExecutivoTabela
              membros={membros as MembroEclesiastico[]}
              agrupar={agrupar}
            />
          )}
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
