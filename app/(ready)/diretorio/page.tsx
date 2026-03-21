"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Search, MessageCircle, MapPin, Briefcase, Users, CalendarDays, Baby, Cake, ChevronRight } from "lucide-react";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CARGO_ECLESIASTICO_OPTIONS } from "@features/membros/lib/constants";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";

const CARGO_FILTERS = [
  { value: null, label: "Todos", tooltip: "Todos os membros ativos da igreja" },
  { value: "membros", label: "Membros", tooltip: "Membros comungantes e nao comungantes" },
  { value: "obreiros", label: "Obreiros", tooltip: "Pastores, presbiteros e diaconos" },
  { value: "presbiteros", label: "Pastores e Presbiteros", tooltip: "Presbiteros regentes e docentes (pastores)" },
] as const;

const MEMBROS_CARGOS = ["MEMBRO_COMUNGANTE", "MEMBRO_NAO_COMUNGANTE"];
const OBREIROS_CARGOS = ["PASTOR", "PRESBITERO", "DIACONO"];

function formatWhatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

function isToday(dataNascimento: string): boolean {
  const [, m, d] = dataNascimento.split("-").map(Number);
  const now = new Date();
  return m === now.getMonth() + 1 && d === now.getDate();
}

function calcularIdade(dataNascimento: string): number {
  return differenceInYears(new Date(), parseISO(dataNascimento));
}

// ===== Ficha do Membro =====

