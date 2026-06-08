"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { BarChart3 } from "lucide-react";

function dataHora(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function dispositivo(ua: string | null): string {
  if (!ua) return "—";
  let os = "";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let nav = "";
  if (/Edg\//i.test(ua)) nav = "Edge";
  else if (/Chrome\//i.test(ua)) nav = "Chrome";
  else if (/Firefox\//i.test(ua)) nav = "Firefox";
  else if (/Safari\//i.test(ua)) nav = "Safari";
  const txt = [os, nav].filter(Boolean).join(" · ");
  return txt || (/Mobile|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop");
}

function Metrica({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-xl font-semibold">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function RelatorioAcessosDialog() {
  const [open, setOpen] = useState(false);
  const rel = useQuery(api.convidado.relatorioAcessos, open ? {} : "skip");

  return (
    <>
      <Button size="sm" variant="outline" className="h-9" onClick={() => setOpen(true)}>
        <BarChart3 className="mr-1.5 h-4 w-4" />
        Acessos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Acessos do link de convidado</DialogTitle>
            <DialogDescription>Registro de aberturas do link público.</DialogDescription>
          </DialogHeader>

          {rel === undefined ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : rel === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem permissão.</p>
          ) : rel.total === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum acesso registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Metrica label="Acessos" valor={rel.total} />
                <Metrica label="IPs únicos" valor={rel.ipsUnicos} />
                <Metrica label="Último" valor={rel.ultimo ? dataHora(rel.ultimo).split(" ")[0] : "—"} />
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
                {rel.lista.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium">{dataHora(a.em)}</p>
                      <p className="text-muted-foreground">{dispositivo(a.userAgent)}</p>
                    </div>
                    <span className="shrink-0 font-mono text-muted-foreground">{a.ip ?? "—"}</span>
                  </div>
                ))}
              </div>
              {rel.total > rel.lista.length && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Mostrando os {rel.lista.length} mais recentes de {rel.total}.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
