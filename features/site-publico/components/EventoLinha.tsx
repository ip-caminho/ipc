import type { EventoPublico } from "@convex/public/agenda";

const TIPO_LABEL: Record<EventoPublico["tipo"], string> = {
  culto: "Culto",
  pg: "PG",
  evento: "Evento",
  reuniao: "Reunião",
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatData(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  const [, m, dia] = data.split("-");
  return `${DIAS[d.getDay()]} · ${dia}/${m}`;
}

// Uma linha da agenda. Apresentação pura (usada em /agenda e na home).
export function EventoLinha({ evento }: { evento: EventoPublico }) {
  return (
    <div className="grid grid-cols-[88px_1fr_auto] items-start gap-4 border-b border-[#E5E3DC] py-3.5 md:grid-cols-[100px_1fr_auto] md:gap-6">
      <div className="font-[family-name:var(--font-source-sans)] text-[12px] uppercase tracking-[0.05em] text-[#595959]">
        {formatData(evento.data)}
        {evento.horario && <div className="mt-0.5 normal-case">{evento.horario}</div>}
      </div>
      <div>
        <p className="font-[family-name:var(--font-spectral)] text-[15px] text-[#1A1A1A]">
          {evento.titulo}
        </p>
        {evento.subtitulo && (
          <p className="mt-0.5 font-[family-name:var(--font-source-sans)] text-[12px] text-[#595959]">
            {evento.subtitulo}
          </p>
        )}
      </div>
      <span className="border border-[#E5E3DC] px-2 py-0.5 font-[family-name:var(--font-source-sans)] text-[11px] text-[#595959]">
        {TIPO_LABEL[evento.tipo]}
      </span>
    </div>
  );
}
