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
import { calcularValorInscricao, idadeNaData } from "@convex/acampamento/calculoHelpers";
import type { AcampamentoPublico } from "../lib/data";
import { LoginModalInline } from "@features/site-publico/components/LoginModalInline";

const hojeIso = () => new Date().toISOString().slice(0, 10);

// Palestras: marcadas por padrao so a partir dos 15 anos
const IDADE_PALESTRA = 15;

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

// ===== Vocabulario visual do site v2 (navy/laranja/papel, cantos retos) =====
const FONT_BODY = "font-[family-name:var(--font-source-sans)]";
const FONT_DISPLAY = "font-[family-name:var(--font-spectral)]";
const COR_TEXTO = "text-[#1A1A1A]";
const COR_MUTED = "text-[#595959]";
const BORDA = "border-[#E5E3DC]";

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={`${FONT_BODY} text-[12px] text-[#B3261E]`}>{msg}</p>;
}

// Cabecalho de etapa: numero em Spectral + regua — o form e uma sequencia real
function Etapa({ n, titulo, hint }: { n: number; titulo: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[#E5E3DC] pb-2">
      <span className={`${FONT_DISPLAY} text-[20px] leading-none text-[#F0732B]`}>{n}</span>
      <h2 className={`${FONT_DISPLAY} text-[19px] leading-tight ${COR_TEXTO}`}>{titulo}</h2>
      {hint && <span className={`${FONT_BODY} ml-auto text-[12px] ${COR_MUTED}`}>{hint}</span>}
    </div>
  );
}

function CampoLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className={`${FONT_BODY} text-[13px] ${COR_TEXTO}`}>
      {children}
    </Label>
  );
}

