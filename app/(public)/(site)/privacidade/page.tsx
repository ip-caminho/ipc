import type { Metadata } from "next";
import Conteudo from "@/content/privacidade.mdx";
import { MDXLayout } from "@features/site-publico/components/MDXLayout";

export const metadata: Metadata = {
  title: "Privacidade — IPC",
  description: "Política de privacidade e tratamento de dados (LGPD) da Igreja Presbiteriana do Caminho.",
};

export default function PrivacidadePage() {
  return (
    <MDXLayout>
      <Conteudo />
    </MDXLayout>
  );
}
