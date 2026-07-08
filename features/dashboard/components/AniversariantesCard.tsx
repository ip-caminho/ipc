"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MessageCircle } from "lucide-react";

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-rose-500", "bg-pink-500", "bg-teal-500",
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

function formatDiaMes(dia: number, mes: number): string {
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

interface PersonData {
  id: string;
  nome: string;
  foto?: string;
  whatsapp?: string;
  dia: number;
  mes: number;
  jaPassou: boolean;
}

function AvatarCircle({ nome, foto, size = "md" }: { nome: string; foto?: string; size?: "sm" | "md" }) {
  const px = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  if (foto) {
    return <img src={foto} alt={nome} className={`${px} rounded-full object-cover ring-2 ring-white/50 shrink-0`} />;
  }
  return (
    <div className={`${px} rounded-full ${avatarColor(nome)} flex items-center justify-center ${textSize} font-bold text-white ring-2 ring-white/50 shrink-0`}>
      {nome.charAt(0).toUpperCase()}
    </div>
  );
}

function PersonRow({ p, showDays, showDate }: {
  p: PersonData;
  showDays?: boolean;
  showDate?: boolean;
}) {
  const phone = p.whatsapp?.replace(/\D/g, "");
  const whatsUrl = phone ? `https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}` : undefined;
  const Wrapper = whatsUrl ? "a" : "div";
  const days = daysUntil(p.dia, p.mes);

  return (
    <Wrapper
      {...(whatsUrl ? { href: whatsUrl, target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-3 rounded-lg px-2 py-2 pr-4 -mx-2 transition-colors cursor-pointer hover:bg-accent/50 min-h-[44px]"
    >
      <AvatarCircle nome={p.nome} foto={p.foto} />
      <span className="text-sm font-medium flex-1 truncate">{p.nome}</span>
      {showDays && days > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">em {days} dia{days !== 1 ? "s" : ""}</span>
      )}
      {showDate && (
        <span className="text-xs text-muted-foreground shrink-0">dia {formatDiaMes(p.dia, p.mes)}</span>
      )}
      {whatsUrl && <MessageCircle className="h-4 w-4 shrink-0 opacity-50" />}
    </Wrapper>
  );
}

/** Lista todos os aniversariantes do mês — para drawer */
export function AniversariantesMesLista() {
  // @ts-ignore Convex TS2589
  const raw = useQuery(api.membros.queries.birthdaysThisMonth, {});
  if (!raw || raw.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhum aniversariante este mês</p>;
  }

  const hoje = new Date().getDate();
  const mesAtual = new Date().getMonth() + 1;

  const aniversariantes: PersonData[] = raw
    .filter((a: any) => a.mes === mesAtual)
    .map((a: any) => ({
      id: a._id,
      nome: a.nome,
      foto: a.foto,
      whatsapp: a.whatsapp,
      dia: a.dia,
      mes: a.mes,
      jaPassou: a.jaPassou,
    }))
    .sort((a, b) => a.dia - b.dia);

  const passados = aniversariantes.filter((p) => p.dia < hoje);
  const hojeList = aniversariantes.filter((p) => p.dia === hoje);
  const futuros = aniversariantes.filter((p) => p.dia > hoje);

  return (
    <div className="flex flex-col">
      {passados.map((p) => (
        <div key={p.id} className="opacity-50">
          <PersonRow p={p} showDate />
        </div>
      ))}

      {hojeList.length > 0 && passados.length > 0 && (
        <div className="border-t border-dashed my-2" />
      )}

      {hojeList.map((p) => (
        <div key={p.id} className="bg-violet-50 dark:bg-violet-950/30 -mx-2 px-2 rounded-lg">
          <PersonRow p={p} showDate />
        </div>
      ))}

      {futuros.length > 0 && (passados.length > 0 || hojeList.length > 0) && (
        <div className="border-t border-dashed my-2" />
      )}

      {futuros.map((p) => (
        <PersonRow key={p.id} p={p} showDate />
      ))}
    </div>
  );
}
