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
        /* Geometria da folha fica no CSS (nao em style inline) porque a tela e a
           impressora precisam de larguras diferentes: na tela, 297mm fixos para
           simular o A4; na impressora, 100% da area imprimivel — assim o
           conteudo continua centralizado mesmo se o navegador aplicar escala ou
           margem propria. */
        .certificado {
          box-sizing: border-box;
          height: 208mm;
          padding: 14mm 20mm;
        }
        @media screen {
          #certificados-print {
            overflow-x: auto;
            background: #f4f4f5;
            padding: 12px;
          }
          .certificado {
            width: 297mm;
            background: #fff;
            border: 1px dashed #d4d4d8;
            margin: 0 auto 12px;
          }
        }
        @media print {
          /* Esconde qualquer coisa fora do certificado — inclui o que vem do
             layout raiz (toaster, banners), que nao passa pelo .no-print. */
          body * {
            visibility: hidden !important;
          }
          #certificados-print,
          #certificados-print * {
            visibility: visible !important;
          }
          /* Sem position:absolute aqui: fora do fluxo, a paginacao de varias
             folhas fica a cargo do motor de impressao e desalinha. */
          #certificados-print {
            margin: 0;
            padding: 0;
            width: 100%;
            background: #fff;
          }
          .certificado {
            width: 100%;
            margin: 0;
            border: 0;
          }
          .no-print {
            display: none !important;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .certificado {
            page-break-after: always;
            break-after: page;
            /* Nao pode passar de 1 pagina: sobra deixaria folha em branco. */
            overflow: hidden;
          }
          .certificado:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          /* Mantem a logo e os cinzas no papel. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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

      <div id="certificados-print" className="bg-white text-black">
        {certificados.map((c) => (
          <section
            key={c._id}
            className="certificado flex flex-col items-center justify-center text-center"
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
                // Relativo, nao em mm: se o navegador imprimir com escala ou
                // margem propria, o bloco acompanha e continua centralizado.
                width: "80%",
              }}
            >
              {c.nomeImpresso}
            </p>

            <p style={{ fontSize: "12pt", marginTop: "8mm", maxWidth: "85%", lineHeight: 1.6 }}>
              concluiu o curso <strong>{c.cursoNome}</strong>
              {c.cargaHoraria ? `, com carga horaria de ${c.cargaHoraria} horas` : ""},
              {c.criterioAprovacao === "MAX_FALTAS"
                ? ` com ${c.faltas ?? 0} ${(c.faltas ?? 0) === 1 ? "falta" : "faltas"} em ${c.aulasConsideradas} encontros.`
                : ` com frequencia de ${c.percentualFrequencia}% (${c.aulasPresentes} de ${c.aulasConsideradas} aulas).`}
            </p>

            <p style={{ fontSize: "11pt", marginTop: "10mm" }}>
              Sao Paulo, {formatDateLong(c.emitidoEm)}
            </p>

            <div
              style={{
                marginTop: "14mm",
                display: "flex",
                gap: "8%",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  borderTop: "1px solid #333",
                  width: "38%",
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
                  width: "38%",
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
