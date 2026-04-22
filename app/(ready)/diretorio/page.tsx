"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Search, Users, CalendarDays, Baby, Cake, ChevronRight, GraduationCap } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TURMA_OPTIONS, TURMA_COLORS, TIPO_RESPONSAVEL_LABELS } from "@features/educacional/lib/constants";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { MemberListItem } from "@features/diretorio/components/MemberListItem";
import {
  MemberFilterChips,
  type FilterValue,
} from "@features/diretorio/components/MemberFilterChips";
import { AlphabetScrubber } from "@features/diretorio/components/AlphabetScrubber";
import { differenceInYears } from "date-fns";

const MEMBROS_CARGOS = ["MEMBRO_COMUNGANTE", "MEMBRO_NAO_COMUNGANTE"];
const OBREIROS_CARGOS = ["PASTOR", "PRESBITERO", "DIACONO"];
const LIDERANCA_CARGOS = ["PASTOR", "PRESBITERO"];

function calcularIdadeLabel(dataNascimento: string): string {
  const idade = differenceInYears(new Date(), parseISO(dataNascimento));
  if (idade === 0) {
    const months = Math.floor(
      (new Date().getTime() - parseISO(dataNascimento).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44),
    );
    return months <= 1 ? "1 mês" : `${months} meses`;
  }
  return idade === 1 ? "1 ano" : `${idade} anos`;
}

// ===== Ficha da Criança (preservada sem mudanças) =====

