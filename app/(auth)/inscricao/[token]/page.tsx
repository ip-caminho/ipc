"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar, MapPin, Users, CheckCircle } from "lucide-react";
import { inscricaoPublicSchema } from "@features/turmas/lib/validations";
import { DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";
import Link from "next/link";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function InscricaoPublicPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useConvexAuth();
  const turma = useQuery(api.turmas.queries.getByToken, { token });
  const registrar = useMutation(api.turmas.mutations.registrar);
  const [success, setSuccess] = useState(false);
  const [resultStatus, setResultStatus] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(inscricaoPublicSchema),
    defaultValues: {
      nomeCompleto: "",
      whatsapp: "",
      email: "",
      dataNascimento: "",
      sexo: "",
      lgpdConsentimento: false as unknown as true,
    },
  });

  if (turma === undefined) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (turma === null) return <div className="min-h-screen flex items-center justify-center">Link invalido ou turma nao encontrada</div>;
  if (turma.status !== "ABERTA") return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Esta turma nao esta aceitando inscricoes no momento.</p>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Inscricao realizada!</h2>
            <p className="text-sm text-muted-foreground">{turma.nome}</p>
            {resultStatus === "LISTA_ESPERA" && (
              <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                Voce esta na lista de espera. Entraremos em contato quando houver vaga.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(values: Record<string, unknown>) {
    try {
      const inscricaoId = await registrar({
        token,
        dadosSistema: {
          nomeCompleto: values.nomeCompleto as string,
          whatsapp: (values.whatsapp as string) || undefined,
          email: (values.email as string) || undefined,
          dataNascimento: (values.dataNascimento as string) || undefined,
          sexo: (values.sexo as string) || undefined,
        },
        lgpdConsentimento: true,
      });
      // Verificar se ficou em lista de espera
      if (turma && turma.vagasRestantes !== null && turma.vagasRestantes <= 0) {
        setResultStatus("LISTA_ESPERA");
      }
      setSuccess(true);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao se inscrever");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-xl">{turma.nome}</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(turma.dataInicio)}
              {turma.diaSemana && ` - ${DIA_SEMANA_LABELS[turma.diaSemana] ?? turma.diaSemana}`}
              {turma.horario && ` ${turma.horario}`}
            </span>
            {turma.local && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{turma.local}</span>
            )}
            {turma.vagasRestantes !== null && turma.vagasRestantes < 5 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                <Users className="h-3 w-3 mr-1" />{turma.vagasRestantes} vagas restantes
              </Badge>
            )}
          </div>
          {turma.descricao && <p className="text-sm mt-2">{turma.descricao}</p>}
        </CardHeader>
        <CardContent>
          {!isAuthenticated && (
            <div className="bg-blue-50 text-blue-800 rounded-lg p-3 text-sm mb-4">
              Ja tem cadastro no sistema?{" "}
              <Link href={`/signin?returnUrl=/inscricao/${token}`} className="underline font-medium">
                Fazer login
              </Link>{" "}
              para preencher automaticamente.
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="nomeCompleto">Nome completo *</Label>
              <Input id="nomeCompleto" {...form.register("nomeCompleto")} />
              {form.formState.errors.nomeCompleto && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.nomeCompleto.message as string}</p>
              )}
            </div>

            {turma.camposSistema.includes("whatsapp") && (
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" {...form.register("whatsapp")} placeholder="(11) 99999-9999" />
              </div>
            )}

            {turma.camposSistema.includes("email") && (
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </div>
            )}

            {turma.camposSistema.includes("dataNascimento") && (
              <div>
                <Label htmlFor="dataNascimento">Data de nascimento</Label>
                <Input id="dataNascimento" type="date" {...form.register("dataNascimento")} />
              </div>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="lgpd"
                checked={form.watch("lgpdConsentimento") === true}
                onCheckedChange={(checked) => form.setValue("lgpdConsentimento", checked === true ? true : false as unknown as true)}
              />
              <Label htmlFor="lgpd" className="text-xs leading-tight cursor-pointer">
                Concordo com o uso dos meus dados para gestao desta turma *
              </Label>
            </div>
            {form.formState.errors.lgpdConsentimento && (
              <p className="text-xs text-red-500">{form.formState.errors.lgpdConsentimento.message as string}</p>
            )}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Enviando..." : "Inscrever-se"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
