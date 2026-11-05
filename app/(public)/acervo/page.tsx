import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import type { LivroCatalogo } from "@convex/public/acervo";
import { AcervoPublico } from "@features/biblioteca/components/acervo/AcervoPublico";
import { montarFileiras, sortearAbertura } from "@features/biblioteca/lib/acervo";
import { getCatalogoAcervo } from "@features/biblioteca/lib/acervoData";

export const metadata: Metadata = {
  title: "Acervo da biblioteca — IPC",
  description:
    "Consulte os livros da biblioteca da Igreja Presbiteriana do Caminho e veja quais estão disponíveis.",
};

export default async function AcervoPage() {
  // Montada a cada visita para uma falha do backend não ficar presa em página
  // estática. O Convex só é lido dentro do cache de getCatalogoAcervo.
  await connection();
  let livros: LivroCatalogo[] = [];
  try {
    livros = await getCatalogoAcervo();
  } catch (erro) {
    console.error("Falha ao carregar o acervo público", erro);
  }
  return (
    <Suspense>
      {/* Sorteado no servidor para o HTML e o navegador abrirem no mesmo livro. */}
      <AcervoPublico livros={livros} abertura={sortearAbertura(livros, montarFileiras(livros))} />
    </Suspense>
  );
}