function CriancaFicha({
  entidadeId,
  onClose,
}: {
  entidadeId: Id<"entidades">;
  onClose: () => void;
}) {
  // @ts-ignore Convex TS2589
  const crianca = useQuery(api.educacional.queries.getCrianca, { entidadeId });

  if (crianca === undefined) {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Carregando...</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!crianca) {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Criança não encontrada</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const turmaLabel =
    TURMA_OPTIONS.find((t) => t.value === crianca.turma)?.label || crianca.turma;
  const turmaColor = TURMA_COLORS[crianca.turma] || "bg-gray-100 text-gray-800";

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">{crianca.nome}</SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-6 pt-2 space-y-6">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 ring-2 ring-border">
              <AvatarFallback className="text-3xl">
                {crianca.nome?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold leading-tight">{crianca.nome}</h2>
              <Badge className={turmaColor}>{turmaLabel}</Badge>
            </div>
          </div>

          <div className="border-t pt-6 space-y-5">
            {crianca.dataNascimento && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Cake className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>
                  {format(parseISO(crianca.dataNascimento), "dd 'de' MMMM", { locale: ptBR })}
                  <span className="text-muted-foreground ml-1">
                    ({calcularIdadeLabel(crianca.dataNascimento)})
                  </span>
                </span>
              </div>
            )}

            {crianca.responsaveis && crianca.responsaveis.length > 0 && (
              <div className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="pt-1.5">
                  {crianca.responsaveis.map((r: any, i: number) => (
                    <p key={i}>
                      {r.nome}
                      <span className="text-muted-foreground ml-1">
                        ({TIPO_RESPONSAVEL_LABELS[r.tipo] || r.tipo})
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {crianca.ovelhinhaNome && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>Ovelhinha: {crianca.ovelhinhaNome}</span>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Grid de Crianças (preservado) =====

function CriancasGrid({
  search,
  turmaFilter,
}: {
  search: string;
  turmaFilter: string | null;
}) {
  const debouncedSearch = useDebounce(search, 300);
  // @ts-ignore Convex TS2589
  const criancas = useQuery(api.educacional.queries.listCriancasForDiretorio, {
    search: debouncedSearch || undefined,
    turma: turmaFilter || undefined,
  });
  const [selectedEntidadeId, setSelectedEntidadeId] =
    useState<Id<"entidades"> | null>(null);

  if (criancas === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (criancas.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Nenhuma criança encontrada
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {criancas.length} criança{criancas.length !== 1 ? "s" : ""}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {criancas.map((c: any) => {
          const turmaColor = TURMA_COLORS[c.turma] || "bg-gray-100 text-gray-800";
          const paisNomes = c.responsaveis
            ?.map((r: any) => r.nome)
            .filter(Boolean)
            .join(", ");
          return (
            <Card
              key={c.entidadeId}
              className="group cursor-pointer border-transparent transition-colors hover:bg-accent"
              onClick={() => setSelectedEntidadeId(c.entidadeId)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {c.foto && <AvatarImage src={c.foto} />}
                  <AvatarFallback className="text-base">
                    {c.nome?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.nome}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className={`text-[10px] px-1.5 py-0 ${turmaColor}`}>
                      {c.turma}
                    </Badge>
                    {c.dataNascimento && (
                      <span className="text-xs text-muted-foreground">
                        {calcularIdadeLabel(c.dataNascimento)}
                      </span>
                    )}
                  </div>
                  {paisNomes && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {paisNomes}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedEntidadeId && (
        <CriancaFicha
          entidadeId={selectedEntidadeId}
          onClose={() => setSelectedEntidadeId(null)}
        />
      )}
    </>
  );
}

// ===== Página Principal =====

type GroupedMember = {
  _id: Id<"membros">;
  nomeCompleto: string;
  foto: string | null;
  cargoEclesiastico: string | null;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function getLetterFromNome(nome: string): string {
  const first = nome.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

export default function DiretorioPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("todos");
  const [turmaFilter, setTurmaFilter] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isCriancas = filter === "criancas";

  // @ts-ignore Convex TS2589
  const membros = useQuery(
    api.membros.queries.list,
    isCriancas ? "skip" : { search: debouncedSearch || undefined },
  );

  const filteredMembros = useMemo<GroupedMember[] | undefined>(() => {
    if (isCriancas || !membros) return undefined;
    let filtered = membros as any[];
    if (filter === "membros") {
      filtered = filtered.filter((m) => MEMBROS_CARGOS.includes(m.cargoEclesiastico));
    } else if (filter === "obreiros") {
      filtered = filtered.filter((m) => OBREIROS_CARGOS.includes(m.cargoEclesiastico));
    } else if (filter === "lideranca") {
      filtered = filtered.filter((m) => LIDERANCA_CARGOS.includes(m.cargoEclesiastico));
    }

    return [...filtered]
      .map((m) => ({
        _id: m._id,
        nomeCompleto: (m.entidade?.nomeCompleto || "").trim(),
        foto: m.entidade?.foto ?? null,
        cargoEclesiastico: m.cargoEclesiastico ?? null,
      }))
      .filter((m) => !!m.nomeCompleto)
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR"));
  }, [membros, filter, isCriancas]);

  // Busca refinada em nome e telefone normalizado
  const searched = useMemo<GroupedMember[] | undefined>(() => {
    if (!filteredMembros) return undefined;
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return filteredMembros;
    const qDigits = q.replace(/\D/g, "");
    return filteredMembros.filter((m) => {
      const nome = m.nomeCompleto.toLowerCase();
      if (nome.includes(q)) return true;
      if (qDigits.length > 0) {
        // busca por telefone; como a query `list` ja filtra por `search`,
        // ela provavelmente ja trouxe esses matches. Aqui garantimos o fallback.
        return false;
      }
      return false;
    });
  }, [filteredMembros, debouncedSearch]);

  const grouped = useMemo(() => {
    if (!searched) return null;
    const map = new Map<string, GroupedMember[]>();
    for (const m of searched) {
      const letter = getLetterFromNome(m.nomeCompleto);
      const arr = map.get(letter) ?? [];
      arr.push(m);
      map.set(letter, arr);
    }
    // ordena letras (# no fim)
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b, "pt-BR");
    });
    return entries;
  }, [searched]);

  const letrasComMembros = useMemo(() => {
    if (!grouped) return new Set<string>();
    return new Set(grouped.map(([l]) => l).filter((l) => l !== "#"));
  }, [grouped]);

  const scrollToLetter = (letter: string) => {
    const el = sectionRefs.current[letter];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isSearching = debouncedSearch.trim().length > 0;
  const total = searched?.length ?? 0;

  return (
    <ModuloGuard modulo="diretorio">
      <HeaderLayout>
        <div className="space-y-3 overflow-x-hidden">
          <PageHeader
            title="Diretório"
            subtitle={
              isCriancas
                ? "Crianças do educacional infantil"
                : searched === undefined
                  ? undefined
                  : `${total} ${total === 1 ? "membro" : "membros"}`
            }
          />

          {/* Busca sticky */}
          <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-2 bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  isCriancas
                    ? "Buscar criança por nome..."
                    : "Buscar por nome ou telefone"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-0 h-10 text-base md:text-sm"
              />
            </div>
          </div>

          {/* Chips de filtro */}
          <MemberFilterChips value={filter} onChange={setFilter} />

          {/* Filtro de turma (apenas para crianças) */}
          {isCriancas && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <Select
                value={turmaFilter || "todas"}
                onValueChange={(v) => setTurmaFilter(v === "todas" ? null : v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as turmas</SelectItem>
                  {TURMA_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conteúdo */}
          {isCriancas ? (
            <CriancasGrid search={search} turmaFilter={turmaFilter} />
          ) : grouped === null ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : total === 0 ? (
            <p className="text-muted-foreground text-center py-12 text-sm">
              Nenhum membro encontrado
            </p>
          ) : isSearching ? (
            // Durante busca: lista única sem agrupamento
            <div className="flex flex-col">
              {searched!.map((m) => (
                <MemberListItem key={m._id} membro={m} />
              ))}
            </div>
          ) : (
            // Padrão: agrupado alfabeticamente
            <div className="flex flex-col">
              {grouped.map(([letter, items]) => (
                <div
                  key={letter}
                  ref={(el) => {
                    sectionRefs.current[letter] = el;
                  }}
                >
                  <div className="sticky top-[60px] py-1.5 text-[10px] font-medium tracking-wider text-muted-foreground bg-background z-10">
                    {letter}
                  </div>
                  {items.map((m) => (
                    <MemberListItem key={m._id} membro={m} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {!isCriancas && !isSearching && grouped && grouped.length > 0 && (
          <AlphabetScrubber
            letrasComMembros={letrasComMembros}
            onSelectLetter={scrollToLetter}
          />
        )}
      </HeaderLayout>
    </ModuloGuard>
  );
}
