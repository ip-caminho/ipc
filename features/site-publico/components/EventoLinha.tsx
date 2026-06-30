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

// Uma linha da agenda (apresentação pura). Estilo .site-v2 (landing.css).
export function EventoLinha({ evento }: { evento: EventoPublico }) {
  return (
    <div className="evento-linha">
      <div className="quando">
        {formatData(evento.data)}
        {evento.horario && <span className="hora">{evento.horario}</span>}
      </div>
      <div>
        <p className="titulo">{evento.titulo}</p>
        {evento.subtitulo && <p className="sub">{evento.subtitulo}</p>}
      </div>
      <span className="tag">{TIPO_LABEL[evento.tipo]}</span>
    </div>
  );
}
