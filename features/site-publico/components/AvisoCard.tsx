import type { AvisoCultoPublico } from "@convex/public/avisos";

// Card de aviso ("Esta semana") — um aviso dado no culto de domingo. Estilo
// .site-v2 (landing.css). Meta = quando/onde, quando houver.
export function AvisoCard({ aviso }: { aviso: AvisoCultoPublico }) {
  const meta = [aviso.quando, aviso.onde].filter(Boolean).join(" · ");
  return (
    <div className="aviso-card">
      {meta && <p className="meta">{meta}</p>}
      <h3>{aviso.titulo}</h3>
      {aviso.descricao && <p>{aviso.descricao}</p>}
    </div>
  );
}
