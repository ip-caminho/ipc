"use client";

import { useMemo, useRef, useState } from "react";
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
import { DateInputBR } from "@/shared/components/ui/date-input-br";
import { Plus, Trash2, UserRound, Loader2, Copy, Check, Receipt } from "lucide-react";
import { calcularValorInscricao, idadeNaData, numDiarias } from "@convex/retiro/calculoHelpers";
import { isValidCPF } from "@shared/lib/validations/brazilian";
import type { RetiroPublico } from "../lib/data";
import { LoginModalInline } from "@features/site-publico/components/LoginModalInline";

const hojeIso = () => new Date().toISOString().slice(0, 10);

// Palestras: marcadas por padrao so a partir dos 15 anos (crianca nao paga palestra)
const IDADE_PALESTRA = 15;

// Pre-preenchimento com os dados do membro logado. Desativado nesta edicao
// (Carnaval 2027): muitos membros ainda nao tem acesso ao sistema, entao o
// atalho de login so geraria atrito. Reativar (=true) quando a base estiver
// toda no sistema.
const PRE_PREENCHER_MEMBRO: boolean = false;

const participanteSchema = z.object({
  nome: z.string().trim().min(3, "Nome completo"),
  dataNascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data")
    .refine((d) => d < hojeIso(), "Data no futuro"),
  participaPalestras: z.boolean(),
  // Vínculo com o cadastro de membro (vem do pré-preenchimento; some se o nome
  // for editado). Reconfirmado no servidor.
  membroId: z.string().optional(),
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
    quartosIndividual: z.number().int().min(0),
    quartosDuplo: z.number().int().min(0),
    quartosTriplo: z.number().int().min(0),
    quartosQuadruplo: z.number().int().min(0),
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
      .refine((s) => isValidCPF(s ?? ""), "CPF do pagante inválido"),
    lgpd: z.boolean().refine((v) => v, "Confirme que leu as condições"),
    website: z.string().optional(), // honeypot
  })
  .refine(
    (d) => d.quartosIndividual + d.quartosDuplo + d.quartosTriplo + d.quartosQuadruplo > 0,
    { message: "Escolha ao menos um quarto", path: ["quartosDuplo"] },
  )
  .refine(
    (d) => d.forma !== "PARCELADO" || (Number(d.parcelas) >= 2 && Number(d.parcelas) <= 12),
    { message: "Escolha de 2 a 12 parcelas", path: ["parcelas"] },
  );

type FormValues = z.infer<typeof formSchema>;

function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "DD/MM" a partir de YYYY-MM-DD (sem Date — evita deslize de fuso).
function diaMes(data: string): string {
  const [, m, d] = data.split("-");
  return d && m ? `${d}/${m}` : data;
}

// ===== Vocabulario visual do site v2 (navy/laranja/papel, cantos retos) =====
const FONT_BODY = "font-[family-name:var(--font-source-sans)]";
const FONT_DISPLAY = "font-[family-name:var(--font-spectral)]";
const COR_TEXTO = "text-[#1A1A1A]";
const COR_MUTED = "text-[#595959]";
const BORDA = "border-[#E5E3DC]";
// Alvo de toque confortavel no mobile (44px); desktop mantem a altura compacta.
const ALTURA_CAMPO = "h-11 md:h-9";

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={`${FONT_BODY} text-[12px] text-[#B3261E]`}>{msg}</p>;
}

// Cabecalho de etapa: numero em Spectral + regua — o form e uma sequencia real
function Etapa({ n, titulo, hint }: { n: number; titulo: string; hint?: string }) {
  return (
    <div className="border-b border-[#E5E3DC] pb-2">
      <div className="flex items-baseline gap-3">
        <span className={`${FONT_DISPLAY} text-[20px] leading-none text-[#2563EB]`}>{n}</span>
        <h2 className={`${FONT_DISPLAY} text-[19px] leading-tight ${COR_TEXTO}`}>{titulo}</h2>
        {/* Desktop: hint alinhado à direita. Mobile: vai abaixo (evita quebrar
            apertado ao lado do título em telas estreitas). */}
        {hint && (
          <span className={`${FONT_BODY} ml-auto hidden text-[12px] ${COR_MUTED} md:inline`}>
            {hint}
          </span>
        )}
      </div>
      {hint && (
        <span className={`${FONT_BODY} mt-1 block text-[12px] ${COR_MUTED} md:hidden`}>{hint}</span>
      )}
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
      <span className={`min-w-0 ${COR_TEXTO}`}>
        {nome}
        {detalhe && <span className={`ml-1.5 text-[12px] ${COR_MUTED}`}>{detalhe}</span>}
      </span>
      <span className="mx-1 flex-1 translate-y-[-2px] border-b border-dotted border-[#C9C2B4]" aria-hidden />
      <span className={`shrink-0 tabular-nums ${COR_TEXTO}`}>{valor}</span>
    </li>
  );
}

