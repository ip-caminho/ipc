import type { Metadata } from "next";
import { PlaceholderPagina } from "@features/site-publico/components/PlaceholderPagina";

export const metadata: Metadata = {
  title: "Trajetória — IPC",
  description: "A história da Igreja Presbiteriana do Caminho.",
};

export default function TrajetoriaPage() {
  return (
    <PlaceholderPagina
      titulo="Trajetória"
      descricao="Como chegamos até aqui — a história da nossa comunidade."
    />
  );
}
