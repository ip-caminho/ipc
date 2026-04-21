"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cake, MessageCircle } from "lucide-react";

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
  whatsapp?: string;
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

interface RelativeLabel {
  text: string;
  isToday: boolean;
}

function relativeLabel(p: Person): RelativeLabel {
  if (p.jaPassou) {
    return { text: `dia ${p.dia}`, isToday: false };
  }
  const days = daysUntil(p.dia, p.mes);
  if (days === 0) return { text: "hoje", isToday: true };
  if (days === 1) return { text: "amanhã", isToday: false };
  return { text: `em ${days} dias`, isToday: false };
}

function whatsappUrl(whatsapp?: string): string | null {
  const phone = whatsapp?.replace(/\D/g, "");
  if (!phone) return null;
  return `https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}`;
}

function BirthdayAvatar({
  p,
  neutral,
  highlight,
  size = "sm",
}: {
  p: Person;
  neutral?: boolean;
  highlight?: boolean;
  size?: "sm" | "lg";
}) {
  const initial = p.primeiroNome.charAt(0).toUpperCase() || "?";
  const sizeClass = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";
  const ring = highlight
    ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
    : "";
  if (p.foto) {
    const px = size === "lg" ? 80 : 44;
    return (
      <Image
        src={p.foto}
        alt={p.nome}
        width={px}
        height={px}
        sizes={size === "lg" ? "80px" : "44px"}
        className={cn(sizeClass, "rounded-full object-cover", ring)}
        unoptimized={!p.foto.startsWith("https://cdn.yhc.com.br")}
      />
    );
  }
  return (
    <div
      aria-label={p.nome}
      className={cn(
        sizeClass,
        "rounded-full flex items-center justify-center font-medium",
        neutral
          ? "bg-secondary text-secondary-foreground"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        ring,
      )}
    >
      {initial}
    </div>
  );
}

function BirthdayDetail({ p }: { p: Person }) {
  const { text, isToday } = relativeLabel(p);
  const dataFormatada = format(
    new Date(2000, p.mes - 1, p.dia),
    "d 'de' MMMM",
    { locale: ptBR },
  );
  const whatsUrl = whatsappUrl(p.whatsapp);

  return (
    <div className="px-4 pb-6 pt-2 flex flex-col items-center gap-4 text-center">
      <BirthdayAvatar
        p={p}
        neutral={p.jaPassou}
        highlight={isToday}
        size="lg"
      />
      <div className="space-y-1">
        <p className="text-base font-medium">{p.nome}</p>
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Cake className="h-3.5 w-3.5" aria-hidden />
          {dataFormatada}
        </p>
        <p
          className={cn(
            "text-xs",
            isToday
              ? "text-blue-600 dark:text-blue-400 font-semibold"
              : "text-muted-foreground",
          )}
        >
          {p.jaPassou
            ? "comemorou este mês"
            : isToday
              ? "aniversário hoje!"
              : `aniversário ${text}`}
        </p>
      </div>
      {whatsUrl && (
        <a
          href={whatsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium min-h-11 active:opacity-90 transition-opacity"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Mandar mensagem
        </a>
      )}
    </div>
  );
}

export function BirthdayList() {
  const [mesDrawerOpen, setMesDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
          whatsapp: a.whatsapp,
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

  const selected = useMemo(
    () => aniversariantes.find((a) => a.id === selectedId) ?? null,
    [aniversariantes, selectedId],
  );

  if (!raw || aniversariantes.length === 0) return null;

  const total = aniversariantes.length;

  return (
    <section className="space-y-2">
      <SectionLabel
        action={
          <Drawer open={mesDrawerOpen} onOpenChange={setMesDrawerOpen}>
            <DrawerTrigger className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Ver {mesAtualLabel} ({total})
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="text-base">
                  Aniversariantes de {mesAtualLabel}
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

      <ul
        className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 pl-4 pr-6 pb-1 pt-1"
        style={{
          maskImage:
            "linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 0%, black calc(100% - 24px), transparent 100%)",
        }}
      >
        {aniversariantes.map((p) => {
          const { text, isToday } = relativeLabel(p);
          return (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(p.id)}
                aria-label={`Ver ${p.nome}`}
                className="flex flex-col items-center gap-1 w-[58px] active:opacity-80 transition-opacity"
              >
                <BirthdayAvatar
                  p={p}
                  neutral={p.jaPassou}
                  highlight={isToday}
                />
                <span className="text-[10px] font-medium leading-tight text-center line-clamp-1 max-w-full">
                  {p.primeiroNome}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    isToday
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {text}
                </span>
              </button>
            </li>
          );
        })}
        <li className="flex flex-col items-center gap-1 shrink-0 w-[58px]">
          <button
            type="button"
            onClick={() => setMesDrawerOpen(true)}
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

      <Drawer
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {selected ? `Aniversariante ${selected.nome}` : "Aniversariante"}
            </DrawerTitle>
          </DrawerHeader>
          {selected && <BirthdayDetail p={selected} />}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
