import type { MDXComponents } from "mdx/types";

// Mapeia os elementos do MDX para a tipografia editorial .site-v2 (Spectral nos
// títulos/citações, Source Sans no corpo, paleta navy+laranja). As páginas MDX
// renderizam dentro de .site-v2 (ver MDXLayout). Obrigatório p/ @next/mdx.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="font-[family-name:var(--font-spectral)] text-[length:clamp(1.9rem,4.5vw,2.5rem)] font-semibold leading-[1.14] tracking-[-0.015em] text-[color:var(--text-strong)]">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-14 font-[family-name:var(--font-spectral)] text-[length:var(--text-xl)] font-semibold leading-tight text-[color:var(--text-strong)]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 font-[family-name:var(--font-spectral)] text-[length:var(--text-lg)] font-medium text-[color:var(--text-strong)]">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="mt-4 font-[family-name:var(--font-source-sans)] text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-[color:var(--text-body)]">
        {children}
      </p>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-[color:var(--accent-ink)] underline underline-offset-2 hover:text-[color:var(--navy-700)]"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-1 pl-5 font-[family-name:var(--font-source-sans)] text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-[color:var(--text-body)]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-1 pl-5 font-[family-name:var(--font-source-sans)] text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-[color:var(--text-body)]">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 border-[color:var(--accent-rule)] pl-6 font-[family-name:var(--font-spectral)] text-[length:var(--text-lg)] italic text-[color:var(--text-muted)]">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-12 border-t border-[color:var(--border-subtle)]" />,
    strong: ({ children }) => (
      <strong className="font-semibold text-[color:var(--text-strong)]">{children}</strong>
    ),
    ...components,
  };
}
