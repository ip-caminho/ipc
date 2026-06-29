import type { Metadata } from "next";
import { PlaceholderPagina } from "@features/site-publico/components/PlaceholderPagina";

export const metadata: Metadata = {
  title: "Agenda — IPC",
  description: "Cultos, eventos e encontros da Igreja Presbiteriana do Caminho.",
};

export default function AgendaPage() {
  return (
    <PlaceholderPagina
      titulo="Agenda"
      descricao="Cultos, encontros e eventos da nossa comunidade."
    />
  );
}
