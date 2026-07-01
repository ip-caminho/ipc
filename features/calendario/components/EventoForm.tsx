"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { eventoFormSchema, type EventoFormValues } from "../lib/validations";
import { DatePickerBR } from "./DatePickerBR";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Trash2 } from "lucide-react";
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
  DialogFooter,
} from "@/shared/components/ui/dialog";

interface EventoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventoFormValues) => Promise<void>;
  defaultValues?: Partial<EventoFormValues>;
  isEditing?: boolean;
  // Se presente e isEditing, mostra o botão "Excluir" no rodapé.
  onDelete?: () => Promise<void>;
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

export function EventoForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
  onDelete,
}: EventoFormProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // @ts-ignore Convex TS2589
  const ministerios = useQuery(api.ministerios.queries.list, { status: "ATIVO" });

  const form = useForm<EventoFormValues>({
    resolver: zodResolver(eventoFormSchema),
    defaultValues: {
      titulo: "",
      data: "",
      dataFim: "",
      ministerioId: "",
      descricao: "",
      tipo: "evento",
      publicadoNoSite: false,
      exibirNoSiteDe: "",
      exibirNoSiteAte: "",
      ...defaultValues,
    },
  });

  const publicar = form.watch("publicadoNoSite") ?? false;

  const handleSubmit = async (data: EventoFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
    setDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar" : "Novo"} evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          {/* ===== Dados do evento (uso interno / calendário) ===== */}
          <div className="space-y-4">
            <SecaoTitulo>Dados do evento</SecaoTitulo>

            <div className="space-y-1">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" {...form.register("titulo")} />
              {form.formState.errors.titulo && (
                <p className="text-xs text-destructive">{form.formState.errors.titulo.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="data">Data *</Label>
                <DatePickerBR
                  id="data"
                  value={form.watch("data") || ""}
                  onChange={(iso) => form.setValue("data", iso, { shouldValidate: true })}
                />
                {form.formState.errors.data && (
                  <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataFim">Data fim</Label>
                <DatePickerBR
                  id="dataFim"
                  value={form.watch("dataFim") || ""}
                  onChange={(iso) => form.setValue("dataFim", iso)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ministério</Label>
              <Select
                value={form.watch("ministerioId") || ""}
                onValueChange={(val) =>
                  form.setValue("ministerioId", val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Geral (todos)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geral (todos)</SelectItem>
                  {ministerios?.map((m: any) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.watch("tipo") || "evento"}
                onValueChange={(val) => form.setValue("tipo", val as "evento" | "pg" | "reuniao")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="pg">Pequeno Grupo</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" {...form.register("descricao")} />
            </div>
          </div>

          {/* ===== Publicar no site público (opt-in) ===== */}
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="publicadoNoSite">Publicar no site público</Label>
                <p className="text-xs text-muted-foreground">
                  Por padrão o evento fica só no calendário. Ative para ele aparecer na agenda
                  pública do site.
                </p>
              </div>
              <Switch
                id="publicadoNoSite"
                checked={publicar}
                onCheckedChange={(val) => form.setValue("publicadoNoSite", val)}
              />
            </div>

            {publicar && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  O <strong>título</strong> e a <strong>descrição</strong> acima aparecem na agenda
                  pública do site.
                </p>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Janela no site (opcional): controla quando o evento aparece. Em branco, aparece
                    enquanto for futuro.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="exibirNoSiteDe" className="text-xs">
                        Aparecer a partir de
                      </Label>
                      <DatePickerBR
                        id="exibirNoSiteDe"
                        value={form.watch("exibirNoSiteDe") || ""}
                        onChange={(iso) => form.setValue("exibirNoSiteDe", iso)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="exibirNoSiteAte" className="text-xs">
                        Aparecer até
                      </Label>
                      <DatePickerBR
                        id="exibirNoSiteAte"
                        value={form.watch("exibirNoSiteAte") || ""}
                        onChange={(iso) => form.setValue("exibirNoSiteAte", iso)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {isEditing && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting || loading}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {deleting ? "Excluindo..." : "Excluir"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || deleting}>
                {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
