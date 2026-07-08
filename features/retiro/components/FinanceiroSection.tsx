"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { DatePickerBR } from "@/shared/components/ui/date-picker-br";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FileUpload } from "@shared/files/components/FileUpload";
import { Plus, Trash2, PiggyBank, Receipt, BadgePercent, FileCheck2, ExternalLink } from "lucide-react";
import { brl, parseReais, dataBR } from "../lib/format";

type Recebimento = {
  valor: number;
  data: string;
  comprovanteUrl?: string;
  obs?: string;
};
type Ajuste = { tipo: "DESCONTO" | "CONTRIBUICAO_FUNDO"; valor: number; motivo?: string };
type PlanoItem = { data: string; valor: number };
type ComprovantePendente = {
  comprovanteUrl: string;
  valorInformado?: number;
  obs?: string;
  enviadoEm: number;
};

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FinanceiroSection({
  inscricaoId,
  retiroId,
  saldo,
  recebimentos,
  ajustes,
  planoPagamento,
  comprovantesPendentes,
  cancelada,
}: {
  inscricaoId: Id<"inscricoesRetiro">;
  retiroId: Id<"retiros">;
  saldo: number;
  recebimentos: Recebimento[];
  ajustes: Ajuste[];
  planoPagamento: PlanoItem[];
  comprovantesPendentes?: ComprovantePendente[];
  cancelada: boolean;
}) {
  const registrar = useMutation(api.retiro.mutations.registrarRecebimento);
  const removerReceb = useMutation(api.retiro.mutations.removerRecebimento);
  const conceder = useMutation(api.retiro.mutations.concederDesconto);
  const destinarSobra = useMutation(api.retiro.mutations.destinarSobraAoFundo);
  const removerAjuste = useMutation(api.retiro.mutations.removerAjuste);
  const salvarPlano = useMutation(api.retiro.mutations.editarPlanoPagamento);
  const removerComprovante = useMutation(api.retiro.mutations.removerComprovantePendente);

  const [recebOpen, setRecebOpen] = useState(false);
  const [descontoOpen, setDescontoOpen] = useState(false);
  const [planoOpen, setPlanoOpen] = useState(false);
  // Indice do comprovante pendente sendo confirmado (some da lista ao registrar)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const pendentes = comprovantesPendentes ?? [];

  // Dialog de recebimento
  const [rValor, setRValor] = useState("");
  const [rData, setRData] = useState(hojeIso());
  const [rObs, setRObs] = useState("");
  const [rComprovante, setRComprovante] = useState<string | undefined>(undefined);

  // Dialog de desconto (mostra o fundo disponivel)
  const [dValor, setDValor] = useState("");
  const [dMotivo, setDMotivo] = useState("");
  // @ts-ignore Convex TS2589
  const resumoEvento = useQuery(
    api.retiro.queries.resumoFinanceiro,
    descontoOpen ? { id: retiroId } : "skip",
  );

  // Plano editavel (estado local; salva de uma vez)
  const [planoDraft, setPlanoDraft] = useState<{ data: string; valor: string }[]>([]);

  async function acao(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      return false;
    }
  }

  // Abre o dialog de recebimento pre-preenchido a partir de um comprovante
  // enviado pelo pagante; ao registrar, o comprovante sai da lista "a conferir".
  function conferirComprovante(i: number) {
    const c = pendentes[i];
    if (!c) return;
    setRValor(c.valorInformado ? (c.valorInformado / 100).toFixed(2).replace(".", ",") : "");
    setRData(hojeIso());
    setRObs(c.obs ?? "");
    setRComprovante(c.comprovanteUrl);
    setPendingIndex(i);
    setRecebOpen(true);
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Sobra destacada */}
      {saldo < 0 && !cancelada && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm">
            Sobra de <strong>{brl(-saldo)}</strong> paga além do valor.
          </p>
          <Button
            size="sm"
            className="h-9"
            onClick={() =>
              acao(() => destinarSobra({ id: inscricaoId }), "Sobra destinada ao fundo solidário")
            }
          >
            <PiggyBank className="mr-1 h-4 w-4" /> Destinar ao fundo
          </Button>
        </div>
      )}

      {/* Comprovantes enviados pelo pagante — a conferir */}
      {pendentes.length > 0 && !cancelada && (
        <div className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <FileCheck2 className="h-4 w-4" /> Comprovantes a conferir ({pendentes.length})
          </p>
          <ul className="space-y-1">
            {pendentes.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <a
                    href={c.comprovanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ver comprovante
                  </a>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.valorInformado ? `informado ${brl(c.valorInformado)} · ` : ""}
                    {dataBR(new Date(c.enviadoEm).toISOString().slice(0, 10))}
                  </span>
                  {c.obs && <p className="truncate text-xs text-muted-foreground">{c.obs}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => conferirComprovante(i)}
                  >
                    Registrar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="Descartar comprovante"
                    onClick={() =>
                      acao(
                        () => removerComprovante({ id: inscricaoId, index: i }),
                        "Comprovante descartado",
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recebimentos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Recebimentos</p>
          {!cancelada && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setPendingIndex(null);
                setRecebOpen(true);
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Registrar
            </Button>
          )}
        </div>
        {recebimentos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum recebimento ainda.</p>
        ) : (
          <ul className="space-y-1">
            {recebimentos.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium tabular-nums">{brl(r.valor)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{dataBR(r.data)}</span>
                  {r.obs && <span className="ml-2 truncate text-xs text-muted-foreground">{r.obs}</span>}
                  {r.comprovanteUrl && (
                    <a
                      href={r.comprovanteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs underline underline-offset-2"
                    >
                      comprovante
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="Remover recebimento"
                  onClick={() =>
                    acao(() => removerReceb({ id: inscricaoId, index: i }), "Recebimento removido")
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ajustes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Descontos e fundo</p>
          {!cancelada && (
            <Button variant="outline" size="sm" className="h-9" onClick={() => setDescontoOpen(true)}>
              <BadgePercent className="mr-1 h-3.5 w-3.5" /> Conceder desconto
            </Button>
          )}
        </div>
        {ajustes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum ajuste.</p>
        ) : (
          <ul className="space-y-1">
            {ajustes.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium tabular-nums">
                    {a.tipo === "DESCONTO" ? "−" : "+"}
                    {brl(a.valor)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {a.tipo === "DESCONTO" ? "desconto" : "contribuição ao fundo"}
                    {a.motivo ? ` · ${a.motivo}` : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="Remover ajuste"
                  onClick={() =>
                    acao(() => removerAjuste({ id: inscricaoId, index: i }), "Ajuste removido")
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Plano de pagamento (previsao) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Plano combinado (previsão)</p>
          {!cancelada && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setPlanoDraft(
                  planoPagamento.length > 0
                    ? planoPagamento.map((p) => ({ data: p.data, valor: (p.valor / 100).toFixed(2).replace(".", ",") }))
                    : [{ data: "", valor: "" }],
                );
                setPlanoOpen(true);
              }}
            >
              <Receipt className="mr-1 h-3.5 w-3.5" /> Editar
            </Button>
          )}
        </div>
        {planoPagamento.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sem plano registrado — combinado caso a caso com a secretaria.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {planoPagamento.map((p) => `${dataBR(p.data)}: ${brl(p.valor)}`).join(" · ")}
          </p>
        )}
      </div>

      {/* Dialog: registrar recebimento */}
      <Dialog open={recebOpen} onOpenChange={setRecebOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rec-valor">Valor (R$)</Label>
                <Input
                  id="rec-valor"
                  inputMode="decimal"
                  value={rValor}
                  onChange={(e) => setRValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-data">Data</Label>
                <DatePickerBR id="rec-data" value={rData} onChange={setRData} max={hojeIso()} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-obs">Observação (opcional)</Label>
              <Input
                id="rec-obs"
                value={rObs}
                onChange={(e) => setRObs(e.target.value)}
                placeholder="Pix, dinheiro, 2ª parcela…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comprovante (opcional)</Label>
              <FileUpload
                folder="retiro-comprovantes"
                entityId={inscricaoId}
                accept="image/*,.pdf"
                maxSizeMB={10}
                value={rComprovante}
                onChange={setRComprovante}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRecebOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const ok = await acao(
                    () =>
                      registrar({
                        id: inscricaoId,
                        valor: parseReais(rValor),
                        data: rData,
                        comprovanteUrl: rComprovante,
                        obs: rObs || undefined,
                      }),
                    "Recebimento registrado",
                  );
                  if (ok) {
                    // Veio de um comprovante "a conferir"? Tira da lista.
                    if (pendingIndex !== null) {
                      await removerComprovante({ id: inscricaoId, index: pendingIndex });
                    }
                    setRecebOpen(false);
                    setPendingIndex(null);
                    setRValor("");
                    setRObs("");
                    setRComprovante(undefined);
                    setRData(hojeIso());
                  }
                }}
              >
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: conceder desconto */}
      <Dialog open={descontoOpen} onOpenChange={setDescontoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder desconto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {resumoEvento && (
              <p
                className={`rounded-md p-3 text-sm ${
                  resumoEvento.fundo - parseReais(dValor) < 0
                    ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Fundo solidário disponível: <strong>{brl(resumoEvento.fundo)}</strong>
                {parseReais(dValor) > 0 && (
                  <> → após este desconto: <strong>{brl(resumoEvento.fundo - parseReais(dValor))}</strong></>
                )}
                {resumoEvento.fundo - parseReais(dValor) < 0 && " (o fundo ficará negativo)"}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="desc-valor">Valor do desconto (R$)</Label>
              <Input
                id="desc-valor"
                inputMode="decimal"
                value={dValor}
                onChange={(e) => setDValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc-motivo">Motivo</Label>
              <Input
                id="desc-motivo"
                value={dMotivo}
                onChange={(e) => setDMotivo(e.target.value)}
                placeholder="Registrado na auditoria"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDescontoOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const ok = await acao(
                    () =>
                      conceder({ id: inscricaoId, valor: parseReais(dValor), motivo: dMotivo }),
                    "Desconto concedido",
                  );
                  if (ok) {
                    setDescontoOpen(false);
                    setDValor("");
                    setDMotivo("");
                  }
                }}
              >
                Conceder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: plano de pagamento */}
      <Dialog open={planoOpen} onOpenChange={setPlanoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plano de pagamento (previsão)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Acordo combinado com a família — datas e valores livres. Não trava recebimentos.
            </p>
            {planoDraft.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <DatePickerBR
                  id={`plano-data-${i}`}
                  value={p.data}
                  onChange={(v) =>
                    setPlanoDraft((d) => d.map((x, j) => (j === i ? { ...x, data: v } : x)))
                  }
                />
                <Input
                  inputMode="decimal"
                  aria-label={`Valor da parcela ${i + 1}`}
                  value={p.valor}
                  onChange={(e) =>
                    setPlanoDraft((d) => d.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))
                  }
                  placeholder="R$"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Remover parcela"
                  onClick={() => setPlanoDraft((d) => d.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanoDraft((d) => [...d, { data: "", valor: "" }])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Parcela
            </Button>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanoOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const plano = planoDraft
                    .filter((p) => p.data && p.valor)
                    .map((p) => ({ data: p.data, valor: parseReais(p.valor) }));
                  const ok = await acao(
                    () => salvarPlano({ id: inscricaoId, plano }),
                    "Plano salvo",
                  );
                  if (ok) setPlanoOpen(false);
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
