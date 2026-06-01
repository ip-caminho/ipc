import { normalizeToE164 } from "@convex/messaging/phoneUtils";

/**
 * Identificador interno usado no Password provider, derivado do telefone.
 * Precisa bater com loginIdFromPhone do backend (convex/membros/acesso.ts).
 */
export function loginIdFromPhone(phone: string): string {
  return `${normalizeToE164(phone).replace(/\D/g, "")}@membro.local`;
}
