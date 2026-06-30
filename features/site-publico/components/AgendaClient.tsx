"use client";

import { useQueryState } from "nuqs";
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
    <div style={{ marginTop: "var(--space-8)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {FILTROS.map((f) => {
          const ativo = (tipo ?? "") === f.value;
          return (
            <button
              key={f.value || "todos"}
              type="button"
              aria-pressed={ativo}
              onClick={() => setTipo(f.value || null)}
              className={`btn ${ativo ? "btn-primary" : "btn-outline"}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "var(--space-8)" }}>
        {filtrados.length === 0 ? (
          <p className="empty" style={{ marginTop: 0 }}>
            Nenhum evento programado.
          </p>
        ) : (
          filtrados.map((e) => <EventoLinha key={e.id} evento={e} />)
        )}
      </div>
    </div>
  );
}
