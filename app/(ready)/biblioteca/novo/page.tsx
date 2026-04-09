"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { livroFormSchema, type LivroFormValues } from "@features/biblioteca/lib/validations";
import { CATEGORIAS_PADRAO, CONDICOES } from "@features/biblioteca/lib/constants";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";

export default function NovoLivroPage() {
  const router = useRouter();
  const createLivro = useMutation(api.biblioteca.mutations.create);

  const form = useForm<LivroFormValues>({
    resolver: zodResolver(livroFormSchema),
    defaultValues: {
      titulo: "",
      autores: "",
      categorias: [],
      condicao: "BOM",
    },
  });

  async function onSubmit(values: LivroFormValues) {
    try {
      await createLivro({
        titulo: values.titulo,
        autores: values.autores.split(",").map((a) => a.trim()).filter(Boolean),
        editora: values.editora || undefined,
        isbn: values.isbn || undefined,
        ano: values.ano,
        categorias: values.categorias,
        descricao: values.descricao || undefined,
        capaUrl: values.capaUrl || undefined,
        paginas: values.paginas,
        condicao: values.condicao as "NOVO" | "BOM" | "REGULAR" | "RUIM" | undefined,
        doadorNome: values.doadorNome || undefined,
      });
      toast.success("Livro cadastrado");
      router.push("/biblioteca");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao cadastrar");
    }
  }

  return (
    <ModuloGuard modulo="biblioteca">
      <div className="container max-w-2xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/biblioteca")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Novo Livro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Titulo *</Label>
                <Input id="titulo" {...form.register("titulo")} />
              </div>

              <div>
                <Label htmlFor="autores">Autores * (separados por vírgula)</Label>
                <Input id="autores" {...form.register("autores")} placeholder="C.S. Lewis, J.I. Packer" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editora">Editora</Label>
                  <Input id="editora" {...form.register("editora")} />
                </div>
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" {...form.register("isbn")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ano">Ano</Label>
                  <Input id="ano" type="number" {...form.register("ano", { valueAsNumber: true })} />
                </div>
                <div>
                  <Label htmlFor="paginas">Páginas</Label>
                  <Input id="paginas" type="number" {...form.register("paginas", { valueAsNumber: true })} />
                </div>
              </div>

              <div>
                <Label>Categorias</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CATEGORIAS_PADRAO.map((cat) => (
                    <label key={cat} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={form.watch("categorias").includes(cat)}
                        onCheckedChange={(checked) => {
                          const current = form.getValues("categorias");
                          form.setValue("categorias", checked
                            ? [...current, cat]
                            : current.filter((c) => c !== cat)
                          );
                        }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="descricao">Descricao</Label>
                <Textarea id="descricao" {...form.register("descricao")} rows={3} />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Primeiro exemplar</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Condição</Label>
                    <Select
                      value={form.watch("condicao") || ""}
                      onValueChange={(v) => form.setValue("condicao", v as LivroFormValues["condicao"])}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CONDICOES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doadorNome">Doador</Label>
                    <Input id="doadorNome" {...form.register("doadorNome")} placeholder="Nome do doador" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/biblioteca")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Cadastrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuloGuard>
  );
}
