"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { revalidarSite } from "../lib/revalidate";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";

type CampoSistema =
  | "nomeCompleto"
  | "whatsapp"
  | "email"
  | "telefone"
  | "dataNascimento"
  | "sexo";

type TipoCustom = "text" | "email" | "tel" | "select" | "textarea" | "checkbox";

type CampoCustom = {
  id: string;
  label: string;
  tipo: TipoCustom;
  obrigatorio: boolean;
  opcoes?: string[];
  placeholder?: string;
};

const CAMPOS_SISTEMA: Array<{ value: CampoSistema; label: string }> = [
  { value: "nomeCompleto", label: "Nome completo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "dataNascimento", label: "Data de nascimento" },
  { value: "sexo", label: "Sexo" },
];

const TIPOS_CUSTOM: Array<{ value: TipoCustom; label: string }> = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "tel", label: "Telefone" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Caixa de marcar" },
];

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// "YYYY-MM-DD" → timestamp (meio-dia local, evita salto de fuso) e vice-versa.
function dateToTs(d: string): number | undefined {
  if (!d) return undefined;
  const t = new Date(`${d}T12:00:00`).getTime();
  return Number.isNaN(t) ? undefined : t;
}
function tsToDate(ts?: number): string {
  if (ts == null) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function InscricaoBuilder({
  open,
  onOpenChange,
  inscricaoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricaoId?: Id<"inscricoesEvento">;
}) {
  const editando = !!inscricaoId;
  // @ts-ignore Convex TS2589
  const existente = useQuery(
    api.inscricoesEvento.queries.getById,
    inscricaoId ? { id: inscricaoId } : "skip",
  );
  const criar = useMutation(api.inscricoesEvento.mutations.criar);
  const atualizar = useMutation(api.inscricoesEvento.mutations.atualizar);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [dataAbertura, setDataAbertura] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [vagas, setVagas] = useState("");
  const [ativa, setAtiva] = useState(true);
  const [camposSistema, setCamposSistema] = useState<CampoSistema[]>([]);
  const [camposCustom, setCamposCustom] = useState<CampoCustom[]>([]);
  const [loading, setLoading] = useState(false);
  const counter = useRef(0);

  // Carrega dados ao editar.
  useEffect(() => {
    if (!editando || !existente) return;
    setTitulo(existente.titulo);
    setSlug(existente.slug);
    setSlugTocado(true);
    setDescricao(existente.descricao);
    setDataAbertura(tsToDate(existente.dataAbertura));
    setDataLimite(tsToDate(existente.dataLimite));
    setVagas(existente.vagas != null ? String(existente.vagas) : "");
    setAtiva(existente.ativa);
    setCamposSistema(existente.camposSistema as CampoSistema[]);
    setCamposCustom(existente.camposCustom as CampoCustom[]);
  }, [editando, existente]);

  // Slug derivado do título até o admin editá-lo manualmente.
  useEffect(() => {
    if (!slugTocado) setSlug(slugify(titulo));
  }, [titulo, slugTocado]);

  function toggleSistema(campo: CampoSistema) {
    setCamposSistema((prev) =>
      prev.includes(campo) ? prev.filter((c) => c !== campo) : [...prev, campo],
    );
  }

  function addCustom() {
    counter.current += 1;
    setCamposCustom((prev) => [
      ...prev,
      { id: `campo${counter.current}`, label: "", tipo: "text", obrigatorio: false },
    ]);
  }

  function updateCustom(idx: number, patch: Partial<CampoCustom>) {
    setCamposCustom((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeCustom(idx: number) {
    setCamposCustom((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!titulo.trim()) return toast.error("Informe o título");
    if (!slug.trim()) return toast.error("Informe o slug");
    // Normaliza campos custom: garante id, descarta opções vazias.
    const custom = camposCustom.map((c) => ({
      id: c.id || slugify(c.label) || `campo${Math.random().toString(36).slice(2, 7)}`,
      label: c.label.trim(),
      tipo: c.tipo,
      obrigatorio: c.obrigatorio,
      opcoes:
        c.tipo === "select"
          ? (c.opcoes ?? []).map((o) => o.trim()).filter(Boolean)
          : undefined,
      placeholder: c.placeholder?.trim() || undefined,
    }));
    if (custom.some((c) => !c.label)) return toast.error("Todo campo custom precisa de um rótulo");
    if (custom.some((c) => c.tipo === "select" && (!c.opcoes || c.opcoes.length === 0)))
      return toast.error("Campo de seleção precisa de ao menos uma opção");

    const vagasNum = vagas.trim() ? Number(vagas) : undefined;
    if (vagasNum != null && (Number.isNaN(vagasNum) || vagasNum < 0))
      return toast.error("Vagas inválidas");

    setLoading(true);
    try {
      if (editando && inscricaoId) {
        await atualizar({
          id: inscricaoId,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          ativa,
          dataAbertura: dateToTs(dataAbertura),
          dataLimite: dateToTs(dataLimite),
          vagas: vagasNum,
          camposSistema,
          camposCustom: custom,
        });
        toast.success("Inscrição atualizada");
      } else {
        await criar({
          slug: slug.trim(),
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          ativa,
          dataAbertura: dateToTs(dataAbertura),
          dataLimite: dateToTs(dataLimite),
          vagas: vagasNum,
          camposSistema,
          camposCustom: custom,
        });
        toast.success("Inscrição criada");
      }
      await revalidarSite("inscricoes");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar inscrição" : "Nova inscrição"}</DialogTitle>
          <DialogDescription>
            Monte o formulário público. Membros logados têm os campos de sistema preenchidos
            automaticamente — não recrie esses dados como campo custom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="b-titulo">Título *</Label>
            <Input id="b-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="b-slug">Slug (URL) *</Label>
            <Input
              id="b-slug"
              value={slug}
              disabled={editando}
              onChange={(e) => {
                setSlugTocado(true);
                setSlug(slugify(e.target.value));
              }}
            />
            <p className="text-xs text-muted-foreground">/inscricoes/{slug || "..."}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="b-descricao">Descrição</Label>
            <Textarea
              id="b-descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="b-abertura">Abre em</Label>
              <Input
                id="b-abertura"
                type="date"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="b-limite">Encerra em</Label>
              <Input
                id="b-limite"
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="b-vagas">Vagas</Label>
              <Input
                id="b-vagas"
                type="number"
                min={0}
                placeholder="Ilimitado"
                value={vagas}
                onChange={(e) => setVagas(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="b-ativa" checked={ativa} onCheckedChange={setAtiva} />
            <Label htmlFor="b-ativa">Ativa (visível no site)</Label>
          </div>

          {/* Campos de sistema */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Campos de sistema</p>
            <p className="text-xs text-muted-foreground">
              Dados que já temos do membro. Se o inscrito for membro e logar, estes campos vêm
              preenchidos — ele não digita de novo.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {CAMPOS_SISTEMA.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={camposSistema.includes(c.value)}
                    onCheckedChange={() => toggleSistema(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {/* Campos customizados */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Campos personalizados</p>
              <Button type="button" variant="outline" size="sm" onClick={addCustom}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {camposCustom.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum campo personalizado.</p>
            )}
            {camposCustom.map((c, idx) => (
              <div key={c.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    placeholder="Rótulo do campo"
                    value={c.label}
                    onChange={(e) => updateCustom(idx, { label: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustom(idx)}
                    aria-label="Remover campo"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select
                    value={c.tipo}
                    onValueChange={(v) => updateCustom(idx, { tipo: v as TipoCustom })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CUSTOM.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={c.obrigatorio}
                      onCheckedChange={(v) => updateCustom(idx, { obrigatorio: v === true })}
                    />
                    Obrigatório
                  </label>
                </div>
                {c.tipo === "select" && (
                  <Input
                    placeholder="Opções separadas por vírgula"
                    value={(c.opcoes ?? []).join(", ")}
                    onChange={(e) =>
                      updateCustom(idx, { opcoes: e.target.value.split(",").map((o) => o.trim()) })
                    }
                  />
                )}
                {c.tipo !== "checkbox" && c.tipo !== "select" && (
                  <Input
                    placeholder="Placeholder (opcional)"
                    value={c.placeholder ?? ""}
                    onChange={(e) => updateCustom(idx, { placeholder: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : editando ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
