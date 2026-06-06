"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@shared/components/layout/Logo";
import { toast } from "sonner";

export default function ConvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const convite = useQuery(api.membros.convites.getByToken, { token });
  const acceptInvite = useMutation(api.membros.convites.acceptInvite);

  if (convite === undefined) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Carregando convite...</p>
        </CardContent>
      </Card>
    );
  }

  if (!convite || convite.expired) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="font-medium">Convite invalido ou expirado</p>
          <p className="text-sm text-muted-foreground">
            Solicite um novo convite ao administrador da igreja.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      await acceptInvite({
        token,
        nomeCompleto: formData.get("nomeCompleto") as string,
        whatsapp: formData.get("whatsapp") as string,
        cpf: (formData.get("cpf") as string) || undefined,
        dataNascimento: (formData.get("dataNascimento") as string) || undefined,
        sexo: (formData.get("sexo") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
      });

      toast.success("Cadastro realizado com sucesso!");
      router.push("/signin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aceitar convite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Logo className="h-12" />
        </div>
        <CardTitle>Bem-vindo a IPC</CardTitle>
        <CardDescription>Preencha seus dados para completar o cadastro</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nomeCompleto">Nome Completo *</Label>
            <Input id="nomeCompleto" name="nomeCompleto" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input id="whatsapp" name="whatsapp" type="tel" placeholder="11999991111" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dataNascimento">Data de Nascimento</Label>
            <Input id="dataNascimento" name="dataNascimento" type="date" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Cadastrando..." : "Completar Cadastro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
