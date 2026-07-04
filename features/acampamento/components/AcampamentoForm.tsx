"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePickerBR } from "@/shared/components/ui/date-picker-br";
import { Plus, Trash2, UserRound, Loader2 } from "lucide-react";
import { calcularValorInscricao } from "@convex/acampamento/calculoHelpers";
import type { AcampamentoPublico } from "../lib/data";
import { LoginModalInline } from "@features/site-publico/components/LoginModalInline";

const hojeIso = () => new Date().toISOString().slice(0, 10);

const participanteSchema = z.object({
  nome: z.string().trim().min(3, "Nome completo"),
  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data")
    .refine((d) => d < hojeIso(), "Data no futuro"),
  participaPalestras: z.boolean(),
});

const formSchema = z
  .object({
    responsavelNome: z.string().trim().min(3, "Informe seu nome"),
    responsavelWhatsapp: z
      .string()
      .refine((s) => {
        const d = s.replace(/\D/g, "");
        return d.length >= 10 && d.length <= 15;
      }, "WhatsApp inválido"),
    participantes: z.array(participanteSchema).min(1, "Adicione ao menos um participante").max(10),
    quartosDuplos: z.number().int().min(0),
    quartosTriplos: z.number().int().min(0),
    camasExtras: z.number().int().min(0),
    pets: z.number().int().min(0),
    colegaDeQuarto: z.string().optional(),
    berco: z.boolean(),
    necessidadesEspeciais: z.string().optional(),
    observacao: z.string().optional(),
    forma: z.enum(["A_VISTA", "PARCELADO"]),
    parcelas: z.string().optional(),
    cpfPagante: z
      .string()
      .optional()
      .refine((s) => !s || s.replace(/\D/g, "").length === 11, "CPF inválido"),
    lgpd: z.boolean().refine((v) => v, "Confirme que leu as condições"),
    website: z.string().optional(), // honeypot
  })
  .refine((d) => d.quartosDuplos + d.quartosTriplos > 0, {
    message: "Escolha ao menos um quarto",
    path: ["quartosDuplos"],
  })
  .refine(
    (d) => d.forma !== "PARCELADO" || (Number(d.parcelas) >= 2 && Number(d.parcelas) <= 12),
    { message: "Escolha de 2 a 12 parcelas", path: ["parcelas"] },
  );

type FormValues = z.infer<typeof formSchema>;

