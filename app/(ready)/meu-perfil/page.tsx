"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { CARGO_ECLESIASTICO_OPTIONS, STATUS_COLORS } from "@features/membros/lib/constants";

export default function MeuPerfilPage() {
  const profile = useQuery(api.membros.selfService.getMyProfile);
  const updateProfile = useMutation(api.membros.selfService.updateMyProfile);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full max-w-2xl" />;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Perfil nao encontrado. Voce pode nao estar vinculado como membro ainda.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startEditing = () => {
    setFormData({
      telefone: profile.entidade?.telefone || "",
      email: profile.entidade?.email || "",
      profissao: profile.entidade?.profissao || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const data: Record<string, any> = {};
      if (formData.telefone !== (profile.entidade?.telefone || "")) data.telefone = formData.telefone;
      if (formData.email !== (profile.entidade?.email || "")) data.email = formData.email;
      if (formData.profissao !== (profile.entidade?.profissao || "")) data.profissao = formData.profissao;

      if (Object.keys(data).length === 0) {
        toast.info("Nenhuma alteracao detectada");
        setEditing(false);
        return;
      }

      await updateProfile({ data });
      toast.success("Perfil atualizado");
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil");
    }
  };

  const cargoLabel = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === profile.cargoEclesiastico)?.label;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{profile.entidade?.nomeCompleto}</CardTitle>
            <Badge variant="outline" className={STATUS_COLORS[profile.entidade?.status || "ATIVO"]}>
              {profile.entidade?.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">WhatsApp</Label>
              <p className="text-sm">{profile.entidade?.whatsapp || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Cargo</Label>
              <p className="text-sm">{cargoLabel || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Rol</Label>
              <p className="text-sm">{profile.rol || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Data de Membresia</Label>
              <p className="text-sm">{profile.dataMembresia || "-"}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Profissao</Label>
                <Input value={formData.profissao} onChange={(e) => setFormData({ ...formData, profissao: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Salvar</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4 space-y-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Telefone</Label>
                  <p className="text-sm">{profile.entidade?.telefone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-sm">{profile.entidade?.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Profissao</Label>
                  <p className="text-sm">{profile.entidade?.profissao || "-"}</p>
                </div>
              </div>
              <Button variant="outline" onClick={startEditing}>Editar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
