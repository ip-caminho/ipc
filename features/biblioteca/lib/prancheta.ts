const DIA_EM_MS = 86_400_000;

function diasEntre(inicio: string, fim: string): number {
  return Math.round((Date.parse(fim) - Date.parse(inicio)) / DIA_EM_MS);
}

/** "hoje", "há 3 dias", "há 2 semanas": a prancheta se lê em semanas, de domingo a domingo. */
export function tempoFora(dataEmprestimo: string, hoje: string): string {
  const dias = diasEntre(dataEmprestimo, hoje);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
}

export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function linkLembrete(e: {
  whatsapp: string;
  pessoa: string;
  livroTitulo: string;
  dataPrevistaDevolucao: string;
}): string {
  const digitos = e.whatsapp.replace(/\D/g, "");
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
  // Pula tratamento digitado ("Sr. Jorge" vira "Jorge").
  const primeiroNome = e.pessoa.trim().split(/\s+/).find((p) => !p.endsWith(".")) ?? e.pessoa;
  const mensagem =
    `Olá, ${primeiroNome}! O livro "${e.livroTitulo}" está com a devolução atrasada ` +
    `desde ${formatarData(e.dataPrevistaDevolucao)}. ` +
    "Podemos combinar a entrega no próximo domingo? Biblioteca da IP do Caminho";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