// Stepper quadrado no vocabulario do site
function CampoNumero({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border ${BORDA} bg-white p-3`}>
      <div className="min-w-0">
        <p className={`${FONT_BODY} text-[14px] font-semibold ${COR_TEXTO}`}>{label}</p>
        {hint && <p className={`${FONT_BODY} text-[12px] ${COR_MUTED}`}>{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className={`h-11 w-11 border ${BORDA} bg-white text-[18px] leading-none ${COR_TEXTO} transition-colors hover:bg-[#F4F0E8] disabled:opacity-30 md:h-9 md:w-9`}
        >
          −
        </button>
        <span className={`${FONT_DISPLAY} w-7 text-center text-[18px] tabular-nums ${COR_TEXTO}`}>
          {value}
        </span>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(value + 1)}
          className={`h-11 w-11 border ${BORDA} bg-white text-[18px] leading-none ${COR_TEXTO} transition-colors hover:bg-[#F4F0E8] md:h-9 md:w-9`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Linha da "conta do retiro": pontilhado entre item e valor (estetica de recibo)
function LinhaConta({ nome, detalhe, valor }: { nome: string; detalhe?: string; valor: string }) {
  return (
    <li className={`flex items-baseline gap-2 py-1 ${FONT_BODY} text-[14px]`}>
      <span className={`shrink-0 ${COR_TEXTO}`}>
        {nome}
        {detalhe && <span className={`ml-1.5 text-[12px] ${COR_MUTED}`}>{detalhe}</span>}
      </span>
      <span className="mx-1 flex-1 translate-y-[-2px] border-b border-dotted border-[#C9C2B4]" aria-hidden />
      <span className={`shrink-0 tabular-nums ${COR_TEXTO}`}>{valor}</span>
    </li>
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

  // Ao informar o nascimento, palestras ficam marcadas so p/ 15+ (ajustavel)
  function aoMudarNascimento(index: number, iso: string) {
    form.setValue(`participantes.${index}.dataNascimento`, iso, { shouldValidate: true });
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      form.setValue(
        `participantes.${index}.participaPalestras`,
        idadeNaData(iso, acampamento.dataInicio) >= IDADE_PALESTRA,
      );
    }
  }

  function preencherComFamilia() {
    if (!familia) return;
    form.setValue("responsavelNome", familia.responsavel.nome);
    form.setValue("responsavelWhatsapp", familia.responsavel.whatsapp);
    form.setValue(
      "participantes",
      familia.participantes.map((p) => ({
        nome: p.nome,
        dataNascimento: p.dataNascimento ?? "",
        participaPalestras: p.dataNascimento
          ? idadeNaData(p.dataNascimento, acampamento.dataInicio) >= IDADE_PALESTRA
          : true,
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
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Erro ao enviar inscrição");
      setStatus("error");
    }
  }

  if (status === "success" && resultado) {
    const espera = resultado.status === "LISTA_ESPERA";
    return (
      <div className={`border ${BORDA} bg-white p-6 text-center md:p-10`}>
        <p className={`${FONT_DISPLAY} text-[24px] ${COR_TEXTO}`}>
          {espera ? "Você está na lista de espera" : "Inscrição recebida!"}
        </p>
        <p className={`${FONT_BODY} mx-auto mt-3 max-w-[42ch] text-[14px] leading-[1.6] ${COR_MUTED}`}>
          {espera
            ? "Os quartos disponíveis se esgotaram. A secretaria entrará em contato assim que abrir vaga."
            : `Valor da inscrição: ${brl(resultado.valorTabela)}. A secretaria entrará em contato pelo WhatsApp para combinar o pagamento.`}
        </p>
      </div>
    );
  }

  if (!acampamento.inscricoesAbertas) {
    return (
      <div className={`border ${BORDA} bg-[#F4F0E8] p-6 text-center ${FONT_BODY} text-[14px] ${COR_MUTED}`}>
        As inscrições não estão abertas no momento.
      </div>
    );
  }

  const errs = form.formState.errors;
  const temTotal = !!resumo && resumo.total > 0;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className={`space-y-10 ${temTotal ? "pb-24 md:pb-0" : ""}`}
    >
      {/* Pre-preenchimento p/ membro */}
      {!isAuthenticated ? (
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className={`flex min-h-[48px] w-full items-center justify-center gap-2 border ${BORDA} bg-[#F4F0E8] px-4 py-3 ${FONT_BODY} text-[13px] ${COR_TEXTO} transition-colors hover:bg-[#ECE6DC]`}
        >
          É membro da IPC? <span className="underline underline-offset-2">Entre</span> e preenchemos
          com os dados da sua família.
        </button>
      ) : familia && familia.participantes.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={preencherComFamilia}
          className={`h-12 w-full border ${BORDA} ${FONT_BODY} text-[14px] ${COR_TEXTO} hover:bg-[#F4F0E8]`}
        >
          <UserRound className="mr-2 h-4 w-4 text-[#F0732B]" />
          Preencher com minha família ({familia.participantes.length})
        </Button>
      ) : null}
      <LoginModalInline open={loginOpen} onOpenChange={setLoginOpen} />

      {/* 1 — Responsavel */}
      <section className="space-y-4">
        <Etapa n={1} titulo="Responsável pela inscrição" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <CampoLabel htmlFor="respNome">Nome</CampoLabel>
            <Input id="respNome" {...form.register("responsavelNome")} />
            <Erro msg={errs.responsavelNome?.message} />
          </div>
          <div className="space-y-1">
            <CampoLabel htmlFor="respZap">WhatsApp</CampoLabel>
            <Input id="respZap" type="tel" placeholder="(11) 9…" {...form.register("responsavelWhatsapp")} />
            <Erro msg={errs.responsavelWhatsapp?.message} />
          </div>
        </div>
      </section>

      {/* 2 — Participantes */}
      <section className="space-y-4">
        <Etapa n={2} titulo="Quem vai" hint={`${fields.length} de 10`} />
        <Erro msg={errs.participantes?.message} />
        <div className="space-y-3">
          {fields.map((f, i) => {
            const nasc = valores.participantes?.[i]?.dataNascimento;
            const nascValido = nasc && /^\d{4}-\d{2}-\d{2}$/.test(nasc);
            const idade = nascValido ? idadeNaData(nasc, acampamento.dataInicio) : null;
            return (
              <div key={f.id} className={`border ${BORDA} bg-white p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.08em] ${COR_MUTED}`}>
                    Participante {i + 1}
                    {idade !== null && (
                      <span className="ml-2 normal-case tracking-normal text-[#F0732B]">
                        {idade} {idade === 1 ? "ano" : "anos"}
                      </span>
                    )}
                  </p>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remover participante ${i + 1}`}
                      onClick={() => remove(i)}
                      className={`-mr-1 flex h-9 w-9 items-center justify-center ${COR_MUTED} transition-colors hover:text-[#B3261E]`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_190px]">
                  <div className="space-y-1">
                    <CampoLabel htmlFor={`p-nome-${i}`}>Nome completo</CampoLabel>
                    <Input id={`p-nome-${i}`} {...form.register(`participantes.${i}.nome`)} />
                    <Erro msg={errs.participantes?.[i]?.nome?.message} />
                  </div>
                  <div className="space-y-1">
                    <CampoLabel htmlFor={`p-nasc-${i}`}>Nascimento</CampoLabel>
                    <Controller
                      control={form.control}
                      name={`participantes.${i}.dataNascimento`}
                      render={({ field }) => (
                        <DatePickerBR
                          id={`p-nasc-${i}`}
                          value={field.value}
                          onChange={(iso) => aoMudarNascimento(i, iso)}
                          max={hojeIso()}
                        />
                      )}
                    />
                    <Erro msg={errs.participantes?.[i]?.dataNascimento?.message} />
                  </div>
                </div>
                <label className={`mt-3 flex min-h-[44px] items-center gap-2.5 ${FONT_BODY} text-[13px] ${COR_TEXTO} md:min-h-0`}>
                  <Controller
                    control={form.control}
                    name={`participantes.${i}.participaPalestras`}
                    render={({ field }) => (
                      <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                    )}
                  />
                  Participará das palestras
                </label>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => append({ nome: "", dataNascimento: "", participaPalestras: true })}
          disabled={fields.length >= 10}
          className={`flex min-h-[48px] w-full items-center justify-center gap-2 border border-dashed ${BORDA} ${FONT_BODY} text-[13px] font-semibold ${COR_TEXTO} transition-colors hover:bg-[#F4F0E8] disabled:opacity-40`}
        >
          <Plus className="h-4 w-4 text-[#F0732B]" /> Adicionar participante
        </button>
      </section>

      {/* 3 — Hospedagem */}
      <section className="space-y-4">
        <Etapa n={3} titulo="Hospedagem" />
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
        <Erro msg={errs.quartosDuplos?.message} />
      </section>

      {/* 4 — Preferencias */}
      <section className="space-y-4">
        <Etapa n={4} titulo="Preferências" hint="opcional" />
        <div className="space-y-4">
          <div className="space-y-1">
            <CampoLabel htmlFor="colega">Dividir quarto com</CampoLabel>
            <Input id="colega" placeholder="Nome de quem você quer por perto" {...form.register("colegaDeQuarto")} />
          </div>
          <label className={`flex min-h-[44px] items-center gap-2.5 ${FONT_BODY} text-[13px] ${COR_TEXTO} md:min-h-0`}>
            <Controller
              control={form.control}
              name="berco"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              )}
            />
            Preciso de berço
          </label>
          <div className="space-y-1">
            <CampoLabel htmlFor="especiais">Necessidades especiais</CampoLabel>
            <Input
              id="especiais"
              placeholder="Acessibilidade, alergias, restrições…"
              {...form.register("necessidadesEspeciais")}
            />
          </div>
          <div className="space-y-1">
            <CampoLabel htmlFor="obs">Observações</CampoLabel>
            <Textarea id="obs" rows={3} {...form.register("observacao")} />
          </div>
        </div>
      </section>

      {/* 5 — Pagamento */}
      <section className="space-y-4">
        <Etapa n={5} titulo="Pagamento" hint="a secretaria confirma pelo WhatsApp" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <CampoLabel>Forma</CampoLabel>
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
            <div className="space-y-1">
              <CampoLabel>Parcelas</CampoLabel>
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
                          {n}×{resumo && resumo.total > 0 ? ` de ${brl(Math.ceil(resumo.total / n))}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Erro msg={errs.parcelas?.message} />
            </div>
          )}
          <div className="space-y-1">
            <CampoLabel htmlFor="cpf">CPF do pagante</CampoLabel>
            <Input id="cpf" inputMode="numeric" placeholder="Somente números" {...form.register("cpfPagante")} />
            <Erro msg={errs.cpfPagante?.message} />
          </div>
        </div>
      </section>

      {/* Conta do retiro (assinatura visual: recibo com pontilhado) */}
      {resumo && resumo.total > 0 && (
        <section className={`border ${BORDA} bg-[#F4F0E8] p-6 md:p-7`}>
          <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.1em] ${COR_MUTED}`}>
            Resumo da inscrição
          </p>
          <ul className="mt-5 space-y-2.5">
            {resumo.hospedagemPorParticipante.map((p, i) => (
              <LinhaConta key={i} nome={p.nome} detalhe={`${p.idade} anos`} valor={brl(p.valor)} />
            ))}
            {resumo.palestras > 0 && <LinhaConta nome="Palestras" valor={brl(resumo.palestras)} />}
            {resumo.camasExtras > 0 && <LinhaConta nome="Camas extras" valor={brl(resumo.camasExtras)} />}
            {resumo.pets > 0 && <LinhaConta nome="Pets" valor={brl(resumo.pets)} />}
          </ul>
          <div className="mt-6 flex items-baseline justify-between border-t-2 border-[#1C2E49] pt-4">
            <span className={`${FONT_BODY} text-[13px] font-semibold uppercase tracking-[0.08em] ${COR_TEXTO}`}>
              Total
            </span>
            <span className={`${FONT_DISPLAY} text-[30px] leading-none text-[#16243F] tabular-nums`}>
              {brl(resumo.total)}
            </span>
          </div>
          <p className={`${FONT_BODY} mt-4 text-[12px] leading-relaxed ${COR_MUTED}`}>
            Valor pela tabela vigente. Condições especiais podem ser combinadas com a secretaria.
          </p>
        </section>
      )}

      {/* Honeypot (invisivel p/ humanos) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        {...form.register("website")}
      />

      {/* LGPD + enviar (desktop) */}
      <section className="space-y-4">
        <label className={`flex items-start gap-2.5 ${FONT_BODY} text-[13px] leading-[1.5] ${COR_TEXTO}`}>
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
        <Erro msg={errs.lgpd?.message} />
        {erroEnvio && (
          <p className={`border border-[#B3261E]/30 bg-[#B3261E]/5 p-3 ${FONT_BODY} text-[13px] text-[#B3261E]`}>
            {erroEnvio}
          </p>
        )}
        <Button
          type="submit"
          disabled={status === "submitting"}
          className={`h-12 w-full bg-[#F0732B] ${FONT_BODY} text-[15px] font-semibold text-white hover:bg-[#DE5F18]`}
        >
          {status === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar inscrição{temTotal ? ` — ${brl(resumo.total)}` : ""}
        </Button>
      </section>

      {/* Mobile: barra fixa com o total ao vivo — so existe quando ha valor
          calculado (antes disso seria um "—" flutuando sobre a descricao) */}
      {temTotal && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E3DC] bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-[680px] items-center gap-3">
            <div className="min-w-0">
              <p className={`${FONT_BODY} text-[11px] uppercase tracking-[0.08em] ${COR_MUTED}`}>Total</p>
              <p className={`${FONT_DISPLAY} text-[20px] leading-none ${COR_TEXTO} tabular-nums`}>
                {brl(resumo.total)}
              </p>
            </div>
            <Button
              type="submit"
              disabled={status === "submitting"}
              className={`h-12 flex-1 bg-[#F0732B] ${FONT_BODY} text-[15px] font-semibold text-white hover:bg-[#DE5F18]`}
            >
              {status === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar inscrição
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
