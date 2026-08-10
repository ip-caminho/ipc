"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

function formatDateLong(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Impressao em lote: um certificado por pagina A4 paisagem. Sem PDF gerado no
 * backend — o navegador imprime, o que mantem tudo local e sem armazenamento.
 * A entrega e presencial, no ultimo dia de aula.
 */
export default function ImprimirCertificadosPage() {
  const { id } = useParams<{ id: string }>();
  const turmaId = id as Id<"turmas">;
  // @ts-ignore Convex TS2589 (instanciacao de tipo profunda)
  const certificados = useQuery(api.turmas.certificados.listParaImpressao, { turmaId });

  if (certificados === undefined) {
    return <div className="p-6 text-sm">Carregando...</div>;
  }

  if (certificados.length === 0) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm">
          Nenhum certificado emitido nesta turma (ou sem permissao para ver).
        </p>
        <p className="text-sm text-muted-foreground">
          Emita na aba Certificados da turma e volte aqui para imprimir.
        </p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .certificado {
            page-break-after: always;
            break-after: page;
          }
          .certificado:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background p-4">
        <p className="text-sm">
          {certificados.length}{" "}
          {certificados.length === 1 ? "certificado" : "certificados"} — confira antes de
          imprimir. Use A4 paisagem, sem margens.
        </p>
        <Button className="h-10" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />
          Imprimir
        </Button>
      </div>

      <div className="bg-white text-black">
        {certificados.map((c) => (
          <section
            key={c._id}
            className="certificado mx-auto flex flex-col items-center justify-center text-center"
            style={{
              width: "297mm",
              height: "210mm",
              padding: "24mm 28mm",
              boxSizing: "border-box",
            }}
          >
            <Image
              src="/logo.png"
              alt="Igreja Presbiteriana do Caminho"
              width={234}
              height={179}
              priority
              style={{ height: "20mm", width: "auto" }}
            />

            <p
              style={{
                letterSpacing: "0.3em",
                fontSize: "10pt",
                textTransform: "uppercase",
                marginTop: "4mm",
              }}
            >
              Igreja Presbiteriana do Caminho
            </p>

            <h1 style={{ fontSize: "28pt", fontWeight: 700, marginTop: "8mm" }}>
              Certificado
            </h1>

            <p style={{ fontSize: "12pt", marginTop: "8mm" }}>Certificamos que</p>

            <p
              style={{
                fontSize: "24pt",
                fontWeight: 600,
                marginTop: "4mm",
                borderBottom: "1px solid #999",
                paddingBottom: "3mm",
                minWidth: "160mm",
              }}
            >
              {c.nomeImpresso}
            </p>

            <p style={{ fontSize: "12pt", marginTop: "8mm", maxWidth: "200mm", lineHeight: 1.6 }}>
              concluiu o curso <strong>{c.cursoNome}</strong>
              {c.cargaHoraria ? `, com carga horaria de ${c.cargaHoraria} horas` : ""}, com
              frequencia de {c.percentualFrequencia}% ({c.aulasPresentes} de{" "}
              {c.aulasConsideradas} aulas).
            </p>

            <p style={{ fontSize: "11pt", marginTop: "10mm" }}>
              Sao Paulo, {formatDateLong(c.emitidoEm)}
            </p>

            <div
              style={{
                marginTop: "14mm",
                display: "flex",
                gap: "24mm",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  borderTop: "1px solid #333",
                  width: "80mm",
                  paddingTop: "2mm",
                  fontSize: "10pt",
                }}
              >
                <p style={{ fontWeight: 600 }}>{c.instrutorNome ?? " "}</p>
                <p style={{ fontSize: "9pt", color: "#555" }}>Professor</p>
              </div>
              <div
                style={{
                  borderTop: "1px solid #333",
                  width: "80mm",
                  paddingTop: "2mm",
                  fontSize: "10pt",
                }}
              >
                <p style={{ fontWeight: 600 }}>{c.pastorNome ?? " "}</p>
                <p style={{ fontSize: "9pt", color: "#555" }}>Pastor titular</p>
              </div>
            </div>

            <p style={{ fontSize: "8pt", color: "#666", marginTop: "8mm" }}>
              {c.turmaNome} · Codigo {c.codigo}
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
