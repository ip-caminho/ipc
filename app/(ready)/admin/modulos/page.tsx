"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { toast } from "sonner";
import { LayoutGrid } from "lucide-react";

export default function ModulosPage() {
  const modulos = useQuery(api.modulos.queries.listModulos);
  const toggle = useMutation(api.modulos.mutations.toggleModulo);

  const handleToggle = async (slug: string, label: string, ativo: boolean) => {
    try {
      await toggle({ slug });
      toast.success(`${label} ${ativo ? "desativado" : "ativado"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar modulo");
    }
  };

  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito a administradores.</p>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Modulos
          </h1>
          <p className="text-muted-foreground mt-1">
            Ative ou desative funcionalidades do sistema
          </p>
        </div>

        {!modulos ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : modulos.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground text-center">
                Nenhum modulo cadastrado. Execute o seed: <code>npx convex run modulos.mutations:seedModulos</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => (
              <Card key={modulo._id} className={!modulo.ativo ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{modulo.label}</CardTitle>
                    <CardDescription className="mt-1">{modulo.descricao}</CardDescription>
                  </div>
                  <Switch
                    checked={modulo.ativo}
                    onCheckedChange={() => handleToggle(modulo.slug, modulo.label, modulo.ativo)}
                  />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminGate>
  );
}
