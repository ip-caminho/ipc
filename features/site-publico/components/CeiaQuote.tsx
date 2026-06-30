// Destaque editorial para o parágrafo da Ceia em /visite (identidade .site-v2).
export function CeiaQuote({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-10 border-l-2 border-[color:var(--accent-rule)] pl-8">
      <p className="font-[family-name:var(--font-spectral)] text-[length:var(--text-lg)] italic leading-relaxed text-[color:var(--text-strong)]">
        {children}
      </p>
    </div>
  );
}
