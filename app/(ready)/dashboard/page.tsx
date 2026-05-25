"use client";

import { useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Church } from "lucide-react";

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
import { SectionLabel } from "@features/dashboard/components/SectionLabel";
import { UltimoSermaoCard } from "@features/dashboard/components/UltimoSermaoCard";
import { PerfilDesatualizadoCard } from "@features/dashboard/components/PerfilDesatualizadoCard";

function BootstrapForm() {
  // @ts-expect-error Convex TS2589
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
            <Church className="h-10 w-10" />
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

  if (!isLoading && isAuthenticated && !role) {
    return <BootstrapForm />;
  }

  const primeiroNome = name?.split(" ")[0] || "Usuário";
  const dataHoje = format(new Date(), "d 'de' MMMM", { locale: ptBR });
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <HeaderLayout>
      <div className="flex flex-col gap-4">
        <PageHeader title={`${saudacao}, ${primeiroNome}`} subtitle={dataHoje} />

        <PushPermissionBanner />

        <PerfilDesatualizadoCard />

        <UltimoSermaoCard />

      <section className="space-y-2">
        <SectionLabel>Hoje</SectionLabel>
        <TodaySection />
      </section>

      <BirthdayList />
      </div>
    </HeaderLayout>
  );
}
