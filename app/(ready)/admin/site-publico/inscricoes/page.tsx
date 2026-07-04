import { redirect } from "next/navigation";

// Inscricoes saiu do hub do site e virou item de Secretaria (/admin/inscricoes).
// Mantido como redirect para links/bookmarks antigos.
export default function InscricoesRedirect() {
  redirect("/admin/inscricoes");
}
