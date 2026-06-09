"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePickerField } from "@shared/components/DatePickerField";
import { FileUpload } from "@/shared/files/components/FileUpload";
import { Church, BookMarked, LogOut, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CARGO_ECLESIASTICO_OPTIONS,
  FORMA_ADMISSAO_OPTIONS,
  FORMA_DEMISSAO_OPTIONS,
  MOTIVO_DEMISSAO_OPTIONS,
} from "@features/membros/lib/constants";

const TIPO_ROL_OPTIONS = [
  { value: "COMUNGANTE", label: "Comungante" },
  { value: "NAO_COMUNGANTE", label: "Nao comungante" },
  { value: "PARADEIRO_IGNORADO", label: "Paradeiro ignorado" },
] as const;

const SAC_CAMPOS = [
  { key: "dataConversao", label: "Data de conversao" },
  { key: "dataBatismo", label: "Data de batismo" },
  { key: "dataMembresia", label: "Membresia desde" },
] as const;

type CampoVerificado = {
  campo: string;
  verificadoEm: number;
};

type Props = {
  membroId: Id<"membros">;
  entidadeId: Id<"entidades">;
  initial: {
    cargoEclesiastico?: string;
    rol?: string;
    tipoRolOverride?: string;
    numeroMatricula?: string;
    dataConversao?: string;
    dataBatismo?: string;
    dataMembresia?: string;
    formaAdmissao?: string;
    igrejaProcedencia?: string;
    observacoesPastorais?: string;
    formaDemissao?: string;
    dataDemissao?: string;
    igrejaDestino?: string;
    dataFalecimento?: string;
    cartaTransferencia?: string;
    motivoDemissao?: string;
    motivoDemissaoObs?: string;
  };
  camposVerificados: CampoVerificado[];
};

