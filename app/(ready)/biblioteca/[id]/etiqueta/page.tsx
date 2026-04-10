"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { ModuloGuard } from "@/shared/components/auth/ModuloGuard";
import type { Id } from "@/convex/_generated/dataModel";

export default function EtiquetaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const livro = useQuery(api.biblioteca.queries.getById, { id: id as Id<"livros"> });
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (livro === undefined) return <div className="p-6">Carregando...</div>;
  if (livro === null) return <div className="p-6">Livro nao encontrado</div>;

  return (
    <ModuloGuard modulo="biblioteca">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .etiqueta-grid { gap: 0 !important; }
          .etiqueta { page-break-inside: avoid; }
        }
      `}</style>

      <div className="container max-w-5xl py-6 space-y-4">
        <div className="no-print flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/biblioteca/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>

        <div className="no-print">
          <h1 className="text-xl font-bold">Etiquetas</h1>
          <p className="text-sm text-muted-foreground">{livro.titulo}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {livro.exemplares.length} etiqueta{livro.exemplares.length !== 1 ? "s" : ""}.
            QR code aponta para a ficha publica do livro.
          </p>
        </div>

        <div className="etiqueta-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
          {livro.exemplares.map((ex) => (
            <div
              key={ex._id}
              className="etiqueta border-2 border-black p-3 flex flex-col items-center text-center bg-white text-black"
              style={{ minHeight: "180px" }}
            >
              <p className="font-mono text-xs font-bold mb-2">{ex.codigo}</p>
              {origin && (
                <QRCodeSVG
                  value={`${origin}/livro/${ex.codigo}`}
                  size={100}
                  level="M"
                />
              )}
              <p className="text-xs mt-2 line-clamp-2 leading-tight">{livro.titulo}</p>
              <p className="text-[10px] mt-1 text-gray-600 line-clamp-1">
                {livro.autores[0]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ModuloGuard>
  );
}
