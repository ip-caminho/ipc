"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { StickyActionBar } from "@/shared/components/layout/StickyActionBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
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
  const [removing, setRemoving] = useState<number | null>(null);
  const dirty = JSON.stringify(avisos) !== JSON.stringify(initial);

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
    <Card className="max-md:mb-28">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" /> Avisos ({avisos.length})
        </CardTitle>
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
                size="icon-tap"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remover aviso ${i + 1}`}
                onClick={() => setRemoving(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`aviso-${i}-titulo`} className="text-xs">Título</Label>
              <Input
                id={`aviso-${i}-titulo`}
                placeholder="Título"
                value={a.titulo}
                onChange={(e) => update(i, "titulo", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`aviso-${i}-descricao`} className="text-xs">Descrição</Label>
              <Textarea
                id={`aviso-${i}-descricao`}
                placeholder="Descrição"
                value={a.descricao}
                onChange={(e) => update(i, "descricao", e.target.value)}
                className="min-h-[60px] md:min-h-[60px]"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`aviso-${i}-quando`} className="text-xs">Quando</Label>
                <Input
                  id={`aviso-${i}-quando`}
                  placeholder="Quando (ex.: Sábado, 16 de maio)"
                  value={a.quando ?? ""}
                  onChange={(e) => update(i, "quando", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`aviso-${i}-onde`} className="text-xs">Onde</Label>
                <Input
                  id={`aviso-${i}-onde`}
                  placeholder="Onde"
                  value={a.onde ?? ""}
                  onChange={(e) => update(i, "onde", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <StickyActionBar>
        <Button variant="outline" onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
        <Button onClick={save} disabled={saving || !dirty}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </StickyActionBar>
      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aviso {removing !== null ? removing + 1 : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              O aviso some da lista e só deixa de aparecer no site depois de salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removing !== null) remove(removing);
                setRemoving(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
