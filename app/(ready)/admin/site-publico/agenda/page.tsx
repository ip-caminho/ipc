import { redirect } from "next/navigation";

// A edição migrou para o hub com abas (/admin/site-publico?secao=agenda).
export default function AgendaRedirect() {
  redirect("/admin/site-publico?secao=agenda");
}
