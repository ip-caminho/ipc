"use client";

import { useState } from "react";
import { RetiroForm } from "./RetiroForm";
import { ValoresRetiro } from "./ValoresRetiro";
import type { RetiroPublico } from "../lib/data";

function periodoBR(inicio: string, fim: string): string {
  const [iy, im, id] = inicio.split("-");
  const [fy, fm, fd] = fim.split("-");
  return `${id}/${im}/${iy} a ${fd}/${fm}/${fy}`;
}

// Envolve titulo + descricao + form. Ao enviar, some a descricao longa — a tela
// de confirmacao fica limpa (so o essencial).
export function RetiroPagina({ retiro }: { retiro: RetiroPublico }) {
  const [enviado, setEnviado] = useState(false);
  return (
    <>
      <div className="page-intro" style={{ paddingBottom: 0 }}>
        <h1>{retiro.titulo}</h1>
      </div>
      <p style={{ color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
        {periodoBR(retiro.dataInicio, retiro.dataFim)}
      </p>
      {retiro.descricao && !enviado && (
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
          {retiro.descricao}
        </div>
      )}
      {!enviado && (
        <div style={{ marginTop: "var(--space-6)" }}>
          <ValoresRetiro precos={retiro.precos} />
        </div>
      )}
      <div style={{ marginTop: "var(--space-10)" }}>
        <RetiroForm retiro={retiro} onEnviado={() => setEnviado(true)} />
      </div>
    </>
  );
}
