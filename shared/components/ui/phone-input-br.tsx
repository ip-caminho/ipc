"use client";

import * as React from "react";
import { Input } from "@/shared/components/ui/input";

// Telefone digitavel com mascara e teclado numerico no celular. Mesma ideia do
// DateInputBR: o usuario digita so numeros, os parenteses e o traco entram
// sozinhos. Emite apenas os digitos (o backend normaliza para E.164).

type Props = {
  id?: string;
  value: string; // digitos (ex: "11999998888")
  onChange: (digitos: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/** (11) 99999-9999 para celular; (11) 3333-4444 para fixo. */
export function mascaraTelefone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function PhoneInputBR({
  id,
  value,
  onChange,
  placeholder = "(11) 99999-9999",
  className,
  disabled,
}: Props) {
  return (
    <Input
      id={id}
      // "numeric" e nao "tel": o teclado tel do iOS mostra *, # e pausa, que
      // nao servem aqui.
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      value={mascaraTelefone(value ?? "")}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
    />
  );
}
