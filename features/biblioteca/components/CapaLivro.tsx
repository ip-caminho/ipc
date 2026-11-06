import { cn } from "@shared/lib/utils/cn";

// Mesmas cores das capas sem foto do acervo público.
const CORES_SEM_FOTO = ["#1f3f7a", "#27606b", "#4a3f78", "#3a4a63", "#5f6f8f", "#7a2f4a"];

function corDoTitulo(titulo: string): string {
  let soma = 0;
  for (const letra of titulo) soma = (soma + letra.charCodeAt(0)) % 997;
  return CORES_SEM_FOTO[soma % CORES_SEM_FOTO.length];
}

/** Capa com lombada; sem foto, vira um livro de pano com o título. O tamanho vem de className. */
export function CapaLivro({
  titulo,
  capaUrl,
  className,
}: {
  titulo: string;
  capaUrl?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("relative shrink-0 overflow-hidden rounded-[3px] shadow-md shadow-slate-900/25", className)}
      style={capaUrl ? undefined : { backgroundColor: corDoTitulo(titulo) }}
    >
      {capaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- capas vêm do CDN e de buscas externas
        <img src={capaUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display block p-[8%] pl-[14%] text-[0.625rem] leading-tight text-white/90">
          {titulo}
        </span>
      )}
      <span className="absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/25 to-transparent" />
    </div>
  );
}
