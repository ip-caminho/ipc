import type { MDXComponents } from "mdx/types";

// Mapeia os elementos do MDX para a tipografia editorial do site público
// (Spectral nos títulos/citações, Source Sans no corpo). Obrigatório p/ @next/mdx.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="font-[family-name:var(--font-spectral)] text-[34px] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] md:text-[40px]">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-14 font-[family-name:var(--font-spectral)] text-[24px] leading-tight text-[#1A1A1A]">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 font-[family-name:var(--font-spectral)] text-[18px] font-medium text-[#1A1A1A]">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="mt-4 font-[family-name:var(--font-source-sans)] text-[16px] leading-[1.6] text-[#1A1A1A]/90">
        {children}
      </p>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-[#1E3A5F] underline underline-offset-2 hover:text-[#1A1A1A]"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="mt-4 list-disc space-y-1 pl-5 font-[family-name:var(--font-source-sans)] text-[16px] leading-[1.6] text-[#1A1A1A]/90">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-1 pl-5 font-[family-name:var(--font-source-sans)] text-[16px] leading-[1.6] text-[#1A1A1A]/90">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 border-[#1E3A5F] pl-6 font-[family-name:var(--font-spectral)] text-[18px] italic text-[#595959]">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-12 border-t border-[#E5E3DC]" />,
    strong: ({ children }) => <strong className="font-semibold text-[#1A1A1A]">{children}</strong>,
    ...components,
  };
}
