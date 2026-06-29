"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Download, ArrowLeft } from "lucide-react";

const SISTEMA_LABEL: Record<string, string> = {
  nomeCompleto: "Nome completo",
  whatsapp: "WhatsApp",
  email: "E-mail",
  telefone: "Telefone",
  dataNascimento: "Nascimento",
  sexo: "Sexo",
};

function csvCell(v: unknown): string {
  const s = v == null ? "" : typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function RespostasContent({ inscricaoId }: { inscricaoId: Id<"inscricoesEvento"> }) {
  // @ts-ignore Convex TS2589
  const inscricao = useQuery(api.inscricoesEvento.queries.getById, { id: inscricaoId });
  const respostas = useQuery(api.inscricoesEvento.queries.listarRespostas, {
    inscricaoId,
  });

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

  function exportCsv() {
    const header = [
      ...camposSistema.map((c) => SISTEMA_LABEL[c] ?? c),
      ...camposCustom.map((c) => c.label),
      "Status",
      "Origem",
      "Data",
    ];
    const linhas = respostas!.map((r) => [
      ...camposSistema.map((c) => csvCell(r.dadosSistema?.[c])),
      ...camposCustom.map((c) => csvCell(r.dadosCustom?.[c.id])),
      csvCell(r.status === "LISTA_ESPERA" ? "Lista de espera" : "Confirmada"),
      csvCell(r.membroId ? "Membro" : "Anônimo"),
      csvCell(new Date(r.criadoEm).toLocaleString("pt-BR")),
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
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/site-publico/inscricoes">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={respostas.length === 0}
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
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {respostas.map((r) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </HeaderLayout>
  );
}

export default function RespostasPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGate
      permission="site_publico:manage"
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
