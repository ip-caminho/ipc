"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { toast } from "sonner";
import { PAPEL_OPTIONS } from "@features/membros/lib/constants";

export default function NovaEntidadePage() {
  const createEntidade = useMutation(api.entidades.mutations.create);
  const router = useRouter();
  const [tipo, setTipo] = useState<"PF" | "PJ">("PF");
  const [papeis, setPapeis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      await createEntidade({
        tipoEntidade: tipo,
        papeis,
        nomeCompleto: tipo === "PF" ? (formData.get("nomeCompleto") as string) || undefined : undefined,
        cpf: tipo === "PF" ? (formData.get("cpf") as string) || undefined : undefined,
        nomeRazaoSocial: tipo === "PJ" ? (formData.get("nomeRazaoSocial") as string) || undefined : undefined,
        nomeFantasia: tipo === "PJ" ? (formData.get("nomeFantasia") as string) || undefined : undefined,
        cnpj: tipo === "PJ" ? (formData.get("cnpj") as string) || undefined : undefined,
        responsavelNome: tipo === "PJ" ? (formData.get("responsavelNome") as string) || undefined : undefined,
        whatsapp: (formData.get("whatsapp") as string) || undefined,
        telefone: (formData.get("telefone") as string) || undefined,
        email: (formData.get("email") as string) || undefined,
      });

      toast.success("Entidade criada com sucesso");
      router.push("/entidades");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar entidade");
    } finally {
      setLoading(false);
    }
  };

  const togglePapel = (papel: string) => {
    setPapeis((prev) =>
      prev.includes(papel) ? prev.filter((p) => p !== papel) : [...prev, papel]
    );
  };

  // Filter papel options based on tipo
  const filteredPapeis = PAPEL_OPTIONS.filter((p) => {
    if (tipo === "PF") return ["VISITANTE", "CONTATO", "FORNECEDOR"].includes(p.value);
    return ["FORNECEDOR", "IGREJA_PARCEIRA"].includes(p.value);
  });

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nova Entidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v as "PF" | "PJ"); setPapeis([]); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Fisica</SelectItem>
                  <SelectItem value="PJ">Pessoa Juridica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Papeis</Label>
              <div className="flex flex-wrap gap-3">
                {filteredPapeis.map((p) => (
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

            {tipo === "PF" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="nomeCompleto">Nome Completo</Label>
                  <Input id="nomeCompleto" name="nomeCompleto" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" name="cpf" placeholder="000.000.000-00" />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

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
            {loading ? "Salvando..." : "Criar Entidade"}
          </Button>
        </div>
      </form>
    </div>
  );
}
