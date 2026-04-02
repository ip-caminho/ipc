"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@shared/providers/PermissionsProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Church, Megaphone, Cake, CalendarCheck } from "lucide-react";
import { AvisosWidget } from "@features/gravacoes/components/AvisosWidget";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { AniversariantesCard, AniversariantesHoje, AniversariantesMesLista } from "@features/dashboard/components/AniversariantesCard";
import { EducacionalPaisWidget } from "@features/educacional/components/EducacionalPaisWidget";
import { MinhaEscalaWidget } from "@features/escalas/components/MinhaEscalaWidget";
import { PushPermissionBanner } from "@shared/notifications/PushPermissionBanner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

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
  const { name, isLoading, role, can } = useAuth();
  // If authenticated but no membro linked (role is null), show bootstrap form
  if (!isLoading && isAuthenticated && !role) {
    return <BootstrapForm />;
  }

  const primeiroNome = name?.split(" ")[0] || "Usuário";
  const dataHoje = format(new Date(), "dd 'de' MMMM", { locale: ptBR });
  const mesAtual = format(new Date(), "MMMM", { locale: ptBR });
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const [avisosOpen, setAvisosOpen] = useState(false);
  // @ts-ignore Convex TS2589
  const avisosData = useQuery(api.gravacoes.queries.getLatestAvisos);
  const aniversariantes = useQuery(api.membros.queries.birthdaysThisMonth, {});
  const aniversariantesCount = aniversariantes?.filter((a: any) => a.mes === new Date().getMonth() + 1).length ?? 0;
  const avisosDataLabel = avisosData?.data ? format(parseISO(avisosData.data), "dd/MM") : "";

  return (
    <div className="flex flex-col md:block md:space-y-6">
      {/* Topo: saudação + frase */}
      {/* Topo: saudação + aniversariantes do dia/em breve */}
      <div className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-medium text-foreground">
            {saudacao}, {primeiroNome}
          </h1>
          <span className="text-sm text-muted-foreground">&middot; {dataHoje}</span>
        </div>

        {/* Banner de notificações */}
        <PushPermissionBanner />

        {/* Aniversariantes hoje ou em breve — mobile only */}
        <div className="md:hidden">
          <AniversariantesHoje />
        </div>

        {/* Desktop: conteúdo direto */}
        <div className="hidden md:block space-y-6">
          <AvisosWidget />
          <AniversariantesCard />
          <EducacionalPaisWidget />
          <MinhaEscalaWidget />
        </div>
      </div>

      {/* Mobile: botões */}
      <div className="md:hidden space-y-3 pb-4 mt-6">
        {/* Aniversariantes de {mesAtual} */}
        <Drawer>
          <DrawerTrigger
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
          >
            <Cake className="h-3.5 w-3.5" />
            Ver aniversariantes de {mesAtual} ({aniversariantesCount})
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-base">Aniversariantes de {mesAtual}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
              <AniversariantesMesLista />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Avisos */}
        <Drawer open={avisosOpen} onOpenChange={setAvisosOpen}>
          <DrawerTrigger
            onClick={() => setAvisosOpen(true)}
            className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:bg-muted/50 active:bg-muted transition-colors min-h-[72px]"
          >
            <Megaphone className="h-8 w-8 text-muted-foreground shrink-0" />
            <span className="text-base font-medium">
              Avisos{avisosDataLabel ? ` do dia ${avisosDataLabel}` : ""}
            </span>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-base">
                Avisos{avisosDataLabel ? ` do dia ${avisosDataLabel}` : ""}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 h-[60vh] flex flex-col">
              <AvisosWidget variant="drawer" />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Minha Escala */}
        <Link
          href="/escalas"
          className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:bg-muted/50 active:bg-muted transition-colors min-h-[72px]"
        >
          <CalendarCheck className="h-8 w-8 text-muted-foreground shrink-0" />
          <span className="text-base font-medium">Minha escala</span>
        </Link>
      </div>
    </div>
  );
}
