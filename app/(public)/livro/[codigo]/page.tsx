import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { LivroPublico } from "@features/biblioteca/components/LivroPublico";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  try {
    const livro = await fetchQuery(api.biblioteca.queries.getPublicByCodigo, { codigo });
    if (!livro) return { title: "Livro não encontrado" };
    const titulo = `${livro.titulo} — Biblioteca IPC`;
    const descricao =
      livro.descricao ?? `${livro.titulo}, de ${livro.autores.join(", ")}.`;
    return {
      title: titulo,
      description: descricao,
      openGraph: {
        title: titulo,
        description: descricao,
        ...(livro.capaUrl ? { images: [{ url: livro.capaUrl }] } : {}),
      },
    };
  } catch {
    return { title: "Biblioteca IPC" };
  }
}

export default async function LivroPublicoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return <LivroPublico codigo={codigo} />;
}
