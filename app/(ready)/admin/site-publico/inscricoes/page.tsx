import { redirect } from "next/navigation";

// A listagem/edição migrou para o hub com abas (/admin/site-publico?secao=inscricoes).
// As respostas de cada inscrição seguem em /admin/site-publico/inscricoes/[id]/respostas.
export default function InscricoesRedirect() {
  redirect("/admin/site-publico?secao=inscricoes");
}
