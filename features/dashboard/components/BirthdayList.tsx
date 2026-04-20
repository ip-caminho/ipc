"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/shared/lib/utils/cn";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { AniversariantesMesLista } from "./AniversariantesCard";
import { SectionLabel } from "./SectionLabel";

interface Person {
  id: string;
  nome: string;
  primeiroNome: string;
  foto?: string;
  dia: number;
  mes: number;
  jaPassou: boolean;
}

function daysUntil(dia: number, mes: number): number {
  const now = new Date();
  const thisYear = now.getFullYear();
  let birthday = new Date(thisYear, mes - 1, dia);
  if (birthday < new Date(thisYear, now.getMonth(), now.getDate())) {
    birthday = new Date(thisYear + 1, mes - 1, dia);
  }
  return Math.ceil((birthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function relativeLabel(p: Person): string {
  if (p.jaPassou) {
    return `dia ${String(p.dia).padStart(2, "0")}`;
  }
  const days = daysUntil(p.dia, p.mes);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

function BirthdayAvatar({ p, neutral }: { p: Person; neutral?: boolean }) {
  const initial = p.primeiroNome.charAt(0).toUpperCase() || "?";
  if (p.foto) {
    return (
      <img
        src={p.foto}
        alt={p.nome}
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      aria-label={p.nome}
      className={cn(
        "h-11 w-11 rounded-full flex items-center justify-center text-sm font-medium",
        neutral
          ? "bg-secondary text-secondary-foreground"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      )}
    >
      {initial}
    </div>
  );
}

export function BirthdayList() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // @ts-ignore Convex TS2589
  const raw = useQuery(api.membros.queries.birthdaysThisMonth, {});

  const mesAtualLabel = format(new Date(), "MMMM", { locale: ptBR });

  const aniversariantes: Person[] = useMemo(() => {
    if (!raw) return [];
    const mesAtual = new Date().getMonth() + 1;
    return (raw as any[])
      .filter((a) => a.mes === mesAtual)
      .map((a) => {
        const nome = (a.nome as string) || "?";
        return {
          id: a._id,
          nome,
          primeiroNome: nome.split(" ")[0] || nome,
          foto: a.foto,
          dia: a.dia,
          mes: a.mes,
          jaPassou: a.jaPassou,
        } satisfies Person;
      })
      .sort((a, b) => {
        const aKey = a.jaPassou ? 10_000 + a.dia : daysUntil(a.dia, a.mes);
        const bKey = b.jaPassou ? 10_000 + b.dia : daysUntil(b.dia, b.mes);
        return aKey - bKey;
      });
  }, [raw]);

  if (!raw || aniversariantes.length === 0) return null;

  const total = aniversariantes.length;

  return (
    <section className="space-y-2">
      <SectionLabel
        action={
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Ver <span className="capitalize">{mesAtualLabel}</span> ({total})
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="text-base">
                  Aniversariantes de{" "}
                  <span className="capitalize">{mesAtualLabel}</span>
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
                <AniversariantesMesLista />
              </div>
            </DrawerContent>
          </Drawer>
        }
      >
        Aniversariantes
      </SectionLabel>

      <ul className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
        {aniversariantes.map((p) => (
          <li
            key={p.id}
            className="flex flex-col items-center gap-1 shrink-0 w-[58px]"
          >
            <BirthdayAvatar p={p} neutral={p.jaPassou} />
            <span className="text-[10px] font-medium leading-tight text-center line-clamp-1 max-w-full">
              {p.primeiroNome}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">
              {relativeLabel(p)}
            </span>
          </li>
        ))}
        <li className="flex flex-col items-center gap-1 shrink-0 w-[58px]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`Ver todos os ${total} aniversariantes do mês`}
            className="h-11 w-11 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-semibold active:opacity-80 transition-opacity"
          >
            +{total}
          </button>
          <span className="text-[10px] font-medium leading-tight text-muted-foreground">
            ver mais
          </span>
        </li>
      </ul>
    </section>
  );
}
