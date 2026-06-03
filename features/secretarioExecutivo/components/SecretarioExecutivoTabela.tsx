"use client";

import { useState, useMemo, Fragment } from "react";
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
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePickerField } from "@shared/components/DatePickerField";
import { ExternalLink, History, Users, UserPlus } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { CARGO_ECLESIASTICO_OPTIONS } from "@features/membros/lib/constants";
import { HistoricoEclesiasticoDrawer } from "./HistoricoEclesiasticoDrawer";

const NONE = "__none__";
const NUM_COLS = 10;
const COL_NOME = "sticky left-0 z-10 bg-background";

const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Ausente" },
  { value: "TRANSFERIDO", label: "Transferido" },
  { value: "DESLIGADO", label: "Excluido" },
  { value: "FALECIDO", label: "Falecido" },
] as const;

type RolCategoria = "PRINCIPAL" | "SEPARADO" | "AUSENTE" | "ARQUIVO";

const ROL_BADGE: Record<RolCategoria, { label: string; className: string }> = {
  PRINCIPAL: { label: "Principal", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  SEPARADO: { label: "Separado", className: "bg-sky-100 text-sky-800 border-sky-200" },
  AUSENTE: { label: "Ausente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  ARQUIVO: { label: "Arquivo", className: "bg-muted text-muted-foreground" },
};

export type MembroEclesiastico = {
  _id: string;
  ehMembro?: boolean;
  entidadeId?: string;
  entidade?: { nomeCompleto?: string; whatsapp?: string; status?: string };
  cargoEclesiastico?: string;
  numeroMatricula?: string;
  dataConversao?: string;
  dataBatismo?: string;
  dataMembresia?: string;
  civilmenteCapazes?: boolean;
  rolCategoria?: RolCategoria | null;
  sexo?: string;
  dataNascimento?: string;
  familiaHeadId?: string;
  familiaHeadNome?: string;
  familiaOrder?: number;
};

function LinhaMembro({ membro, agrupar }: { membro: MembroEclesiastico; agrupar: boolean }) {
  // @ts-expect-error Convex TS2589
  const update = useMutation(api.membros.eclesiastico.updateEclesiastico);
  // @ts-expect-error Convex TS2589
  const updateStatus = useMutation(api.membros.eclesiastico.updateStatus);
  const membroId = membro._id as Id<"membros">;
  const entidadeId = membro.entidadeId as Id<"entidades"> | undefined;
  const [histOpen, setHistOpen] = useState(false);

  async function salvar(field: string, value: unknown) {
    try {
      await update({ membroId, data: { [field]: value } });
      toast.success("Salvo", { duration: 1200 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }
  function salvarSeMudou(field: string, atual: string, value: string) {
    if (value !== atual) salvar(field, value);
  }
  async function salvarStatus(status: string) {
    if (!entidadeId) return;
    try {
      await updateStatus({ entidadeId, status });
      toast.success("Status atualizado", { duration: 1200 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar status");
    }
  }

  const status = membro.entidade?.status || "ATIVO";
  const rol = membro.rolCategoria ? ROL_BADGE[membro.rolCategoria] : null;
  const ehFilho = agrupar && membro.familiaOrder === 2;

  return (
    <TableRow>
      <TableCell className={cn(COL_NOME, "font-medium whitespace-nowrap")}>
        <Link href={`/secretario-executivo/${membro._id}`} className={cn("hover:underline", agrupar && "pl-6 block")}>
          {membro.entidade?.nomeCompleto || "-"}
          {ehFilho && <span className="ml-1 text-[10px] text-muted-foreground">(filho)</span>}
        </Link>
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={salvarStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        {rol ? (
          <Badge variant="outline" className={cn("text-xs", rol.className)}>
            {rol.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {membro.rolCategoria === "PRINCIPAL" ? (
          <Checkbox
            checked={!!membro.civilmenteCapazes}
            onCheckedChange={(c) => salvar("civilmenteCapazes", c === true)}
            title="Civilmente capaz"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
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
        <DatePickerField value={membro.dataConversao ?? ""} onChange={(iso) => salvar("dataConversao", iso)} className="h-8 w-[150px] text-xs" />
      </TableCell>
      <TableCell>
        <DatePickerField value={membro.dataBatismo ?? ""} onChange={(iso) => salvar("dataBatismo", iso)} className="h-8 w-[150px] text-xs" />
      </TableCell>
      <TableCell>
        <DatePickerField value={membro.dataMembresia ?? ""} onChange={(iso) => salvar("dataMembresia", iso)} className="h-8 w-[150px] text-xs" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setHistOpen(true)} className="text-muted-foreground hover:text-foreground" title="Historico / reverter">
            <History className="h-4 w-4" />
          </button>
          <Link href={`/secretario-executivo/${membro._id}`} className="text-muted-foreground hover:text-foreground" title="Abrir detalhe">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <HistoricoEclesiasticoDrawer membroId={membroId} nome={membro.entidade?.nomeCompleto || ""} open={histOpen} onOpenChange={setHistOpen} />
      </TableCell>
    </TableRow>
  );
}

function LinhaDependente({ dep }: { dep: MembroEclesiastico }) {
  const tornarMembro = useMutation(api.membros.eclesiastico.tornarMembro);
  const [loading, setLoading] = useState(false);

  async function promover() {
    if (!dep.entidadeId) return;
    setLoading(true);
    try {
      await tornarMembro({ entidadeId: dep.entidadeId as Id<"entidades"> });
      toast.success("Agora e membro — edite os dados eclesiasticos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao tornar membro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TableRow className="bg-muted/10">
      <TableCell className={cn(COL_NOME, "font-medium whitespace-nowrap")}>
        <span className="pl-6 block text-muted-foreground">
          {dep.entidade?.nomeCompleto || "-"}
          <span className="ml-1 text-[10px]">(filho)</span>
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">Dependente · nao membro</Badge>
      </TableCell>
      <TableCell colSpan={NUM_COLS - 3} className="text-xs text-muted-foreground">
        {dep.dataNascimento ? `Nascimento: ${dep.dataNascimento}` : "Sem dados eclesiasticos (nao e membro)"}
      </TableCell>
      <TableCell>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={promover} title="Criar registro de membro">
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          {loading ? "..." : "Tornar membro"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CabecalhoFamilia({ nome, total }: { nome: string; total: number }) {
  return (
    <TableRow className="border-t-2 border-t-border hover:bg-transparent">
      <TableCell colSpan={NUM_COLS} className={cn(COL_NOME, "bg-muted/60 py-2")}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          Familia {nome || "(sem chefe definido)"}
          <span className="text-xs font-normal text-muted-foreground">
            · {total} pessoa{total !== 1 ? "s" : ""}
          </span>
        </div>
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
  const linhas = useMemo(() => {
    if (!agrupar) return membros.filter((m) => m.ehMembro !== false);
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
        const da = a.dataNascimento || "9999-99-99";
        const db = b.dataNascimento || "9999-99-99";
        if (da !== db) return da < db ? -1 : 1;
      }
      return (a.entidade?.nomeCompleto ?? "").localeCompare(b.entidade?.nomeCompleto ?? "");
    });
  }, [membros, agrupar]);

  const totalPorFamilia = useMemo(() => {
    const map = new Map<string, number>();
    if (agrupar) for (const l of linhas) {
      const k = l.familiaHeadId ?? "";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [linhas, agrupar]);

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(COL_NOME, "whitespace-nowrap")}>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cargo eclesiastico</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Civ. capaz</TableHead>
            <TableHead>Matricula</TableHead>
            <TableHead>Conversao</TableHead>
            <TableHead>Batismo</TableHead>
            <TableHead>Membresia</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((m, i) => {
            const novaFamilia = agrupar && (i === 0 || m.familiaHeadId !== linhas[i - 1].familiaHeadId);
            return (
              <Fragment key={m._id}>
                {novaFamilia && (
                  <CabecalhoFamilia
                    nome={m.familiaHeadNome ?? ""}
                    total={totalPorFamilia.get(m.familiaHeadId ?? "") ?? 1}
                  />
                )}
                {m.ehMembro === false ? (
                  <LinhaDependente dep={m} />
                ) : (
                  <LinhaMembro membro={m} agrupar={agrupar} />
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
