"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DateInputBR } from "@/shared/components/ui/date-input-br";
import { PhoneInputBR } from "@/shared/components/ui/phone-input-br";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar, MapPin, Users, CheckCircle } from "lucide-react";
import { inscricaoPublicSchema } from "@features/turmas/lib/validations";
import { DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function InscricaoPublicPage() {
  const { token } = useParams<{ token: string }>();
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const turma = useQuery(api.turmas.queries.getByToken, { token });
  const registrar = useMutation(api.turmas.mutations.registrar);
  const [success, setSuccess] = useState(false);
  const [resultStatus, setResultStatus] = useState<string>("");
  // Perguntas extras ficam fora do react-hook-form: sao dinamicas por turma.
  const [respostas, setRespostas] = useState<Record<string, string | string[]>>({});

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
  if (!turma.inscricoesAbertas) {
    const mensagem =
      turma.motivoFechado === "AINDA_NAO_COMECOU" && turma.inscricoesDe
        ? `As inscricoes abrem em ${formatDate(turma.inscricoesDe)}.`
        : turma.motivoFechado === "ENCERRADA" && turma.inscricoesAte
          ? `As inscricoes foram encerradas em ${formatDate(turma.inscricoesAte)}.`
          : "Esta turma nao esta aceitando inscricoes no momento.";
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <CardTitle className="text-lg">{turma.nome}</CardTitle>
            <p className="text-sm text-muted-foreground">{mensagem}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Voltar para o site</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    const extras = turma?.perguntasExtras ?? [];

    // Obrigatorias das perguntas extras: validadas aqui porque o schema do
    // react-hook-form so conhece os campos fixos.
    for (const p of extras) {
      const r = respostas[p.id];
      const vazia = Array.isArray(r) ? r.length === 0 : !r?.trim();
      if (p.obrigatorio && vazia) {
        toast.error(`Responda: ${p.label}`);
        return;
      }
    }

    const respostasExtras = extras
      .map((p) => {
        const r = respostas[p.id];
        if (Array.isArray(r)) {
          return r.length ? { perguntaId: p.id, valor: r.join("; "), valores: r } : null;
        }
        return r?.trim() ? { perguntaId: p.id, valor: r.trim() } : null;
      })
      .filter((r): r is { perguntaId: string; valor: string; valores?: string[] } => r !== null);

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
        respostasExtras: respostasExtras.length ? respostasExtras : undefined,
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
            {turma.inscricoesAte && (
              <span className="flex items-center gap-1">
                Inscricoes ate {formatDate(turma.inscricoesAte)}
              </span>
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
                <PhoneInputBR
                  id="whatsapp"
                  value={(form.watch("whatsapp") as string) ?? ""}
                  onChange={(d) => form.setValue("whatsapp", d)}
                />
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
                <Controller
                  control={form.control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <DateInputBR
                      id="dataNascimento"
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite so os numeros: 25121990
                </p>
              </div>
            )}

            {(turma.perguntasExtras ?? []).map((p) => {
              const valor = respostas[p.id];
              const tipo = p.tipo ?? "TEXTO";
              return (
                <div key={p.id}>
                  <Label htmlFor={`extra-${p.id}`}>
                    {p.label}
                    {p.obrigatorio && <span className="text-destructive"> *</span>}
                  </Label>
                  {p.ajuda && (
                    <p className="text-xs text-muted-foreground mb-1">{p.ajuda}</p>
                  )}

                  {tipo === "TEXTO" && (
                    <Input
                      id={`extra-${p.id}`}
                      value={(valor as string) ?? ""}
                      onChange={(e) =>
                        setRespostas((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                  )}

                  {tipo === "TEXTO_LONGO" && (
                    <Textarea
                      id={`extra-${p.id}`}
                      rows={3}
                      value={(valor as string) ?? ""}
                      onChange={(e) =>
                        setRespostas((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                  )}

                  {tipo === "ESCOLHA_UNICA" && (
                    <RadioGroup
                      className="mt-1 gap-1"
                      value={(valor as string) ?? ""}
                      onValueChange={(v) => setRespostas((prev) => ({ ...prev, [p.id]: v }))}
                    >
                      {(p.opcoes ?? []).map((opcao) => (
                        <Label
                          key={opcao}
                          htmlFor={`${p.id}-${opcao}`}
                          className="flex items-center gap-3 min-h-[44px] px-3 rounded-lg border cursor-pointer font-normal"
                        >
                          <RadioGroupItem id={`${p.id}-${opcao}`} value={opcao} />
                          <span className="text-sm">{opcao}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}

                  {tipo === "ESCOLHA_MULTIPLA" && (
                    <div className="mt-1 space-y-1">
                      {(p.opcoes ?? []).map((opcao) => {
                        const marcadas = (valor as string[]) ?? [];
                        const marcada = marcadas.includes(opcao);
                        return (
                          <Label
                            key={opcao}
                            htmlFor={`${p.id}-${opcao}`}
                            className="flex items-center gap-3 min-h-[44px] px-3 rounded-lg border cursor-pointer font-normal"
                          >
                            <Checkbox
                              id={`${p.id}-${opcao}`}
                              checked={marcada}
                              onCheckedChange={(c) =>
                                setRespostas((prev) => ({
                                  ...prev,
                                  [p.id]: c
                                    ? [...marcadas, opcao]
                                    : marcadas.filter((m) => m !== opcao),
                                }))
                              }
                            />
                            <span className="text-sm">{opcao}</span>
                          </Label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

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
