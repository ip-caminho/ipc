"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePickerField } from "@shared/components/DatePickerField";
import { Heart, Baby, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  membroId: Id<"membros">;
  entidadeId?: string;
  nome: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

function BuscaEntidade({
  excluirEntidadeId,
  onSelecionar,
  placeholder,
}: {
  excluirEntidadeId?: string;
  onSelecionar: (entidadeId: Id<"entidades">, nome: string) => void;
  placeholder: string;
}) {
  const [termo, setTermo] = useState("");
  const args = termo.trim().length >= 2
    ? { termo, excluirEntidadeId: excluirEntidadeId as Id<"entidades"> | undefined }
    : "skip";
  const resultados = useQuery(api.membros.eclesiastico.buscarEntidadesFamilia, args);
  return (
    <div className="space-y-1">
      <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
      {resultados && resultados.length > 0 && (
        <ul className="rounded-md border divide-y max-h-40 overflow-y-auto">
          {resultados.map((r) => (
            <li key={r.entidadeId}>
              <button
                type="button"
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
                onClick={() => {
                  onSelecionar(r.entidadeId as Id<"entidades">, r.nomeCompleto);
                  setTermo("");
                }}
              >
                <span>{r.nomeCompleto}</span>
                {!r.ehMembro && <Badge variant="secondary" className="text-[10px]">dependente</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FamiliaDrawer({ membroId, entidadeId, nome, open, onOpenChange }: Props) {
  const familia = useQuery(api.membros.eclesiastico.getFamily, open ? { membroId } : "skip");
  const vincularConjuge = useMutation(api.membros.eclesiastico.vincularConjugeAdmin);
  const desvincularConjuge = useMutation(api.membros.eclesiastico.desvincularConjugeAdmin);
  const adicionarFilho = useMutation(api.membros.eclesiastico.adicionarFilhoAdmin);
  const vincularFilho = useMutation(api.membros.eclesiastico.vincularFilhoExistenteAdmin);
  const removerFilho = useMutation(api.membros.eclesiastico.removerFilhoAdmin);

  const [addFilho, setAddFilho] = useState(false);
  const [fNome, setFNome] = useState("");
  const [fNasc, setFNasc] = useState("");
  const [fSexo, setFSexo] = useState("");
  const [fBatismoInfantil, setFBatismoInfantil] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function acao(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function criarFilho() {
    if (!fNome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setSalvando(true);
    try {
      await adicionarFilho({
        responsavelMembroId: membroId,
        nomeCompleto: fNome.trim(),
        dataNascimento: fNasc || undefined,
        sexo: fSexo === "M" || fSexo === "F" ? fSexo : undefined,
        batismoInfantil: fBatismoInfantil,
      });
      toast.success("Filho adicionado");
      setFNome(""); setFNasc(""); setFSexo(""); setFBatismoInfantil(false); setAddFilho(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar filho");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Familia — {nome}</SheetTitle>
          <SheetDescription>Vincule conjuge e filhos deste membro.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8 space-y-6">
          {/* Conjuge */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Heart className="h-4 w-4 text-rose-500" /> Conjuge
            </h3>
            {familia?.conjuge ? (
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{familia.conjuge.nomeCompleto}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => acao(() => desvincularConjuge({ membroId }), "Conjuge desvinculado")}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Desvincular
                </Button>
              </div>
            ) : (
              <BuscaEntidade
                excluirEntidadeId={entidadeId}
                placeholder="Buscar pessoa para vincular como conjuge..."
                onSelecionar={(eid) =>
                  acao(() => vincularConjuge({ membroId, conjugeEntidadeId: eid }), "Conjuge vinculado")
                }
              />
            )}
          </section>

          {/* Filhos */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Baby className="h-4 w-4 text-sky-500" /> Filhos
            </h3>
            {familia && familia.filhos.length > 0 ? (
              <ul className="space-y-1">
                {familia.filhos.map((f) => (
                  <li key={f.entidadeId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>
                      {f.nomeCompleto}
                      {f.dataNascimento && (
                        <span className="ml-1 text-xs text-muted-foreground">({f.dataNascimento})</span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover vinculo"
                      onClick={() =>
                        acao(
                          () => removerFilho({ responsavelMembroId: membroId, filhoEntidadeId: f.entidadeId as Id<"entidades"> }),
                          "Vinculo removido"
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum filho vinculado.</p>
            )}

            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1">Vincular filho que ja existe:</p>
              <BuscaEntidade
                excluirEntidadeId={entidadeId}
                placeholder="Buscar pessoa..."
                onSelecionar={(eid) =>
                  acao(
                    () => vincularFilho({ responsavelMembroId: membroId, filhoEntidadeId: eid }),
                    "Filho vinculado"
                  )
                }
              />
            </div>

            {addFilho ? (
              <div className="rounded-md border p-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={fNome} onChange={(e) => setFNome(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Nascimento</Label>
                    <DatePickerField value={fNasc} onChange={setFNasc} className="h-8 text-xs" />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Sexo</Label>
                    <Select value={fSexo} onValueChange={setFSexo}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-xs">
                  <Checkbox checked={fBatismoInfantil} onCheckedChange={(c) => setFBatismoInfantil(c === true)} className="mt-0.5" />
                  <span>
                    Recebeu batismo infantil — registra como{" "}
                    <strong>membro nao comungante</strong> (Rol Separado). Sem
                    batismo, fica como dependente.
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button size="sm" onClick={criarFilho} disabled={salvando}>
                    {salvando ? "Salvando..." : "Adicionar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddFilho(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAddFilho(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar novo filho
              </Button>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
