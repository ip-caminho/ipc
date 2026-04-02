"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { toast } from "sonner";
import { LayoutGrid, Bell, Send } from "lucide-react";

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

  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);
  // @ts-ignore Convex TS2589
  const sendPush = useAction(api.notifications.actions.sendPushToAll);
  // @ts-ignore Convex TS2589
  const subCount = useQuery(api.notifications.queries.countSubscriptions);

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setSending(true);
    try {
      const result = await sendPush({ title: pushTitle.trim(), body: pushBody.trim() });
      toast.success(`Enviado para ${result.sent} dispositivo${result.sent !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} falha${result.failed !== 1 ? "s" : ""})` : ""}`);
      setPushTitle("");
      setPushBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito a administradores.</p>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            Módulos
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
        {/* Push Notifications */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5" />
            Notificações Push
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {subCount !== undefined ? `${subCount} dispositivo${subCount !== 1 ? "s" : ""} registrado${subCount !== 1 ? "s" : ""}` : "Carregando..."}
          </p>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Input
                placeholder="Título da notificação"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
              />
              <Textarea
                placeholder="Mensagem..."
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleSendPush}
                disabled={!pushTitle.trim() || !pushBody.trim() || sending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Enviando..." : "Enviar para todos"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGate>
  );
}
