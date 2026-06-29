import type { Metadata } from "next";
import { PlaceholderPagina } from "@features/site-publico/components/PlaceholderPagina";

export const metadata: Metadata = {
  title: "Quem somos — IPC",
  description:
    "Quem é a Igreja Presbiteriana do Caminho: comunidade bíblica, reformada, no centro de São Paulo.",
};

export default function QuemSomosPage() {
  return (
    <PlaceholderPagina
      titulo="Quem somos"
      descricao="Uma comunidade aprendendo, junto, a se parecer com Cristo — começando pela segunda-feira."
    />
  );
}
