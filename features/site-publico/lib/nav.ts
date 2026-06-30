// Navegação do site público (rotas sem auth)
export const NAV_PUBLICO = [
  { label: "Quem somos", href: "/quem-somos" },
  { label: "Agenda", href: "/agenda" },
  { label: "Visite", href: "/visite" },
  { label: "Inscrições", href: "/inscricoes" },
] as const;

// Retorno de convex `preferencias.getIgrejaInfo`
export type IgrejaInfo = {
  nome?: string;
  descricao?: string;
  foto?: string;
  endereco?: string;
  googleMapsEmbed?: string;
  horarios?: Array<{ dia: string; horario: string; tipo: string }>;
  whatsapp?: string;
  telefone?: string;
  email?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  pix?: string;
  educacional?: Array<{ turma: string; responsavel: string }>;
};
