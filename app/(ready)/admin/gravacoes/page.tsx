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
import {
  Search, ExternalLink, Plus, Globe, GlobeLock,
  Mic, BookOpen, Presentation, FileAudio,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Mic; color: string }> = {
  SERMAO: { label: "Sermao", icon: Mic, color: "text-blue-600 dark:text-blue-400" },
  ESTUDO_BIBLICO: { label: "Estudo", icon: BookOpen, color: "text-violet-600 dark:text-violet-400" },
  PALESTRA: { label: "Palestra", icon: Presentation, color: "text-teal-600 dark:text-teal-400" },
  OUTRO: { label: "Outro", icon: FileAudio, color: "text-amber-600 dark:text-amber-400" },
};

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
      {/* Tipo */}
      <td className="py-2 px-3 w-8">
        <TipoIcon className={`h-4 w-4 ${tipo.color}`} title={tipo.label} />
      </td>
      {/* Titulo + info */}
      <td className="py-2 px-3">
        <Link href={`/gravacoes/${g._id}/admin`} className="block group-hover:underline">
          <span className="font-medium text-sm leading-tight line-clamp-1">{g.titulo}</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {pregador && <span>{pregador}</span>}
          {g.textoBase && <span className="truncate max-w-[200px]">{g.textoBase}</span>}
        </div>
      </td>
      {/* Data */}
      <td className="py-2 px-3 text-sm text-muted-foreground whitespace-nowrap hidden sm:table-cell">
        {format(parseISO(g.data), "dd/MM/yy", { locale: ptBR })}
      </td>
      {/* Status */}
      <td className="py-2 px-3 hidden md:table-cell">
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
      {/* IA Status */}
      <td className="py-2 px-3 hidden md:table-cell">
        <IaStatusBadge iaStatus={g.iaStatus} iaErro={g.iaErro} />
      </td>
      {/* Ações */}
      <td className="py-2 px-3 text-right whitespace-nowrap">
        <div className="flex items-center gap-1 justify-end">
          {/* Mobile: badges inline */}
          <span className="md:hidden flex items-center gap-1">
            <Badge
              variant={isPublished ? "default" : "secondary"}
              className="text-[10px] cursor-pointer"
              onClick={toggleStatus}
            >
              {isPublished ? "Pub" : "Rasc"}
            </Badge>
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/gravacoes/${g._id}/admin`}>
              Gerenciar
            </Link>
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

export default function AdminGravacoesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [iaFilter, setIaFilter] = useState<string>("ALL");
  const [tipoFilter, setTipoFilter] = useState<string>("ALL");
  const debouncedSearch = useDebounce(search, 300);

  // @ts-ignore Convex TS2589
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const filtered = useMemo(() => {
    if (!gravacoes) return undefined;
    let result = gravacoes;
    if (tipoFilter !== "ALL") {
      result = result.filter((g: any) => g.tipo === tipoFilter);
    }
    if (iaFilter === "ALL") return result;
    return result.filter((g: any) => {
      if (iaFilter === "CONCLUIDO") return g.iaStatus === "CONCLUIDO";
      if (iaFilter === "PENDENTE") return !g.iaStatus || g.iaStatus === "PENDENTE";
      if (iaFilter === "ERRO") return g.iaStatus === "ERRO";
      if (iaFilter === "PROCESSANDO") return g.iaStatus === "TRANSCREVENDO" || g.iaStatus === "ANALISANDO";
      return true;
    });
  }, [gravacoes, iaFilter, tipoFilter]);

  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito a administradores</p>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Gravacoes</h1>
            {filtered && (
              <p className="text-sm text-muted-foreground">{filtered.length} gravacao(oes)</p>
            )}
          </div>
          <Button asChild>
            <Link href="/gravacoes/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["ALL", "RASCUNHO", "PUBLICADO"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "Todos" : s === "PUBLICADO" ? "Pub" : "Rasc"}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(["ALL", "SERMAO", "ESTUDO_BIBLICO", "PALESTRA", "OUTRO"] as const).map((t) => {
              const cfg = TIPO_CONFIG[t];
              return (
                <Button
                  key={t}
                  variant={tipoFilter === t ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTipoFilter(t)}
                >
                  {t === "ALL" ? "Tipo: Todos" : cfg?.label || t}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            {(["ALL", "CONCLUIDO", "PROCESSANDO", "PENDENTE", "ERRO"] as const).map((s) => (
              <Button
                key={s}
                variant={iaFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIaFilter(s)}
              >
                {s === "ALL" ? "IA: Todos" : s === "CONCLUIDO" ? "IA: OK" : s === "PROCESSANDO" ? "Proc." : s === "PENDENTE" ? "Pend." : "Erro"}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        {filtered === undefined ? (
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma gravacao encontrada</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
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
