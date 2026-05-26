export type ModuloSeed = {
  slug: string;
  label: string;
  descricao: string;
  ativo: boolean;
  ordem: number;
};

export const MODULOS_INICIAIS: ModuloSeed[] = [
  { slug: "membros", label: "Membros", descricao: "Cadastro e gestao de membros", ativo: true, ordem: 1 },
  { slug: "diretorio", label: "Diretorio", descricao: "Diretorio de contatos", ativo: true, ordem: 2 },
  { slug: "entidades", label: "Entidades", descricao: "Gestao de entidades (PF/PJ)", ativo: true, ordem: 3 },
  { slug: "escalas", label: "Cultos", descricao: "Escalas e liturgia dos cultos", ativo: false, ordem: 4 },
  { slug: "boletim", label: "Boletim", descricao: "Boletim dominical", ativo: false, ordem: 5 },
  { slug: "gravacoes", label: "Gravacoes", descricao: "Gravacoes de sermoes e estudos", ativo: false, ordem: 6 },
  { slug: "pequenos-grupos", label: "Pequenos Grupos", descricao: "Gestao de pequenos grupos", ativo: false, ordem: 7 },
  { slug: "pedidos-oracao", label: "Pedidos de Oracao", descricao: "Pedidos de oracao da comunidade", ativo: false, ordem: 8 },
  { slug: "pastoreio", label: "Pastoreio", descricao: "Acompanhamento pastoral", ativo: false, ordem: 9 },
  { slug: "ministerios", label: "Ministerios", descricao: "Gestao de ministerios da igreja", ativo: false, ordem: 10 },
  { slug: "calendario", label: "Calendario", descricao: "Calendario de eventos da igreja", ativo: false, ordem: 11 },
  { slug: "educacional", label: "Educacional Infantil", descricao: "Gestao das turmas e criancas", ativo: false, ordem: 12 },
  { slug: "louvor", label: "Louvor", descricao: "Repertorio de musicas com cifras e tons", ativo: false, ordem: 13 },
  { slug: "salas", label: "Salas", descricao: "Reserva de salas da igreja", ativo: false, ordem: 14 },
  { slug: "tarefas", label: "Tarefas", descricao: "Gestao de tarefas e atividades", ativo: false, ordem: 15 },
  { slug: "turmas", label: "Turmas", descricao: "Turmas e cursos", ativo: false, ordem: 16 },
  { slug: "biblioteca", label: "Biblioteca", descricao: "Acervo de livros e emprestimos", ativo: false, ordem: 17 },
  { slug: "multimidia", label: "Multimidia", descricao: "Painel de multimidia para cultos", ativo: false, ordem: 18 },
  { slug: "avisos", label: "Avisos", descricao: "Avisos semanais extraidos dos cultos", ativo: false, ordem: 19 },
];

export const MODULOS_SLUGS = MODULOS_INICIAIS.map((m) => m.slug);
