// Monta a mensagem do relatório da turma para o WhatsApp. Puro/testável.
// Título = "Lição N — <tema>" (tema entra no título, não repete linha "Tema").
// NÃO inclui presença (LGPD), observações internas nem visitantes — a mensagem
// é pública, vai para o grupo dos pais.

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface RelatorioParaWhatsApp {
  numero?: number | null;
  data: string; // YYYY-MM-DD
  turma: string;
  tema?: string;
  textosBase?: string[];
  historia?: string;
  aplicacao?: string;
  licaoDeCasa?: string;
  professores?: string; // fallback legado
  voluntarios?: { nome: string; papel: string }[];
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatRelatorioWhatsApp(r: RelatorioParaWhatsApp): string {
  const cabecalho: string[] = [];

  // Título: "Lição N — tema" (partes ausentes são omitidas).
  const base = r.numero != null ? `Lição ${r.numero}` : "Relatório";
  const titulo = r.tema ? `${base} — ${r.tema}` : base;
  cabecalho.push(`📖 *${titulo}*`);

  // Data (dia da semana capitalizado) + turma.
  const dataFmt = capitalizar(
    format(parseISO(r.data), "EEEE, dd/MM/yyyy", { locale: ptBR })
  );
  cabecalho.push(`🗓 ${dataFmt} · Turma ${r.turma}`);

  // Professores: papel PROFESSOR; senão todos os voluntários; senão o legado.
  const professores = (r.voluntarios ?? [])
    .filter((v) => v.papel === "PROFESSOR")
    .map((v) => v.nome)
    .filter(Boolean);
  let linhaProf = "";
  if (professores.length) linhaProf = professores.join(", ");
  else if (r.professores) linhaProf = r.professores;
  else {
    const todos = (r.voluntarios ?? []).map((v) => v.nome).filter(Boolean);
    if (todos.length) linhaProf = todos.join(", ");
  }
  if (linhaProf) cabecalho.push(`👤 Professores: ${linhaProf}`);

  // Corpo: cada seção em seu parágrafo.
  const corpo: string[] = [];
  const textos = (r.textosBase ?? []).filter(Boolean);
  if (textos.length) corpo.push(`*Texto base:* ${textos.join(", ")}`);
  if (r.historia) corpo.push(`*História:* ${r.historia}`);
  if (r.aplicacao) corpo.push(`*Aplicação:* ${r.aplicacao}`);
  if (r.licaoDeCasa) corpo.push(`*Lição de casa:* ${r.licaoDeCasa}`);

  return [cabecalho.join("\n"), corpo.join("\n\n")]
    .filter(Boolean)
    .join("\n\n");
}

// Compartilha via share nativo (mobile → escolhe o grupo); fallback abre o
// WhatsApp com o texto preenchido (wa.me). Cancelar o share não faz nada.
export async function shareRelatorioWhatsApp(
  r: RelatorioParaWhatsApp
): Promise<void> {
  const text = formatRelatorioWhatsApp(r);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
    }
  }
  if (typeof window !== "undefined") {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener"
    );
  }
}
