"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DateInputBR } from "@/shared/components/ui/date-input-br";
import { PhoneInputBR } from "@/shared/components/ui/phone-input-br";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { calcularValorInscricao, TIPOS_QUARTO, type TipoQuarto } from "@convex/retiro/calculoHelpers";
import { brl, LABEL_QUARTO } from "../lib/format";
import { inscricaoEditSchema, type InscricaoEditValues } from "../lib/validations";
import { formToEditArgs, formToHospedagem, inscricaoToForm } from "../lib/mappers";

// Shape do getInscricao (sem precosSnapshot/ipHash/lgpd) — so o que o form usa.
type Inscricao = Pick<
  Doc<"inscricoesRetiro">,
  | "_id"
  | "responsavel"
  | "participantes"
  | "hospedagem"
  | "extras"
  | "pagamentoPreferido"
  | "valorTabela"
>;

const ALTURA = "h-11 md:h-9";

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-3">
      <p className="mb-2 text-sm font-semibold">{titulo}</p>
      {children}
    </section>
  );
}

// Stepper numerico compacto (mobile: alvos de 44px).
function CampoNumero({
  id,
  label,
  value,
  onChange,
  max = 20,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Diminuir ${label}`}
        >
          –
        </Button>
        <Input
          id={id}
          inputMode="numeric"
          className="h-9 w-14 text-center"
          value={String(value)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ""));
            onChange(Number.isFinite(n) ? Math.min(max, n) : 0);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Aumentar ${label}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function InscricaoEditForm({
  inscricao,
  onCancelar,
  onSalvo,
}: {
  inscricao: Inscricao;
  onCancelar: () => void;
  onSalvo: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  // @ts-ignore Convex TS2589
  const editar = useMutation(api.retiro.mutations.editarInscricao);
  // Snapshot de precos + datas: so carregado no modo edicao (o getInscricao
  // do drawer nao traz o snapshot, p/ nao pagar egress a cada acao).
  // @ts-ignore Convex TS2589
  const contexto = useQuery(api.retiro.queries.getInscricaoParaEdicao, {
    id: inscricao._id as Id<"inscricoesRetiro">,
  });

  const form = useForm<InscricaoEditValues>({
    resolver: zodResolver(inscricaoEditSchema) as never,
    defaultValues: inscricaoToForm(inscricao),
    mode: "onSubmit",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participantes",
  });
  const errs = form.formState.errors;
  const valores = form.watch();

  // Nome do membro vinculado, por indice (o form nao carrega membroNome; o
  // backend o preserva ao salvar).
  const membroNomePorIndice = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of inscricao.participantes) {
      if (p.membroId && p.membroNome) m.set(p.membroId, p.membroNome);
    }
    return m;
  }, [inscricao.participantes]);

  // Resumo do valor ao vivo — mesma aritmetica do backend, com o SNAPSHOT da
  // inscricao (preco combinado na epoca), nao a tabela vigente.
  const resumo = useMemo(() => {
    if (!contexto) return null;
    const parts = (valores.participantes ?? []).filter(
      (p) => p?.nome?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(p.dataNascimento ?? ""),
    );
    const hosp = formToHospedagem({
      quartosIndividual: valores.quartosIndividual ?? 0,
      quartosDuplo: valores.quartosDuplo ?? 0,
      quartosTriplo: valores.quartosTriplo ?? 0,
      quartosQuadruplo: valores.quartosQuadruplo ?? 0,
      camasExtras: valores.camasExtras ?? 0,
      pets: valores.pets ?? 0,
    });
    const totalQ =
      hosp.quartos.individual + hosp.quartos.duplo + hosp.quartos.triplo + hosp.quartos.quadruplo;
    if (parts.length === 0 || totalQ === 0) return null;
    return calcularValorInscricao(
      parts.map((p) => ({
        nome: p.nome,
        dataNascimento: p.dataNascimento,
        participaPalestras: p.participaPalestras,
      })),
      hosp,
      contexto.precosSnapshot,
      contexto.dataInicio,
      contexto.dataFim,
    );
  }, [valores, contexto]);

  // So os tipos de quarto com preco no snapshot (a igreja nem sempre oferece
  // os 4 tipos).
  const tiposOferecidos: TipoQuarto[] = contexto
    ? TIPOS_QUARTO.filter((t) => contexto.precosSnapshot.quartos[t] > 0)
    : [];

  const campoQuarto: Record<TipoQuarto, keyof InscricaoEditValues> = {
    individual: "quartosIndividual",
    duplo: "quartosDuplo",
    triplo: "quartosTriplo",
    quadruplo: "quartosQuadruplo",
  };

  async function onSubmit(data: InscricaoEditValues) {
    setSalvando(true);
    try {
      const r = await editar({
        id: inscricao._id as Id<"inscricoesRetiro">,
        ...formToEditArgs(data),
      });
      toast.success(`Inscrição atualizada — valor de tabela ${brl(r.valorTabela)}`);
      if (r.ocupantesRemovidos > 0) {
        toast.warning(
          `${r.ocupantesRemovidos} participante(s) saíram do quadro de quartos — revise a alocação`,
        );
      }
      onSalvo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (!contexto) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Secao titulo="Responsável">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="resp-nome" className="text-xs text-muted-foreground">
              Nome
            </Label>
            <Input id="resp-nome" className={ALTURA} {...form.register("responsavelNome")} />
            <Erro msg={errs.responsavelNome?.message} />
          </div>
          <div>
            <Label htmlFor="resp-zap" className="text-xs text-muted-foreground">
              WhatsApp
            </Label>
            <Controller
              control={form.control}
              name="responsavelWhatsapp"
              render={({ field }) => (
                <PhoneInputBR
                  id="resp-zap"
                  className={ALTURA}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Erro msg={errs.responsavelWhatsapp?.message} />
          </div>
        </div>
      </Secao>

      <Secao titulo="Participantes">
        <div className="space-y-3">
          {fields.map((f, i) => {
            const membroId = valores.participantes?.[i]?.membroId;
            const membroNome = membroId ? membroNomePorIndice.get(membroId) : undefined;
            return (
              <div key={f.id} className="rounded-md border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`p-nome-${i}`} className="text-xs text-muted-foreground">
                      Nome
                    </Label>
                    <Input
                      id={`p-nome-${i}`}
                      className={ALTURA}
                      {...form.register(`participantes.${i}.nome`)}
                    />
                    <Erro msg={errs.participantes?.[i]?.nome?.message} />
                  </div>
                  <div>
                    <Label htmlFor={`p-nasc-${i}`} className="text-xs text-muted-foreground">
                      Nascimento
                    </Label>
                    <Controller
                      control={form.control}
                      name={`participantes.${i}.dataNascimento`}
                      render={({ field }) => (
                        <DateInputBR
                          id={`p-nasc-${i}`}
                          className={ALTURA}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <Erro msg={errs.participantes?.[i]?.dataNascimento?.message} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex min-h-[44px] items-center gap-2 text-sm md:min-h-0">
                    <Controller
                      control={form.control}
                      name={`participantes.${i}.participaPalestras`}
                      render={({ field }) => (
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    Participa das palestras
                  </label>
                  <div className="flex items-center gap-2">
                    {membroNome && <Badge variant="outline">Membro: {membroNome}</Badge>}
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-10 text-destructive md:h-8"
                        onClick={() => remove(i)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <Erro msg={errs.participantes?.message} />
          {fields.length < 10 && (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full md:h-9"
              onClick={() =>
                append({ nome: "", dataNascimento: "", participaPalestras: true, membroId: undefined })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar participante
            </Button>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Trocar ou remover participante tira essa pessoa do quadro de quartos — realoque
            depois de salvar.
          </p>
        </div>
      </Secao>

      <Secao titulo="Hospedagem">
        <div className="space-y-2">
          {tiposOferecidos.map((t) => (
            <Controller
              key={t}
              control={form.control}
              name={campoQuarto[t] as "quartosDuplo"}
              render={({ field }) => (
                <CampoNumero
                  id={`q-${t}`}
                  label={`${LABEL_QUARTO[t]} (${brl(contexto.precosSnapshot.quartos[t])})`}
                  value={Number(field.value ?? 0)}
                  onChange={field.onChange}
                />
              )}
            />
          ))}
          <Erro msg={errs.quartosDuplo?.message} />
          <Controller
            control={form.control}
            name="camasExtras"
            render={({ field }) => (
              <CampoNumero
                id="camas-extras"
                label="Camas extras"
                value={Number(field.value ?? 0)}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="pets"
            render={({ field }) => (
              <CampoNumero
                id="pets"
                label="Pets"
                value={Number(field.value ?? 0)}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </Secao>

      <Secao titulo="Preferências">
        <div className="space-y-3">
          <div>
            <Label htmlFor="colega" className="text-xs text-muted-foreground">
              Dividir quarto com
            </Label>
            <Input id="colega" className={ALTURA} {...form.register("colegaDeQuarto")} />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm md:min-h-0">
            <Controller
              control={form.control}
              name="berco"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            Precisa de berço
          </label>
          <div>
            <Label htmlFor="necessidades" className="text-xs text-muted-foreground">
              Necessidades especiais
            </Label>
            <Textarea id="necessidades" rows={2} {...form.register("necessidadesEspeciais")} />
          </div>
          <div>
            <Label htmlFor="obs" className="text-xs text-muted-foreground">
              Observação
            </Label>
            <Textarea id="obs" rows={2} {...form.register("observacao")} />
          </div>
        </div>
      </Secao>

      <Secao titulo="Pagamento">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Forma</Label>
            <Controller
              control={form.control}
              name="forma"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={ALTURA}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_VISTA">À vista</SelectItem>
                    <SelectItem value="PARCELADO">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {valores.forma === "PARCELADO" && (
            <div>
              <Label className="text-xs text-muted-foreground">Parcelas</Label>
              <Controller
                control={form.control}
                name="parcelas"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className={ALTURA}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, k) => k + 2).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}×
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Erro msg={errs.parcelas?.message} />
            </div>
          )}
          <div>
            <Label htmlFor="cpf" className="text-xs text-muted-foreground">
              CPF do pagante
            </Label>
            <Input id="cpf" inputMode="numeric" className={ALTURA} {...form.register("cpfPagante")} />
            <Erro msg={errs.cpfPagante?.message} />
          </div>
        </div>
      </Secao>

      <Secao titulo="Motivo da alteração (opcional)">
        <Textarea
          rows={2}
          placeholder="Ex: conversou com a secretaria e trocou para quarto triplo"
          {...form.register("motivo")}
        />
      </Secao>

      {/* Resumo: valor de tabela atual -> novo (com o snapshot da inscricao) */}
      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Valor de tabela</span>
          <span>
            {brl(inscricao.valorTabela)}
            {resumo && resumo.total !== inscricao.valorTabela && (
              <>
                {" → "}
                <strong>{brl(resumo.total)}</strong>
              </>
            )}
          </span>
        </div>
        {resumo && (
          <>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Quartos {brl(resumo.quartos)} · palestras {brl(resumo.palestras)}</span>
              <span>capacidade {resumo.capacidade}</span>
            </div>
            {resumo.estimativaHotel > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Estimativa paga ao hotel (fora da inscrição): {brl(resumo.estimativaHotel)}
              </p>
            )}
          </>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Calculado com a tabela combinada na inscrição. Para usar os preços atuais, use
          &quot;Recalcular valor&quot;.
        </p>
      </div>

      <div className="flex gap-2 pb-2">
        <Button type="submit" className="h-11 flex-1 md:h-9" disabled={salvando}>
          {salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          onClick={onCancelar}
          disabled={salvando}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
