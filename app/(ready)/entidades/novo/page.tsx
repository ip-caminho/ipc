"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { DetailHeader } from "@shared/components/layout/DetailHeader";
import { StickyActionBar } from "@shared/components/layout/StickyActionBar";
import { toast } from "sonner";
import { PAPEL_OPTIONS } from "@features/membros/lib/constants";

type PapelEntidade = (typeof PAPEL_OPTIONS)[number]["value"];

// So Pessoa Juridica: fornecedores e igrejas parceiras. Pessoas (PF) sao
// cadastradas como membros no rol (/membros).
const PAPEIS_PJ = PAPEL_OPTIONS.filter((p) =>
  ["FORNECEDOR", "IGREJA_PARCEIRA"].includes(p.value)
);

export default function NovaEntidadePage() {
  // @ts-ignore Convex TS2589
  const createEntidade = useMutation(api.entidades.mutations.create);
  const router = useRouter();
  const [papeis, setPapeis] = useState<PapelEntidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [papeisError, setPapeisError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (papeis.length === 0) {
      setPapeisError(true);
      return;
    }
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
    setPapeisError(false);
    setPapeis((prev) =>
      prev.includes(papel) ? prev.filter((p) => p !== papel) : [...prev, papel]
    );
  };

  return (
    <HeaderLayout>
    <DetailHeader title="Novo fornecedor" backHref="/entidades" />
    <div className="max-w-2xl pb-28 md:pb-0">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Papeis</Label>
              <div className="flex flex-wrap gap-3">
                {PAPEIS_PJ.map((p) => (
                  <label key={p.value} className="flex min-h-11 flex-1 items-center gap-3 rounded-md border px-3 text-sm md:min-h-0 md:flex-none md:gap-2 md:rounded-none md:border-0 md:px-0">
                    <Checkbox
                      checked={papeis.includes(p.value)}
                      onCheckedChange={() => togglePapel(p.value)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              {papeisError && (
                <p className="text-xs text-destructive">Marque ao menos um papel</p>
              )}
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
              <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" inputMode="numeric" autoComplete="off" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="responsavelNome">Responsavel</Label>
              <Input id="responsavelNome" name="responsavelNome" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" type="tel" autoComplete="tel" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" />
              </div>
            </div>
          </CardContent>
        </Card>

        <StickyActionBar>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Criar"}
          </Button>
        </StickyActionBar>
      </form>
    </div>
    </HeaderLayout>
  );
}
