"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Church, Cake, Gift } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { AvisosWidget } from "@features/gravacoes/components/AvisosWidget";
import { FrasesCarrossel } from "@features/gravacoes/components/FrasesCarrossel";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";

function BootstrapForm() {
  // @ts-ignore Convex TS2589
  const bootstrap = useMutation(api.membros.bootstrap.bootstrapAdmin);
  const relinkAdmin = useMutation(api.debug.relinkAdmin);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await bootstrap({
        nomeCompleto: formData.get("nomeCompleto") as string,
        whatsapp: (formData.get("whatsapp") as string) || undefined,
      });
      toast.success("Admin criado! Recarregando...");
      // Force page reload to pick up new permissions
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar admin"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Church className="h-10 w-10" />
          </div>
          <CardTitle>Configuracao Inicial</CardTitle>
          <CardDescription>
            Crie o primeiro administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nomeCompleto">Seu Nome Completo *</Label>
              <Input id="nomeCompleto" name="nomeCompleto" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                placeholder="11999991111"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Criando..." : "Criar Admin e Entrar"}
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await relinkAdmin({});
                  toast.success("Admin religado! Recarregando...");
                  window.location.reload();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Erro");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Ja sou admin (religar sessao)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const { name, isLoading, role } = useAuth();
  const aniversariantesSemana = useQuery(api.membros.queries.birthdaysThisWeek, {});
  const aniversariantesMes = useQuery(api.membros.queries.birthdaysThisMonth, {});

  // If authenticated but no membro linked (role is null), show bootstrap form
  if (!isLoading && isAuthenticated && !role) {
    return <BootstrapForm />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Bem-vindo, {name || "Usuario"}!
        </h1>
      </div>

      <FrasesCarrossel />

      <AvisosWidget />

      {/* Aniversariantes da semana */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Aniversariantes da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!aniversariantesSemana ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : aniversariantesSemana.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aniversariante esta semana</p>
          ) : (
            <ul className="space-y-3">
              {aniversariantesSemana.map((a: any) => {
                const isToday = a.entidade?.dataNascimento
                  ? (() => {
                      const [, m, d] = a.entidade.dataNascimento.split("-").map(Number);
                      const now = new Date();
                      return m === now.getMonth() + 1 && d === now.getDate();
                    })()
                  : false;
                return (
                  <li key={a._id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-sm">
                        {a.entidade?.nomeCompleto?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.entidade?.nomeCompleto}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.entidade?.dataNascimento
                          ? format(parseISO(a.entidade.dataNascimento), "EEEE, dd 'de' MMMM", { locale: ptBR })
                          : ""}
                        {isToday && <span className="ml-1.5 text-primary font-medium">— Hoje!</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Aniversariantes do mes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="h-4 w-4" />
            Aniversariantes do mes
          </CardTitle>
          {aniversariantesMes && aniversariantesMes.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {aniversariantesMes.length}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {!aniversariantesMes ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : aniversariantesMes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aniversariante este mes</p>
          ) : (
            <ul className="space-y-3">
              {aniversariantesMes.map((a: any) => (
                <li key={a._id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-sm">
                      {a.entidade?.nomeCompleto?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.entidade?.nomeCompleto}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.entidade?.dataNascimento
                        ? format(parseISO(a.entidade.dataNascimento), "dd 'de' MMMM", { locale: ptBR })
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
