"use client";

import { useQueryState } from "nuqs";
import { cn } from "@/shared/lib/utils/cn";
import { EventoLinha } from "./EventoLinha";
import type { EventoPublico } from "@convex/public/agenda";

const FILTROS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos" },
  { value: "culto", label: "Cultos" },
  { value: "pg", label: "PGs" },
  { value: "evento", label: "Eventos" },
  { value: "reuniao", label: "Reuniões" },
];

// Lista a agenda com filtro por tipo. O tipo fica na URL (?tipo=culto) via nuqs;
// a filtragem é client-side sobre a lista já carregada (sem refetch ao Convex).
export function AgendaClient({ eventos }: { eventos: EventoPublico[] }) {
  const [tipo, setTipo] = useQueryState("tipo");
  const filtrados = tipo ? eventos.filter((e) => e.tipo === tipo) : eventos;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = (tipo ?? "") === f.value;
          return (
            <button
              key={f.value || "todos"}
              type="button"
              aria-pressed={ativo}
              onClick={() => setTipo(f.value || null)}
              className={cn(
                "h-10 border px-3.5 font-[family-name:var(--font-source-sans)] text-[13px] transition-colors",
                ativo
                  ? "border-[#1A1A1A] bg-[#1A1A1A] text-[#FAFAF7]"
                  : "border-[#E5E3DC] text-[#595959] hover:border-[#1A1A1A] hover:text-[#1A1A1A]",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {filtrados.length === 0 ? (
          <p className="py-12 text-center font-[family-name:var(--font-source-sans)] text-[14px] text-[#595959]">
            Nenhum evento programado.
          </p>
        ) : (
          filtrados.map((e) => <EventoLinha key={e.id} evento={e} />)
        )}
      </div>
    </div>
  );
}
