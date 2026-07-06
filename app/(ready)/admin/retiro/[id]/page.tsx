"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ArrowLeft, BedDouble } from "lucide-react";
import { InscricaoDetalheDrawer } from "@features/retiro/components/InscricaoDetalheDrawer";
import { FundoEventoCard } from "@features/retiro/components/FundoEventoCard";
import { brl, dataBR } from "@features/retiro/lib/format";
import { consolidadoEvento } from "@convex/retiro/calculoHelpers";

type FiltroStatus = "TODAS" | "ATIVA" | "LISTA_ESPERA" | "CANCELADA";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ATIVA: { label: "Ativa", variant: "default" },
  LISTA_ESPERA: { label: "Espera", variant: "secondary" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function Conteudo({ retiroId }: { retiroId: Id<"retiros"> }) {
  // @ts-ignore Convex TS2589
  const acamp = useQuery(api.retiro.queries.getById, { id: retiroId });
  const inscricoes = useQuery(api.retiro.queries.listarInscricoes, { retiroId });
  const [filtro, setFiltro] = useState<FiltroStatus>("TODAS");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<Id<"inscricoesRetiro"> | null>(null);

  const lista = useMemo(() => {
    if (!inscricoes) return undefined;
    const t = normalize(busca);
    return inscricoes.filter((i) => {
      if (filtro !== "TODAS" && i.status !== filtro) return false;
      if (!t) return true;
      const alvo = normalize(
        `${i.responsavel.nome} ${i.participantesNomes.join(" ")} ${i.responsavel.whatsapp}`,
      );
      return alvo.includes(t);
    });
  }, [inscricoes, filtro, busca]);

  const resumo = useMemo(() => {
    if (!inscricoes) return null;
    const ativas = inscricoes.filter((i) => i.status === "ATIVA");
    return {
      ativas: ativas.length,
      espera: inscricoes.filter((i) => i.status === "LISTA_ESPERA").length,
      pessoas: ativas.reduce((s, i) => s + i.participantesQtd, 0),
      semMatching: ativas.reduce((s, i) => s + i.semMatching, 0),
    };
  }, [inscricoes]);

  // Consolidado financeiro derivado das linhas ja assinadas + aportes do
  // retiro — sem assinar resumoFinanceiro (leitura dupla da base).
  const consolidado = useMemo(
    () => (inscricoes && acamp ? consolidadoEvento(inscricoes, acamp.aportesFundo) : null),
    [inscricoes, acamp],
  );

  if (acamp === undefined || inscricoes === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (acamp === null) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">Retiro não encontrado.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/retiro">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retiros
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {dataBR(acamp.dataInicio)} a {dataBR(acamp.dataFim)}
          </p>
          <Button asChild variant="outline" size="sm" className="h-11 md:h-8">
            <Link href={`/admin/retiro/${retiroId}/quartos`}>
              <BedDouble className="mr-1 h-4 w-4" /> Quartos
            </Link>
          </Button>
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Inscrições ativas", resumo.ativas],
            ["Pessoas", resumo.pessoas],
            ["Lista de espera", resumo.espera],
            ["Duplos", `${acamp.duplosReservados}/${acamp.estoqueDuplos}`],
            ["Triplos", `${acamp.triplosReservados}/${acamp.estoqueTriplos}`],
          ].map(([label, valor]) => (
            <div key={label} className="rounded-md border p-3">
              <p className="text-2xl font-semibold leading-none tabular-nums">{valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}
      {consolidado && <FundoEventoCard retiroId={retiroId} resumo={consolidado} />}

      {resumo && resumo.semMatching > 0 && (
        <p className="text-xs text-amber-700">
          {resumo.semMatching} participante(s) ainda sem vínculo com a base de membros.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filtro} onValueChange={(val) => setFiltro(val as FiltroStatus)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas</SelectItem>
            <SelectItem value="ATIVA">Ativas</SelectItem>
            <SelectItem value="LISTA_ESPERA">Lista de espera</SelectItem>
            <SelectItem value="CANCELADA">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lista && lista.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma inscrição {inscricoes.length > 0 ? "corresponde ao filtro" : "ainda"}.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Quartos</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista?.map((i) => (
                  <TableRow
                    key={i._id}
                    className="cursor-pointer"
                    onClick={() => setAberta(i._id)}
                  >
                    <TableCell className="font-medium">{i.responsavel.nome}</TableCell>
                    <TableCell>
                      {i.participantesQtd}
                      {i.semMatching > 0 && i.status !== "CANCELADA" && (
                        <span className="ml-1 text-xs text-amber-700">({i.semMatching} s/ vínculo)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {i.hospedagem.quartosDuplos}D + {i.hospedagem.quartosTriplos}T
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(i.valorFinal)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.saldo <= 0 ? (
                        <Badge variant="outline">Quitada</Badge>
                      ) : (
                        brl(i.saldo)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[i.status].variant}>
                        {STATUS_BADGE[i.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards de leitura (edicao no drawer) */}
          <div className="space-y-2 md:hidden">
            {lista?.map((i) => (
              <button
                key={i._id}
                type="button"
                onClick={() => setAberta(i._id)}
                className="w-full rounded-lg border p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{i.responsavel.nome}</p>
                  <Badge variant={STATUS_BADGE[i.status].variant}>
                    {STATUS_BADGE[i.status].label}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {i.participantesQtd} pessoa(s) · {i.hospedagem.quartosDuplos}D+
                  {i.hospedagem.quartosTriplos}T · {brl(i.valorFinal)}
                  {i.saldo > 0 ? ` · falta ${brl(i.saldo)}` : " · quitada"}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <InscricaoDetalheDrawer
        inscricaoId={aberta}
        dataInicio={acamp.dataInicio}
        onOpenChange={(o) => !o && setAberta(null)}
      />
    </div>
  );
}

export default function RetiroDetalhePage() {
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
      <HeaderLayout>
        <PageHeader title="Inscrições do retiro" />
        <div className="mt-4">
          <Conteudo retiroId={params.id as Id<"retiros">} />
        </div>
      </HeaderLayout>
    </PermissionGate>
  );
}
