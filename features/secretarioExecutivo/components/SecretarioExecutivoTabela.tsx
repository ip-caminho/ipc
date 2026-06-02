"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePickerField } from "@shared/components/DatePickerField";
import { ExternalLink, History } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import {
  CARGO_ECLESIASTICO_OPTIONS,
  STATUS_COLORS,
} from "@features/membros/lib/constants";
import { HistoricoEclesiasticoDrawer } from "./HistoricoEclesiasticoDrawer";

const TIPO_ROL_OPTIONS = [
  { value: "COMUNGANTE", label: "Comungante" },
  { value: "NAO_COMUNGANTE", label: "Nao comungante" },
  { value: "PARADEIRO_IGNORADO", label: "Paradeiro ignorado" },
] as const;

const NONE = "__none__";

export type MembroEclesiastico = {
  _id: string;
  entidade?: { nomeCompleto?: string; whatsapp?: string; status?: string };
  cargoEclesiastico?: string;
  rol?: string;
  tipoRolOverride?: string;
  numeroMatricula?: string;
  dataConversao?: string;
  dataBatismo?: string;
  dataMembresia?: string;
  sexo?: string;
  dataNascimento?: string;
  familiaHeadId?: string;
  familiaHeadNome?: string;
  familiaOrder?: number;
};

const COL_NOME = "sticky left-0 z-10 bg-background";

function LinhaMembro({
  membro,
  agrupar,
  inicioFamilia,
}: {
  membro: MembroEclesiastico;
  agrupar: boolean;
  inicioFamilia: boolean;
}) {
  // @ts-expect-error Convex TS2589
  const update = useMutation(api.membros.eclesiastico.updateEclesiastico);
  const membroId = membro._id as Id<"membros">;
  const [histOpen, setHistOpen] = useState(false);

  async function salvar(field: string, value: string) {
    try {
      await update({ membroId, data: { [field]: value } });
      toast.success("Salvo", { duration: 1200 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  function salvarSeMudou(field: string, atual: string, value: string) {
    if (value === atual) return;
    salvar(field, value);
  }

  const status = membro.entidade?.status || "ATIVO";
  const ehFilho = agrupar && membro.familiaOrder === 2;

  return (
    <TableRow className={cn(agrupar && inicioFamilia && "border-t-2 border-t-border")}>
      <TableCell className={cn(COL_NOME, "font-medium whitespace-nowrap")}>
        <Link
          href={`/secretario-executivo/${membro._id}`}
          className={cn("hover:underline", ehFilho && "pl-6 block text-muted-foreground")}
        >
          {membro.entidade?.nomeCompleto || "-"}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] || ""}`}>
          {status}
        </Badge>
      </TableCell>
      <TableCell>
        <Select
          value={membro.cargoEclesiastico || NONE}
          onValueChange={(v) => salvar("cargoEclesiastico", v === NONE ? "" : v)}
        >
          <SelectTrigger className="h-8 w-[190px] text-xs">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {CARGO_ECLESIASTICO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          key={membro.rol ?? ""}
          defaultValue={membro.rol ?? ""}
          onBlur={(e) => salvarSeMudou("rol", membro.rol ?? "", e.target.value)}
          className="h-8 w-20 text-xs"
        />
      </TableCell>
      <TableCell>
        <Select
          value={membro.tipoRolOverride || NONE}
          onValueChange={(v) => salvar("tipoRolOverride", v === NONE ? "" : v)}
        >
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue placeholder="Automatico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Automatico</SelectItem>
            {TIPO_ROL_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          key={membro.numeroMatricula ?? ""}
          defaultValue={membro.numeroMatricula ?? ""}
          onBlur={(e) => salvarSeMudou("numeroMatricula", membro.numeroMatricula ?? "", e.target.value)}
          className="h-8 w-24 text-xs"
        />
      </TableCell>
      <TableCell>
        <DatePickerField
          value={membro.dataConversao ?? ""}
          onChange={(iso) => salvar("dataConversao", iso)}
          className="h-8 w-[150px] text-xs"
        />
      </TableCell>
      <TableCell>
        <DatePickerField
          value={membro.dataBatismo ?? ""}
          onChange={(iso) => salvar("dataBatismo", iso)}
          className="h-8 w-[150px] text-xs"
        />
      </TableCell>
      <TableCell>
        <DatePickerField
          value={membro.dataMembresia ?? ""}
          onChange={(iso) => salvar("dataMembresia", iso)}
          className="h-8 w-[150px] text-xs"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Historico de alteracoes / reverter"
          >
            <History className="h-4 w-4" />
          </button>
          <Link
            href={`/secretario-executivo/${membro._id}`}
            className="text-muted-foreground hover:text-foreground"
            title="Abrir detalhe (admissao, demissao, atos, cargos)"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <HistoricoEclesiasticoDrawer
          membroId={membroId}
          nome={membro.entidade?.nomeCompleto || ""}
          open={histOpen}
          onOpenChange={setHistOpen}
        />
      </TableCell>
    </TableRow>
  );
}

export function SecretarioExecutivoTabela({
  membros,
  agrupar,
}: {
  membros: MembroEclesiastico[];
  agrupar: boolean;
}) {
  const ordenados = useMemo(() => {
    if (!agrupar) return membros;
    return [...membros].sort((a, b) => {
      const hn = (a.familiaHeadNome ?? "").localeCompare(b.familiaHeadNome ?? "");
      if (hn !== 0) return hn;
      if ((a.familiaHeadId ?? "") !== (b.familiaHeadId ?? "")) {
        return (a.familiaHeadId ?? "").localeCompare(b.familiaHeadId ?? "");
      }
      const oa = a.familiaOrder ?? 0;
      const ob = b.familiaOrder ?? 0;
      if (oa !== ob) return oa - ob;
      if (oa === 2) {
        // filhos: mais velho primeiro (data de nascimento mais antiga no topo)
        const da = a.dataNascimento || "9999-99-99";
        const db = b.dataNascimento || "9999-99-99";
        if (da !== db) return da < db ? -1 : 1;
      }
      return (a.entidade?.nomeCompleto ?? "").localeCompare(b.entidade?.nomeCompleto ?? "");
    });
  }, [membros, agrupar]);

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(COL_NOME, "whitespace-nowrap")}>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cargo eclesiastico</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Tipo de rol</TableHead>
            <TableHead>Matricula</TableHead>
            <TableHead>Conversao</TableHead>
            <TableHead>Batismo</TableHead>
            <TableHead>Membresia</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((m, i) => (
            <LinhaMembro
              key={m._id}
              membro={m}
              agrupar={agrupar}
              inicioFamilia={
                i > 0 && m.familiaHeadId !== ordenados[i - 1].familiaHeadId
              }
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
