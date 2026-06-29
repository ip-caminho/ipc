import type { Metadata } from "next";
import { PlaceholderPagina } from "@features/site-publico/components/PlaceholderPagina";

export const metadata: Metadata = {
  title: "Visite — IPC",
  description:
    "Como nos visitar: endereço, horários e o que esperar de um culto na Igreja Presbiteriana do Caminho.",
};

export default function VisitePage() {
  return (
    <PlaceholderPagina
      titulo="Visite"
      descricao="Estamos esperando você. Veja onde, quando e o que esperar."
    />
  );
}
