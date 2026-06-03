"use client";

import { forwardRef } from "react";
import type { MembroEclesiastico } from "./SecretarioExecutivoTabela";

const ROL_LABEL: Record<string, string> = {
  PRINCIPAL: "Principal",
  SEPARADO: "Separado",
  AUSENTE: "Ausente",
  ARQUIVO: "Arquivo",
};

const CARGO_ABREV: Record<string, string> = {
  MEMBRO_COMUNGANTE: "MC",
  MEMBRO_NAO_COMUNGANTE: "MNC",
  DIACONO: "Diac.",
  PRESBITERO: "Presb.",
  PASTOR: "Pr.",
};

function thStyle(extra: React.CSSProperties): React.CSSProperties {
  return { borderBottom: "2px solid #000", padding: "4px 6px", fontWeight: "bold", textAlign: "center", ...extra };
}
function tdStyle(extra: React.CSSProperties): React.CSSProperties {
  return { borderBottom: "1px solid #ddd", padding: "3px 6px", ...extra };
}

type Props = {
  rows: MembroEclesiastico[];
  descricao: string;
  dataHoje: string;
};

export const RolExportView = forwardRef<HTMLDivElement, Props>(function RolExportView(
  { rows, descricao, dataHoje },
  ref
) {
  const sorted = [...rows].sort((a, b) =>
    (a.entidade?.nomeCompleto ?? "").localeCompare(b.entidade?.nomeCompleto ?? "", "pt-BR")
  );

  return (
    <div ref={ref} className="hidden print:block print-export">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-export, .print-export * { visibility: visible !important; }
          .print-export {
            /* absolute (nao fixed): fixed repete na mesma posicao em toda pagina,
               sobrepondo o conteudo numa lista multipagina */
            position: absolute; left: 0; top: 0; width: 100%;
            font-family: 'Times New Roman', serif; font-size: 11pt; color: #000;
          }
          /* repete o cabecalho da tabela em cada pagina */
          .print-export thead { display: table-header-group; }
          /* nao quebra uma linha no meio entre paginas */
          .print-export tr { page-break-inside: avoid; }
        }
      `}</style>

      <div style={{ padding: "1cm" }}>
        <div style={{ textAlign: "center", marginBottom: "0.5cm" }}>
          <h1 style={{ fontSize: "14pt", fontWeight: "bold", margin: 0 }}>
            Rol de Membros — Igreja Presbiteriana do Caminho
          </h1>
          <p style={{ fontSize: "10pt", margin: "4px 0 0" }}>
            {descricao} | Data: {dataHoje} | Total: {sorted.length}
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
          <thead>
            <tr>
              <th style={thStyle({ width: "6%" })}>N°</th>
              <th style={thStyle({ width: "40%", textAlign: "left" })}>Nome</th>
              <th style={thStyle({ width: "12%" })}>Rol</th>
              <th style={thStyle({ width: "10%" })}>Cargo</th>
              <th style={thStyle({ width: "32%", textAlign: "left" })}>Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m._id}>
                <td style={tdStyle({ textAlign: "center" })}>{i + 1}</td>
                <td style={tdStyle({})}>{m.entidade?.nomeCompleto ?? "-"}</td>
                <td style={tdStyle({ textAlign: "center" })}>
                  {m.ehMembro === false ? "Dep." : ROL_LABEL[m.rolCategoria ?? ""] ?? "-"}
                </td>
                <td style={tdStyle({ textAlign: "center" })}>
                  {m.cargoEclesiastico ? CARGO_ABREV[m.cargoEclesiastico] ?? m.cargoEclesiastico : "-"}
                </td>
                <td style={tdStyle({})}>
                  <div style={{ borderBottom: "1px solid #999", minHeight: "18px" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
