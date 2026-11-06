"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { CATEGORIAS_PADRAO } from "@features/biblioteca/lib/constants";
import { pilula } from "@features/biblioteca/lib/estilos";
import { livroEdicaoSchema, type LivroEdicaoValues } from "@features/biblioteca/lib/validations";

type Props = {
  onClose: () => void;
  livro: {
    _id: Id<"livros">;
    titulo: string;
    autores: string[];
    editora?: string;
    ano?: number;
    categorias: string[];
    descricao?: string;
    capaUrl?: string;
  };
};

export function LivroEditDialog({ onClose, livro }: Props) {
  const atualizar = useMutation(api.biblioteca.mutations.update);
  const form = useForm<LivroEdicaoValues>({
    resolver: zodResolver(livroEdicaoSchema),
    defaultValues: {
      titulo: livro.titulo,
      autores: livro.autores.join(", "),
      editora: livro.editora ?? "",
      ano: livro.ano,
      categorias: livro.categorias,
      descricao: livro.descricao ?? "",
      capaUrl: livro.capaUrl,
    },
  });
  const categorias = form.watch("categorias");
  const erros = form.formState.errors;

  async function salvar(values: LivroEdicaoValues) {
    try {
      await atualizar({
        id: livro._id,
        titulo: values.titulo,
        autores: values.autores.split(",").map((a) => a.trim()).filter(Boolean),
        editora: values.editora ?? "",
        ano: values.ano,
        categorias: values.categorias,
        descricao: values.descricao ?? "",
        // So envia a capa se mudou; vazio remove a atual.
        capaUrl: values.capaUrl === livro.capaUrl ? undefined : (values.capaUrl ?? ""),
      });
      toast.success("Livro atualizado");
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar");
    }
  }

  return (
    <ResponsiveDialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Editar livro</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(salvar)} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" className="h-11 rounded-2xl" {...form.register("titulo")} />
              {erros.titulo && <p className="text-sm text-destructive">{erros.titulo.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="autores">Autores (separados por vírgula)</Label>
              <Input id="autores" className="h-11 rounded-2xl" {...form.register("autores")} />
              {erros.autores && <p className="text-sm text-destructive">{erros.autores.message}</p>}
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <div className="space-y-1">
                <Label htmlFor="editora">Editora</Label>
                <Input id="editora" className="h-11 rounded-2xl" {...form.register("editora")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  inputMode="numeric"
                  className="h-11 rounded-2xl"
                  {...form.register("ano", {
                    setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                  })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categorias</Label>
              <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2">
                {CATEGORIAS_PADRAO.map((cat) => (
                  <label key={cat} className="flex min-h-11 items-center gap-2 text-sm">
                    <Checkbox
                      checked={categorias.includes(cat)}
                      onCheckedChange={(marcado) =>
                        form.setValue(
                          "categorias",
                          marcado ? [...categorias, cat] : categorias.filter((c) => c !== cat)
                        )
                      }
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="descricao">Sinopse</Label>
              <Textarea id="descricao" rows={3} className="rounded-2xl" {...form.register("descricao")} />
            </div>
            <div className="space-y-1">
              <Label>Capa</Label>
              <FileUpload
                folder="biblioteca-capas"
                entityId={livro._id}
                accept="image/*"
                maxSizeMB={10}
                value={form.watch("capaUrl")}
                onChange={(url) => form.setValue("capaUrl", url)}
                label="Selecionar foto"
              />
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="ghost" className={`h-11 active:bg-muted ${pilula}`} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className={`h-11 ${pilula}`} disabled={form.formState.isSubmitting}>
              Salvar
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
