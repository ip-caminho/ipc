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
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PhotoUpload } from "@/shared/files/components/PhotoUpload";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { toast } from "sonner";
import { MapPin, User, Phone, Save, AlertCircle, CheckCircle2, HeartPulse, HelpCircle } from "lucide-react";
import {
  CARGO_ECLESIASTICO_OPTIONS,
  STATUS_COLORS,
  FORMACAO_OPTIONS,
} from "@features/membros/lib/constants";
import { FamiliaSection } from "@features/membros/components/FamiliaSection";
import { LgpdConsentDialog } from "@features/membros/components/LgpdConsentDialog";

type Endereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
};

type ContatoEmergencia = {
  nome?: string;
  telefone?: string;
  parentesco?: string;
};

const MESES_PARA_ALERTA = 6;

const CAMPOS_INCERTOS_DISPONIVEIS: Array<{ field: string; label: string }> = [
  { field: "dataBatismo", label: "Data do batismo" },
  { field: "dataMembresia", label: "Data em que me tornei membro" },
  { field: "dataConversao", label: "Data da conversao" },
  { field: "profissao", label: "Profissao" },
  { field: "formacao", label: "Formacao" },
  { field: "endereco", label: "Endereco" },
];

function tempoDesde(timestamp: number | undefined): string {
  if (!timestamp) return "nunca";
  const meses = Math.floor((Date.now() - timestamp) / (30 * 24 * 60 * 60 * 1000));
  if (meses < 1) return "menos de um mes";
  if (meses === 1) return "1 mes";
  if (meses < 12) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return anos === 1 ? "1 ano" : `${anos} anos`;
}

