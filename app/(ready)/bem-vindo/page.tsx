"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { toast } from "sonner";
import { Check, ArrowRight } from "lucide-react";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";

export default function BemVindoPage() {
  const data = useQuery(api.membros.onboarding.getOnboardingData);
  const completeOnboarding = useMutation(api.membros.onboarding.completeOnboarding);
  const router = useRouter();

  const [step, setStep] = useState<"foto" | "dados" | "done">("foto");
  const [foto, setFoto] = useState<string | undefined>(undefined);
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [profissao, setProfissao] = useState("");
  const [saving, setSaving] = useState(false);

  // Inicializar form quando dados carregam
  const initialized = useState(false);
  if (data && !initialized[0]) {
    if (data.foto) setFoto(data.foto);
    if (data.apelido) setApelido(data.apelido);
    if (data.email) setEmail(data.email);
    if (data.profissao) setProfissao(data.profissao);
    initialized[1](true);
  }

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="h-96 w-full max-w-md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Perfil nao encontrado.</p>
      </div>
    );
  }

  const firstName = data.nomeCompleto.split(" ")[0];

  const handleComplete = async () => {
    setSaving(true);
    try {
      await completeOnboarding({
        foto,
        apelido: apelido || undefined,
        email: email || undefined,
        profissao: profissao || undefined,
      });
      setStep("done");
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HeaderLayout>
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Step: Foto */}
        {step === "foto" && (
          <Card>
            <CardContent className="pt-8 pb-6 space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Bem-vindo, {firstName}!</h1>
                <p className="text-sm text-muted-foreground">
                  Que bom ter voce aqui. Vamos confirmar suas informacoes.
                </p>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-28 w-28 border-2 border-border">
                  {foto && <AvatarImage src={foto} alt={data.nomeCompleto} />}
                  <AvatarFallback className="text-3xl">
                    {firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="w-full">
                  <FileUpload
                    folder="membros/fotos"
                    entityId={data.entidadeId}
                    accept="image/*"
                    maxSizeMB={10}
                    value={foto}
                    onChange={(url) => setFoto(url)}
                    label="Atualizar foto"
                  />
                </div>
              </div>

              <Button className="w-full" onClick={() => setStep("dados")}>
                {foto ? "Continuar" : "Pular por agora"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Dados */}
        {step === "dados" && (
          <Card>
            <CardContent className="pt-6 pb-6 space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">Confirme seus dados</h2>
                <p className="text-xs text-muted-foreground">
                  Verifique se esta tudo certo. Voce pode alterar depois no seu perfil.
                </p>
              </div>

              {/* Dados read-only */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <p className="text-sm font-medium">{data.nomeCompleto}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                  <p className="text-sm">{data.whatsapp || "Nao informado"}</p>
                </div>

                {data.dataNascimento && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
                    <p className="text-sm">{data.dataNascimento.split("-").reverse().join("/")}</p>
                  </div>
                )}
              </div>

              {/* Dados editáveis */}
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1">
                  <Label htmlFor="apelido" className="text-xs">Como prefere ser chamado?</Label>
                  <Input
                    id="apelido"
                    value={apelido}
                    onChange={(e) => setApelido(e.target.value)}
                    placeholder={data.nomeCompleto.split(" ")[0]}
                  />
                  <p className="text-[10px] text-muted-foreground">Apelido ou nome curto que usam no dia a dia</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="profissao" className="text-xs">Profissao</Label>
                  <Input
                    id="profissao"
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    placeholder="Ex: Engenheiro, Professor"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("foto")} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleComplete} disabled={saving} className="flex-1">
                  {saving ? "Salvando..." : "Tudo certo!"}
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Tudo pronto, {firstName}!</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Redirecionando...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </HeaderLayout>
  );
}
