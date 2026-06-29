import type { Metadata } from "next";
import { PlaceholderPagina } from "@features/site-publico/components/PlaceholderPagina";

export const metadata: Metadata = {
  title: "Inscrições — IPC",
  description: "Inscrições abertas para eventos, cursos e atividades da Igreja Presbiteriana do Caminho.",
};

export default function InscricoesPage() {
  return (
    <PlaceholderPagina
      titulo="Inscrições"
      descricao="Retiros, cursos e atividades com inscrição aberta."
    />
  );
}
