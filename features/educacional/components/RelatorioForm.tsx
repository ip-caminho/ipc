"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DateFieldBR } from "@/shared/components/ui/date-picker-br";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Separator } from "@/shared/components/ui/separator";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { TURMA_OPTIONS, TURMA_COLORS } from "../lib/constants";
import { relatorioFormSchema, type RelatorioFormValues } from "../lib/validations";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelatorioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RelatorioFormValues) => Promise<void>;
  /** Valores iniciais para edição. Ausente = criação. */
  defaultValues?: Partial<RelatorioFormValues>;
  /** Em edição turma+data são a identidade — ficam travadas. */
  isEditing?: boolean;
}

const EMPTY_VALUES: RelatorioFormValues = {
  turma: "",
  data: new Date().toISOString().slice(0, 10),
  voluntarios: [],
  numero: "",
  tema: "",
  textosBaseText: "",
  passagemMemorizar: "",
  historia: "",
  aplicacao: "",
  licaoDeCasa: "",
  visitantesText: "",
};

// Agrupamento do picker de voluntarios pelos 3 papeis do educacional.
const PAPEL_GRUPOS = [
  { papel: "PROFESSOR", label: "Professores" },
  { papel: "AUXILIAR", label: "Auxiliares" },
  { papel: "APOIO", label: "Apoio" },
] as const;

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

export function RelatorioForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing,
}: RelatorioFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RelatorioFormValues>({
    resolver: zodResolver(relatorioFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Ao abrir, preenche com os valores de edição ou zera para criação.
  useEffect(() => {
    if (!open) return;
    form.reset(
      defaultValues ? { ...EMPTY_VALUES, ...defaultValues } : EMPTY_VALUES
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const turmaSelecionada = form.watch("turma");
  const dataSelecionada = form.watch("data");
  const voluntarios = form.watch("voluntarios");

  // Voluntarios do educacional habilitados na turma selecionada.
  // @ts-ignore Convex TS2589
  const voluntariosDisponiveis = useQuery(api.educacional.queries.listVoluntarios, turmaSelecionada ? { turma: turmaSelecionada } : "skip");

  // Escala do dia para pre-preencher quem serviu.
  // @ts-ignore Convex TS2589
  const sugestao = useQuery(api.educacional.queries.sugestaoVoluntariosRelatorio, turmaSelecionada && dataSelecionada ? { turma: turmaSelecionada, data: dataSelecionada } : "skip");

  const handleSubmit = async (data: RelatorioFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isSelecionado = (membroId: string) =>
    voluntarios.some((v) => v.membroId === membroId);

  const toggleVoluntario = (membroId: string, papel: string) => {
    const current = form.getValues("voluntarios");
    if (current.some((v) => v.membroId === membroId)) {
      form.setValue(
        "voluntarios",
        current.filter((v) => v.membroId !== membroId)
      );
    } else {
      form.setValue("voluntarios", [...current, { membroId, papel }]);
    }
  };

  // Pre-preenche a partir da escala do dia — marca os escalados que sao
  // voluntarios cadastrados na turma (fonte selecionavel).
  const preencherPelaEscala = () => {
    if (!sugestao || !voluntariosDisponiveis) return;
    const disponiveisIds = new Set(
      voluntariosDisponiveis.map((v: any) => String(v.membroId))
    );
    const novos = sugestao
      .filter((s: any) => disponiveisIds.has(String(s.membroId)))
      .map((s: any) => ({ membroId: String(s.membroId), papel: s.papel }));

    if (sugestao.length === 0) {
      toast.info("Sem escala cadastrada para esta turma e data");
      return;
    }
    form.setValue("voluntarios", novos);
    const faltantes = sugestao.length - novos.length;
    if (novos.length === 0) {
      toast.info("Nenhum escalado consta no cadastro de voluntarios desta turma");
    } else if (faltantes > 0) {
      toast.info(
        `${novos.length} preenchido(s); ${faltantes} escalado(s) fora do cadastro de voluntarios`
      );
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEditing ? "Editar Relatorio" : "Novo Relatorio"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <ResponsiveDialogBody className="space-y-4">
          <SecTitle>Aula</SecTitle>
          {isEditing ? (
            // Turma+data sao a identidade do relatorio — nao editaveis (mudar
            // criaria um duplicado). Exibidas como referencia.
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={TURMA_COLORS[turmaSelecionada] || ""}
              >
                Turma {turmaSelecionada}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {dataSelecionada &&
                  format(parseISO(dataSelecionada), "dd/MM/yyyy (EEEE)", {
                    locale: ptBR,
                  })}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Turma *</Label>
                <Select
                  value={turmaSelecionada}
                  onValueChange={(v) => {
                    form.setValue("turma", v);
                    form.setValue("voluntarios", []);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TURMA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.turma && (
                  <p className="text-xs text-destructive">{form.formState.errors.turma.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <DateFieldBR control={form.control} name="data" />
                {form.formState.errors.data && (
                  <p className="text-xs text-destructive">{form.formState.errors.data.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Numero da licao</Label>
            <Input type="number" {...form.register("numero")} placeholder="Ex: 12" />
          </div>

          {/* Voluntarios que serviram — puxados do cadastro do educacional */}
          {turmaSelecionada && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Voluntarios ({voluntarios.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={preencherPelaEscala}
                  disabled={!sugestao || !voluntariosDisponiveis}
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  Preencher pela escala
                </Button>
              </div>
              {!voluntariosDisponiveis ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : voluntariosDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum voluntario cadastrado nesta turma
                </p>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto border rounded-md p-2">
                  {PAPEL_GRUPOS.map((grupo) => {
                    const doGrupo = voluntariosDisponiveis.filter(
                      (v: any) => v.papelEdu === grupo.papel
                    );
                    if (doGrupo.length === 0) return null;
                    return (
                      <div key={grupo.papel} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {grupo.label}
                        </p>
                        {doGrupo.map((v: any) => (
                          <label
                            key={String(v.membroId)}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                          >
                            <Checkbox
                              checked={isSelecionado(String(v.membroId))}
                              onCheckedChange={() =>
                                toggleVoluntario(String(v.membroId), grupo.papel)
                              }
                            />
                            {v.nome}
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <SecTitle>Conteudo da licao</SecTitle>
          <div className="space-y-1">
            <Label>Tema</Label>
            <Input {...form.register("tema")} />
          </div>

          <div className="space-y-1">
            <Label>Textos-base (um por linha)</Label>
            <Textarea
              {...form.register("textosBaseText")}
              rows={2}
              placeholder={"Joao 3:16\nSalmo 23"}
            />
          </div>

          <div className="space-y-1">
            <Label>Passagem para memorizar</Label>
            <Input {...form.register("passagemMemorizar")} />
          </div>

          <div className="space-y-1">
            <Label>Historia</Label>
            <Textarea {...form.register("historia")} rows={3} />
          </div>

          <div className="space-y-1">
            <Label>Aplicacao</Label>
            <Textarea {...form.register("aplicacao")} rows={2} />
          </div>

          <div className="space-y-1">
            <Label>Licao de casa</Label>
            <Textarea {...form.register("licaoDeCasa")} rows={2} />
          </div>

          <SecTitle>Turma do dia</SecTitle>
          <div className="space-y-1">
            <Label>Visitantes (um por linha)</Label>
            <Textarea {...form.register("visitantesText")} rows={2} />
          </div>

          <div className="space-y-1">
            <Label>Observacoes e sugestoes internas</Label>
            <Textarea {...form.register("observacoes")} rows={2} />
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
