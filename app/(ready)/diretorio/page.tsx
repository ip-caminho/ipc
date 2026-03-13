"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Search, Cake, Phone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CARGO_ECLESIASTICO_OPTIONS } from "@features/membros/lib/constants";

export default function DiretorioPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const membros = useQuery(api.membros.queries.list, { search: debouncedSearch || undefined });
  const aniversariantes = useQuery(api.membros.queries.birthdaysThisMonth, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Diretorio</h1>
        <p className="text-muted-foreground">Encontre membros da igreja</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Birthdays section */}
      {aniversariantes && aniversariantes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cake className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Aniversariantes do Mes</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {aniversariantes.map((a: any) => (
                <div key={a._id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{a.entidade?.nomeCompleto?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span>{a.entidade?.nomeCompleto}</span>
                  <span className="text-muted-foreground">
                    {a.entidade?.dataNascimento ? format(parseISO(a.entidade.dataNascimento), "dd/MM") : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members grid */}
      {membros === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {membros.map((m: any) => {
            const cargoLabel = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === m.cargoEclesiastico)?.label;
            return (
              <Card key={m._id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{m.entidade?.nomeCompleto?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.entidade?.nomeCompleto}</p>
                    {m.entidade?.whatsapp && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {m.entidade.whatsapp}
                      </p>
                    )}
                    {cargoLabel && (
                      <Badge variant="outline" className="text-xs mt-1">{cargoLabel}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {membros.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Nenhum membro encontrado
            </p>
          )}
        </div>
      )}
    </div>
  );
}
