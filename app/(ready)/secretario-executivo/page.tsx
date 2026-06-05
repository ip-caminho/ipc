"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, Users, Printer } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { AnyPermissionGate } from "@shared/components/auth/PermissionGate";
import { cn } from "@shared/lib/utils/cn";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/shared/components/ui/tooltip";
import {
  SecretarioExecutivoTabela,
  type MembroEclesiastico,
} from "@features/secretarioExecutivo/components/SecretarioExecutivoTabela";
import { RolExportView } from "@features/secretarioExecutivo/components/RolExportView";

const DESCRICAO_FILTRO: Record<string, string> = {
  PRINCIPAL: "Comungantes (Rol Principal)",
  SEPARADO: "Nao-comungantes (Rol Separado)",
  AUSENTE: "Ausentes (paradeiro ignorado)",
  ARQUIVO: "Arquivo (transferidos/excluidos/falecidos)",
  DEPENDENTES: "Dependentes (nao membros)",
  PENDENCIA: "Pendencias de cadastro",
  PASTOR: "Pastores",
  PRESBITERO: "Presbiteros",
  DIACONO: "Diaconos",
  MANDATO_VENCIDO: "Mandatos vencidos (renovar/encerrar)",
  MANDATO_VENCENDO: "Mandatos a vencer em 90 dias",
  CIVILMENTE_CAPAZ: "Comungantes civilmente capazes (aptos a votar)",
};

const CARGOS = ["PASTOR", "PRESBITERO", "DIACONO"];

function filtrarPorCategoria(
  membros: MembroEclesiastico[],
  categoria: string | null
): MembroEclesiastico[] {
  if (categoria === "DEPENDENTES") return membros.filter((m) => m.ehMembro === false);
  if (categoria === "PENDENCIA") return membros.filter((m) => m.ehMembro !== false && m.pendencia);
  if (categoria === "MANDATO_VENCIDO") return membros.filter((m) => m.ehMembro !== false && m.mandatoVencido);
  if (categoria === "MANDATO_VENCENDO") return membros.filter((m) => m.ehMembro !== false && m.mandatoVencendo);
  if (categoria === "CIVILMENTE_CAPAZ") return membros.filter((m) => m.rolCategoria === "PRINCIPAL" && m.civilmenteCapazes);
  if (categoria && CARGOS.includes(categoria))
    return membros.filter((m) => m.ehMembro !== false && m.cargoEclesiastico === categoria);
  if (categoria) return membros.filter((m) => m.ehMembro !== false && m.rolCategoria === categoria);
  return membros.filter((m) => m.ehMembro !== false);
}

function CardNum({
  label,
  valor,
  ativo,
  cor,
  dica,
  onClick,
}: {
  label: string;
  valor: number | string;
  ativo?: boolean;
  cor?: string;
  dica?: string;
  onClick?: () => void;
}) {
  const botao = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-3 text-left transition-colors hover:bg-accent/40",
        ativo && "ring-2 ring-primary border-primary"
      )}
    >
      <p className={cn("text-2xl font-semibold leading-none", cor)}>{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </button>
  );
  if (!dica) return botao;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{botao}</TooltipTrigger>
      <TooltipContent className="max-w-[220px] text-xs">{dica}</TooltipContent>
    </Tooltip>
  );
}

