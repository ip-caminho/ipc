"use client";

import { useEffect, useState } from "react";

// Janela em que o culto e considerado "acontecendo agora" apos o horario
const DURACAO_CULTO_MS = 2 * 60 * 60 * 1000;

// Aceita "10h", "10:00", "10h30", "9:30" — o campo horario nao tem formato fixo
function parseAlvo(data: string, horario?: string): number {
  const m = /(\d{1,2})\s*[h:]?\s*(\d{2})?/.exec(horario || "");
  const hh = (m?.[1] ?? "10").padStart(2, "0");
  const mm = m?.[2] ?? "00";
  return new Date(`${data}T${hh}:${mm}:00`).getTime();
}

function calcRestante(alvo: number, agora: number) {
  const diff = Math.max(0, alvo - agora);
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor(diff / 3_600_000) % 24,
    m: Math.floor(diff / 60_000) % 60,
    s: Math.floor(diff / 1_000) % 60,
  };
}

function Unidade({ valor, rotulo }: { valor: number; rotulo: string }) {
  const txt = String(valor).padStart(2, "0");
  return (
    <span className="cc-unit">
      {/* key muda a cada valor → remonta o span e dispara a animação de tick */}
      <span key={txt} className="cc-num">
        {txt}
      </span>
      <span className="cc-label">{rotulo}</span>
    </span>
  );
}

/**
 * Contagem regressiva animada para o próximo culto (ilha client).
 * SSR/primeiro render mostram só a linha estática (sem hydration mismatch);
 * após montar, o contador entra. Quando o horário chega, vira o selo
 * "estamos reunidos agora" pela janela de 2h.
 */
export function CultoCountdown({
  data,
  horario,
  label,
}: {
  data: string;
  horario?: string;
  label: string;
}) {
  const alvo = parseAlvo(data, horario);
  // null até montar — o servidor não sabe "agora" do visitante
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const valido = !Number.isNaN(alvo);
  const emCulto =
    valido && agora !== null && agora >= alvo && agora < alvo + DURACAO_CULTO_MS;
  const contando = valido && agora !== null && agora < alvo;
  const r = contando ? calcRestante(alvo, agora) : null;

  return (
    <div className="culto-countdown">
      <p className="culto-line">
        <strong>{emCulto ? "Culto de hoje" : "Próximo culto"}</strong> · {label}
      </p>
      {emCulto && (
        <p className="cc-live">
          <span className="cc-dot" aria-hidden />
          Estamos reunidos agora — venha como está
        </p>
      )}
      {r && (
        <div
          className="cc-row"
          role="timer"
          aria-label="Contagem regressiva para o próximo culto"
        >
          {r.d > 0 && (
            <>
              <Unidade valor={r.d} rotulo={r.d === 1 ? "dia" : "dias"} />
              <span className="cc-sep" aria-hidden>
                :
              </span>
            </>
          )}
          <Unidade valor={r.h} rotulo="horas" />
          <span className="cc-sep" aria-hidden>
            :
          </span>
          <Unidade valor={r.m} rotulo="min" />
          <span className="cc-sep" aria-hidden>
            :
          </span>
          <Unidade valor={r.s} rotulo="seg" />
        </div>
      )}
    </div>
  );
}
