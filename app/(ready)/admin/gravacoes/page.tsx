"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { IaStatusBadge } from "@features/gravacoes/components/IaStatusBadge";
import { useIsMobile } from "@shared/hooks/use-mobile";
import {
  Search, ExternalLink, Plus, Globe, GlobeLock,
  Mic, BookOpen, Presentation, FileAudio,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Mic; color: string; bg: string }> = {
  SERMAO: { label: "Sermao", icon: Mic, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  ESTUDO_BIBLICO: { label: "Estudo", icon: BookOpen, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
  PALESTRA: { label: "Palestra", icon: Presentation, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/30" },
  OUTRO: { label: "Outro", icon: FileAudio, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
};

type SortField = "data" | "titulo" | "tipo" | "status";
type SortDir = "asc" | "desc";

// --- Desktop: Row ---

function GravacaoRow({ g }: { g: any }) {
  // @ts-ignore Convex TS2589
  const publishGravacao = useMutation(api.gravacoes.mutations.publish);
  // @ts-ignore Convex TS2589
  const unpublishGravacao = useMutation(api.gravacoes.mutations.update);
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;
  const isPublished = g.status === "PUBLICADO";
  const tipo = TIPO_CONFIG[g.tipo] || TIPO_CONFIG.OUTRO;
  const TipoIcon = tipo.icon;

  const toggleStatus = async () => {
    try {
      if (isPublished) {
        await unpublishGravacao({ id: g._id, data: { status: "RASCUNHO" } });
        toast.success("Gravacao despublicada");
      } else {
        await publishGravacao({ id: g._id });
        toast.success("Gravacao publicada");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar status");
    }
  };

  return (
    <tr className="border-b hover:bg-accent/50 transition-colors group">
      <td className="py-2 px-3 w-8">
        <span title={tipo.label}><TipoIcon className={`h-4 w-4 ${tipo.color}`} /></span>
      </td>
      <td className="py-2 px-3">
        <Link href={`/gravacoes/${g._id}/admin`} className="block group-hover:underline">
          <span className="font-medium text-sm leading-tight line-clamp-1">{g.titulo}</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {pregador && <span>{pregador}</span>}
          {g.textoBase && <span className="truncate max-w-[200px]">{g.textoBase}</span>}
        </div>
      </td>
      <td className="py-2 px-3 text-sm text-muted-foreground whitespace-nowrap">
        {format(parseISO(g.data), "dd/MM/yy", { locale: ptBR })}
      </td>
      <td className="py-2 px-3">
        <Badge
          variant={isPublished ? "default" : "secondary"}
          className="text-[10px] cursor-pointer"
          onClick={toggleStatus}
        >
          {isPublished ? (
            <><Globe className="h-3 w-3 mr-0.5" />Pub</>
          ) : (
            <><GlobeLock className="h-3 w-3 mr-0.5" />Rasc</>
          )}
        </Badge>
      </td>
      <td className="py-2 px-3">
        <IaStatusBadge iaStatus={g.iaStatus} iaErro={g.iaErro} />
      </td>
      <td className="py-2 px-3 text-right whitespace-nowrap">
        <div className="flex items-center gap-1 justify-end">
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/gravacoes/${g._id}/admin`}>Gerenciar</Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link href={`/gravacoes/${g._id}`}>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

// --- Mobile: Card compacto ---

function GravacaoMobileCard({ g }: { g: any }) {
  // @ts-ignore Convex TS2589
  const publishGravacao = useMutation(api.gravacoes.mutations.publish);
  // @ts-ignore Convex TS2589
  const unpublishGravacao = useMutation(api.gravacoes.mutations.update);
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;
  const isPublished = g.status === "PUBLICADO";
  const tipo = TIPO_CONFIG[g.tipo] || TIPO_CONFIG.OUTRO;
  const TipoIcon = tipo.icon;

  const toggleStatus = async () => {
    try {
      if (isPublished) {
        await unpublishGravacao({ id: g._id, data: { status: "RASCUNHO" } });
        toast.success("Gravacao despublicada");
      } else {
        await publishGravacao({ id: g._id });
        toast.success("Gravacao publicada");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao alterar status");
    }
  };

  return (
    <Link
      href={`/gravacoes/${g._id}/admin`}
      className="flex items-center gap-3 p-3 border-b active:bg-accent/50 transition-colors"
    >
      {/* Icone tipo */}
      <div className={`shrink-0 rounded-md p-2 ${tipo.bg}`}>
        <TipoIcon className={`h-4 w-4 ${tipo.color}`} />
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight line-clamp-1">{g.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {format(parseISO(g.data), "dd/MM/yy", { locale: ptBR })}
          </span>
          {pregador && (
            <span className="text-xs text-muted-foreground truncate">{pregador}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge
            variant={isPublished ? "default" : "secondary"}
            className="text-[10px] h-5 cursor-pointer"
            onClick={(e) => { e.preventDefault(); toggleStatus(); }}
          >
            {isPublished ? "Publicado" : "Rascunho"}
          </Badge>
          <IaStatusBadge iaStatus={g.iaStatus} iaErro={g.iaErro} />
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

// --- Sort Header ---

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      className="py-2 px-3 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

// --- Page ---

export default function AdminGravacoesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [iaFilter, setIaFilter] = useState<string>("ALL");
  const [tipoFilter, setTipoFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const debouncedSearch = useDebounce(search, 300);
  const isMobile = useIsMobile();

  // @ts-ignore Convex TS2589
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "data" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    if (!gravacoes) return undefined;
    let result = [...gravacoes];

    if (tipoFilter !== "ALL") {
      result = result.filter((g: any) => g.tipo === tipoFilter);
    }
    if (iaFilter !== "ALL") {
      result = result.filter((g: any) => {
        if (iaFilter === "CONCLUIDO") return g.iaStatus === "CONCLUIDO";
        if (iaFilter === "PENDENTE") return !g.iaStatus || g.iaStatus === "PENDENTE";
        if (iaFilter === "ERRO") return g.iaStatus === "ERRO";
        if (iaFilter === "PROCESSANDO") return g.iaStatus === "TRANSCREVENDO" || g.iaStatus === "ANALISANDO";
        return true;
      });
    }

    // Ordenar
    result.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === "data") cmp = a.data.localeCompare(b.data);
      else if (sortField === "titulo") cmp = (a.titulo || "").localeCompare(b.titulo || "");
      else if (sortField === "tipo") cmp = (a.tipo || "").localeCompare(b.tipo || "");
      else if (sortField === "status") cmp = (a.status || "").localeCompare(b.status || "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [gravacoes, iaFilter, tipoFilter, sortField, sortDir]);

  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito a administradores</p>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Gravacoes</h1>
            {filtered && (
              <p className="text-xs text-muted-foreground">{filtered.length} item(s)</p>
            )}
          </div>
          <Button size={isMobile ? "sm" : "default"} asChild>
            <Link href="/gravacoes/nova">
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {(["ALL", "RASCUNHO", "PUBLICADO"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "Todos" : s === "PUBLICADO" ? "Pub" : "Rasc"}
              </Button>
            ))}
            <span className="w-px h-5 bg-border shrink-0" />
            {(["ALL", "SERMAO", "ESTUDO_BIBLICO", "PALESTRA", "OUTRO"] as const).map((t) => {
              const cfg = TIPO_CONFIG[t];
              return (
                <Button
                  key={t}
                  variant={tipoFilter === t ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => setTipoFilter(t)}
                >
                  {t === "ALL" ? "Todos" : cfg?.label || t}
                </Button>
              );
            })}
            <span className="w-px h-5 bg-border shrink-0" />
            {(["ALL", "CONCLUIDO", "PENDENTE", "ERRO"] as const).map((s) => (
              <Button
                key={s}
                variant={iaFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={() => setIaFilter(s)}
              >
                {s === "ALL" ? "IA" : s === "CONCLUIDO" ? "OK" : s === "PENDENTE" ? "Pend" : "Erro"}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {filtered === undefined ? (
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma gravacao encontrada</p>
        ) : isMobile ? (
          // Mobile: cards compactos
          <div className="border rounded-md overflow-hidden divide-y">
            {filtered.map((g: any) => (
              <GravacaoMobileCard key={g._id} g={g} />
            ))}
          </div>
        ) : (
          // Desktop: tabela com sort
          <div className="border rounded-md overflow-auto max-h-[calc(100vh-16rem)]">
            <table className="w-full">
              <thead className="sticky top-0 z-20 bg-muted">
                <tr className="border-b">
                  <th className="py-2 px-3 w-8" />
                  <SortHeader label="Titulo" field="titulo" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Data" field="data" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                  <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">IA</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((g: any) => (
                  <GravacaoRow key={g._id} g={g} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
