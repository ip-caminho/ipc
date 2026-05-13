"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Users, Search, X, Plus, Heart } from "lucide-react";
import { toast } from "sonner";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function FamiliaSection() {
  const familia = useQuery(api.membros.selfService.getMyFamily);
  const vincularConjuge = useMutation(api.membros.selfService.vincularConjuge);
  const desvincularConjuge = useMutation(api.membros.selfService.desvincularConjuge);
  const adicionarFilho = useMutation(api.membros.selfService.adicionarFilho);
  const removerFilho = useMutation(api.membros.selfService.removerFilho);
  const vincularFilho = useMutation(api.membros.selfService.vincularFilhoExistente);

  const [searchConjuge, setSearchConjuge] = useState("");
  const buscaConjuge = useQuery(
    api.membros.selfService.searchMembersForFamily,
    searchConjuge.trim().length >= 2 ? { search: searchConjuge.trim() } : "skip"
  );

  const [openFilho, setOpenFilho] = useState(false);
  const [filhoForm, setFilhoForm] = useState({
    nomeCompleto: "",
    dataNascimento: "",
    sexo: "" as "M" | "F" | "",
    batizadoNestaIgreja: false,
  });
  const [savingFilho, setSavingFilho] = useState(false);

  const handleVincularConjuge = async (entId: Id<"entidades">, nome: string) => {
    try {
      await vincularConjuge({ conjugeEntidadeId: entId });
      toast.success(`${nome} vinculado(a) como conjuge`);
      setSearchConjuge("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao vincular conjuge");
    }
  };

  const handleDesvincularConjuge = async () => {
    if (!confirm("Remover vinculo de conjuge?")) return;
    try {
      await desvincularConjuge();
      toast.success("Conjuge removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  const handleAdicionarFilho = async () => {
    if (!filhoForm.nomeCompleto.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setSavingFilho(true);
    try {
      await adicionarFilho({
        nomeCompleto: filhoForm.nomeCompleto.trim(),
        dataNascimento: filhoForm.dataNascimento || undefined,
        sexo: filhoForm.sexo || undefined,
        batizadoNestaIgreja: filhoForm.batizadoNestaIgreja,
      });
      toast.success("Filho adicionado");
      setFilhoForm({
        nomeCompleto: "",
        dataNascimento: "",
        sexo: "",
        batizadoNestaIgreja: false,
      });
      setOpenFilho(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar filho");
    } finally {
      setSavingFilho(false);
    }
  };

  const handleRemoverFilho = async (entId: Id<"entidades">, nome: string) => {
    if (!confirm(`Remover ${nome} da lista de filhos? A pessoa nao sera excluida.`)) return;
    try {
      await removerFilho({ filhoEntidadeId: entId });
      toast.success("Filho removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  // Suprimir warning lint: usado quando expandirmos UI para vincular filho existente
  void vincularFilho;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Familia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Conjuge */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Heart className="h-3 w-3" /> Conjuge
          </Label>
          {familia?.conjuge ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-md border">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={familia.conjuge.foto} />
                  <AvatarFallback>{initials(familia.conjuge.nomeCompleto)}</AvatarFallback>
                </Avatar>
                <p className="text-sm">{familia.conjuge.nomeCompleto}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDesvincularConjuge}
                aria-label="Remover conjuge"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar membro pelo nome..."
                  value={searchConjuge}
                  onChange={(e) => setSearchConjuge(e.target.value)}
                />
              </div>
              {searchConjuge.trim().length >= 2 && buscaConjuge && (
                <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                  {buscaConjuge.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">Nenhum membro encontrado</p>
                  ) : (
                    buscaConjuge.map((m) => (
                      <button
                        key={m.entidadeId}
                        type="button"
                        onClick={() => handleVincularConjuge(m.entidadeId, m.nomeCompleto)}
                        className="w-full text-left p-2 hover:bg-muted text-sm flex items-center gap-2"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.foto} />
                          <AvatarFallback>{initials(m.nomeCompleto)}</AvatarFallback>
                        </Avatar>
                        <span>{m.nomeCompleto}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filhos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Filhos ({familia?.filhos.length ?? 0})</Label>
            <Dialog open={openFilho} onOpenChange={setOpenFilho}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar filho</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome completo *</Label>
                    <Input
                      value={filhoForm.nomeCompleto}
                      onChange={(e) =>
                        setFilhoForm((p) => ({ ...p, nomeCompleto: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Data de nascimento</Label>
                      <Input
                        type="date"
                        value={filhoForm.dataNascimento}
                        onChange={(e) =>
                          setFilhoForm((p) => ({ ...p, dataNascimento: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sexo</Label>
                      <Select
                        value={filhoForm.sexo}
                        onValueChange={(v) =>
                          setFilhoForm((p) => ({ ...p, sexo: v as "M" | "F" }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={filhoForm.batizadoNestaIgreja}
                      onCheckedChange={(v) =>
                        setFilhoForm((p) => ({ ...p, batizadoNestaIgreja: !!v }))
                      }
                    />
                    Foi batizado(a) nesta igreja
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenFilho(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdicionarFilho} disabled={savingFilho}>
                    {savingFilho ? "Salvando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {familia && familia.filhos.length > 0 && (
            <div className="space-y-1">
              {familia.filhos.map((f) => (
                <div
                  key={f.entidadeId}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={f.foto} />
                      <AvatarFallback>{initials(f.nomeCompleto)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">{f.nomeCompleto}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {f.tipo === "PAI" || f.tipo === "MAE" ? "Filho(a)" : f.tipo}
                        {f.dataNascimento && ` · ${f.dataNascimento}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoverFilho(f.entidadeId, f.nomeCompleto)}
                    aria-label="Remover filho"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
