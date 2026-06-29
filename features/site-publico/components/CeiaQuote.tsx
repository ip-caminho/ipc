// Destaque editorial para o parágrafo da Ceia em /visite.
export function CeiaQuote({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-10 border-l-2 border-[#1E3A5F] pl-8">
      <p className="font-[family-name:var(--font-spectral)] text-[20px] italic leading-relaxed text-[#1A1A1A]">
        {children}
      </p>
    </div>
  );
}
