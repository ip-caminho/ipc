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
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { toast } from "sonner";
import { Pencil, X, Save, MapPin, User, Phone, Mail, Briefcase } from "lucide-react";
import { CARGO_ECLESIASTICO_OPTIONS, STATUS_COLORS } from "@features/membros/lib/constants";

type Endereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
};

function formatEndereco(e?: Endereco | null): string {
  if (!e) return "-";
  const parts = [
    e.logradouro,
    e.numero ? `n ${e.numero}` : null,
    e.complemento,
    e.bairro,
    e.cidade && e.estado ? `${e.cidade}/${e.estado}` : e.cidade || e.estado,
    e.cep,
  ].filter(Boolean);
  return parts.join(", ") || "-";
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm">{value || "-"}</p>
      </div>
    </div>
  );
}

export default function MeuPerfilPage() {
  const profile = useQuery(api.membros.selfService.getMyProfile);
  const updateProfile = useMutation(api.membros.selfService.updateMyProfile);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full max-w-2xl mx-auto" />;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Perfil nao encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ent = profile.entidade;
  const endereco = ent?.endereco as Endereco | undefined;
  const cargoLabel = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === profile.cargoEclesiastico)?.label;

  const startEditing = () => {
    setFormData({
      apelido: ent?.apelido || "",
      telefone: ent?.telefone || "",
      email: ent?.email || "",
      profissao: ent?.profissao || "",
      foto: ent?.foto || "",
      logradouro: endereco?.logradouro || "",
      numero: endereco?.numero || "",
      complemento: endereco?.complemento || "",
      bairro: endereco?.bairro || "",
      cidade: endereco?.cidade || "",
      estado: endereco?.estado || "",
      cep: endereco?.cep || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const data: Record<string, any> = {};

      if (formData.apelido !== (ent?.apelido || "")) data.apelido = formData.apelido;
      if (formData.telefone !== (ent?.telefone || "")) data.telefone = formData.telefone;
      if (formData.email !== (ent?.email || "")) data.email = formData.email;
      if (formData.profissao !== (ent?.profissao || "")) data.profissao = formData.profissao;
      if (formData.foto !== (ent?.foto || "")) data.foto = formData.foto;

      // Montar endereço
      const newEndereco: Endereco = {
        logradouro: formData.logradouro || undefined,
        numero: formData.numero || undefined,
        complemento: formData.complemento || undefined,
        bairro: formData.bairro || undefined,
        cidade: formData.cidade || undefined,
        estado: formData.estado || undefined,
        cep: formData.cep || undefined,
      };
      const enderecoChanged = JSON.stringify(newEndereco) !== JSON.stringify(endereco || {});
      if (enderecoChanged) data.endereco = newEndereco;

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

  const firstName = ent?.apelido || ent?.nomeCompleto?.split(" ")[0] || "";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header com foto */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-20 w-20 border-2 border-border">
              {ent?.foto && <AvatarImage src={ent.foto} alt={ent.nomeCompleto} />}
              <AvatarFallback className="text-2xl">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold">{ent?.nomeCompleto}</h1>
              {ent?.apelido && (
                <p className="text-sm text-muted-foreground">&ldquo;{ent.apelido}&rdquo;</p>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
                <Badge variant="outline" className={STATUS_COLORS[ent?.status || "ATIVO"]}>
                  {ent?.status}
                </Badge>
                {cargoLabel && <Badge variant="secondary">{cargoLabel}</Badge>}
                {profile.rol && <Badge variant="outline">Rol {profile.rol}</Badge>}
              </div>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEditing} className="shrink-0">
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {editing ? (
        /* Modo edição */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Editar perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Foto */}
            <div className="space-y-1">
              <Label className="text-xs">Foto</Label>
              <FileUpload
                folder="membros/fotos"
                entityId={ent?._id || ""}
                accept="image/*"
                maxSizeMB={10}
                value={formData.foto || undefined}
                onChange={(url) => setFormData({ ...formData, foto: url || "" })}
                label="Atualizar foto"
              />
            </div>

            {/* Dados pessoais */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Apelido</Label>
                <Input
                  value={formData.apelido}
                  onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                  placeholder="Como prefere ser chamado"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Profissao</Label>
                <Input
                  value={formData.profissao}
                  onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Endereco
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Logradouro</Label>
                  <Input
                    value={formData.logradouro}
                    onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Numero</Label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Complemento</Label>
                  <Input
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    placeholder="Apto, Bloco..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bairro</Label>
                  <Input
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Input
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CEP</Label>
                  <Input
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Modo visualização */
        <>
          {/* Contato */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Contato</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={Phone} label="WhatsApp" value={ent?.whatsapp || "-"} />
              <InfoRow icon={Phone} label="Telefone" value={ent?.telefone || "-"} />
              <InfoRow icon={Mail} label="Email" value={ent?.email || "-"} />
              <InfoRow icon={Briefcase} label="Profissao" value={ent?.profissao || "-"} />
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Endereco</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow icon={MapPin} label="Endereco" value={formatEndereco(endereco)} />
            </CardContent>
          </Card>

          {/* Membresia */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Membresia</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow icon={User} label="Cargo" value={cargoLabel || "-"} />
              <InfoRow icon={User} label="Rol" value={profile.rol || "-"} />
              <InfoRow icon={User} label="Data de membresia" value={profile.dataMembresia || "-"} />
              {profile.dataBatismo && (
                <InfoRow icon={User} label="Batismo" value={profile.dataBatismo} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
