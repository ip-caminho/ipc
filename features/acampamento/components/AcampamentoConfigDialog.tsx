"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DatePickerBR } from "@/shared/components/ui/date-picker-br";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { brl, parseReais } from "../lib/format";

type FaixaForm = { idadeMin: string; idadeMax: string; valor: string };

type ConfigForm = {
  slug: string;
  titulo: string;
  descricao: string;
  ativa: boolean;
  dataInicio: string;
  dataFim: string;
  inscricoesAbrem: string; // ISO date ("" = sem janela)
  inscricoesFecham: string;
  faixas: FaixaForm[];
  camaExtra: string;
  petPorDia: string;
  palestra: string;
  estoqueDuplos: string;
  estoqueTriplos: string;
};

const VAZIO: ConfigForm = {
  slug: "",
  titulo: "",
  descricao: "",
  ativa: true,
  dataInicio: "",
  dataFim: "",
  inscricoesAbrem: "",
  inscricoesFecham: "",
  faixas: [
    { idadeMin: "0", idadeMax: "4", valor: "0" },
    { idadeMin: "5", idadeMax: "10", valor: "" },
    { idadeMin: "11", idadeMax: "120", valor: "" },
  ],
  camaExtra: "",
  petPorDia: "",
  palestra: "",
  estoqueDuplos: "",
  estoqueTriplos: "",
};

function centavosParaInput(c: number): string {
  return c === 0 ? "0" : (c / 100).toFixed(2).replace(".", ",");
}

function isoParaTs(iso: string, fimDoDia = false): number | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d, fimDoDia ? 23 : 0, fimDoDia ? 59 : 0, fimDoDia ? 59 : 0);
  return dt.getTime();
}

