import { cleanPhoneForWhatsApp } from "@shared/lib/validations/brazilian";
import { splitNome } from "./splitNome";

interface VCardInput {
  nomeCompleto: string;
  whatsapp?: string | null;
  dataNascimento?: string | null;
  cidade?: string | null;
  profissao?: string | null;
}

/**
 * Gera string no formato vCard 3.0 (RFC 2426).
 */
export function generateVCard(m: VCardInput): string {
  const { primeiro, resto } = splitNome(m.nomeCompleto);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escape(m.nomeCompleto)}`,
    `N:${escape(resto)};${escape(primeiro)};;;`,
    m.whatsapp && `TEL;TYPE=CELL:+${cleanPhoneForWhatsApp(m.whatsapp)}`,
    m.dataNascimento && `BDAY:${m.dataNascimento}`,
    m.cidade && `ADR;TYPE=HOME:;;;${escape(m.cidade)};;;`,
    m.profissao && `TITLE:${escape(m.profissao)}`,
    "END:VCARD",
  ].filter(Boolean) as string[];
  return lines.join("\r\n");
}

function escape(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/**
 * Dispara download do vCard como arquivo .vcf.
 */
export function downloadVCard(membro: VCardInput) {
  if (typeof window === "undefined") return;
  const content = generateVCard(membro);
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${membro.nomeCompleto.replace(/[^a-zA-Z0-9]+/g, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
