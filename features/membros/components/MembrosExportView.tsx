"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CARGO_ECLESIASTICO_OPTIONS, STATUS_OPTIONS } from "../lib/constants";
import type { MembroRow } from "./MembroTable";

interface MembrosExportViewProps {
  data: MembroRow[];
  filtroStatus: string;
  filtroCargo: string;
}

function getStatusLabel(value: string) {
  if (!value || value === "TODOS") return "Todos";
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function getCargoLabel(value: string) {
  if (!value || value === "TODOS") return null;
  return CARGO_ECLESIASTICO_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function getCargoAbrev(value?: string) {
  if (!value) return "-";
  const map: Record<string, string> = {
    MEMBRO_COMUNGANTE: "MC",
    MEMBRO_NAO_COMUNGANTE: "MNC",
    DIACONO: "Diác.",
    PRESBITERO: "Presb.",
    PASTOR: "Pr.",
  };
  return map[value] ?? value;
}

export const MembrosExportView = forwardRef<HTMLDivElement, MembrosExportViewProps>(
  function MembrosExportView({ data, filtroStatus, filtroCargo }, ref) {
    const sorted = [...data].sort((a, b) =>
      (a.entidade.nomeCompleto ?? "").localeCompare(b.entidade.nomeCompleto ?? "", "pt-BR"),
    );

    const dataHoje = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const statusLabel = filtroStatus === "" ? "Ativos" : getStatusLabel(filtroStatus);
    const cargoLabel = getCargoLabel(filtroCargo);

    return (
      <div ref={ref} className="hidden print:block print-export">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .print-export, .print-export * { visibility: visible !important; }
            .print-export {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              font-family: 'Times New Roman', serif;
              font-size: 11pt;
              color: #000;
            }
          }
        `}</style>

        <div style={{ padding: "1cm" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5cm" }}>
            <h1 style={{ fontSize: "14pt", fontWeight: "bold", margin: 0 }}>
              Lista de Membros — Igreja Presbiteriana de Cotia
            </h1>
            <p style={{ fontSize: "10pt", margin: "4px 0 0" }}>
              Filtro: {statusLabel}
              {cargoLabel && ` | Cargo: ${cargoLabel}`}
              {" | "}Data: {dataHoje}
              {" | "}Total: {sorted.length} membro{sorted.length !== 1 && "s"}
            </p>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "10pt",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle({ width: "6%" })}>N°</th>
                <th style={thStyle({ width: "38%", textAlign: "left" })}>Nome</th>
                <th style={thStyle({ width: "10%" })}>Rol</th>
                <th style={thStyle({ width: "14%" })}>Cargo</th>
                <th style={thStyle({ width: "32%", textAlign: "left" })}>Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={i}>
                  <td style={tdStyle({ textAlign: "center" })}>{i + 1}</td>
                  <td style={tdStyle({})}>{m.entidade.nomeCompleto ?? "-"}</td>
                  <td style={tdStyle({ textAlign: "center" })}>{m.rol ?? "-"}</td>
                  <td style={tdStyle({ textAlign: "center" })}>{getCargoAbrev(m.cargoEclesiastico)}</td>
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
  },
);

function thStyle(extra: React.CSSProperties): React.CSSProperties {
  return {
    borderBottom: "2px solid #000",
    padding: "4px 6px",
    fontWeight: "bold",
    textAlign: "center",
    ...extra,
  };
}

function tdStyle(extra: React.CSSProperties): React.CSSProperties {
  return {
    borderBottom: "1px solid #ddd",
    padding: "3px 6px",
    ...extra,
  };
}
