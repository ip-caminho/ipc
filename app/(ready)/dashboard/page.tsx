"use client";

import { useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Logo } from "@shared/components/layout/Logo";

import { useAuth } from "@shared/providers/PermissionsProvider";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { PushPermissionBanner } from "@shared/notifications/PushPermissionBanner";
import { TodaySection } from "@features/dashboard/components/TodaySection";
import { BirthdayList } from "@features/dashboard/components/BirthdayList";
import { UltimoSermaoCard } from "@features/dashboard/components/UltimoSermaoCard";
import { ComentariosRecentesCard } from "@features/dashboard/components/ComentariosRecentesCard";
import { ProfileCompletenessCard } from "@features/dashboard/components/ProfileCompletenessCard";
import { ProfileNudgeDialog } from "@features/dashboard/components/ProfileNudgeDialog";

function BootstrapForm() {
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
            <Logo className="h-12" />
          </div>
          <CardTitle>Configuração Inicial</CardTitle>
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
  const precisaBootstrap = useQuery(api.membros.bootstrap.precisaBootstrap);

  if (!isLoading && isAuthenticated && !role) {
    // So mostra "criar primeiro admin" se o sistema realmente nao tem membros.
    if (precisaBootstrap === true) {
      return <BootstrapForm />;
    }
    // Logado sem role mas o sistema TEM membros: contexto ainda resolvendo
    // (reconexao/refresh de auth) ou conta sem vinculo. Mostra loader em vez
    // da tela de bootstrap (que assustava usuarios existentes).
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const primeiroNome = name?.split(" ")[0] || "Usuário";
  const dataHoje = format(new Date(), "d 'de' MMMM", { locale: ptBR });
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <HeaderLayout>
      <div className="flex flex-col gap-5">
        <PageHeader title={`${saudacao}, ${primeiroNome}`} subtitle={dataHoje} />

        <PushPermissionBanner />

        <ProfileCompletenessCard />

        <UltimoSermaoCard />

        <ComentariosRecentesCard />

        <TodaySection />

      <BirthdayList />
      </div>
      <ProfileNudgeDialog />
    </HeaderLayout>
  );
}
