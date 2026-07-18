"use client";

import * as React from "react";
import { Input } from "@/shared/components/ui/input";

// Input de data digitavel (dd/mm/aaaa) com teclado numerico. Alternativa ao
// DatePickerBR (calendario) para casos em que digitar e mais rapido que
// navegar — ex: data de nascimento no formulario do retiro. Emite ISO
// (yyyy-mm-dd) quando a data esta completa e valida; "" enquanto incompleta.

type Props = {
  id?: string;
  value: string; // ISO yyyy-mm-dd (ou "")
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function isoParaBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// Formata os digitos como dd/mm/aaaa, inserindo as barras automaticamente.
function mascara(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// Converte dd/mm/aaaa -> ISO, validando dia/mes reais (rejeita 31/02, etc.).
function brParaISO(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const dia = Number(dd);
  const mes = Number(mm);
  const ano = Number(yyyy);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const iso = `${yyyy}-${mm}-${dd}`;
  const dt = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== ano ||
    dt.getUTCMonth() + 1 !== mes ||
    dt.getUTCDate() !== dia
  ) {
    return null;
  }
  return iso;
}

export function DateInputBR({
  id,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className,
  disabled,
}: Props) {
  const [texto, setTexto] = React.useState(() => isoParaBR(value));
  const [tocado, setTocado] = React.useState(false);

  // Sincroniza quando o valor externo muda (ex: pre-preenchimento da familia).
  React.useEffect(() => {
    setTexto((atual) => (brParaISO(atual) === value ? atual : isoParaBR(value)));
  }, [value]);

  // Inválido só depois de sair do campo: evita "erro" enquanto ainda digita.
  // Pega tanto data incompleta (ano com 2 dígitos) quanto impossível (31/02).
  const invalido = tocado && texto.length > 0 && brParaISO(texto) === null;

  return (
    <div>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={texto}
        maxLength={10}
        disabled={disabled}
        className={className}
        aria-invalid={invalido || undefined}
        onBlur={() => setTocado(true)}
        onChange={(e) => {
          const mascarado = mascara(e.target.value);
          setTexto(mascarado);
          onChange(brParaISO(mascarado) ?? "");
        }}
      />
      {invalido && (
        <p className="mt-1 text-[12px] text-[#B3261E]">
          Informe dia, mês e ano completos (dd/mm/aaaa).
        </p>
      )}
    </div>
  );
}
