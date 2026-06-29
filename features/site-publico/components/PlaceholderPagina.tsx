// Placeholder editorial para rotas públicas ainda sem conteúdo (PR 1).
// Substituído por conteúdo real nos PRs seguintes.
export function PlaceholderPagina({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28">
      <p className="font-[family-name:var(--font-source-sans)] text-[11px] uppercase tracking-[0.1em] text-[#595959]">
        Igreja Presbiteriana do Caminho · São Paulo
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-spectral)] text-[34px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[38px]">
        {titulo}
      </h1>
      <p className="mt-4 max-w-[480px] font-[family-name:var(--font-spectral)] text-[16px] italic text-[#595959]">
        {descricao}
      </p>
      <p className="mt-10 font-[family-name:var(--font-source-sans)] text-[13px] text-[#595959]">
        Em breve.
      </p>
    </section>
  );
}
