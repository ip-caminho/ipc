// Wrapper de páginas MDX (identidade .site-v2). Por padrão centraliza o conteúdo
// numa coluna de leitura; com `fullBleed`, deixa o conteúdo controlar a largura.
export function MDXLayout({
  children,
  fullBleed = false,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  if (fullBleed) {
    return <div className="site-v2">{children}</div>;
  }
  return (
    <div className="site-v2">
      <section style={{ padding: "var(--space-16) 0" }}>
        <article className="wrap" style={{ maxWidth: "720px" }}>
          {children}
        </article>
      </section>
    </div>
  );
}
