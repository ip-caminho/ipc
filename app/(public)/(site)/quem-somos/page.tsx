import type { Metadata } from "next";
import Conteudo from "@/content/quem-somos.mdx";
import { MDXLayout } from "@features/site-publico/components/MDXLayout";

export const metadata: Metadata = {
  title: "Quem somos — IPC",
  description:
    "Quem é a Igreja Presbiteriana do Caminho: comunidade bíblica, reformada, no centro de São Paulo.",
};

export default function QuemSomosPage() {
  return (
    <MDXLayout>
      <Conteudo />
    </MDXLayout>
  );
}
