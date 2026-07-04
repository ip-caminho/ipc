"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Download, ArrowLeft, MoreHorizontal, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

const SISTEMA_LABEL: Record<string, string> = {
  nomeCompleto: "Nome completo",
  whatsapp: "WhatsApp",
  email: "E-mail",
  telefone: "Telefone",
  dataNascimento: "Nascimento",
  sexo: "Sexo",
};

type StatusResposta = "CONFIRMADA" | "LISTA_ESPERA";
type FiltroStatus = "TODAS" | StatusResposta;

function csvCell(v: unknown): string {
  const s = v == null ? "" : typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Remove acentos para busca tolerante.
function normalizeBusca(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function RespostasContent({ inscricaoId }: { inscricaoId: Id<"inscricoesEvento"> }) {
  // @ts-ignore Convex TS2589
  const inscricao = useQuery(api.inscricoesEvento.queries.getById, { id: inscricaoId });
  const respostas = useQuery(api.inscricoesEvento.queries.listarRespostas, {
    inscricaoId,
  });
  const moverStatus = useMutation(api.inscricoesEvento.mutations.moverStatusResposta);
  const excluirResposta = useMutation(api.inscricoesEvento.mutations.excluirResposta);

  const [filtro, setFiltro] = useState<FiltroStatus>("TODAS");
  const [busca, setBusca] = useState("");
  const [excluirId, setExcluirId] = useState<Id<"respostasInscricaoEvento"> | null>(null);

  const listaFiltrada = useMemo(() => {
    if (!respostas) return [];
    const termo = normalizeBusca(busca);
    return respostas.filter((r) => {
      if (filtro !== "TODAS" && r.status !== filtro) return false;
      if (!termo) return true;
      const alvo = normalizeBusca(Object.values(r.dadosSistema ?? {}).join(" "));
      return alvo.includes(termo);
    });
  }, [respostas, filtro, busca]);

  if (inscricao === undefined || respostas === undefined) {
    return (
      <HeaderLayout>
        <Skeleton className="h-64 w-full" />
      </HeaderLayout>
    );
  }
  if (inscricao === null) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6 text-muted-foreground">Inscrição não encontrada.</CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  const camposSistema = inscricao.camposSistema;
  const camposCustom = inscricao.camposCustom;

  const totalConfirmadas = respostas.filter((r) => r.status === "CONFIRMADA").length;
  const totalEspera = respostas.length - totalConfirmadas;

  async function mover(respostaId: Id<"respostasInscricaoEvento">, status: StatusResposta) {
    try {
      await moverStatus({ respostaId, status });
      toast.success(status === "CONFIRMADA" ? "Promovida para confirmada" : "Movida para lista de espera");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao mover");
    }
  }

  async function confirmarExclusao() {
    if (!excluirId) return;
    const id = excluirId;
    setExcluirId(null);
    try {
      await excluirResposta({ respostaId: id });
      toast.success("Resposta excluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  function exportCsv() {
    const header = [
      ...camposSistema.map((c) => SISTEMA_LABEL[c] ?? c),
      ...camposCustom.map((c) => c.label),
      "Status",
      "Origem",
      "Data",
    ];
    // Monta valores crus; a escapagem acontece uma única vez no join.
    const linhas = listaFiltrada.map((r) => [
      ...camposSistema.map((c) => r.dadosSistema?.[c] ?? ""),
      ...camposCustom.map((c) => r.dadosCustom?.[c.id] ?? ""),
      r.status === "LISTA_ESPERA" ? "Lista de espera" : "Confirmada",
      r.membroId ? "Membro" : "Anônimo",
      new Date(r.criadoEm).toLocaleString("pt-BR"),
    ]);
    const csv = [header, ...linhas].map((l) => l.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscritos-${inscricao!.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <HeaderLayout>
      <PageHeader title={`Respostas — ${inscricao.titulo}`} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/inscricoes">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{respostas.length} total</Badge>
            <Badge>{totalConfirmadas} confirmadas</Badge>
            {totalEspera > 0 && <Badge variant="outline">{totalEspera} na espera</Badge>}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por nome, e-mail, WhatsApp…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroStatus)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmadas</SelectItem>
                <SelectItem value="LISTA_ESPERA">Lista de espera</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={listaFiltrada.length === 0}
          >
            <Download className="mr-1 h-4 w-4" /> Exportar CSV
          </Button>
        </div>

        {respostas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma resposta ainda.
            </CardContent>
          </Card>
        ) : listaFiltrada.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma resposta corresponde ao filtro.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table containerClassName="max-h-[calc(100vh-18rem)] overflow-y-auto">
              <TableHeader className="sticky top-0 z-20 bg-background">
                <TableRow>
                  {camposSistema.map((c) => (
                    <TableHead key={c}>{SISTEMA_LABEL[c] ?? c}</TableHead>
                  ))}
                  {camposCustom.map((c) => (
                    <TableHead key={c.id}>{c.label}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listaFiltrada.map((r) => (
                  <TableRow key={r._id}>
                    {camposSistema.map((c) => (
                      <TableCell key={c}>{r.dadosSistema?.[c] ?? "—"}</TableCell>
                    ))}
                    {camposCustom.map((c) => {
                      const v = r.dadosCustom?.[c.id];
                      return (
                        <TableCell key={c.id}>
                          {typeof v === "boolean" ? (v ? "Sim" : "Não") : (v as string) || "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Badge variant={r.status === "LISTA_ESPERA" ? "secondary" : "default"}>
                        {r.status === "LISTA_ESPERA" ? "Espera" : "Confirmada"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.membroId ? "Membro" : "Anônimo"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.criadoEm).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.status === "LISTA_ESPERA" ? (
                            <DropdownMenuItem onClick={() => mover(r._id, "CONFIRMADA")}>
                              <ArrowUp className="mr-2 h-4 w-4" /> Promover para confirmada
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => mover(r._id, "LISTA_ESPERA")}>
                              <ArrowDown className="mr-2 h-4 w-4" /> Mover para espera
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setExcluirId(r._id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={excluirId !== null} onOpenChange={(o) => !o && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
            <AlertDialogDescription>
              A resposta será removida permanentemente. Se estava confirmada, a vaga é liberada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HeaderLayout>
  );
}

export default function RespostasPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGate
      permission="inscricoes:manage"
      fallback={
        <HeaderLayout>
          <Card>
            <CardContent className="p-6 text-muted-foreground">Acesso restrito.</CardContent>
          </Card>
        </HeaderLayout>
      }
    >
      <RespostasContent inscricaoId={params.id as Id<"inscricoesEvento">} />
    </PermissionGate>
  );
}
