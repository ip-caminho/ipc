import { IGREJA_SEO } from "./seo";

// Defaults corretos da igreja — fallback caso o banco (getIgrejaInfo) esteja
// vazio. Mesma verdade do JSON-LD/rodapé; mantém o site robusto se a preferência
// sumir. Editar no painel sobrescreve estes valores no banco.
export const IGREJA_DEFAULTS = {
  nome: IGREJA_SEO.nome,
  descricao: IGREJA_SEO.descricao,
  endereco: `${IGREJA_SEO.endereco.rua} — ${IGREJA_SEO.endereco.bairro}, ${IGREJA_SEO.endereco.cidade}, ${IGREJA_SEO.endereco.uf}`,
  // Versão sem travessão para a busca do Google Maps.
  enderecoMapa: `${IGREJA_SEO.endereco.rua}, ${IGREJA_SEO.endereco.bairro}, ${IGREJA_SEO.endereco.cidade}, ${IGREJA_SEO.endereco.uf}`,
  horario: "Domingos · 10h",
  email: IGREJA_SEO.email,
  instagram: IGREJA_SEO.instagram,
  // Dados de ofertas (dízimos). Sem campo no SEO — defaults aqui.
  banco: "Santander (033)",
  agencia: "0108",
  conta: "13007643-7",
  pix: "48.792.102/0001-13",
} as const;

// Textos editáveis do hero da home (chaves `site.*`). Defaults = os valores
// atuais hardcoded; o painel sobrescreve no banco.
export const SITE_TEXTOS_DEFAULTS = {
  heroTitulo: "Uma comunidade bíblica de discipulado, participando da missão de Deus neste mundo.",
  heroSub: "Presbiteriana. Pequena por escolha. No centro de São Paulo.",
} as const;

// "Dom · 10h — Culto" a partir da lista de horários do banco (ou null).
export function formatHorarios(
  horarios?: Array<{ dia: string; horario: string; tipo?: string }>,
): string | null {
  if (!horarios || horarios.length === 0) return null;
  return horarios
    .map((h) => `${h.dia} · ${h.horario}${h.tipo ? ` — ${h.tipo}` : ""}`)
    .join("  ·  ");
}
