"use client";

import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ResponsiveDataList } from "@/shared/components/ui/responsive-data-list";
import { ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import { STATUS_COLORS, CARGO_ECLESIASTICO_OPTIONS } from "../lib/constants";

interface MembroRow {
  _id: string;
  entidade: {
    _id: string;
    nomeCompleto?: string;
    whatsapp?: string;
    status: string;
    dataNascimento?: string;
  };
  cargoEclesiastico?: string;
  role: string;
  rol?: string;
}

const columns: ColumnDef<MembroRow>[] = [
  {
    accessorKey: "entidade.nomeCompleto",
    header: "Nome",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.entidade?.nomeCompleto || "-"}</span>
    ),
  },
  {
    accessorKey: "entidade.whatsapp",
    header: "WhatsApp",
    cell: ({ row }) => row.original.entidade?.whatsapp || "-",
  },
  {
    accessorKey: "cargoEclesiastico",
    header: "Cargo",
    cell: ({ row }) => {
      const cargo = row.original.cargoEclesiastico;
      const opt = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === cargo);
      return opt?.label || "-";
    },
  },
  {
    accessorKey: "rol",
    header: "Rol",
    cell: ({ row }) => row.original.rol || "-",
  },
  {
    accessorKey: "entidade.status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.entidade?.status || "ATIVO";
      return (
        <Badge variant="outline" className={STATUS_COLORS[status] || ""}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: function ActionsCell({ row }) {
      const router = useRouter();
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/membros/${row.original._id}`)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      );
    },
  },
];

function MembroMobileCard({ row }: { row: Row<MembroRow> }) {
  const router = useRouter();
  const m = row.original;
  const nome = m.entidade?.nomeCompleto || "-";
  const status = m.entidade?.status || "ATIVO";
  const cargoOpt = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === m.cargoEclesiastico);

  return (
    <button
      type="button"
      onClick={() => router.push(`/membros/${m._id}`)}
      className="flex items-start justify-between gap-3 rounded-md border bg-card p-4 text-left min-h-[72px] transition-colors active:bg-accent/50"
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="font-medium truncate">{nome}</div>
        {m.entidade?.whatsapp && (
          <div className="text-xs text-muted-foreground truncate">
            {m.entidade.whatsapp}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {cargoOpt && (
            <Badge variant="outline" className="text-xs">
              {cargoOpt.label}
            </Badge>
          )}
          {m.rol && (
            <Badge variant="outline" className="text-xs">
              Rol {m.rol}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-xs", STATUS_COLORS[status])}
          >
            {status}
          </Badge>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" aria-hidden />
    </button>
  );
}

interface MembroTableProps {
  data: MembroRow[];
}

export function MembroTable({ data }: MembroTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <ResponsiveDataList
      table={table}
      renderMobileCard={(row) => <MembroMobileCard row={row} />}
      emptyState="Nenhum membro encontrado"
    />
  );
}