export default function MeuPerfilPage() {
  const profile = useQuery(api.membros.selfService.getMyProfile);
  const updateProfile = useMutation(api.membros.selfService.updateMyProfile);
  const confirmProfile = useMutation(api.membros.selfService.confirmProfile);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [dadosIncertos, setDadosIncertos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const entId = profile?.entidade?._id;
  if (profile?.entidade && initializedFor !== entId) {
    const ent = profile.entidade;
    const end = ent.endereco as Endereco | undefined;
    const ce = ent.contatoEmergencia as ContatoEmergencia | undefined;
    setDadosIncertos(ent.dadosIncertos ?? []);
    setFormData({
      apelido: ent.apelido || "",
      nomeSocial: ent.nomeSocial || "",
      telefone: ent.telefone || "",
      email: ent.email || "",
      profissao: ent.profissao || "",
      formacao: ent.formacao || "",
      logradouro: end?.logradouro || "",
      numero: end?.numero || "",
      complemento: end?.complemento || "",
      bairro: end?.bairro || "",
      cidade: end?.cidade || "",
      estado: end?.estado || "",
      cep: end?.cep || "",
      contatoEmergenciaNome: ce?.nome || "",
      contatoEmergenciaTelefone: ce?.telefone || "",
      contatoEmergenciaParentesco: ce?.parentesco || "",
    });
    setInitializedFor(entId || null);
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
  const contatoEmergencia = ent?.contatoEmergencia as ContatoEmergencia | undefined;
  const cargoLabel = CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === profile.cargoEclesiastico)?.label;
  const formacaoLabel = FORMACAO_OPTIONS.find((o) => o.value === ent?.formacao)?.label;
  const firstName = ent?.apelido || ent?.nomeCompleto?.split(" ")[0] || "";

  const perfilAtualizadoEm = ent?.perfilAtualizadoEm as number | undefined;
  const desatualizado =
    !perfilAtualizadoEm ||
    Date.now() - perfilAtualizadoEm > MESES_PARA_ALERTA * 30 * 24 * 60 * 60 * 1000;

  const handlePhotoChange = async (url: string | null) => {
    try {
      await updateProfile({ data: { foto: url || "" } });
      toast.success(url ? "Foto atualizada" : "Foto removida");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar foto");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};

      if (formData.apelido !== (ent?.apelido || "")) data.apelido = formData.apelido;
      if (formData.nomeSocial !== (ent?.nomeSocial || "")) data.nomeSocial = formData.nomeSocial;
      if (formData.telefone !== (ent?.telefone || "")) data.telefone = formData.telefone;
      if (formData.email !== (ent?.email || "")) data.email = formData.email;
      if (formData.profissao !== (ent?.profissao || "")) data.profissao = formData.profissao;
      if (formData.formacao !== (ent?.formacao || "")) {
        data.formacao = formData.formacao || undefined;
      }

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

      const newCE: ContatoEmergencia = {
        nome: formData.contatoEmergenciaNome || undefined,
        telefone: formData.contatoEmergenciaTelefone || undefined,
        parentesco: formData.contatoEmergenciaParentesco || undefined,
      };
      const hasAnyCE = newCE.nome && newCE.telefone && newCE.parentesco;
      if (hasAnyCE && JSON.stringify(newCE) !== JSON.stringify(contatoEmergencia || {})) {
        data.contatoEmergencia = newCE;
      }

      const incertosAtual = (ent?.dadosIncertos as string[] | undefined) ?? [];
      const incertosNovo = [...dadosIncertos].sort();
      const incertosAntigo = [...incertosAtual].sort();
      if (JSON.stringify(incertosNovo) !== JSON.stringify(incertosAntigo)) {
        data.dadosIncertos = dadosIncertos;
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

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmProfile();
      toast.success("Dados confirmados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao confirmar");
    } finally {
      setConfirming(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <HeaderLayout>
    <LgpdConsentDialog />
    <div className="max-w-2xl mx-auto space-y-4">
      <PageHeader title="Meu perfil" />

      {/* Banner de atualizacao */}
      {desatualizado && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {perfilAtualizadoEm
                  ? `Seu cadastro foi atualizado ha ${tempoDesde(perfilAtualizadoEm)}.`
                  : "Seu cadastro nunca foi confirmado."}
              </p>
              <p className="text-xs text-muted-foreground">
                Confirme ou edite seus dados abaixo. Se estiver tudo certo, basta clicar em &quot;Confirmar dados&quot;.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header com foto clicavel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <PhotoUpload
              folder="membros/fotos"
              entityId={ent?._id || ""}
              value={ent?.foto}
              onChange={handlePhotoChange}
              fallback={firstName}
            />

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold">{ent?.nomeCompleto}</h1>
              {ent?.nomeSocial && (
                <p className="text-sm text-muted-foreground">Nome social: {ent.nomeSocial}</p>
              )}
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
              <Label className="text-xs">Nome social</Label>
              <Input value={formData.nomeSocial || ""} onChange={set("nomeSocial")} placeholder="Opcional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profissao</Label>
              <Input value={formData.profissao || ""} onChange={set("profissao")} placeholder="Ex: Engenheiro" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Formacao</Label>
              <Select
                value={formData.formacao || ""}
                onValueChange={(v) => setFormData((p) => ({ ...p, formacao: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FORMACAO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Contato de emergencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5" /> Contato de emergencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pessoa para a igreja contatar em casos urgentes (hospitalizacao, emergencia familiar).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input
                value={formData.contatoEmergenciaNome || ""}
                onChange={set("contatoEmergenciaNome")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input
                value={formData.contatoEmergenciaTelefone || ""}
                onChange={set("contatoEmergenciaTelefone")}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Parentesco</Label>
              <Input
                value={formData.contatoEmergenciaParentesco || ""}
                onChange={set("contatoEmergenciaParentesco")}
                placeholder="Ex: Conjuge, Mae, Irmao"
              />
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
            {formacaoLabel && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Formacao</p>
                <p>{formacaoLabel}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Familia (Fase 2) */}
      <FamiliaSection />

      {/* Dados incertos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> Dados que nao tenho certeza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Marque os campos que voce nao lembra ou nao tem certeza. A secretaria sera notificada e podera ajudar a confirmar com o livro de registros.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CAMPOS_INCERTOS_DISPONIVEIS.map((c) => {
              const checked = dadosIncertos.includes(c.field);
              return (
                <label
                  key={c.field}
                  className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      setDadosIncertos((prev) =>
                        v ? [...prev, c.field] : prev.filter((f) => f !== c.field)
                      );
                    }}
                  />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Acoes */}
      <div className="pb-24 md:pb-4 grid gap-2 sm:grid-cols-2">
        <Button
          onClick={handleConfirm}
          disabled={confirming || saving}
          variant="outline"
          className="w-full"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          {confirming ? "Confirmando..." : "Confirmar dados (sem alterar)"}
        </Button>
        <Button onClick={handleSave} disabled={saving || confirming} className="w-full">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </Button>
      </div>
    </div>
    </HeaderLayout>
  );
}