function MembroFicha({ membroId, onClose }: { membroId: Id<"membros">; onClose: () => void }) {
  // @ts-ignore Convex TS2589
  const perfil = useQuery(api.membros.queries.getPublicProfile, { id: membroId });

  if (perfil === undefined) {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Carregando...</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!perfil) {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Membro nao encontrado</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const cargoLabel = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === perfil.cargoEclesiastico)?.label;

  const infoItems = [
    perfil.whatsapp && {
      key: "whatsapp",
      icon: MessageCircle,
      iconClass: "text-green-600 dark:text-green-500",
      content: (
        <a
          href={formatWhatsappLink(perfil.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 hover:underline transition-colors"
        >
          {perfil.whatsapp}
        </a>
      ),
    },
    perfil.dataNascimento && {
      key: "nascimento",
      icon: Cake,
      content: (
        <>
          {format(parseISO(perfil.dataNascimento), "dd 'de' MMMM", { locale: ptBR })}
          <span className="text-muted-foreground ml-1">
            ({calcularIdade(perfil.dataNascimento)} anos)
          </span>
        </>
      ),
    },
    perfil.profissao && {
      key: "profissao",
      icon: Briefcase,
      content: perfil.profissao,
    },
    (perfil.bairro || perfil.cidade) && {
      key: "local",
      icon: MapPin,
      content: [perfil.bairro, perfil.cidade].filter(Boolean).join(", "),
    },
    perfil.dataMembresia && {
      key: "membresia",
      icon: CalendarDays,
      content: `Membro desde ${format(parseISO(perfil.dataMembresia), "MMMM 'de' yyyy", { locale: ptBR })}`,
    },
    perfil.conjugeNome && {
      key: "conjuge",
      icon: Users,
      content: `Casado(a) com ${perfil.conjugeNome}`,
    },
    perfil.filhos && perfil.filhos.length > 0 && {
      key: "filhos",
      icon: Baby,
      content: (
        <div>
          {perfil.filhos.map((f: any, i: number) => (
            <p key={i}>
              {f.nome}
              {f.dataNascimento && (
                <span className="text-muted-foreground ml-1">
                  ({calcularIdade(f.dataNascimento)} anos)
                </span>
              )}
            </p>
          ))}
        </div>
      ),
      alignTop: true,
    },
    perfil.pgNome && {
      key: "pg",
      icon: Users,
      content: `PG ${perfil.pgNome}`,
    },
  ].filter(Boolean) as Array<{ key: string; icon: any; iconClass?: string; content: React.ReactNode; alignTop?: boolean }>;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">{perfil.nome}</SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-6 pt-2 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 ring-2 ring-border">
              {perfil.foto && <AvatarImage src={perfil.foto} />}
              <AvatarFallback className="text-3xl">{perfil.nome?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold leading-tight">
                {perfil.apelido || perfil.nome}
              </h2>
              {perfil.apelido && (
                <p className="text-sm text-muted-foreground">{perfil.nome}</p>
              )}
              {cargoLabel && (
                <Badge variant="secondary">{cargoLabel}</Badge>
              )}
            </div>
          </div>

          {/* Info */}
          {infoItems.length > 0 ? (
            <div className="border-t pt-6 space-y-5">
              {infoItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex ${item.alignTop ? "items-start" : "items-center"} gap-3 text-sm`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <item.icon className={`h-4 w-4 ${item.iconClass || "text-muted-foreground"}`} />
                  </div>
                  <span className={item.alignTop ? "pt-1.5" : ""}>{item.content}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma informacao adicional
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Pagina Principal =====

export default function DiretorioPage() {
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string | null>(null);
  const [selectedMembroId, setSelectedMembroId] = useState<Id<"membros"> | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  // @ts-ignore Convex TS2589
  const membros = useQuery(api.membros.queries.list, {
    search: debouncedSearch || undefined,
  });

  const sortedMembros = useMemo(() => {
    if (!membros) return undefined;
    let filtered = membros;
    if (cargoFilter === "membros") {
      filtered = filtered.filter((m: any) => MEMBROS_CARGOS.includes(m.cargoEclesiastico));
    } else if (cargoFilter === "obreiros") {
      filtered = filtered.filter((m: any) => OBREIROS_CARGOS.includes(m.cargoEclesiastico));
    } else if (cargoFilter === "presbiteros") {
      filtered = filtered.filter((m: any) => m.cargoEclesiastico === "PRESBITERO" || m.cargoEclesiastico === "PASTOR");
    }
    return [...filtered].sort((a: any, b: any) =>
      (a.entidade?.nomeCompleto || "").localeCompare(b.entidade?.nomeCompleto || "", "pt-BR")
    );
  }, [membros, cargoFilter]);

  return (
    <ModuloGuard modulo="diretorio">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diretorio</h1>
          <p className="text-muted-foreground">
            Encontre membros da igreja
            {sortedMembros !== undefined && (
              <span className="ml-1">({sortedMembros.length})</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <TooltipProvider delayDuration={300}>
          <div className="flex gap-1.5 flex-wrap">
            {CARGO_FILTERS.map((f) => (
              <Tooltip key={f.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant={cargoFilter === f.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCargoFilter(f.value)}
                    className="text-xs"
                  >
                    {f.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{f.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Grid de membros */}
      {sortedMembros === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : sortedMembros.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum membro encontrado
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMembros.map((m: any) => {
            const cargoLabel = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === m.cargoEclesiastico)?.label;
            const aniversarioHoje = m.entidade?.dataNascimento ? isToday(m.entidade.dataNascimento) : false;
            return (
              <Card
                key={m._id}
                className="group cursor-pointer border-transparent transition-colors hover:bg-accent"
                onClick={() => setSelectedMembroId(m._id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      {m.entidade?.foto && <AvatarImage src={m.entidade.foto} />}
                      <AvatarFallback className="text-base">{m.entidade?.nomeCompleto?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    {aniversarioHoje && (
                      <span className="absolute -top-1 -right-1 text-sm" title="Aniversariante!">🎂</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {m.entidade?.apelido || m.entidade?.nomeCompleto}
                    </p>
                    {cargoLabel && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">{cargoLabel}</Badge>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>

    {/* Ficha do membro */}
    {selectedMembroId && (
      <MembroFicha membroId={selectedMembroId} onClose={() => setSelectedMembroId(null)} />
    )}
    </ModuloGuard>
  );
}
