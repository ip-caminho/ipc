// Valida CPF (11 digitos + digitos verificadores). Vive dentro de convex/
// porque o Convex nao empacota imports de fora (shared/lib/validations/brazilian).
export function cpfValido(raw: string): boolean {
  const c = raw.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dig = c.split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += dig[i] * (t + 1 - i);
    const d = ((soma * 10) % 11) % 10;
    if (d !== dig[t]) return false;
  }
  return true;
}
