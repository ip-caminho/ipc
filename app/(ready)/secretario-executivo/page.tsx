"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, ChevronRight, BookMarked } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import {
  CARGO_ECLESIASTICO_OPTIONS,
  STATUS_COLORS,
} from "@features/membros/lib/constants";

type MembroRow = {
  _id: string;
  entidade: {
    _id: string;
    nomeCompleto?: string;
    whatsapp?: string;
    status: string;
  };
  cargoEclesiastico?: string;
  rol?: string;
};

function MembroLinha({ membro }: { membro: MembroRow }) {
  const cargoOpt = CARGO_ECLESIASTICO_OPTIONS.find(
    (o) => o.value === membro.cargoEclesiastico
  );
  const status = membro.entidade?.status || "ATIVO";

  return (
    <Link
      href={`/secretario-executivo/${membro._id}`}
      className="flex items-center justify-between gap-3 rounded-md border bg-card p-4 hover:bg-accent/30 transition-colors"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium truncate">
          {membro.entidade?.nomeCompleto || "-"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {cargoOpt && (
            <Badge variant="outline" className="text-xs">
              {cargoOpt.label}
            </Badge>
          )}
          {membro.rol && (
            <Badge variant="outline" className="text-xs">
              Rol {membro.rol}
            </Badge>
          )}
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] || ""}`}>
            {status}
          </Badge>
          {membro.entidade?.whatsapp && (
            <span className="text-xs text-muted-foreground">
              {membro.entidade.whatsapp}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

export default function SecretarioExecutivoPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const membros = useQuery(api.membros.queries.list, {
    search: debouncedSearch || undefined,
  });

  return (
    <PermissionGate permission="membros:update_eclesiastico">
      <HeaderLayout>
        <div className="space-y-4">
          <PageHeader
            title="Secretario Executivo"
            subtitle="Consulta de dados basicos e edicao de dados eclesiasticos"
          />

          <div className="rounded-md border bg-muted/30 p-3 flex items-start gap-2">
            <BookMarked className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Voce pode visualizar todos os dados cadastrais e editar campos
              eclesiasticos: cargo, rol, datas sacramentais, admissao, demissao,
              atos pastorais e cargos. Dados pessoais (nome, contato, endereco)
              sao apenas para consulta.
            </p>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {membros === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : membros.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum membro encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {membros.map((m) => (
                <MembroLinha key={m._id} membro={m as MembroRow} />
              ))}
            </div>
          )}
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
