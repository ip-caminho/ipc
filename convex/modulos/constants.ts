export type ModuloSeed = {
  slug: string;
  label: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
};

export const MODULOS_INICIAIS: ModuloSeed[] = [
  { slug: "membros", label: "Membros", descricao: "Cadastro e gestão de membros", ativo: true, ordem: 1 },
  { slug: "diretorio", label: "Diretório", descricao: "Diretório de contatos", ativo: true, ordem: 2 },
  { slug: "entidades", label: "Entidades", descricao: "Gestão de entidades (PF/PJ)", ativo: true, ordem: 3 },
  { slug: "escalas", label: "Cultos", descricao: "Escalas e liturgia dos cultos", ativo: false, ordem: 4 },
  { slug: "boletim", label: "Boletim", descricao: "Boletim dominical", ativo: false, ordem: 5 },
  { slug: "gravacoes", label: "Gravações", descricao: "Gravações de sermões e estudos", ativo: false, ordem: 6 },
  { slug: "pequenos-grupos", label: "Pequenos Grupos", descricao: "Gestão de pequenos grupos", ativo: false, ordem: 7 },
  { slug: "pedidos-oracao", label: "Pedidos de Oração", descricao: "Pedidos de oração da comunidade", ativo: false, ordem: 8 },
  { slug: "pastoreio", label: "Pastoreio", descricao: "Acompanhamento pastoral", ativo: false, ordem: 9 },
  { slug: "ministerios", label: "Ministérios", descricao: "Gestão de ministérios da igreja", ativo: false, ordem: 10 },
  { slug: "calendario", label: "Calendário", descricao: "Calendário de eventos da igreja", ativo: false, ordem: 11 },
  { slug: "educacional", label: "Educacional Infantil", descricao: "Gestão das turmas e crianças", ativo: false, ordem: 12 },
  { slug: "louvor", label: "Louvor", descricao: "Repertório de músicas com cifras e tons", ativo: false, ordem: 13 },
  { slug: "salas", label: "Salas", descricao: "Reserva de salas da igreja", ativo: false, ordem: 14 },
  { slug: "tarefas", label: "Tarefas", descricao: "Gestão de tarefas e atividades", ativo: false, ordem: 15 },
  { slug: "turmas", label: "Turmas", descricao: "Turmas e cursos", ativo: false, ordem: 16 },
  { slug: "biblioteca", label: "Biblioteca", descricao: "Acervo de livros e empréstimos", ativo: false, ordem: 17 },
  { slug: "multimidia", label: "Multimídia", descricao: "Painel de multimídia para cultos", ativo: false, ordem: 18 },
  { slug: "avisos", label: "Avisos", descricao: "Avisos semanais extraídos dos cultos", ativo: false, ordem: 19 },
];

export const MODULOS_SLUGS = MODULOS_INICIAIS.map((m) => m.slug);
