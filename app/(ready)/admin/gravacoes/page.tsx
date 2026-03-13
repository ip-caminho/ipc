"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { IaStatusBadge } from "@features/gravacoes/components/IaStatusBadge";
import { Search, ExternalLink, Plus, Globe, GlobeLock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";

function GravacaoAdminCard({ g }: { g: any }) {
  // @ts-ignore Convex TS2589
  const publishGravacao = useMutation(api.gravacoes.mutations.publish);
  // @ts-ignore Convex TS2589
  const unpublishGravacao = useMutation(api.gravacoes.mutations.update);
  const pregador = g.pregadorNome || g.pregadorInfo?.nome;
  const isPublished = g.status === "PUBLICADO";

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
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-tight truncate">{g.titulo}</h3>
              <Badge
                variant={isPublished ? "default" : "secondary"}
                className="text-xs shrink-0 cursor-pointer"
                onClick={toggleStatus}
              >
                {isPublished ? (
                  <><Globe className="h-3 w-3 mr-1" />Publicado</>
                ) : (
                  <><GlobeLock className="h-3 w-3 mr-1" />Rascunho</>
                )}
              </Badge>
              <IaStatusBadge iaStatus={g.iaStatus} iaErro={g.iaErro} />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{format(parseISO(g.data), "dd/MM/yyyy", { locale: ptBR })}</span>
              {pregador && <span>{pregador}</span>}
              {g.textoBase && <span className="truncate">{g.textoBase}</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {g.audioUrl ? (
                <span className="text-green-600">Audio enviado</span>
              ) : (
                <span className="text-orange-500">Sem audio</span>
              )}
              {g.iaAvisos && g.iaAvisos.length > 0 && (
                <span>{g.iaAvisos.length} aviso(s)</span>
              )}
              {g.tags && g.tags.length > 0 && (
                <span>{g.tags.length} tag(s)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/gravacoes/${g._id}/admin`}>
                Gerenciar
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/gravacoes/${g._id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminGravacoesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [iaFilter, setIaFilter] = useState<string>("ALL");
  const debouncedSearch = useDebounce(search, 300);

  // @ts-ignore Convex TS2589
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const filtered = useMemo(() => {
    if (!gravacoes) return undefined;
    if (iaFilter === "ALL") return gravacoes;
    return gravacoes.filter((g: any) => {
      if (iaFilter === "CONCLUIDO") return g.iaStatus === "CONCLUIDO";
      if (iaFilter === "PENDENTE") return !g.iaStatus || g.iaStatus === "PENDENTE";
      if (iaFilter === "ERRO") return g.iaStatus === "ERRO";
      if (iaFilter === "PROCESSANDO") return g.iaStatus === "TRANSCREVENDO" || g.iaStatus === "ANALISANDO";
      return true;
    });
  }, [gravacoes, iaFilter]);

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
              Nova Gravacao
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por titulo, pregador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["ALL", "RASCUNHO", "PUBLICADO"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "Todos" : s === "PUBLICADO" ? "Publicado" : "Rascunho"}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(["ALL", "CONCLUIDO", "PROCESSANDO", "PENDENTE", "ERRO"] as const).map((s) => (
              <Button
                key={s}
                variant={iaFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setIaFilter(s)}
              >
                {s === "ALL" ? "IA: Todos" : s === "CONCLUIDO" ? "IA: OK" : s === "PROCESSANDO" ? "IA: Processando" : s === "PENDENTE" ? "IA: Pendente" : "IA: Erro"}
              </Button>
            ))}
          </div>
        </div>

        {filtered === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma gravacao encontrada</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((g: any) => (
              <GravacaoAdminCard key={g._id} g={g} />
            ))}
          </div>
        )}
      </div>
    </AdminGate>
  );
}
