"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardTitle } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { toast } from "sonner";
import { Bell, Send } from "lucide-react";
import { PageHeader } from "@shared/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

export default function ModulosPage() {
  const modulos = useQuery(api.modulos.queries.listModulos);
  const toggle = useMutation(api.modulos.mutations.toggleModulo);

  const [deactivating, setDeactivating] = useState<{ slug: string; label: string } | null>(null);

  // Desativar afeta menu de todos: pede confirmacao; ativar e direto
  const requestToggle = (slug: string, label: string, ativo: boolean) => {
    if (ativo) {
      setDeactivating({ slug, label });
      return;
    }
    handleToggle(slug, label, ativo);
  };

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
        <PageHeader title="Módulos" subtitle="Ative ou desative funcionalidades do sistema" />

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
                <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-6 py-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{modulo.label}</CardTitle>
                    <CardDescription className="mt-1">{modulo.descricao}</CardDescription>
                  </div>
                  <Switch
                    checked={modulo.ativo}
                    onCheckedChange={() => requestToggle(modulo.slug, modulo.label, modulo.ativo)}
                  />
                </label>
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

        <AlertDialog open={!!deactivating} onOpenChange={(o) => !o && setDeactivating(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar {deactivating?.label} para todos?</AlertDialogTitle>
              <AlertDialogDescription>
                O módulo some do menu de todos os usuários até ser ativado de novo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deactivating) handleToggle(deactivating.slug, deactivating.label, true);
                  setDeactivating(null);
                }}
              >
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGate>
  );
}
