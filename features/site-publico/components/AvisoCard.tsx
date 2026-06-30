import type { AvisoPublico } from "@convex/public/avisos";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatData(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  const [, m, dia] = data.split("-");
  return `${DIAS[d.getDay()]} · ${dia}/${m}`;
}

// Card de aviso ("Esta semana"). Estilo .site-v2 (landing.css). Prioridade alta
// ganha border-left laranja + meta em laranja.
export function AvisoCard({ aviso }: { aviso: AvisoPublico }) {
  const alta = aviso.prioridade === "alta";
  return (
    <div className={`aviso-card${alta ? " alta" : ""}`}>
      <p className="meta">
        {alta ? "Importante · " : ""}
        {formatData(aviso.dataInicio)}
      </p>
      <h3>{aviso.titulo}</h3>
      {aviso.descricao && <p>{aviso.descricao}</p>}
    </div>
  );
}
