"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useFileUpload } from "@/shared/files/hooks/useFileUpload";
import { toast } from "sonner";
import { Camera, Loader2, MapPin, User, Phone, Save } from "lucide-react";
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

export default function MeuPerfilPage() {
  const profile = useQuery(api.membros.selfService.getMyProfile);
  const updateProfile = useMutation(api.membros.selfService.updateMyProfile);
  const { upload, isUploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Inicializar form quando dados carregam
  if (profile?.entidade && !initialized) {
    const ent = profile.entidade;
    const end = ent.endereco as Endereco | undefined;
    setFormData({
      apelido: ent.apelido || "",
      telefone: ent.telefone || "",
      email: ent.email || "",
      profissao: ent.profissao || "",
      logradouro: end?.logradouro || "",
      numero: end?.numero || "",
      complemento: end?.complemento || "",
      bairro: end?.bairro || "",
      cidade: end?.cidade || "",
      estado: end?.estado || "",
      cep: end?.cep || "",
    });
    setInitialized(true);
  }

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
  const firstName = ent?.apelido || ent?.nomeCompleto?.split(" ")[0] || "";

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ent?._id) return;

    try {
      const url = await upload(file, "membros/fotos", ent._id);
      await updateProfile({ data: { foto: url } });
      toast.success("Foto atualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar foto");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, any> = {};

      if (formData.apelido !== (ent?.apelido || "")) data.apelido = formData.apelido;
      if (formData.telefone !== (ent?.telefone || "")) data.telefone = formData.telefone;
      if (formData.email !== (ent?.email || "")) data.email = formData.email;
      if (formData.profissao !== (ent?.profissao || "")) data.profissao = formData.profissao;

      const newEndereco: Endereco = {
        logradouro: formData.logradouro || undefined,
        numero: formData.numero || undefined,
        complemento: formData.complemento || undefined,
        bairro: formData.bairro || undefined,
        cidade: formData.cidade || undefined,
        estado: formData.estado || undefined,
        cep: formData.cep || undefined,
      };
      if (JSON.stringify(newEndereco) !== JSON.stringify(endereco || {})) {
        data.endereco = newEndereco;
      }

      if (Object.keys(data).length === 0) {
        toast.info("Nenhuma alteracao detectada");
        return;
      }

      await updateProfile({ data });
      toast.success("Perfil atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header com foto clicavel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar com botão de camera */}
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border" key={ent?.foto || "no-foto"}>
                {ent?.foto && <AvatarImage src={ent.foto} alt={ent.nomeCompleto} />}
                <AvatarFallback className="text-2xl">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold">{ent?.nomeCompleto}</h1>
              {ent?.apelido && (
                <p className="text-sm text-muted-foreground">&ldquo;{ent.apelido}&rdquo;</p>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className={STATUS_COLORS[ent?.status || "ATIVO"]}>
                  {ent?.status}
                </Badge>
                {cargoLabel && <Badge variant="secondary">{cargoLabel}</Badge>}
                {profile.rol && <Badge variant="outline">Rol {profile.rol}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados editaveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Apelido</Label>
              <Input value={formData.apelido || ""} onChange={set("apelido")} placeholder="Como prefere ser chamado" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profissao</Label>
              <Input value={formData.profissao || ""} onChange={set("profissao")} placeholder="Ex: Engenheiro" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">WhatsApp</Label>
            <p className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-md">{ent?.whatsapp || "-"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={formData.telefone || ""} onChange={set("telefone")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={formData.email || ""} onChange={set("email")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Endereco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Logradouro</Label>
              <Input value={formData.logradouro || ""} onChange={set("logradouro")} placeholder="Rua, Avenida..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Numero</Label>
              <Input value={formData.numero || ""} onChange={set("numero")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Complemento</Label>
              <Input value={formData.complemento || ""} onChange={set("complemento")} placeholder="Apto, Bloco..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bairro</Label>
              <Input value={formData.bairro || ""} onChange={set("bairro")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cidade</Label>
              <Input value={formData.cidade || ""} onChange={set("cidade")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Input value={formData.estado || ""} onChange={set("estado")} placeholder="SP" maxLength={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CEP</Label>
              <Input value={formData.cep || ""} onChange={set("cep")} placeholder="00000-000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membresia (read-only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Membresia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cargo</p>
              <p>{cargoLabel || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rol</p>
              <p>{profile.rol || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Data membresia</p>
              <p>{profile.dataMembresia || "-"}</p>
            </div>
            {profile.dataBatismo && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Batismo</p>
                <p>{profile.dataBatismo}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão salvar fixo */}
      <div className="sticky bottom-20 md:bottom-4 z-10">
        <Button onClick={handleSave} disabled={saving} className="w-full shadow-lg">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </Button>
      </div>
    </div>
  );
}
