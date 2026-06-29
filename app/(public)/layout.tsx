import { churchJsonLd } from "@features/site-publico/lib/seo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Structured data schema.org/Church — cobre landing + rotas públicas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(churchJsonLd()) }}
      />
      {children}
    </>
  );
}
