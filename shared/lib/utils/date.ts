import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ISO (YYYY-MM-DD) -> dd/MM/yyyy; devolve o valor cru se invalido
export function formatDataBR(iso?: string) {
  if (!iso) return undefined;
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd/MM/yyyy") : iso;
}

// "Domingo, 5 de outubro" (so a inicial maiuscula)
export function formatDataExtenso(date: Date) {
  const s = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type PartesData = { dia: string; mes: string; ano: string };

export type ResultadoData = {
  iso: string | null;
  erro: string | null;
  // true enquanto faltam dados: o erro só aparece depois de sair do campo.
  incompleta: boolean;
};

const ANO_MINIMO = 1900;
const vazio = (erro: string | null, incompleta: boolean): ResultadoData => ({
  iso: null,
  erro,
  incompleta,
});

export function isoParaPartes(iso: string): PartesData {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { dia: m[3], mes: m[2], ano: m[1] } : { dia: "", mes: "", ano: "" };
}

// Reconhece a data inteira colada ou preenchida pelo navegador.
export function interpretarDataColada(texto: string): PartesData | null {
  const t = texto.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (iso) return { dia: iso[3], mes: iso[2], ano: iso[1] };
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (br) return { dia: br[1], mes: br[2], ano: br[3] };
  const so = /^(\d{2})(\d{2})(\d{4})$/.exec(t);
  return so ? { dia: so[1], mes: so[2], ano: so[3] } : null;
}

// Valida dia, mês e ano digitados; devolve o ISO ou a mensagem para o usuário.
export function validarPartesData(
  { dia, mes, ano }: PartesData,
  { min, hoje = format(new Date(), "yyyy-MM-dd") }: { min?: string; hoje?: string } = {},
): ResultadoData {
  if (!dia && !mes && !ano) return vazio(null, true);
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(ano);
  if (mes.length === 2 && (m < 1 || m > 12)) return vazio("O mês vai de 1 a 12.", false);
  if (dia.length === 2 && (d < 1 || d > 31)) return vazio("O dia vai de 1 a 31.", false);
  if (!dia || !mes || !ano) return vazio("Preencha dia, mês e ano.", true);
  if (m < 1) return vazio("O mês vai de 1 a 12.", false);
  if (d < 1) return vazio("O dia vai de 1 a 31.", false);
  if (ano.length < 4) return vazio("Informe o ano com 4 dígitos, como 1990.", true);
  if (a < ANO_MINIMO) return vazio(`O ano deve ser a partir de ${ANO_MINIMO}.`, false);

  const data = new Date(a, m - 1, d);
  if (data.getFullYear() !== a || data.getMonth() !== m - 1 || data.getDate() !== d) {
    const nomeMes = format(new Date(2000, m - 1, 1), "MMMM", { locale: ptBR });
    return vazio(`Essa data não existe: ${nomeMes} de ${a} não tem dia ${d}.`, false);
  }

  const iso = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  if (iso > hoje) return vazio("A data não pode estar no futuro.", false);
  if (min && iso < min) return vazio(`A data não pode ser anterior a ${formatDataBR(min)}.`, false);
  return { iso, erro: null, incompleta: false };
}
