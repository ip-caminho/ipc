"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@shared/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
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
import { MessageCircle, Link2, Link2Off, ArrowUp, Ban, RefreshCcw, Copy, Check, Pencil } from "lucide-react";
import { brl, dataBR } from "../lib/format";
import { idadeNaData } from "@convex/retiro/calculoHelpers";
import { FinanceiroSection } from "./FinanceiroSection";
import { InscricaoEditForm } from "./InscricaoEditForm";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ATIVA: { label: "Ativa", variant: "default" },
  LISTA_ESPERA: { label: "Lista de espera", variant: "secondary" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
};

// Popover de matching: sugestoes por nome + confirmacao manual.
function VincularMembro({
  inscricaoId,
  participanteIndex,
  nome,
}: {
  inscricaoId: Id<"inscricoesRetiro">;
  participanteIndex: number;
  nome: string;
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState(nome);
  // @ts-ignore Convex TS2589
  const sugestoes = useQuery(
    api.retiro.queries.sugerirMembros,
    open ? { nome: busca } : "skip",
  );
  const confirmar = useMutation(api.retiro.mutations.confirmarMatching);

  async function vincular(membroId: string) {
    try {
      await confirmar({
        inscricaoId,
        participanteIndex,
        membroId: membroId as Id<"membros">,
      });
      toast.success("Participante vinculado ao membro");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao vincular");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Link2 className="mr-1 h-3.5 w-3.5" /> Vincular
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar membro…"
        />
        {sugestoes === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : sugestoes.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Nenhum membro parecido. É visitante?
          </p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {sugestoes.map((s) => (
              <button
                key={s.membroId}
                type="button"
                onClick={() => vincular(s.membroId)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent min-h-[44px]"
              >
                <span className="truncate">{s.nome}</span>
                {s.dataNascimento && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {dataBR(s.dataNascimento)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Copia o link individual de envio de comprovante — a secretaria manda no
// WhatsApp p/ quem fechou a pagina de inscricao (membro ou visitante).
function CopiarLinkComprovante({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const url = `${baseUrl}/comprovante/${token}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          toast.success("Link do comprovante copiado");
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
      className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      Link do comprovante
    </button>
  );
}

export function InscricaoDetalheDrawer({
  inscricaoId,
  dataInicio,
  onOpenChange,
}: {
  inscricaoId: Id<"inscricoesRetiro"> | null;
  dataInicio: string;
  onOpenChange: (open: boolean) => void;
}) {
  // @ts-ignore Convex TS2589
  const insc = useQuery(
    api.retiro.queries.getInscricao,
    inscricaoId ? { id: inscricaoId } : "skip",
  );
  const confirmar = useMutation(api.retiro.mutations.confirmarMatching);
  const cancelar = useMutation(api.retiro.mutations.cancelarInscricao);
  const promover = useMutation(api.retiro.mutations.promoverListaEspera);
  const recalcular = useMutation(api.retiro.mutations.recalcularValor);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState("");
  // Edicao inline no proprio drawer (evita overlay aninhado no mobile)
  const [modo, setModo] = useState<"ver" | "editar">("ver");

  async function acao(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  const zap = insc?.responsavel.whatsapp.replace(/\D/g, "");

  return (
    <Drawer
      open={inscricaoId !== null}
      onOpenChange={(open) => {
        if (!open) setModo("ver");
        onOpenChange(open);
      }}
    >
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl overflow-y-auto px-4 pb-8">
          {!insc ? (
            <div className="py-8">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              <DrawerHeader className="px-0">
                <DrawerTitle className="flex flex-wrap items-center gap-2">
                  {insc.responsavel.nome}
                  <Badge variant={STATUS_LABEL[insc.status].variant}>
                    {STATUS_LABEL[insc.status].label}
                  </Badge>
                </DrawerTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {insc.responsavel.whatsapp}
                  {zap && (
                    <a
                      href={`https://wa.me/${zap}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                  {insc.comprovanteToken && insc.status !== "CANCELADA" && (
                    <CopiarLinkComprovante token={insc.comprovanteToken} />
                  )}
                </div>
              </DrawerHeader>

              {modo === "editar" ? (
                <InscricaoEditForm
                  inscricao={insc}
                  onCancelar={() => setModo("ver")}
                  onSalvo={() => setModo("ver")}
                />
              ) : (
                <>

                {/* Financeiro (gestao completa na fase 4) */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Tabela", brl(insc.valorTabela)],
                    ["Final", brl(insc.valorFinal)],
                    ["Recebido", brl(insc.recebido)],
                    ["Saldo", brl(insc.saldo)],
                  ].map(([label, valor]) => (
                    <div key={label} className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold tabular-nums">{valor}</p>
                    </div>
                  ))}
                </div>

                {/* Participantes + matching */}
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold">Participantes</p>
                  {insc.participantes.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {dataBR(p.dataNascimento)} · {idadeNaData(p.dataNascimento, dataInicio)}{" "}
                          anos{p.participaPalestras ? " · palestras" : ""}
                        </p>
                        {p.membroNome && (
                          <Badge variant="outline" className="mt-1">
                            Membro: {p.membroNome}
                          </Badge>
                        )}
                      </div>
                      <div className="shrink-0">
                        {p.membroId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-muted-foreground"
                            onClick={() =>
                              acao(
                                () =>
                                  confirmar({
                                    inscricaoId: insc._id,
                                    participanteIndex: i,
                                    membroId: null,
                                  }),
                                "Vínculo removido",
                              )
                            }
                          >
                            <Link2Off className="mr-1 h-3.5 w-3.5" /> Desvincular
                          </Button>
                        ) : (
                          <VincularMembro
                            inscricaoId={insc._id}
                            participanteIndex={i}
                            nome={p.nome}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divergencias de cadastro: o membro informou na inscricao um
                    valor diferente do cadastro atual. Nao alteramos automatico —
                    a secretaria decide atualizar pelo cadastro do membro. */}
                {insc.divergenciasCadastro && insc.divergenciasCadastro.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Divergências de cadastro
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
                      Informado na inscrição, diferente do cadastro. Revise e atualize
                      pelo cadastro do membro se for o caso.
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-100">
                      {insc.divergenciasCadastro.map(
                        (
                          d: {
                            membroNome: string;
                            campo: "whatsapp" | "dataNascimento";
                            valorCadastro: string;
                            valorInformado: string;
                          },
                          i: number,
                        ) => {
                          const fmt = (v: string) =>
                            d.campo === "dataNascimento" ? dataBR(v) : v;
                          const label = d.campo === "whatsapp" ? "WhatsApp" : "Nascimento";
                          return (
                            <li key={i}>
                              <span className="font-medium">{d.membroNome}</span> · {label}:{" "}
                              <span className="line-through opacity-70">{fmt(d.valorCadastro)}</span>{" "}
                              → <span className="font-semibold">{fmt(d.valorInformado)}</span>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </div>
                )}

                {/* Hospedagem + extras (leitura — botao "Editar inscricao" abre o form) */}
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="font-semibold">Hospedagem</p>
                    <p className="mt-1 text-muted-foreground">
                      {[
                        insc.hospedagem.quartos.individual && `${insc.hospedagem.quartos.individual} individual`,
                        insc.hospedagem.quartos.duplo && `${insc.hospedagem.quartos.duplo} duplo`,
                        insc.hospedagem.quartos.triplo && `${insc.hospedagem.quartos.triplo} triplo`,
                        insc.hospedagem.quartos.quadruplo && `${insc.hospedagem.quartos.quadruplo} quádruplo`,
                        insc.hospedagem.camasExtras > 0 && `${insc.hospedagem.camasExtras} cama(s) extra`,
                        insc.hospedagem.pets > 0 && `${insc.hospedagem.pets} pet(s)`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sem quarto"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Pagamento pedido:{" "}
                      {insc.pagamentoPreferido.forma === "A_VISTA"
                        ? "à vista"
                        : `${insc.pagamentoPreferido.parcelas ?? "?"}×`}
                    </p>
                  </div>
                  {(insc.extras?.colegaDeQuarto ||
                    insc.extras?.berco ||
                    insc.extras?.necessidadesEspeciais ||
                    insc.extras?.observacao) && (
                    <div className="rounded-lg border p-3">
                      <p className="font-semibold">Preferências</p>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {insc.extras?.colegaDeQuarto && <li>Dividir com: {insc.extras.colegaDeQuarto}</li>}
                        {insc.extras?.berco && <li>Precisa de berço</li>}
                        {insc.extras?.necessidadesEspeciais && (
                          <li>Necessidades: {insc.extras.necessidadesEspeciais}</li>
                        )}
                        {insc.extras?.observacao && <li>Obs: {insc.extras.observacao}</li>}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Financeiro: recebimentos, descontos/fundo e plano */}
                <FinanceiroSection
                  inscricaoId={insc._id}
                  retiroId={insc.retiroId}
                  saldo={insc.saldo}
                  recebimentos={insc.recebimentos}
                  ajustes={insc.ajustes}
                  planoPagamento={insc.planoPagamento}
                  comprovantesPendentes={insc.comprovantesPendentes}
                  cancelada={insc.status === "CANCELADA"}
                />

                {insc.observacaoCancelamento && (
                  <p className="mt-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    Cancelamento: {insc.observacaoCancelamento}
                  </p>
                )}

                {/* Acoes */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {insc.status === "LISTA_ESPERA" && (
                    <Button
                      className="h-11 md:h-9"
                      onClick={() =>
                        acao(() => promover({ id: insc._id }), "Promovida — quartos reservados")
                      }
                    >
                      <ArrowUp className="mr-1 h-4 w-4" /> Promover para ativa
                    </Button>
                  )}
                  {insc.status !== "CANCELADA" && (
                    <Button
                      variant="outline"
                      className="h-11 md:h-9"
                      onClick={() => setModo("editar")}
                    >
                      <Pencil className="mr-1 h-4 w-4" /> Editar inscrição
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 md:h-9"
                    onClick={() =>
                      acao(() => recalcular({ id: insc._id }), "Valor recalculado com a tabela atual")
                    }
                  >
                    <RefreshCcw className="mr-1 h-4 w-4" /> Recalcular valor
                  </Button>
                  {insc.status !== "CANCELADA" && (
                    <Button
                      variant="ghost"
                      className="h-11 md:h-9 text-destructive"
                      onClick={() => setCancelarOpen(true)}
                    >
                      <Ban className="mr-1 h-4 w-4" /> Cancelar inscrição
                    </Button>
                  )}
                </div>

                <AlertDialog open={cancelarOpen} onOpenChange={setCancelarOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar esta inscrição?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Os quartos voltam ao estoque. Registre a devolução (se houver) abaixo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      value={motivoCancel}
                      onChange={(e) => setMotivoCancel(e.target.value)}
                      placeholder="Motivo / devolução combinada (opcional)"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          acao(
                            () => cancelar({ id: insc._id, observacao: motivoCancel || undefined }),
                            "Inscrição cancelada",
                          )
                        }
                      >
                        Cancelar inscrição
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
