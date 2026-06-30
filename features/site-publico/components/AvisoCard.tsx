import type { AvisoPublico } from "@convex/public/avisos";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatData(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  const [, m, dia] = data.split("-");
  return `${DIAS[d.getDay()]} · ${dia}/${m}`;
}

// Card de aviso do bloco "Esta semana" da home. Apresentação pura.
// Prioridade 'alta' ganha destaque: border-left azul-marinho + meta na mesma cor.
export function AvisoCard({ aviso }: { aviso: AvisoPublico }) {
  const alta = aviso.prioridade === "alta";
  return (
    <div
      className={`border border-[#E5E3DC] bg-white px-[18px] py-4${
        alta ? " border-l-2 border-l-[#1E3A5F]" : ""
      }`}
    >
      <p
        className={`font-[family-name:var(--font-source-sans)] text-[10px] uppercase tracking-[0.08em] ${
          alta ? "text-[#1E3A5F]" : "text-[#595959]"
        }`}
      >
        {alta ? "Importante · " : ""}
        {formatData(aviso.dataInicio)}
      </p>
      <p className="mt-1.5 font-[family-name:var(--font-spectral)] text-[14px] font-medium text-[#1A1A1A]">
        {aviso.titulo}
      </p>
      {aviso.descricao && (
        <p className="mt-1 line-clamp-3 font-[family-name:var(--font-source-sans)] text-[12px] leading-[1.5] text-[#595959]">
          {aviso.descricao}
        </p>
      )}
    </div>
  );
}