// Link individual p/ o pagante enviar o comprovante (inclusive parcelado)
function LinkComprovante({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/comprovante/${token}`
      : "";
  return (
    <div className={`mx-auto mt-6 max-w-[46ch] border ${BORDA} bg-[#F4F0E8] p-4 text-center`}>
      <p className={`flex items-center justify-center gap-1.5 ${FONT_BODY} text-[13px] font-semibold ${COR_TEXTO}`}>
        <Receipt className="h-4 w-4 text-[#2563EB]" /> Enviar comprovante de pagamento
      </p>
      <p className={`${FONT_BODY} mt-1 text-[12px] leading-[1.5] ${COR_MUTED}`}>
        Guarde este link. Ao pagar (ou cada parcela), envie o comprovante por aqui — a
        secretaria confere.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className={`min-w-0 flex-1 border ${BORDA} bg-white px-2 py-1.5 ${FONT_BODY} text-[12px] ${COR_TEXTO}`}
        />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              /* clipboard indisponivel — o campo ja permite copiar manualmente */
            }
          }}
          className={`flex h-9 shrink-0 items-center gap-1.5 border ${BORDA} bg-white px-3 ${FONT_BODY} text-[12px] font-semibold ${COR_TEXTO} transition-colors hover:bg-[#ECE6DC]`}
        >
          {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

// Tipos de quarto exibidos na etapa de hospedagem
const TIPOS_QUARTO = [
  { key: "quartosIndividual" as const, tipo: "individual" as const, label: "Individual" },
  { key: "quartosDuplo" as const, tipo: "duplo" as const, label: "Duplo" },
  { key: "quartosTriplo" as const, tipo: "triplo" as const, label: "Triplo" },
  { key: "quartosQuadruplo" as const, tipo: "quadruplo" as const, label: "Quádruplo" },
];

export function RetiroForm({
  retiro,
  onEnviado,
}: {
  retiro: RetiroPublico;
  onEnviado?: () => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  // @ts-ignore Convex TS2589
  const familia = useQuery(
    api.public.retiro.minhaFamilia,
    isAuthenticated && PRE_PREENCHER_MEMBRO ? {} : "skip",
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [resultado, setResultado] = useState<{
    valorTabela: number;
    comprovanteToken?: string;
  } | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responsavelNome: "",
      responsavelWhatsapp: "",
      participantes: [{ nome: "", dataNascimento: "", participaPalestras: true }],
      quartosIndividual: 0,
      quartosDuplo: 0,
      quartosTriplo: 0,
      quartosQuadruplo: 0,
      camasExtras: 0,
      pets: 0,
      berco: false,
      forma: "A_VISTA",
      lgpd: false,
      website: "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "participantes" });

  // Responsavel normalmente e o 1o participante — segue o nome digitado ali
  // ate o usuario editar o nome do participante 1 diretamente (divergiu:
  // outra pessoa). Ref (nao state) pra nao re-renderizar a cada tecla.
  const participante1SegueResponsavelRef = useRef(true);

  const valores = form.watch();

  // Resumo do valor ao vivo — mesma aritmetica do backend (helper compartilhado)
  const resumo = useMemo(() => {
    const parts = (valores.participantes ?? []).filter(
      (p) => p?.nome?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(p.dataNascimento ?? ""),
    );
    // Sem quarto escolhido nao ha inscricao valida — nao calcular (com
    // capacidade 0 todos virariam "extras" pagando refeicao, total enganoso).
    const totalQuartos =
      (valores.quartosIndividual ?? 0) +
      (valores.quartosDuplo ?? 0) +
      (valores.quartosTriplo ?? 0) +
      (valores.quartosQuadruplo ?? 0);
    if (parts.length === 0 || totalQuartos === 0) return null;
    return calcularValorInscricao(
      parts.map((p) => ({
        nome: p.nome,
        dataNascimento: p.dataNascimento,
        participaPalestras: p.participaPalestras,
      })),
      {
        quartos: {
          individual: valores.quartosIndividual ?? 0,
          duplo: valores.quartosDuplo ?? 0,
          triplo: valores.quartosTriplo ?? 0,
          quadruplo: valores.quartosQuadruplo ?? 0,
        },
        camasExtras: valores.camasExtras ?? 0,
        pets: valores.pets ?? 0,
      },
      retiro.precos,
      retiro.dataInicio,
      retiro.dataFim,
    );
  }, [valores, retiro]);

  // Nº de diárias e nº de participantes nas palestras — usados no detalhamento
  const diarias = numDiarias(retiro.dataInicio, retiro.dataFim);
  const nPalestras =
    resumo && retiro.precos.palestra > 0
      ? Math.round(resumo.palestras / retiro.precos.palestra)
      : 0;

  // Linhas de quartos escolhidos (tipo × qtd × valor cheio)
  const linhasQuartos = TIPOS_QUARTO.map((t) => {
    const qtd = (valores[t.key] as number) ?? 0;
    return { ...t, qtd, valor: retiro.precos.quartos[t.tipo] };
  }).filter((l) => l.qtd > 0);

  // Ao informar o nascimento, palestras ficam marcadas so p/ 15+ (ajustavel)
  function aoMudarNascimento(index: number, iso: string) {
    form.setValue(`participantes.${index}.dataNascimento`, iso, { shouldValidate: true });
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      form.setValue(
        `participantes.${index}.participaPalestras`,
        idadeNaData(iso, retiro.dataInicio) >= IDADE_PALESTRA,
      );
    }
  }

  function preencherComFamilia() {
    if (!familia) return;
    participante1SegueResponsavelRef.current = false;
    form.setValue("responsavelNome", familia.responsavel.nome);
    form.setValue("responsavelWhatsapp", familia.responsavel.whatsapp);
    form.setValue(
      "participantes",
      familia.participantes.map((p) => ({
        nome: p.nome,
        dataNascimento: p.dataNascimento ?? "",
        participaPalestras: p.dataNascimento
          ? idadeNaData(p.dataNascimento, retiro.dataInicio) >= IDADE_PALESTRA
          : true,
        membroId: p.membroId ?? undefined,
      })),
    );
  }

  // Editar o nome quebra o vínculo pré-preenchido — evita vincular alguém errado
  function aoMudarNome(index: number) {
    if (form.getValues(`participantes.${index}.membroId`)) {
      form.setValue(`participantes.${index}.membroId`, undefined);
    }
    // Usuario digitou no nome do participante 1 diretamente -> nao e mais o
    // responsavel (ou o nome diverge do dele); para de seguir.
    if (index === 0) {
      participante1SegueResponsavelRef.current = false;
    }
  }

  // Responsavel = participante 1 no caso comum: repete o nome ali pra so
  // faltar o nascimento. setValue não dispara o onChange do campo do
  // participante, entao nao aciona aoMudarNome (nao quebra o "segue").
  function aoMudarNomeResponsavel(nome: string) {
    if (participante1SegueResponsavelRef.current) {
      // Sem shouldValidate: evita erro de "min 3 caracteres" piscando no
      // participante 1 enquanto o responsavel ainda esta digitando o nome.
      form.setValue("participantes.0.nome", nome);
    }
  }

  async function onSubmit(data: FormValues) {
    setStatus("submitting");
    setErroEnvio(null);
    try {
      const res = await fetch("/api/retiro/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: retiro.slug,
          responsavel: { nome: data.responsavelNome, whatsapp: data.responsavelWhatsapp },
          participantes: data.participantes,
          hospedagem: {
            quartos: {
              individual: data.quartosIndividual,
              duplo: data.quartosDuplo,
              triplo: data.quartosTriplo,
              quadruplo: data.quartosQuadruplo,
            },
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
      setResultado({
        valorTabela: json.valorTabela,
        comprovanteToken: json.comprovanteToken,
      });
      setStatus("success");
      onEnviado?.();
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Erro ao enviar inscrição");
      setStatus("error");
    }
  }

  if (status === "success" && resultado) {
    return (
      <div className={`border ${BORDA} bg-white p-6 text-center md:p-10`}>
        <p className={`${FONT_DISPLAY} text-[24px] ${COR_TEXTO}`}>Inscrição recebida!</p>
        {/* Wrapper <div> centraliza o bloco: `.site-v2 p` (margin:0 0 1em) anula
            o mx-auto do <p> por especificidade. */}
        <div className="mx-auto mt-3 max-w-[42ch]">
          <p className={`${FONT_BODY} text-[14px] leading-[1.6] ${COR_MUTED}`}>
            {`Valor da inscrição: ${brl(resultado.valorTabela)}. A secretaria entrará em contato pelo WhatsApp para combinar o pagamento.`}
          </p>
        </div>
        {resultado.comprovanteToken && (
          <LinkComprovante token={resultado.comprovanteToken} />
        )}
      </div>
    );
  }

  if (!retiro.inscricoesAbertas) {
    return (
      <div className={`border ${BORDA} bg-[#F4F0E8] p-6 text-center ${FONT_BODY} text-[14px] ${COR_MUTED}`}>
        As inscrições não estão abertas no momento.
      </div>
    );
  }

  const errs = form.formState.errors;
  const temTotal = !!resumo && resumo.total > 0;
  // Participantes que pagam refeição (excedem a capacidade dos quartos)
  const extrasRefeicao = resumo?.participantes.filter((p) => p.refeicoes > 0) ?? [];

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className={`space-y-10 ${temTotal ? "pb-24 md:pb-0" : ""}`}
    >
      {/* Pre-preenchimento p/ membro — desativado nesta edicao (PRE_PREENCHER_MEMBRO) */}
      {PRE_PREENCHER_MEMBRO && (
        <>
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
              <UserRound className="mr-2 h-4 w-4 text-[#2563EB]" />
              Preencher com minha família ({familia.participantes.length})
            </Button>
          ) : null}
          <LoginModalInline open={loginOpen} onOpenChange={setLoginOpen} />
        </>
      )}

      {/* 1 — Responsavel */}
      <div className="space-y-4">
        <Etapa n={1} titulo="Responsável pela inscrição" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <CampoLabel htmlFor="respNome">Nome</CampoLabel>
            <Input
              id="respNome"
              className={ALTURA_CAMPO}
              {...form.register("responsavelNome", {
                onChange: (e) => aoMudarNomeResponsavel(e.target.value),
              })}
            />
            <Erro msg={errs.responsavelNome?.message} />
          </div>
          <div className="space-y-1">
            <CampoLabel htmlFor="respZap">WhatsApp</CampoLabel>
            <Input id="respZap" type="tel" className={ALTURA_CAMPO} placeholder="(11) 9…" {...form.register("responsavelWhatsapp")} />
            <Erro msg={errs.responsavelWhatsapp?.message} />
          </div>
        </div>
      </div>

      {/* 2 — Participantes */}
      <div className="space-y-4">
        <Etapa n={2} titulo="Quem vai" hint={`${fields.length} de 10`} />
        <Erro msg={errs.participantes?.message} />
        <div className="space-y-3">
          {fields.map((f, i) => {
            const nasc = valores.participantes?.[i]?.dataNascimento;
            const nascValido = nasc && /^\d{4}-\d{2}-\d{2}$/.test(nasc);
            const idade = nascValido ? idadeNaData(nasc, retiro.dataInicio) : null;
            return (
              <div key={f.id} className={`border ${BORDA} bg-white p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.08em] ${COR_MUTED}`}>
                    Participante {i + 1}
                    {idade !== null && (
                      <span className="ml-2 normal-case tracking-normal text-[#2563EB]">
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
                    <Input
                      id={`p-nome-${i}`}
                      className={ALTURA_CAMPO}
                      {...form.register(`participantes.${i}.nome`, {
                        onChange: () => aoMudarNome(i),
                      })}
                    />
                    <Erro msg={errs.participantes?.[i]?.nome?.message} />
                  </div>
                  <div className="space-y-1">
                    <CampoLabel htmlFor={`p-nasc-${i}`}>Nascimento</CampoLabel>
                    <Controller
                      control={form.control}
                      name={`participantes.${i}.dataNascimento`}
                      render={({ field }) => (
                        <DateInputBR
                          id={`p-nasc-${i}`}
                          className={ALTURA_CAMPO}
                          value={field.value}
                          onChange={(iso) => aoMudarNascimento(i, iso)}
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
          <Plus className="h-4 w-4 text-[#2563EB]" /> Adicionar participante
        </button>
      </div>

      {/* 3 — Hospedagem */}
      <div className="space-y-4">
        <Etapa n={3} titulo="Hospedagem" hint="escolha os quartos da sua família" />
        <div className="grid gap-2 md:grid-cols-2">
          {/* Só os tipos realmente ofertados (com preço definido) */}
          {TIPOS_QUARTO.filter((t) => retiro.precos.quartos[t.tipo] > 0).map((t) => (
            <Controller
              key={t.key}
              control={form.control}
              name={t.key}
              render={({ field }) => (
                <CampoNumero
                  label={`Quarto ${t.label.toLowerCase()}`}
                  hint={brl(retiro.precos.quartos[t.tipo])}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          ))}
          <Controller
            control={form.control}
            name="camasExtras"
            render={({ field }) => (
              <CampoNumero
                label="Camas extras"
                hint={`${brl(retiro.precos.camaExtra)} (cobrança única)`}
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
                hint={`${brl(retiro.precos.petPorDia)} por dia`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <Erro msg={errs.quartosDuplo?.message} />
      </div>

      {/* 4 — Preferencias */}
      <div className="space-y-4">
        <Etapa n={4} titulo="Preferências" hint="opcional" />
        <div className="space-y-4">
          <div className="space-y-1">
            <CampoLabel htmlFor="colega">Dividir quarto com</CampoLabel>
            <Input id="colega" className={ALTURA_CAMPO} placeholder="Nome de quem você quer por perto" {...form.register("colegaDeQuarto")} />
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
              className={ALTURA_CAMPO}
              placeholder="Acessibilidade, alergias, restrições…"
              {...form.register("necessidadesEspeciais")}
            />
          </div>
          <div className="space-y-1">
            <CampoLabel htmlFor="obs">Observações</CampoLabel>
            <Textarea id="obs" rows={3} {...form.register("observacao")} />
          </div>
        </div>
      </div>

      {/* 5 — Pagamento */}
      <div className="space-y-4">
        <Etapa n={5} titulo="Pagamento" hint="a secretaria confirma pelo WhatsApp" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <CampoLabel>Forma</CampoLabel>
            <Controller
              control={form.control}
              name="forma"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full min-h-11 md:min-h-9">
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
                    <SelectTrigger className="w-full min-h-11 md:min-h-9">
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
            <Input id="cpf" inputMode="numeric" className={ALTURA_CAMPO} placeholder="Somente números" {...form.register("cpfPagante")} />
            <Erro msg={errs.cpfPagante?.message} />
          </div>
        </div>
      </div>

      {/* Conta do retiro (assinatura visual: recibo com pontilhado) */}
      {resumo && resumo.total > 0 && (
        <div className={`border  bg-[#F4F0E8] p-6 md:p-7`}>
          <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.1em] ${COR_MUTED}`}>
            Resumo da inscrição
          </p>
          <p className={`${FONT_BODY} mt-1 text-[12px] ${COR_MUTED}`}>
            {diaMes(retiro.dataInicio)} a {diaMes(retiro.dataFim)} · {diarias}{" "}
            {diarias > 1 ? "diárias" : "diária"}
          </p>
          <ul className="mt-5 space-y-2.5">
            {linhasQuartos.length > 0 && (
              <li className={`${FONT_BODY} text-[11px] uppercase tracking-[0.08em] ${COR_MUTED} pb-0.5`}>
                Quartos (pacote completo)
              </li>
            )}
            {linhasQuartos.map((l) => (
              <LinhaConta
                key={l.key}
                nome={`${l.qtd} × Quarto ${l.label.toLowerCase()}`}
                valor={brl(l.qtd * l.valor)}
              />
            ))}

            {resumo.palestras > 0 && (
              <li className={`${FONT_BODY} text-[11px] uppercase tracking-[0.08em] ${COR_MUTED} pt-2 pb-0.5`}>
                Adicionais
              </li>
            )}
            {resumo.palestras > 0 && (
              <LinhaConta
                nome="Palestras"
                detalhe={`${nPalestras} × ${brl(retiro.precos.palestra)}`}
                valor={brl(resumo.palestras)}
              />
            )}
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
            Total ajustado para terminar em R$ 0,03 (identificação do financeiro). Condições
            especiais podem ser combinadas com a secretaria.
          </p>

          {/* Estimativa paga DIRETO ao hotel no checkout — informativa, fora do
              total cobrado na inscrição. */}
          {resumo.estimativaHotel > 0 && (
            <div className="mt-6 border-t border-dashed border-[#C9C2B4] pt-5">
              <p className={`${FONT_BODY} text-[11px] font-semibold uppercase tracking-[0.1em] ${COR_MUTED}`}>
                Estimativa paga no hotel
              </p>
              <p className={`${FONT_BODY} mt-1 text-[12px] leading-relaxed ${COR_MUTED}`}>
                Não incluída no total acima — paga diretamente ao hotel no checkout.
              </p>
              <ul className="mt-4 space-y-2.5">
                {extrasRefeicao.length > 0 && (
                  <li className={`${FONT_BODY} text-[11px] uppercase tracking-[0.08em] ${COR_MUTED} pb-0.5`}>
                    Alimentação
                  </li>
                )}
                {extrasRefeicao.map((p, i) => (
                  <LinhaConta
                    key={`r-${i}`}
                    nome={p.nome}
                    detalhe={`${p.idade} anos · sem cama própria`}
                    valor={brl(p.refeicoes)}
                  />
                ))}
                {resumo.camasExtras > 0 && (
                  <LinhaConta
                    nome="Camas extras"
                    detalhe={`${valores.camasExtras} × ${brl(retiro.precos.camaExtra)}`}
                    valor={brl(resumo.camasExtras)}
                  />
                )}
                {resumo.pets > 0 && (
                  <LinhaConta
                    nome="Pets"
                    detalhe={`${valores.pets} × ${brl(retiro.precos.petPorDia)}/dia × ${diarias} ${diarias > 1 ? "diárias" : "diária"}`}
                    valor={brl(resumo.pets)}
                  />
                )}
              </ul>
              <div className="mt-4 flex items-baseline justify-between border-t border-[#C9C2B4] pt-3">
                <span className={`${FONT_BODY} text-[12px] uppercase tracking-[0.08em] ${COR_MUTED}`}>
                  Estimativa hotel
                </span>
                <span className={`${FONT_BODY} text-[16px] font-semibold tabular-nums ${COR_TEXTO}`}>
                  {brl(resumo.estimativaHotel)}
                </span>
              </div>
              <p className={`${FONT_BODY} mt-3 text-[12px] leading-relaxed ${COR_MUTED}`}>
                Estimativa — o hotel também cobra bebidas e outros consumos no checkout.
              </p>
            </div>
          )}
        </div>
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
      <div className="space-y-4">
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
          className={`h-12 w-full bg-[#2563EB] ${FONT_BODY} text-[15px] font-semibold text-white hover:bg-[#1D4ED8]`}
        >
          {status === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar inscrição{temTotal ? ` — ${brl(resumo.total)}` : ""}
        </Button>
      </div>

      {/* Mobile: barra fixa com o total ao vivo — so existe quando ha valor
          calculado (antes disso seria um "—" flutuando sobre a descricao) */}
      {temTotal && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E3DC] bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
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
              className={`h-12 flex-1 bg-[#2563EB] ${FONT_BODY} text-[15px] font-semibold text-white hover:bg-[#1D4ED8]`}
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
