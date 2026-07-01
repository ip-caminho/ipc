import { redirect } from "next/navigation";

// A edição migrou para o hub com abas (/admin/site-publico?secao=informacoes).
export default function InformacoesRedirect() {
  redirect("/admin/site-publico?secao=informacoes");
}
