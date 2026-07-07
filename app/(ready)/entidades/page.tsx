"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useDebounce } from "@shared/hooks/useDebounce";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Plus, Search, Building2, User } from "lucide-react";
import Link from "next/link";
import { PermissionGate } from "@shared/components/auth/PermissionGate";
import { ModuloGuard } from "@shared/components/auth/ModuloGuard";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PAPEL_OPTIONS, STATUS_COLORS } from "@features/membros/lib/constants";

export default function EntidadesPage() {
  return (
    <ModuloGuard modulo="entidades">
      <HeaderLayout>
        <div className="space-y-4">
          <PageHeader title="Entidades" />
          <Tabs defaultValue="fornecedores" className="space-y-4">
            <TabsList>
              <TabsTrigger value="fornecedores">Fornecedores e Parceiros</TabsTrigger>
              <TabsTrigger value="contatos">Contatos e Visitantes</TabsTrigger>
            </TabsList>
            <TabsContent value="fornecedores">
              <FornecedoresTab />
            </TabsContent>
            <TabsContent value="contatos">
              <ContatosTab />
            </TabsContent>
          </Tabs>
        </div>
      </HeaderLayout>
    </ModuloGuard>
  );
}

function BuscaInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por nome, telefone ou email..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}

function ListaSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

function FornecedoresTab() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const entidades = useQuery(api.entidades.queries.list, {
    tipo: "PJ",
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <BuscaInput value={search} onChange={setSearch} />
        <PermissionGate permission="entidades:create">
          <Button asChild>
            <Link href="/entidades/novo">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Link>
          </Button>
        </PermissionGate>
      </div>

      {entidades === undefined ? (
        <ListaSkeleton />
      ) : (
        <div className="space-y-2">
          {entidades.map((e: any) => (
            <Card key={e._id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {e.nomeRazaoSocial || e.nomeFantasia || "-"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {e.papeis?.map((p: string) => {
                      const opt = PAPEL_OPTIONS.find((o) => o.value === p);
                      return (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {opt?.label || p}
                        </Badge>
                      );
                    })}
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[e.status] || ""}`}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{e.whatsapp || e.email || ""}</p>
              </CardContent>
            </Card>
          ))}
          {entidades.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Nenhum fornecedor ou parceiro encontrado
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ContatosTab() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const contatos = useQuery(api.entidades.queries.listNaoMembros, {
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-4">
      <BuscaInput value={search} onChange={setSearch} />
      <p className="text-xs text-muted-foreground">
        Pessoas cadastradas que ainda nao sao membros (visitantes, contatos).
        Ao se tornarem membros, passam para o rol.
      </p>

      {contatos === undefined ? (
        <ListaSkeleton />
      ) : (
        <div className="space-y-2">
          {contatos.map((e: any) => (
            <Card key={e._id}>
              <CardContent className="p-4 flex items-center gap-3">
                <User className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.nomeCompleto || "-"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[e.status] || ""}`}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{e.whatsapp || e.email || ""}</p>
              </CardContent>
            </Card>
          ))}
          {contatos.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Nenhum contato ou visitante encontrado
            </p>
          )}
        </div>
      )}
    </div>
  );
}
