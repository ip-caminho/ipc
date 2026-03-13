"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Users, Cake, Mic, Church } from "lucide-react";
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
  const { name, can, isLoading, role } = useAuth();
  const membros = useQuery(api.membros.queries.list, {});
  const aniversariantes = useQuery(api.membros.queries.birthdaysThisMonth, {});
  const gravacoes = useQuery(api.gravacoes.queries.list, {
    status: "PUBLICADO",
  });

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
        <p className="text-muted-foreground">Painel do sistema IPC</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {can("membros:read") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Membros Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membros?.length ?? "..."}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aniversariantes do Mes
            </CardTitle>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aniversariantes?.length ?? "..."}
            </div>
            <div className="mt-2 space-y-1">
              {aniversariantes?.slice(0, 5).map((a: any) => (
                <p key={a._id} className="text-xs text-muted-foreground">
                  {a.entidade?.nomeCompleto} —{" "}
                  {a.entidade?.dataNascimento
                    ? format(parseISO(a.entidade.dataNascimento), "dd/MM", {
                        locale: ptBR,
                      })
                    : ""}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {can("gravacoes:read") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gravacoes</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gravacoes?.length ?? "..."}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
