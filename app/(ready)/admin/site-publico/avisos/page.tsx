import { redirect } from "next/navigation";

// A edição migrou para o hub com abas (/admin/site-publico?secao=avisos).
export default function AvisosRedirect() {
  redirect("/admin/site-publico?secao=avisos");
}
