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
import { parseReais } from "../lib/format";

type ConfigForm = {
  slug: string;
  titulo: string;
  descricao: string;
  ativa: boolean;
  dataInicio: string;
  dataFim: string;
  inscricoesAbrem: string; // ISO date ("" = sem janela)
  inscricoesFecham: string;
  // Precos por tipo de quarto (valor cheio, em reais)
  qIndividual: string;
  qDuplo: string;
  qTriplo: string;
  qQuadruplo: string;
  // Refeicoes dos extras (quem excede a capacidade do quarto)
  refeicaoInteira: string;
  refeicaoMeia: string;
  numRefeicoes: string;
  // Faixas de idade (anos)
  idadeMeiaMin: string;
  idadeInteiraMin: string;
  // Adicionais
  camaExtra: string;
  petPorDia: string;
  palestra: string;
  // Estoque por tipo
  eIndividual: string;
  eDuplo: string;
  eTriplo: string;
  eQuadruplo: string;
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
  qIndividual: "",
  qDuplo: "",
  qTriplo: "",
  qQuadruplo: "",
  refeicaoInteira: "",
  refeicaoMeia: "",
  numRefeicoes: "6",
  idadeMeiaMin: "6",
  idadeInteiraMin: "11",
  camaExtra: "",
  petPorDia: "",
  palestra: "",
  eIndividual: "",
  eDuplo: "",
  eTriplo: "",
  eQuadruplo: "",
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

export function RetiroConfigDialog({
  open,
  onOpenChange,
  retiroId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  retiroId?: Id<"retiros">;
}) {
  const criar = useMutation(api.retiro.mutations.criar);
  const atualizar = useMutation(api.retiro.mutations.atualizar);
  // @ts-ignore Convex TS2589
  const existente = useQuery(
    api.retiro.queries.getById,
    open && retiroId ? { id: retiroId } : "skip",
  );

  const [form, setForm] = useState<ConfigForm>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!retiroId) {
      setForm(VAZIO);
    } else if (existente) {
      const p = existente.precos;
      setForm({
        slug: existente.slug,
        titulo: existente.titulo,
        descricao: existente.descricao ?? "",
        ativa: existente.ativa,
        dataInicio: existente.dataInicio,
        dataFim: existente.dataFim,
        inscricoesAbrem: tsParaIso(existente.inscricoesAbrem),
        inscricoesFecham: tsParaIso(existente.inscricoesFecham),
        qIndividual: centavosParaInput(p.quartos.individual),
        qDuplo: centavosParaInput(p.quartos.duplo),
        qTriplo: centavosParaInput(p.quartos.triplo),
        qQuadruplo: centavosParaInput(p.quartos.quadruplo),
        refeicaoInteira: centavosParaInput(p.refeicaoInteira),
        refeicaoMeia: centavosParaInput(p.refeicaoMeia),
        numRefeicoes: String(p.numRefeicoes),
        idadeMeiaMin: String(p.idadeMeiaMin),
        idadeInteiraMin: String(p.idadeInteiraMin),
        camaExtra: centavosParaInput(p.camaExtra),
        petPorDia: centavosParaInput(p.petPorDia),
        palestra: centavosParaInput(p.palestra),
        eIndividual: String(existente.estoque.individual),
        eDuplo: String(existente.estoque.duplo),
        eTriplo: String(existente.estoque.triplo),
        eQuadruplo: String(existente.estoque.quadruplo),
      });
    }
  }, [open, retiroId, existente]);

  function set<K extends keyof ConfigForm>(k: K, v: ConfigForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
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
          quartos: {
            individual: parseReais(form.qIndividual),
            duplo: parseReais(form.qDuplo),
            triplo: parseReais(form.qTriplo),
            quadruplo: parseReais(form.qQuadruplo),
          },
          refeicaoInteira: parseReais(form.refeicaoInteira),
          refeicaoMeia: parseReais(form.refeicaoMeia),
          numRefeicoes: Number(form.numRefeicoes) || 0,
          idadeMeiaMin: Number(form.idadeMeiaMin) || 0,
          idadeInteiraMin: Number(form.idadeInteiraMin) || 0,
          camaExtra: parseReais(form.camaExtra),
          petPorDia: parseReais(form.petPorDia),
          palestra: parseReais(form.palestra),
        },
        estoque: {
          individual: Number(form.eIndividual) || 0,
          duplo: Number(form.eDuplo) || 0,
          triplo: Number(form.eTriplo) || 0,
          quadruplo: Number(form.eQuadruplo) || 0,
        },
      };
      if (!payload.titulo || !form.dataInicio || !form.dataFim) {
        throw new Error("Preencha título e período");
      }
      if (retiroId) {
        await atualizar({ id: retiroId, ...payload });
        toast.success("Retiro atualizado");
      } else {
        await criar({ slug: form.slug.trim(), ...payload });
        toast.success("Retiro criado");
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
          <DialogTitle>{retiroId ? "Editar retiro" : "Novo retiro"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-titulo">Título</Label>
              <Input
                id="cfg-titulo"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Retiro 2027"
              />
            </div>
            {!retiroId && (
              <div className="space-y-1.5">
                <Label htmlFor="cfg-slug">Slug (URL)</Label>
                <Input
                  id="cfg-slug"
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="retiro-2027"
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

          {/* Precos por tipo de quarto (valor cheio) */}
          <div className="space-y-2">
            <Label>Valor por quarto — pacote completo (R$)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="cfg-qi" className="text-xs text-muted-foreground">Individual</Label>
                <Input id="cfg-qi" inputMode="decimal" value={form.qIndividual} onChange={(e) => set("qIndividual", e.target.value)} placeholder="R$" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-qd" className="text-xs text-muted-foreground">Duplo</Label>
                <Input id="cfg-qd" inputMode="decimal" value={form.qDuplo} onChange={(e) => set("qDuplo", e.target.value)} placeholder="R$" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-qt" className="text-xs text-muted-foreground">Triplo</Label>
                <Input id="cfg-qt" inputMode="decimal" value={form.qTriplo} onChange={(e) => set("qTriplo", e.target.value)} placeholder="R$" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-qq" className="text-xs text-muted-foreground">Quádruplo</Label>
                <Input id="cfg-qq" inputMode="decimal" value={form.qQuadruplo} onChange={(e) => set("qQuadruplo", e.target.value)} placeholder="R$" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cobrado pelo valor cheio do quarto. Quem excede a capacidade (ex: criança que
              divide cama) paga só as refeições abaixo.
            </p>
          </div>

          {/* Refeicoes dos extras + faixas de idade */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-rint">Refeição inteira (R$)</Label>
              <Input id="cfg-rint" inputMode="decimal" value={form.refeicaoInteira} onChange={(e) => set("refeicaoInteira", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-rmeia">Refeição meia (R$)</Label>
              <Input id="cfg-rmeia" inputMode="decimal" value={form.refeicaoMeia} onChange={(e) => set("refeicaoMeia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-nref">Nº de refeições</Label>
              <Input id="cfg-nref" inputMode="numeric" value={form.numRefeicoes} onChange={(e) => set("numRefeicoes", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-imeia">Paga meia a partir de (anos)</Label>
              <Input id="cfg-imeia" inputMode="numeric" value={form.idadeMeiaMin} onChange={(e) => set("idadeMeiaMin", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-iint">Paga inteira a partir de (anos)</Label>
              <Input id="cfg-iint" inputMode="numeric" value={form.idadeInteiraMin} onChange={(e) => set("idadeInteiraMin", e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Abaixo da idade de meia = isento. Ex.: 0–5 isento, 6–10 meia refeição, 11+ inteira.
            </p>
          </div>

          {/* Adicionais */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-cama">Cama extra (R$, única)</Label>
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

          {/* Estoque por tipo */}
          <div className="space-y-2">
            <Label>Estoque de quartos</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="cfg-ei" className="text-xs text-muted-foreground">Individual</Label>
                <Input id="cfg-ei" inputMode="numeric" value={form.eIndividual} onChange={(e) => set("eIndividual", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-ed" className="text-xs text-muted-foreground">Duplo</Label>
                <Input id="cfg-ed" inputMode="numeric" value={form.eDuplo} onChange={(e) => set("eDuplo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-et" className="text-xs text-muted-foreground">Triplo</Label>
                <Input id="cfg-et" inputMode="numeric" value={form.eTriplo} onChange={(e) => set("eTriplo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cfg-eq" className="text-xs text-muted-foreground">Quádruplo</Label>
                <Input id="cfg-eq" inputMode="numeric" value={form.eQuadruplo} onChange={(e) => set("eQuadruplo", e.target.value)} />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.ativa} onCheckedChange={(c) => set("ativa", c === true)} />
            Ativo (página pública acessível)
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {retiroId ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