function tsParaIso(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AcampamentoConfigDialog({
  open,
  onOpenChange,
  acampamentoId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  acampamentoId?: Id<"acampamentos">;
}) {
  const criar = useMutation(api.acampamento.mutations.criar);
  const atualizar = useMutation(api.acampamento.mutations.atualizar);
  // @ts-ignore Convex TS2589
  const existente = useQuery(
    api.acampamento.queries.getById,
    open && acampamentoId ? { id: acampamentoId } : "skip",
  );

  const [form, setForm] = useState<ConfigForm>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!acampamentoId) {
      setForm(VAZIO);
    } else if (existente) {
      setForm({
        slug: existente.slug,
        titulo: existente.titulo,
        descricao: existente.descricao ?? "",
        ativa: existente.ativa,
        dataInicio: existente.dataInicio,
        dataFim: existente.dataFim,
        inscricoesAbrem: tsParaIso(existente.inscricoesAbrem),
        inscricoesFecham: tsParaIso(existente.inscricoesFecham),
        faixas: existente.precos.faixas.map((f) => ({
          idadeMin: String(f.idadeMin),
          idadeMax: String(f.idadeMax),
          valor: centavosParaInput(f.valor),
        })),
        camaExtra: centavosParaInput(existente.precos.camaExtra),
        petPorDia: centavosParaInput(existente.precos.petPorDia),
        palestra: centavosParaInput(existente.precos.palestra),
        estoqueDuplos: String(existente.estoqueDuplos),
        estoqueTriplos: String(existente.estoqueTriplos),
      });
    }
  }, [open, acampamentoId, existente]);

  function set<K extends keyof ConfigForm>(k: K, v: ConfigForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setFaixa(i: number, k: keyof FaixaForm, v: string) {
    setForm((f) => ({
      ...f,
      faixas: f.faixas.map((fx, j) => (j === i ? { ...fx, [k]: v } : fx)),
    }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        ativa: form.ativa,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        inscricoesAbrem: isoParaTs(form.inscricoesAbrem),
        inscricoesFecham: isoParaTs(form.inscricoesFecham, true),
        precos: {
          faixas: form.faixas.map((f) => ({
            idadeMin: Number(f.idadeMin),
            idadeMax: Number(f.idadeMax),
            valor: parseReais(f.valor),
          })),
          camaExtra: parseReais(form.camaExtra),
          petPorDia: parseReais(form.petPorDia),
          palestra: parseReais(form.palestra),
        },
        estoqueDuplos: Number(form.estoqueDuplos) || 0,
        estoqueTriplos: Number(form.estoqueTriplos) || 0,
      };
      if (!payload.titulo || !form.dataInicio || !form.dataFim) {
        throw new Error("Preencha título e período");
      }
      if (acampamentoId) {
        await atualizar({ id: acampamentoId, ...payload });
        toast.success("Acampamento atualizado");
      } else {
        await criar({ slug: form.slug.trim(), ...payload });
        toast.success("Acampamento criado");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{acampamentoId ? "Editar acampamento" : "Novo acampamento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-titulo">Título</Label>
              <Input
                id="cfg-titulo"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Acampamento 2027"
              />
            </div>
            {!acampamentoId && (
              <div className="space-y-1.5">
                <Label htmlFor="cfg-slug">Slug (URL)</Label>
                <Input
                  id="cfg-slug"
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="acampa-2027"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cfg-desc">Descrição (aparece na página pública)</Label>
            <Textarea
              id="cfg-desc"
              rows={3}
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-ini">Início</Label>
              <DatePickerBR id="cfg-ini" value={form.dataInicio} onChange={(v) => set("dataInicio", v)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-fim">Fim</Label>
              <DatePickerBR id="cfg-fim" value={form.dataFim} onChange={(v) => set("dataFim", v)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-abre">Inscrições abrem (opcional)</Label>
              <DatePickerBR id="cfg-abre" value={form.inscricoesAbrem} onChange={(v) => set("inscricoesAbrem", v)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-fecha">Inscrições fecham (opcional)</Label>
              <DatePickerBR id="cfg-fecha" value={form.inscricoesFecham} onChange={(v) => set("inscricoesFecham", v)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Faixas etárias (valor por pessoa)</Label>
            {form.faixas.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1.4fr] items-center gap-2">
                <Input
                  inputMode="numeric"
                  aria-label={`Faixa ${i + 1}: idade mínima`}
                  value={f.idadeMin}
                  onChange={(e) => setFaixa(i, "idadeMin", e.target.value)}
                  placeholder="De (anos)"
                />
                <Input
                  inputMode="numeric"
                  aria-label={`Faixa ${i + 1}: idade máxima`}
                  value={f.idadeMax}
                  onChange={(e) => setFaixa(i, "idadeMax", e.target.value)}
                  placeholder="Até (anos)"
                />
                <Input
                  inputMode="decimal"
                  aria-label={`Faixa ${i + 1}: valor em reais`}
                  value={f.valor}
                  onChange={(e) => setFaixa(i, "valor", e.target.value)}
                  placeholder="R$"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Idade calculada na data de início. Ex.: 0–4 isento, 5–10 reduzido, 11–120 inteiro.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-cama">Cama extra (R$/período)</Label>
              <Input id="cfg-cama" inputMode="decimal" value={form.camaExtra} onChange={(e) => set("camaExtra", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-pet">Pet (R$/dia)</Label>
              <Input id="cfg-pet" inputMode="decimal" value={form.petPorDia} onChange={(e) => set("petPorDia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-pal">Palestra (R$/pessoa)</Label>
              <Input id="cfg-pal" inputMode="decimal" value={form.palestra} onChange={(e) => set("palestra", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-dup">Quartos duplos (estoque)</Label>
              <Input id="cfg-dup" inputMode="numeric" value={form.estoqueDuplos} onChange={(e) => set("estoqueDuplos", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-tri">Quartos triplos (estoque)</Label>
              <Input id="cfg-tri" inputMode="numeric" value={form.estoqueTriplos} onChange={(e) => set("estoqueTriplos", e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.ativa} onCheckedChange={(c) => set("ativa", c === true)} />
            Ativo (página pública acessível)
          </label>

          {form.faixas.some((f) => f.valor) && (
            <p className="text-xs text-muted-foreground">
              Conferência: faixas {form.faixas.map((f) => brl(parseReais(f.valor))).join(" · ")}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {acampamentoId ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
