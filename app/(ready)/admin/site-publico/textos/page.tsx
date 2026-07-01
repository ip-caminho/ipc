import { redirect } from "next/navigation";

// A edição migrou para o hub com abas (/admin/site-publico?secao=textos).
export default function TextosRedirect() {
  redirect("/admin/site-publico?secao=textos");
}