function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Input numerico compacto (mobile-first, tap >= 44px)
function CampoNumero({
  label,
  hint,
  value,
  onChange,
  max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 md:h-9 md:w-9"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          −
        </Button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 md:h-9 md:w-9"
          onClick={() => onChange(value + 1)}
          disabled={max !== undefined && value >= max}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function AcampamentoForm({ acampamento }: { acampamento: AcampamentoPublico }) {
  const { isAuthenticated } = useConvexAuth();
  // @ts-ignore Convex TS2589
  const familia = useQuery(api.public.acampamento.minhaFamilia, isAuthenticated ? {} : "skip");
  const [loginOpen, setLoginOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [resultado, setResultado] = useState<{ status: string; valorTabela: number } | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responsavelNome: "",
      responsavelWhatsapp: "",
      participantes: [{ nome: "", dataNascimento: "", participaPalestras: true }],
      quartosDuplos: 0,
      quartosTriplos: 0,
      camasExtras: 0,
      pets: 0,
      berco: false,
      forma: "A_VISTA",
      lgpd: false,
      website: "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "participantes" });

  const valores = form.watch();

  // Resumo do valor ao vivo — mesma aritmetica do backend (helper compartilhado)
  const resumo = useMemo(() => {
    const parts = (valores.participantes ?? []).filter(
      (p) => p?.nome?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(p.dataNascimento ?? ""),
    );
    if (parts.length === 0) return null;
    return calcularValorInscricao(
      parts.map((p) => ({
        nome: p.nome,
        dataNascimento: p.dataNascimento,
        participaPalestras: p.participaPalestras,
      })),
      {
        quartosDuplos: valores.quartosDuplos ?? 0,
        quartosTriplos: valores.quartosTriplos ?? 0,
        camasExtras: valores.camasExtras ?? 0,
        pets: valores.pets ?? 0,
      },
      acampamento.precos,
      acampamento.dataInicio,
      acampamento.dataFim,
    );
  }, [valores, acampamento]);

  function preencherComFamilia() {
    if (!familia) return;
    form.setValue("responsavelNome", familia.responsavel.nome);
    form.setValue("responsavelWhatsapp", familia.responsavel.whatsapp);
    form.setValue(
      "participantes",
      familia.participantes.map((p) => ({
        nome: p.nome,
        dataNascimento: p.dataNascimento ?? "",
        participaPalestras: true,
      })),
    );
  }

  async function onSubmit(data: FormValues) {
    setStatus("submitting");
    setErroEnvio(null);
    try {
      const res = await fetch("/api/acampamento/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: acampamento.slug,
          responsavel: { nome: data.responsavelNome, whatsapp: data.responsavelWhatsapp },
          participantes: data.participantes,
          hospedagem: {
            quartosDuplos: data.quartosDuplos,
            quartosTriplos: data.quartosTriplos,
            camasExtras: data.camasExtras,
            pets: data.pets,
          },
          extras: {
            colegaDeQuarto: data.colegaDeQuarto?.trim() || undefined,
            berco: data.berco || undefined,
            necessidadesEspeciais: data.necessidadesEspeciais?.trim() || undefined,
            observacao: data.observacao?.trim() || undefined,
          },
          pagamentoPreferido: {
            forma: data.forma,
            parcelas: data.forma === "PARCELADO" ? Number(data.parcelas) : undefined,
            cpfPagante: data.cpfPagante?.replace(/\D/g, "") || undefined,
          },
          lgpdConsentimento: data.lgpd,
          website: data.website,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Erro ao enviar inscrição");
      setResultado({ status: json.status, valorTabela: json.valorTabela });
      setStatus("success");
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Erro ao enviar inscrição");
      setStatus("error");
    }
  }

  if (status === "success" && resultado) {
    const espera = resultado.status === "LISTA_ESPERA";
    return (
      <div className="rounded-xl border p-6 text-center space-y-3">
        <p className="text-lg font-semibold">
          {espera ? "Você está na lista de espera" : "Inscrição recebida!"}
        </p>
        <p className="text-sm text-muted-foreground">
          {espera
            ? "Os quartos disponíveis se esgotaram. A secretaria entrará em contato assim que abrir vaga."
            : `Valor da inscrição: ${brl(resultado.valorTabela)}. A secretaria entrará em contato pelo WhatsApp para combinar o pagamento.`}
        </p>
      </div>
    );
  }

  if (!acampamento.inscricoesAbertas) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        As inscrições não estão abertas no momento.
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Pré-preenchimento p/ membro */}
      {!isAuthenticated ? (
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="w-full rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent/40 min-h-[44px]"
        >
          É membro? <span className="underline">Entre</span> para preencher com os dados da sua família.
        </button>
      ) : familia && familia.participantes.length > 0 ? (
        <Button type="button" variant="outline" className="w-full h-11" onClick={preencherComFamilia}>
          <UserRound className="mr-2 h-4 w-4" />
          Preencher com minha família ({familia.participantes.length})
        </Button>
      ) : null}
      <LoginModalInline open={loginOpen} onOpenChange={setLoginOpen} />

      {/* Responsável */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Responsável pela inscrição</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="respNome">Nome</Label>
            <Input id="respNome" {...form.register("responsavelNome")} />
            {form.formState.errors.responsavelNome && (
              <p className="text-xs text-destructive">{form.formState.errors.responsavelNome.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="respZap">WhatsApp</Label>
            <Input id="respZap" type="tel" placeholder="(11) 9…" {...form.register("responsavelWhatsapp")} />
            {form.formState.errors.responsavelWhatsapp && (
              <p className="text-xs text-destructive">{form.formState.errors.responsavelWhatsapp.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Participantes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Participantes</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 md:h-8"
            disabled={fields.length >= 10}
            onClick={() => append({ nome: "", dataNascimento: "", participaPalestras: true })}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
        {form.formState.errors.participantes?.message && (
          <p className="text-xs text-destructive">{form.formState.errors.participantes.message}</p>
        )}
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="rounded-lg border p-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor={`p-nome-${i}`}>Nome completo</Label>
                  <Input id={`p-nome-${i}`} {...form.register(`participantes.${i}.nome`)} />
                  {form.formState.errors.participantes?.[i]?.nome && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.participantes[i]?.nome?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`p-nasc-${i}`}>Nascimento</Label>
                  <Controller
                    control={form.control}
                    name={`participantes.${i}.dataNascimento`}
                    render={({ field }) => (
                      <DatePickerBR
                        id={`p-nasc-${i}`}
                        value={field.value}
                        onChange={field.onChange}
                        max={hojeIso()}
                      />
                    )}
                  />
                  {form.formState.errors.participantes?.[i]?.dataNascimento && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.participantes[i]?.dataNascimento?.message}
                    </p>
                  )}
                </div>
                <div className="flex items-end justify-between gap-3 md:flex-col md:items-center">
                  <label className="flex items-center gap-2 text-sm min-h-[44px] md:min-h-0">
                    <Controller
                      control={form.control}
                      name={`participantes.${i}.participaPalestras`}
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                      )}
                    />
                    Palestras
                  </label>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground"
                      onClick={() => remove(i)}
                      aria-label="Remover participante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hospedagem */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Hospedagem</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <Controller
            control={form.control}
            name="quartosDuplos"
            render={({ field }) => (
              <CampoNumero
                label="Quartos duplos"
                hint={`${acampamento.disponibilidade.duplos} disponíveis`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="quartosTriplos"
            render={({ field }) => (
              <CampoNumero
                label="Quartos triplos"
                hint={`${acampamento.disponibilidade.triplos} disponíveis`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="camasExtras"
            render={({ field }) => (
              <CampoNumero
                label="Camas extras"
                hint={`${brl(acampamento.precos.camaExtra)} pelo período`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="pets"
            render={({ field }) => (
              <CampoNumero
                label="Pets"
                hint={`${brl(acampamento.precos.petPorDia)} por dia`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        {form.formState.errors.quartosDuplos && (
          <p className="text-xs text-destructive">{form.formState.errors.quartosDuplos.message}</p>
        )}
      </section>

      {/* Extras */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Preferências</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="colega">Dividir quarto com (opcional)</Label>
            <Input id="colega" placeholder="Nome de quem quer por perto" {...form.register("colegaDeQuarto")} />
          </div>
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <Controller
              control={form.control}
              name="berco"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              )}
            />
            Preciso de berço
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="especiais">Necessidades especiais (opcional)</Label>
            <Input
              id="especiais"
              placeholder="Acessibilidade, alergias, restrições…"
              {...form.register("necessidadesEspeciais")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações (opcional)</Label>
            <Textarea id="obs" rows={3} {...form.register("observacao")} />
          </div>
        </div>
      </section>

      {/* Pagamento */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Pagamento</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Forma</Label>
            <Controller
              control={form.control}
              name="forma"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_VISTA">À vista</SelectItem>
                    <SelectItem value="PARCELADO">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {valores.forma === "PARCELADO" && (
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Controller
                control={form.control}
                name="parcelas"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Quantas?" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}×
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.parcelas && (
                <p className="text-xs text-destructive">{form.formState.errors.parcelas.message}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF do pagante</Label>
            <Input id="cpf" inputMode="numeric" placeholder="Somente números" {...form.register("cpfPagante")} />
            {form.formState.errors.cpfPagante && (
              <p className="text-xs text-destructive">{form.formState.errors.cpfPagante.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Resumo do valor */}
      {resumo && resumo.total > 0 && (
        <section className="rounded-xl border bg-muted/30 p-4 space-y-2">
          <h2 className="text-base font-semibold">Resumo</h2>
          <ul className="space-y-1 text-sm">
            {resumo.hospedagemPorParticipante.map((p, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {p.nome} ({p.idade} anos)
                </span>
                <span className="tabular-nums">{brl(p.valor)}</span>
              </li>
            ))}
            {resumo.palestras > 0 && (
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Palestras</span>
                <span className="tabular-nums">{brl(resumo.palestras)}</span>
              </li>
            )}
            {resumo.camasExtras > 0 && (
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Camas extras</span>
                <span className="tabular-nums">{brl(resumo.camasExtras)}</span>
              </li>
            )}
            {resumo.pets > 0 && (
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Pets</span>
                <span className="tabular-nums">{brl(resumo.pets)}</span>
              </li>
            )}
          </ul>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{brl(resumo.total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Valor calculado pela tabela vigente. Condições especiais podem ser combinadas com a secretaria.
          </p>
        </section>
      )}

      {/* Honeypot (invisível p/ humanos) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        {...form.register("website")}
      />

      {/* LGPD + enviar */}
      <section className="space-y-4">
        <label className="flex items-start gap-2 text-sm">
          <Controller
            control={form.control}
            name="lgpd"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
                className="mt-0.5"
              />
            )}
          />
          <span>
            Declaro que li e estou ciente das informações e condições apresentadas, incluindo taxas
            adicionais e regras de hospedagem.
          </span>
        </label>
        {form.formState.errors.lgpd && (
          <p className="text-xs text-destructive">{form.formState.errors.lgpd.message}</p>
        )}
        {erroEnvio && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erroEnvio}</p>
        )}
        <Button type="submit" className="w-full h-12" disabled={status === "submitting"}>
          {status === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar inscrição{resumo && resumo.total > 0 ? ` — ${brl(resumo.total)}` : ""}
        </Button>
      </section>
    </form>
  );
}
