"use client";

import Link from "next/link";

import { useState } from "react";
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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar, MapPin, Users, CheckCircle } from "lucide-react";
import { inscricaoPublicSchema } from "@features/turmas/lib/validations";
import { DIA_SEMANA_LABELS } from "@features/turmas/lib/constants";

// Escala do formulario publico, no espirito do Tally: rotulo grande, input alto
// e respiro generoso entre perguntas. text-base (16px) tambem impede o Safari
// do iOS de dar zoom ao focar o campo.
const CAMPO = "space-y-2";
const ROTULO = "block text-[17px] font-medium leading-snug";
const AJUDA = "text-sm text-muted-foreground";
const ENTRADA = "h-12 text-base";
const OPCAO =
  "flex items-center gap-3 min-h-14 px-4 rounded-xl border text-base font-normal cursor-pointer transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function InscricaoPublicaForm({ token }: { token: string }) {
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

  if (turma === undefined) return <div className="flex items-center justify-center py-24">Carregando...</div>;
  if (turma === null)
    return (
      <div className="flex items-center justify-center px-5 py-24 text-center">
        Link inválido ou turma não encontrada
      </div>
    );
  if (!turma.inscricoesAbertas) {
    const mensagem =
      turma.motivoFechado === "AINDA_NAO_COMECOU" && turma.inscricoesDe
        ? `As inscrições abrem em ${formatDate(turma.inscricoesDe)}.`
        : turma.motivoFechado === "ENCERRADA" && turma.inscricoesAte
          ? `As inscrições foram encerradas em ${formatDate(turma.inscricoesAte)}.`
          : "Esta turma não está aceitando inscrições no momento.";
    return (
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-xl text-center space-y-5">
          <h1 className="text-2xl font-bold leading-tight">{turma.nome}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{mensagem}</p>
          <Link
            href="/inscricoes"
            className="inline-block text-base text-muted-foreground underline hover:text-foreground"
          >
            Ver outras inscrições
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-xl text-center space-y-5">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold leading-tight">Inscrição realizada!</h1>
          <p className="text-base text-muted-foreground">{turma.nome}</p>
          {resultStatus === "LISTA_ESPERA" && (
            <p className="text-base leading-relaxed text-yellow-800 bg-yellow-50 p-4 rounded-xl">
              Você está na lista de espera. Entraremos em contato quando houver vaga.
            </p>
          )}
          <Link
            href="/inscricoes"
            className="inline-block text-base text-muted-foreground underline hover:text-foreground"
          >
            Ver outras inscrições
          </Link>
        </div>
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
      await registrar({
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
    // Sem Card: formulario ocupa a pagina, com respiro. Fonte base de 16px nos
    // inputs tambem evita o zoom automatico do Safari no iOS.
    // O shell (fundo e altura) vem do layout do site — aqui so o miolo.
    <div>
      <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-14">
        <Link
          href="/inscricoes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Inscrições
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{turma.nome}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(turma.dataInicio)}
              {turma.diaSemana && ` - ${DIA_SEMANA_LABELS[turma.diaSemana] ?? turma.diaSemana}`}
              {turma.horario && ` ${turma.horario}`}
            </span>
            {turma.local && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {turma.local}
              </span>
            )}
            {turma.inscricoesAte && (
              <span>Inscrições até {formatDate(turma.inscricoesAte)}</span>
            )}
            {turma.vagasRestantes !== null && turma.vagasRestantes < 5 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                <Users className="h-3 w-3 mr-1" />
                {turma.vagasRestantes} vagas restantes
              </Badge>
            )}
          </div>
          {turma.descricao && (
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {turma.descricao}
            </p>
          )}
        </header>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className={CAMPO}>
              <Label htmlFor="nomeCompleto" className={ROTULO}>
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input id="nomeCompleto" className={ENTRADA} {...form.register("nomeCompleto")} />
              {form.formState.errors.nomeCompleto && (
                <p className="text-sm text-destructive">{form.formState.errors.nomeCompleto.message as string}</p>
              )}
            </div>

            {turma.camposSistema.includes("whatsapp") && (
              <div className={CAMPO}>
                <Label htmlFor="whatsapp" className={ROTULO}>
                  WhatsApp
                </Label>
                <PhoneInputBR
                  id="whatsapp"
                  className={ENTRADA}
                  value={(form.watch("whatsapp") as string) ?? ""}
                  onChange={(d) => form.setValue("whatsapp", d)}
                />
              </div>
            )}

            {turma.camposSistema.includes("email") && (
              <div className={CAMPO}>
                <Label htmlFor="email" className={ROTULO}>
                  E-mail
                </Label>
                <Input id="email" type="email" className={ENTRADA} {...form.register("email")} />
              </div>
            )}

            {turma.camposSistema.includes("sexo") && (
              <div className={CAMPO}>
                <Label className={ROTULO}>Sexo</Label>
                <RadioGroup
                  className="gap-2"
                  value={(form.watch("sexo") as string) ?? ""}
                  onValueChange={(v) => form.setValue("sexo", v)}
                >
                  {[
                    { valor: "M", label: "Masculino" },
                    { valor: "F", label: "Feminino" },
                  ].map((o) => (
                    <Label key={o.valor} htmlFor={`sexo-${o.valor}`} className={OPCAO}>
                      <RadioGroupItem id={`sexo-${o.valor}`} value={o.valor} className="size-5" />
                      <span>{o.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {turma.camposSistema.includes("dataNascimento") && (
              <div className={CAMPO}>
                <Label htmlFor="dataNascimento" className={ROTULO}>
                  Data de nascimento
                </Label>
                <Controller
                  control={form.control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <DateInputBR
                      id="dataNascimento"
                      className={ENTRADA}
                      value={(field.value as string) ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                <p className={AJUDA}>Digite só os números: 25121990</p>
              </div>
            )}

            {(turma.perguntasExtras ?? []).map((p) => {
              const valor = respostas[p.id];
              const tipo = p.tipo ?? "TEXTO";
              return (
                <div key={p.id} className={CAMPO}>
                  <Label htmlFor={`extra-${p.id}`} className={ROTULO}>
                    {p.label}
                    {p.obrigatorio && <span className="text-destructive"> *</span>}
                  </Label>
                  {p.ajuda && <p className={AJUDA}>{p.ajuda}</p>}

                  {tipo === "TEXTO" && (
                    <Input
                      id={`extra-${p.id}`}
                      className={ENTRADA}
                      value={(valor as string) ?? ""}
                      onChange={(e) =>
                        setRespostas((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                  )}

                  {tipo === "TEXTO_LONGO" && (
                    <Textarea
                      id={`extra-${p.id}`}
                      className="text-base"
                      rows={3}
                      value={(valor as string) ?? ""}
                      onChange={(e) =>
                        setRespostas((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                  )}

                  {tipo === "ESCOLHA_UNICA" && (
                    <RadioGroup
                      className="gap-2"
                      value={(valor as string) ?? ""}
                      onValueChange={(v) => setRespostas((prev) => ({ ...prev, [p.id]: v }))}
                    >
                      {(p.opcoes ?? []).map((opcao) => (
                        <Label
                          key={opcao}
                          htmlFor={`${p.id}-${opcao}`}
                          className={OPCAO}
                        >
                          <RadioGroupItem id={`${p.id}-${opcao}`} value={opcao} className="size-5" />
                          <span>{opcao}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  )}

                  {tipo === "ESCOLHA_MULTIPLA" && (
                    <div className="space-y-2">
                      {(p.opcoes ?? []).map((opcao) => {
                        const marcadas = (valor as string[]) ?? [];
                        const marcada = marcadas.includes(opcao);
                        return (
                          <Label
                            key={opcao}
                            htmlFor={`${p.id}-${opcao}`}
                            className={OPCAO}
                          >
                            <Checkbox
                              id={`${p.id}-${opcao}`}
                              className="size-5"
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
                            <span>{opcao}</span>
                          </Label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="space-y-2 border-t pt-8">
              <Label
                htmlFor="lgpd"
                className="flex items-start gap-3 text-sm leading-relaxed font-normal cursor-pointer"
              >
                <Checkbox
                  id="lgpd"
                  className="mt-0.5"
                  checked={form.watch("lgpdConsentimento") === true}
                  onCheckedChange={(checked) =>
                    form.setValue(
                      "lgpdConsentimento",
                      checked === true ? true : (false as unknown as true)
                    )
                  }
                />
                <span>
                  Concordo com o uso dos meus dados para gestão desta turma{" "}
                  <span className="text-destructive">*</span>
                </span>
              </Label>
              {form.formState.errors.lgpdConsentimento && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lgpdConsentimento.message as string}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Enviando..." : "Inscrever-se"}
            </Button>
          </form>
      </div>
    </div>
  );
}
