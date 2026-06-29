// Wrapper de páginas MDX. Por padrão centraliza o conteúdo numa coluna de
// leitura; com `fullBleed`, deixa o conteúdo controlar a própria largura
// (seções full-bleed da página /quem-somos).
export function MDXLayout({
  children,
  fullBleed = false,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  if (fullBleed) {
    return <div className="py-16 md:py-20">{children}</div>;
  }
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">{children}</article>
  );
}
