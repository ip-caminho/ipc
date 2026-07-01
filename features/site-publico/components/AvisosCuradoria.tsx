"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { revalidarSite } from "../lib/revalidate";

// Um aviso do culto. Campos editáveis: titulo/descricao/quando/onde. Os demais
// (contato/dataEvento) são preservados no estado e reenviados no save — não
// aparecem no site, mas não devem ser apagados.
export interface AvisoCulto {
  titulo: string;
  descricao: string;
  quando?: string | null;
  onde?: string | null;
  dataEvento?: string | null;
  contatoNome?: string | null;
  contatoWhatsapp?: string | null;
}

export function AvisosCuradoria({
  gravacaoId,
  avisos: initial,
}: {
  gravacaoId: Id<"gravacoes">;
  avisos: AvisoCulto[];
}) {
  // @ts-ignore Convex TS2589
  const corrigir = useMutation(api.gravacoes.mutations.corrigirAvisosCulto);
  const [avisos, setAvisos] = useState<AvisoCulto[]>(initial);
  const [saving, setSaving] = useState(false);

  const update = (i: number, field: keyof AvisoCulto, value: string) =>
    setAvisos((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  const add = () => setAvisos((prev) => [...prev, { titulo: "", descricao: "" }]);
  const remove = (i: number) => setAvisos((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const clean = avisos.filter((a) => a.titulo.trim() || a.descricao.trim());
    setSaving(true);
    try {
      await corrigir({ gravacaoId, avisos: clean });
      await revalidarSite("avisos");
      toast.success("Avisos atualizados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" /> Avisos ({avisos.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={add}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1 h-3.5 w-3.5" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {avisos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum aviso. Clique em Adicionar para criar.</p>
        )}
        {avisos.map((a, i) => (
          <div key={i} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Aviso {i + 1}
                {a.contatoNome ? ` · contato: ${a.contatoNome} (não aparece no site)` : ""}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              placeholder="Título"
              value={a.titulo}
              onChange={(e) => update(i, "titulo", e.target.value)}
            />
            <Textarea
              placeholder="Descrição"
              value={a.descricao}
              onChange={(e) => update(i, "descricao", e.target.value)}
              className="min-h-[60px]"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Quando (ex.: Sábado, 16 de maio)"
                value={a.quando ?? ""}
                onChange={(e) => update(i, "quando", e.target.value)}
              />
              <Input
                placeholder="Onde"
                value={a.onde ?? ""}
                onChange={(e) => update(i, "onde", e.target.value)}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
