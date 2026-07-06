"use client";

import { useState } from "react";
import { AcampamentoForm } from "./AcampamentoForm";
import type { AcampamentoPublico } from "../lib/data";

function periodoBR(inicio: string, fim: string): string {
  const [iy, im, id] = inicio.split("-");
  const [fy, fm, fd] = fim.split("-");
  return `${id}/${im}/${iy} a ${fd}/${fm}/${fy}`;
}

// Envolve titulo + descricao + form. Ao enviar, some a descricao longa — a tela
// de confirmacao fica limpa (so o essencial).
export function AcampamentoPagina({ acampamento }: { acampamento: AcampamentoPublico }) {
  const [enviado, setEnviado] = useState(false);
  return (
    <>
      <div className="page-intro" style={{ paddingBottom: 0 }}>
        <h1>{acampamento.titulo}</h1>
      </div>
      <p style={{ color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
        {periodoBR(acampamento.dataInicio, acampamento.dataFim)}
      </p>
      {acampamento.descricao && !enviado && (
        <div
          style={{
            whiteSpace: "pre-line",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-muted)",
            marginTop: "var(--space-4)",
          }}
        >
          {acampamento.descricao}
        </div>
      )}
      <div style={{ marginTop: "var(--space-10)" }}>
        <AcampamentoForm acampamento={acampamento} onEnviado={() => setEnviado(true)} />
      </div>
    </>
  );
}