export default function SecretarioExecutivoPage() {
  const [search, setSearch] = useState("");
  const [agrupar, setAgrupar] = useState(false);
  const [categoria, setCategoria] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const membros = useQuery(api.membros.eclesiastico.listParaSecretario, {
    search: debouncedSearch || undefined,
  });
  const resumo = useQuery(api.membros.eclesiastico.getResumoSecretario, {});

  function toggle(cat: string) {
    setCategoria((c) => (c === cat ? null : cat));
  }

  return (
    <AnyPermissionGate permissions={["rol:read", "rol:update"]}>
      <HeaderLayout>
        <div className="space-y-4">
          <PageHeader title="Rol de Membros" subtitle="Rol, familia e dados eclesiasticos" />

          {/* Dashboard */}
          {resumo === undefined ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  <CardNum label="Comungantes" valor={resumo.comungantes} cor="text-emerald-700" dica="Membros comungantes (fizeram profissao de fe) — Rol Principal." ativo={categoria === "PRINCIPAL"} onClick={() => toggle("PRINCIPAL")} />
                  <CardNum label="Civilmente capazes" valor={resumo.civilmenteCapazes} cor="text-emerald-700" dica="Comungantes com 18+ anos — aptos a votar na assembleia." ativo={categoria === "CIVILMENTE_CAPAZ"} onClick={() => toggle("CIVILMENTE_CAPAZ")} />
                  <CardNum label="Nao-comungantes" valor={resumo.naoComungantes} cor="text-sky-700" dica="Batizados na infancia, sem profissao de fe — Rol Separado." ativo={categoria === "SEPARADO"} onClick={() => toggle("SEPARADO")} />
                  <CardNum label="Ausentes" valor={resumo.ausentes} cor="text-amber-700" dica="Status Ausente (paradeiro ignorado)." ativo={categoria === "AUSENTE"} onClick={() => toggle("AUSENTE")} />
                  <CardNum label="Arquivo" valor={resumo.arquivo} dica="Transferidos, excluidos e falecidos (fora do rol)." ativo={categoria === "ARQUIVO"} onClick={() => toggle("ARQUIVO")} />
                  <CardNum label="Total no rol" valor={resumo.totalRol} dica="Comungantes + nao-comungantes. Clique para ver todos (limpa filtros)." ativo={categoria === null && !agrupar} onClick={() => { setCategoria(null); setAgrupar(false); }} />
                  <CardNum label="Familias" valor={resumo.familias} dica="Nucleos familiares. Clique para agrupar a tabela por familia." ativo={agrupar} onClick={() => { setCategoria(null); setAgrupar((v) => !v); }} />
                  <CardNum label="Dependentes" valor={resumo.dependentes} dica="Filhos nao-membros (sem batismo) vinculados a um membro." ativo={categoria === "DEPENDENTES"} onClick={() => toggle("DEPENDENTES")} />
                  <CardNum label="Pendencias" valor={resumo.pendencias} cor={resumo.pendencias > 0 ? "text-rose-700" : undefined} dica="Membros com cadastro eclesiastico incompleto (cargo, matricula ou data)." ativo={categoria === "PENDENCIA"} onClick={() => toggle("PENDENCIA")} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Oficiais:</span>
                  <CardNum label="Pastores" valor={resumo.pastores} dica="Membros com cargo de Pastor." ativo={categoria === "PASTOR"} onClick={() => toggle("PASTOR")} />
                  <CardNum label="Presbiteros" valor={resumo.presbiteros} dica="Membros com cargo de Presbitero." ativo={categoria === "PRESBITERO"} onClick={() => toggle("PRESBITERO")} />
                  <CardNum label="Diaconos" valor={resumo.diaconos} dica="Membros com cargo de Diacono." ativo={categoria === "DIACONO"} onClick={() => toggle("DIACONO")} />
                  {resumo.mandatosVencidos > 0 && (
                    <CardNum label="Mandatos vencidos" valor={resumo.mandatosVencidos} cor="text-rose-700" dica="Mandatos ativos com termino no passado — renovar ou encerrar." ativo={categoria === "MANDATO_VENCIDO"} onClick={() => toggle("MANDATO_VENCIDO")} />
                  )}
                  {resumo.mandatosVencendo > 0 && (
                    <CardNum label="A vencer (90d)" valor={resumo.mandatosVencendo} cor="text-amber-700" dica="Mandatos que terminam nos proximos 90 dias — preparar eleicao." ativo={categoria === "MANDATO_VENCENDO"} onClick={() => toggle("MANDATO_VENCENDO")} />
                  )}
                </div>
              </div>
            </TooltipProvider>
          )}

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong>Rol:</strong>{" "}
            <span className="text-emerald-700">Principal</span> = comungantes (profissao de fe;
            subcategoria civilmente capazes) · <span className="text-sky-700">Separado</span> =
            nao comungantes (batismo infantil) · <span className="text-amber-700">Ausente</span> =
            paradeiro ignorado · <span className="text-foreground">Arquivo</span> = transferidos,
            excluidos e falecidos. Edicao salva ao sair do campo; o Rol e derivado de cargo + status.
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
            <Button type="button" variant={agrupar ? "default" : "outline"} size="sm" onClick={() => setAgrupar((v) => !v)}>
              <Users className="h-4 w-4 mr-1.5" />
              {agrupar ? "Agrupado por familia" : "Agrupar por familia"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!membros || membros.length === 0}
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Imprimir lista
            </Button>
            {categoria && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setCategoria(null)}>
                Limpar filtro
              </Button>
            )}
          </div>

          {membros === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <SecretarioExecutivoTabela
              membros={membros as MembroEclesiastico[]}
              agrupar={agrupar}
              categoria={categoria}
            />
          )}
        </div>

        {membros && (
          <RolExportView
            rows={filtrarPorCategoria(membros as MembroEclesiastico[], categoria)}
            descricao={
              (categoria ? DESCRICAO_FILTRO[categoria] ?? "Membros" : "Todos os membros (em rol)") +
              (debouncedSearch ? ` · busca: "${debouncedSearch}"` : "")
            }
            dataHoje={new Date().toLocaleDateString("pt-BR")}
          />
        )}
      </HeaderLayout>
    </AnyPermissionGate>
  );
}
