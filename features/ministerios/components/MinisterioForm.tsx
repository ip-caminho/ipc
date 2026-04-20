"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ministerioFormSchema, type MinisterioFormValues } from "../lib/validations";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { X, Plus } from "lucide-react";

interface MinisterioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MinisterioFormValues) => Promise<void>;
  defaultValues?: Partial<MinisterioFormValues>;
  isEditing?: boolean;
}

export function MinisterioForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: MinisterioFormProps) {
  const [loading, setLoading] = useState(false);
  const [novoPapel, setNovoPapel] = useState("");
  const [novoSubgrupo, setNovoSubgrupo] = useState("");

  const form = useForm<MinisterioFormValues>({
    resolver: zodResolver(ministerioFormSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      papeis: [],
      subgrupos: [],
      ...defaultValues,
    },
  });

  const papeis = form.watch("papeis") || [];
  const subgrupos = form.watch("subgrupos") || [];

  const handleAddPapel = () => {
    const trimmed = novoPapel.trim();
    if (trimmed && !papeis.includes(trimmed)) {
      form.setValue("papeis", [...papeis, trimmed]);
      setNovoPapel("");
    }
  };

  const handleRemovePapel = (papel: string) => {
    form.setValue("papeis", papeis.filter((p) => p !== papel));
  };

  const handleAddSubgrupo = () => {
    const trimmed = novoSubgrupo.trim();
    if (trimmed && !subgrupos.includes(trimmed)) {
      form.setValue("subgrupos", [...subgrupos, trimmed]);
      setNovoSubgrupo("");
    }
  };

  const handleRemoveSubgrupo = (subgrupo: string) => {
    form.setValue("subgrupos", subgrupos.filter((s) => s !== subgrupo));
  };

  const handleSubmit = async (data: MinisterioFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      setNovoPapel("");
      setNovoSubgrupo("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEditing ? "Editar" : "Novo"} Ministerio
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <ResponsiveDialogBody className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...form.register("nome")} />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive">
                {form.formState.errors.nome.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="descricao">Descricao</Label>
            <Textarea id="descricao" {...form.register("descricao")} />
          </div>

          {/* Papeis */}
          <div className="space-y-2">
            <Label>Papeis *</Label>
            <div className="flex flex-wrap gap-1.5">
              {papeis.map((papel) => (
                <Badge key={papel} variant="secondary" className="gap-1">
                  {papel}
                  <button type="button" onClick={() => handleRemovePapel(papel)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Novo papel..."
                value={novoPapel}
                onChange={(e) => setNovoPapel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPapel();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddPapel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.papeis && (
              <p className="text-xs text-destructive">
                {form.formState.errors.papeis.message}
              </p>
            )}
          </div>

          {/* Subgrupos */}
          <div className="space-y-2">
            <Label>Subgrupos (opcional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {subgrupos.map((sub) => (
                <Badge key={sub} variant="outline" className="gap-1">
                  {sub}
                  <button type="button" onClick={() => handleRemoveSubgrupo(sub)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Novo subgrupo..."
                value={novoSubgrupo}
                onChange={(e) => setNovoSubgrupo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubgrupo();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddSubgrupo}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
