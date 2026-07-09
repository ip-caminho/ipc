"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { toast } from "sonner";
import { PAPEL_OPTIONS } from "@features/membros/lib/constants";

type PapelEntidade = (typeof PAPEL_OPTIONS)[number]["value"];

// So Pessoa Juridica: fornecedores e igrejas parceiras. Pessoas (PF) sao
// cadastradas como membros no rol (/membros).
const PAPEIS_PJ = PAPEL_OPTIONS.filter((p) =>
  ["FORNECEDOR", "IGREJA_PARCEIRA"].includes(p.value)
);

export default function NovaEntidadePage() {
  const createEntidade = useMutation(api.entidades.mutations.create);
  const router = useRouter();
  const [papeis, setPapeis] = useState<PapelEntidade[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      await createEntidade({
        tipoEntidade: "PJ",
        papeis,
        nomeRazaoSocial: (formData.get("nomeRazaoSocial") as string) || undefined,
        nomeFantasia: (formData.get("nomeFantasia") as string) || undefined,
        cnpj: (formData.get("cnpj") as string) || undefined,
        responsavelNome: (formData.get("responsavelNome") as string) || undefined,
        whatsapp: (formData.get("whatsapp") as string) || undefined,
        telefone: (formData.get("telefone") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
      });

      toast.success("Cadastro criado com sucesso");
      router.push("/entidades");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar cadastro");
    } finally {
      setLoading(false);
    }
  };

  const togglePapel = (papel: PapelEntidade) => {
    setPapeis((prev) =>
      prev.includes(papel) ? prev.filter((p) => p !== papel) : [...prev, papel]
    );
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Fornecedor ou Parceiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Papeis</Label>
              <div className="flex flex-wrap gap-3">
                {PAPEIS_PJ.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={papeis.includes(p.value)}
                      onCheckedChange={() => togglePapel(p.value)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nomeRazaoSocial">Razao Social</Label>
              <Input id="nomeRazaoSocial" name="nomeRazaoSocial" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input id="nomeFantasia" name="nomeFantasia" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="responsavelNome">Responsavel</Label>
              <Input id="responsavelNome" name="responsavelNome" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" type="tel" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" type="tel" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || papeis.length === 0}>
            {loading ? "Salvando..." : "Criar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
