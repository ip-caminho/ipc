"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { AdminGate } from "@shared/components/auth/RoleGate";
import { toast } from "sonner";
import { Copy, Link as LinkIcon } from "lucide-react";
import { PermissionMatrix } from "@features/preferencias/components/PermissionMatrix";

export default function PermissoesPage() {
  const generateInvite = useMutation(api.membros.convites.generateInvite);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleGenerateInvite = async (role?: string) => {
    try {
      const token = await generateInvite({ role });
      const link = `${window.location.origin}/convite/${token}`;
      setInviteLink(link);
      toast.success("Convite gerado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar convite");
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Link copiado!");
    }
  };

  return (
    <AdminGate fallback={<p className="text-muted-foreground">Acesso restrito a administradores</p>}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Administracao</h1>

        <Tabs defaultValue="permissoes">
          <TabsList>
            <TabsTrigger value="permissoes">Roles e Permissoes</TabsTrigger>
            <TabsTrigger value="convites">Convites</TabsTrigger>
          </TabsList>

          <TabsContent value="permissoes" className="mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Matriz de permissoes por papel. A coluna &quot;Personalizado&quot; mostra membros com permissoes diferentes do seu papel.
              </p>
              <PermissionMatrix />
            </div>
          </TabsContent>

          <TabsContent value="convites" className="mt-4">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="text-lg">Gerar Convite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gere um link de convite para novos membros. O link expira em 24 horas.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => handleGenerateInvite("membro")}>Convite Membro</Button>
                  <Button variant="outline" onClick={() => handleGenerateInvite("secretaria")}>Convite Secretaria</Button>
                </div>
                {inviteLink && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <LinkIcon className="h-4 w-4 shrink-0" />
                    <code className="text-xs flex-1 truncate">{inviteLink}</code>
                    <Button variant="ghost" size="icon" onClick={copyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  );
}
