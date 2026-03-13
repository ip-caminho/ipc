"use client";

import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Eye } from "lucide-react";
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
          <Eye className="h-4 w-4" />
        </Button>
      );
    },
  },
];

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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhum membro encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
