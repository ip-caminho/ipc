import type { Metadata } from "next";
import Conteudo from "@/content/trajetoria.mdx";
import { MDXLayout } from "@features/site-publico/components/MDXLayout";

export const metadata: Metadata = {
  title: "Trajetória — IPC",
  description: "A história da Igreja Presbiteriana do Caminho.",
};

export default function TrajetoriaPage() {
  return (
    <MDXLayout>
      <Conteudo />
    </MDXLayout>
  );
}
