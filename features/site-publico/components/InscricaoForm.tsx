"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import type { InscricaoEventoPublica } from "@convex/public/inscricoesEvento";
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
import { LoginModalInline } from "./LoginModalInline";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rótulos e tipos de input dos campos de sistema (perfil do membro).
const SISTEMA_META: Record<
  InscricaoEventoPublica["camposSistema"][number],
  { label: string; type: string }
> = {
  nomeCompleto: { label: "Nome completo", type: "text" },
  whatsapp: { label: "WhatsApp", type: "tel" },
  email: { label: "E-mail", type: "email" },
  telefone: { label: "Telefone", type: "tel" },
  dataNascimento: { label: "Data de nascimento", type: "date" },
  sexo: { label: "Sexo", type: "text" },
};

const KEY_SIS = (campo: string) => `sys__${campo}`;
const KEY_CST = (id: string) => `cst__${id}`;

type FormValues = Record<string, unknown>;

export function InscricaoForm({ inscricao }: { inscricao: InscricaoEventoPublica }) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const profile = useQuery(
    // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
    api.membros.selfService.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [resultado, setResultado] = useState<"CONFIRMADA" | "LISTA_ESPERA" | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const entidade = (profile?.entidade ?? null) as Record<string, unknown> | null;
  const isMembro = isAuthenticated && !!entidade;
  const carregandoPerfil = isAuthenticated && profile === undefined;

  // Valor do perfil para um campo de sistema (string ou vazio).
  const valorPerfil = (campo: string): string => {
    const v = entidade?.[campo];
    return typeof v === "string" ? v : "";
  };

  // Um campo de sistema é editável quando: anônimo, OU membro mas o campo está
  // vazio no perfil (§16.12 — campo vazio vira editável).
  const campoEditavel = (campo: string): boolean => !isMembro || !valorPerfil(campo);

  // Schema Zod dinâmico: só os campos que o usuário realmente edita entram.
  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const campo of inscricao.camposSistema) {
      if (!campoEditavel(campo)) continue;
      let s = z.string().trim().min(1, "Campo obrigatório");
      if (campo === "email") s = s.refine((v) => EMAIL_RE.test(v), "E-mail inválido");
      shape[KEY_SIS(campo)] = s;
    }
    for (const c of inscricao.camposCustom) {
      const key = KEY_CST(c.id);
      if (c.tipo === "checkbox") {
        shape[key] = c.obrigatorio
          ? z.boolean().refine((v) => v === true, "Obrigatório")
          : z.boolean().optional();
        continue;
      }
      let s = z.string().trim();
      if (c.obrigatorio) s = s.min(1, "Campo obrigatório");
      if (c.tipo === "email") {
        s = s.refine((v) => v === "" || EMAIL_RE.test(v), "E-mail inválido");
      }
      shape[key] = c.obrigatorio ? s : s.optional();
    }
    shape.lgpd = z.boolean().refine((v) => v === true, "É necessário concordar para enviar");
    shape.website = z.string().optional(); // honeypot
    return z.object(shape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscricao, isMembro, profile]);

  const defaultValues = useMemo<FormValues>(() => {
    const dv: FormValues = { lgpd: false, website: "" };
    for (const campo of inscricao.camposSistema) {
      if (campoEditavel(campo)) dv[KEY_SIS(campo)] = "";
    }
    for (const c of inscricao.camposCustom) {
      dv[KEY_CST(c.id)] = c.tipo === "checkbox" ? false : "";
    }
    return dv;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inscricao, isMembro, profile]);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  // Quando o estado de auth/perfil muda, recompõe os defaults (campos read-only
  // deixam de existir no form).
  useEffect(() => {
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  async function onSubmit(values: FormValues) {
    setStatus("submitting");
    setErroEnvio(null);

    const dadosSistema: Record<string, string> = {};
    for (const campo of inscricao.camposSistema) {
      if (campoEditavel(campo)) {
        const v = values[KEY_SIS(campo)];
        if (typeof v === "string" && v.trim()) dadosSistema[campo] = v.trim();
      }
    }
    const dadosCustom: Record<string, unknown> = {};
    for (const c of inscricao.camposCustom) {
      const v = values[KEY_CST(c.id)];
      if (c.tipo === "checkbox") dadosCustom[c.id] = Boolean(v);
      else if (typeof v === "string" && v.trim()) dadosCustom[c.id] = v.trim();
    }

    try {
      const resp = await fetch("/api/inscricoes/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: inscricao.slug,
          dadosSistema,
          dadosCustom,
          lgpdConsentimento: values.lgpd === true,
          website: typeof values.website === "string" ? values.website : "",
        }),
      });
      const data = (await resp.json()) as {
        ok: boolean;
        status?: "CONFIRMADA" | "LISTA_ESPERA";
        error?: string;
      };
      if (!resp.ok || !data.ok) {
        setErroEnvio(data.error || "Não foi possível enviar sua inscrição.");
        setStatus("error");
        return;
      }
      setResultado(data.status ?? "CONFIRMADA");
      setStatus("success");
    } catch {
      setErroEnvio("Falha de conexão. Tente novamente.");
      setStatus("error");
    }
  }

  // ----- Confirmação inline (sem redirect) -----
  if (status === "success") {
    const emEspera = resultado === "LISTA_ESPERA";
    return (
      <div className="border border-[#E5E3DC] bg-white p-6 text-center md:p-8">
        <p className="font-[family-name:var(--font-spectral)] text-[22px] text-[#1A1A1A]">
          {emEspera ? "Você entrou na lista de espera" : "Inscrição confirmada"}
        </p>
        <p className="mt-3 font-[family-name:var(--font-source-sans)] text-[14px] leading-[1.6] text-[#595959]">
          {emEspera
            ? "As vagas se esgotaram, mas registramos seu interesse. Entraremos em contato se uma vaga abrir."
            : "Recebemos sua inscrição. Em breve entraremos em contato com mais detalhes."}
        </p>
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <div>
      {/* Bloco de identificação como membro */}
      {!isAuthenticated && (
        <div className="mb-8 flex flex-col gap-2 border border-[#E5E3DC] bg-[#F4F0E8] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A]">
            É membro da IPC? Entre para preencher mais rápido.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            onClick={() => setLoginOpen(true)}
          >
            Entrar
          </Button>
        </div>
      )}
      {isMembro && (
        <div className="mb-8 flex flex-col gap-2 border border-[#E5E3DC] bg-[#F4F0E8] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A]">
            Inscrevendo como <strong>{valorPerfil("nomeCompleto") || "membro"}</strong>
          </p>
          <Button
            type="button"
            variant="ghost"
            className="h-10 shrink-0"
            onClick={() => void signOut()}
          >
            Sair
          </Button>
        </div>
      )}

      {carregandoPerfil ? (
        <p className="py-8 text-center font-[family-name:var(--font-source-sans)] text-[14px] text-[#595959]">
          Carregando seu perfil...
        </p>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Honeypot — invisível para humanos, off-screen + aria-hidden */}
          <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
            <label>
              Não preencha
              <input type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
            </label>
          </div>

          {/* Campos de sistema */}
          {inscricao.camposSistema.map((campo) => {
            const meta = SISTEMA_META[campo];
            if (!campoEditavel(campo)) {
              return (
                <div key={campo} className="space-y-1">
                  <Label className="font-[family-name:var(--font-source-sans)] text-[13px] text-[#595959]">
                    {meta.label}
                  </Label>
                  <div className="flex h-10 items-center border border-[#E5E3DC] bg-[#FAFAF7] px-3 font-[family-name:var(--font-source-sans)] text-[14px] text-[#1A1A1A]">
                    {valorPerfil(campo)}
                  </div>
                </div>
              );
            }
            const key = KEY_SIS(campo);
            return (
              <div key={campo} className="space-y-1">
                <Label
                  htmlFor={key}
                  className="font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A]"
                >
                  {meta.label} *
                  {isMembro && (
                    <span className="ml-1 text-[12px] font-normal text-[#595959]">
                      (não temos esse dado — informe)
                    </span>
                  )}
                </Label>
                <Input id={key} type={meta.type} {...form.register(key)} />
                {errors[key] && (
                  <p className="text-xs text-destructive">{String(errors[key]?.message)}</p>
                )}
              </div>
            );
          })}

          {/* Campos customizados */}
          {inscricao.camposCustom.map((c) => {
            const key = KEY_CST(c.id);
            const erro = errors[key];
            return (
              <div key={c.id} className="space-y-1">
                {c.tipo !== "checkbox" && (
                  <Label
                    htmlFor={key}
                    className="font-[family-name:var(--font-source-sans)] text-[13px] text-[#1A1A1A]"
                  >
                    {c.label}
                    {c.obrigatorio && " *"}
                  </Label>
                )}
                {c.tipo === "textarea" ? (
                  <Textarea id={key} placeholder={c.placeholder} {...form.register(key)} />
                ) : c.tipo === "select" ? (
                  <Select
                    value={(form.watch(key) as string) || ""}
                    onValueChange={(val) => form.setValue(key, val, { shouldValidate: true })}
                  >
                    <SelectTrigger id={key}>
                      <SelectValue placeholder={c.placeholder || "Selecione"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(c.opcoes ?? []).map((op) => (
                        <SelectItem key={op} value={op}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : c.tipo === "checkbox" ? (
                  <label className="flex items-start gap-2.5">
                    <Checkbox
                      id={key}
                      checked={form.watch(key) === true}
                      onCheckedChange={(v) =>
                        form.setValue(key, v === true, { shouldValidate: true })
                      }
                      className="mt-0.5"
                    />
                    <span className="font-[family-name:var(--font-source-sans)] text-[13px] leading-[1.5] text-[#1A1A1A]">
                      {c.label}
                      {c.obrigatorio && " *"}
                    </span>
                  </label>
                ) : (
                  <Input
                    id={key}
                    type={c.tipo === "email" ? "email" : c.tipo === "tel" ? "tel" : "text"}
                    placeholder={c.placeholder}
                    {...form.register(key)}
                  />
                )}
                {erro && <p className="text-xs text-destructive">{String(erro?.message)}</p>}
              </div>
            );
          })}

          {/* LGPD */}
          <div className="space-y-1 border-t border-[#E5E3DC] pt-5">
            <label className="flex items-start gap-2.5">
              <Checkbox
                id="lgpd"
                checked={form.watch("lgpd") === true}
                onCheckedChange={(v) => form.setValue("lgpd", v === true, { shouldValidate: true })}
                className="mt-0.5"
              />
              <span className="font-[family-name:var(--font-source-sans)] text-[13px] leading-[1.5] text-[#595959]">
                Concordo com o tratamento dos meus dados para fins desta inscrição, conforme a{" "}
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1A1A1A] underline underline-offset-2"
                >
                  Política de Privacidade
                </a>
                .
              </span>
            </label>
            {errors.lgpd && (
              <p className="text-xs text-destructive">{String(errors.lgpd?.message)}</p>
            )}
          </div>

          {erroEnvio && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{erroEnvio}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={status === "submitting"}
            className="h-11 w-full bg-[#F0732B] text-white hover:bg-[#DE5F18] sm:w-auto sm:px-8"
          >
            {status === "submitting" ? "Enviando..." : "Enviar inscrição"}
          </Button>
        </form>
      )}

      <LoginModalInline open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