export function EclesiasticoForm({
  membroId,
  entidadeId,
  initial,
  camposVerificados,
}: Props) {
  const updateEclesiastico = useMutation(api.membros.eclesiastico.updateEclesiastico);
  const marcarCampo = useMutation(api.membros.eclesiastico.marcarCampoVerificado);

  const [form, setForm] = useState({
    cargoEclesiastico: initial.cargoEclesiastico ?? "",
    rol: initial.rol ?? "",
    tipoRolOverride: initial.tipoRolOverride ?? "",
    numeroMatricula: initial.numeroMatricula ?? "",
    dataConversao: initial.dataConversao ?? "",
    dataBatismo: initial.dataBatismo ?? "",
    dataMembresia: initial.dataMembresia ?? "",
    formaAdmissao: initial.formaAdmissao ?? "",
    igrejaProcedencia: initial.igrejaProcedencia ?? "",
    observacoesPastorais: initial.observacoesPastorais ?? "",
    formaDemissao: initial.formaDemissao ?? "",
    dataDemissao: initial.dataDemissao ?? "",
    igrejaDestino: initial.igrejaDestino ?? "",
    dataFalecimento: initial.dataFalecimento ?? "",
    cartaTransferencia: initial.cartaTransferencia ?? "",
    motivoDemissao: initial.motivoDemissao ?? "",
    motivoDemissaoObs: initial.motivoDemissaoObs ?? "",
  });
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      form.cargoEclesiastico !== (initial.cargoEclesiastico ?? "") ||
      form.rol !== (initial.rol ?? "") ||
      form.tipoRolOverride !== (initial.tipoRolOverride ?? "") ||
      form.numeroMatricula !== (initial.numeroMatricula ?? "") ||
      form.dataConversao !== (initial.dataConversao ?? "") ||
      form.dataBatismo !== (initial.dataBatismo ?? "") ||
      form.dataMembresia !== (initial.dataMembresia ?? "") ||
      form.formaAdmissao !== (initial.formaAdmissao ?? "") ||
      form.igrejaProcedencia !== (initial.igrejaProcedencia ?? "") ||
      form.observacoesPastorais !== (initial.observacoesPastorais ?? "") ||
      form.formaDemissao !== (initial.formaDemissao ?? "") ||
      form.dataDemissao !== (initial.dataDemissao ?? "") ||
      form.igrejaDestino !== (initial.igrejaDestino ?? "") ||
      form.dataFalecimento !== (initial.dataFalecimento ?? "") ||
      form.cartaTransferencia !== (initial.cartaTransferencia ?? "") ||
      form.motivoDemissao !== (initial.motivoDemissao ?? "") ||
      form.motivoDemissaoObs !== (initial.motivoDemissaoObs ?? "")
    );
  }, [form, initial]);

  const handleSave = async () => {
    // Carta obrigatoria ao registrar/alterar transferencia — mas nao trava
    // registros legados que ja eram transferencia sem carta (so impede piorar)
    const eraTransferenciaSemCarta =
      initial.formaDemissao === "TRANSFERENCIA" && !initial.cartaTransferencia;
    if (
      form.formaDemissao === "TRANSFERENCIA" &&
      !form.cartaTransferencia &&
      !eraTransferenciaSemCarta
    ) {
      toast.error("Anexe a carta de transferencia antes de salvar");
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, string | undefined> = {};
      const k = (campo: keyof typeof form) => {
        if (form[campo] !== (initial[campo as keyof typeof initial] ?? "")) {
          data[campo as string] = form[campo] || undefined;
        }
      };
      k("cargoEclesiastico");
      k("rol");
      k("tipoRolOverride");
      k("numeroMatricula");
      k("dataConversao");
      k("dataBatismo");
      k("dataMembresia");
      k("formaAdmissao");
      k("igrejaProcedencia");
      k("observacoesPastorais");
      k("formaDemissao");
      k("dataDemissao");
      k("igrejaDestino");
      k("dataFalecimento");
      k("cartaTransferencia");
      k("motivoDemissao");
      k("motivoDemissaoObs");

      await updateEclesiastico({ membroId, data });
      toast.success("Dados eclesiasticos atualizados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const isVerificado = (campo: string) =>
    camposVerificados.find((c) => c.campo === campo);

  const handleVerificar = async (campo: string, desmarcar: boolean) => {
    try {
      await marcarCampo({ entidadeId, campo, desmarcar });
      toast.success(desmarcar ? "Verificacao removida" : "Campo verificado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const isTransferencia = form.formaAdmissao === "TRANSFERENCIA";
  const isDemitido = !!form.formaDemissao;

  return (
    <div className="space-y-4">
      {/* Membresia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Church className="h-3.5 w-3.5" /> Membresia
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Cargo eclesiastico</Label>
            <Select
              value={form.cargoEclesiastico}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, cargoEclesiastico: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CARGO_ECLESIASTICO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Numero do rol</Label>
            <Input
              value={form.rol}
              onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
              placeholder="Ex: 0123"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo de rol</Label>
            <Select
              value={form.tipoRolOverride}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, tipoRolOverride: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Derivado do cargo (padrao)" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_ROL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Numero de matricula</Label>
            <Input
              value={form.numeroMatricula}
              onChange={(e) =>
                setForm((p) => ({ ...p, numeroMatricula: e.target.value }))
              }
              placeholder="Numeracao do rol"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sacramentos e admissao */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <BookMarked className="h-3.5 w-3.5" /> Sacramentos e admissao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {SAC_CAMPOS.map(({ key, label }) => {
              const verificado = isVerificado(key);
              const valorAtual = form[key];
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">{label}</Label>
                    {verificado && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        Verificado
                      </Badge>
                    )}
                  </div>
                  <DatePickerField
                    value={valorAtual}
                    onChange={(iso) =>
                      setForm((p) => ({ ...p, [key]: iso }))
                    }
                    placeholder="dd/mm/aaaa"
                    maxDate={new Date()}
                  />
                  <div className="flex items-center justify-between gap-2">
                    {verificado ? (
                      <p className="text-[10px] text-muted-foreground">
                        Em{" "}
                        {format(
                          new Date(verificado.verificadoEm),
                          "dd/MM/yyyy",
                          { locale: ptBR }
                        )}
                      </p>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {valorAtual ? "Nao verificado" : ""}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleVerificar(key, !!verificado)}
                      disabled={!valorAtual && !verificado}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {verificado ? "Remover selo" : "Confirmar pelo livro"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t">
            <div className="space-y-1">
              <Label className="text-xs">Forma de admissao</Label>
              <Select
                value={form.formaAdmissao}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, formaAdmissao: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_ADMISSAO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isTransferencia && (
              <div className="space-y-1">
                <Label className="text-xs">Igreja de procedencia</Label>
                <Input
                  value={form.igrejaProcedencia}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      igrejaProcedencia: e.target.value,
                    }))
                  }
                  placeholder="Nome da igreja anterior"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observacoes pastorais</Label>
            <Textarea
              rows={3}
              value={form.observacoesPastorais}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  observacoesPastorais: e.target.value,
                }))
              }
              placeholder="Notas sem registro oficial, contexto pastoral, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Demissao */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Demissao / saida do rol
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Forma de demissao</Label>
            <Select
              value={form.formaDemissao}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  formaDemissao: v,
                  // limpa campos especificos da forma anterior para nao orfanar
                  cartaTransferencia:
                    v === "TRANSFERENCIA" ? p.cartaTransferencia : "",
                  motivoDemissao: v === "EXCLUSAO" ? p.motivoDemissao : "",
                  motivoDemissaoObs: v === "EXCLUSAO" ? p.motivoDemissaoObs : "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                {FORMA_DEMISSAO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isDemitido && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Data da demissao</Label>
                <DatePickerField
                  value={form.dataDemissao}
                  onChange={(iso) =>
                    setForm((p) => ({ ...p, dataDemissao: iso }))
                  }
                  placeholder="dd/mm/aaaa"
                  maxDate={new Date()}
                />
              </div>
              {form.formaDemissao === "TRANSFERENCIA" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Igreja de destino</Label>
                    <Input
                      value={form.igrejaDestino}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, igrejaDestino: e.target.value }))
                      }
                      placeholder="Nome da nova igreja"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Carta de transferencia *</Label>
                    <FileUpload
                      folder="membros/cartas-transferencia"
                      entityId={entidadeId}
                      accept="application/pdf,image/*"
                      value={form.cartaTransferencia || undefined}
                      onChange={(url) =>
                        setForm((p) => ({ ...p, cartaTransferencia: url ?? "" }))
                      }
                      label="Anexar carta (PDF ou imagem)"
                    />
                  </div>
                </>
              )}
              {form.formaDemissao === "EXCLUSAO" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Motivo da exclusao</Label>
                    <Select
                      value={form.motivoDemissao}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, motivoDemissao: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVO_DEMISSAO_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Observacao do motivo</Label>
                    <Textarea
                      rows={2}
                      value={form.motivoDemissaoObs}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          motivoDemissaoObs: e.target.value,
                        }))
                      }
                      placeholder="Detalhe o motivo da exclusao (opcional)"
                    />
                  </div>
                </>
              )}
              {form.formaDemissao === "FALECIMENTO" && (
                <div className="space-y-1">
                  <Label className="text-xs">Data do falecimento</Label>
                  <DatePickerField
                    value={form.dataFalecimento}
                    onChange={(iso) =>
                      setForm((p) => ({ ...p, dataFalecimento: iso }))
                    }
                    placeholder="dd/mm/aaaa"
                    maxDate={new Date()}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Acoes */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-0">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Salvando..." : "Salvar alteracoes eclesiasticas"}
        </Button>
        {hasChanges && (
          <p className="text-[11px] text-muted-foreground mt-1 sm:inline-block sm:ml-3">
            Alteracoes pendentes
          </p>
        )}
      </div>
    </div>
  );
}
