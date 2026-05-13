import {
  Home,
  Users,
  HandHeart,
  Settings,
  FileText,
  Ear,
  Music,
  BookOpen,
  CalendarDays,
  Library,
  DoorOpen,
  Church,
  Monitor,
  Mic,
  Megaphone,
  UserCircle,
  Heart,
  UsersRound,
  Baby,
  ClipboardList,
  ListTodo,
  GraduationCap,
  Shield,
  LayoutGrid,
  History,
  type LucideIcon,
} from "lucide-react";
import type { Permission, Role } from "@/types/auth";

export const ELEVATED_ROLES: Role[] = [
  "admin",
  "secretaria",
  "pastor",
  "presbitero",
];

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  permission?: Permission;
  modulo?: string;
};

export type NavSection = {
  titulo: string;
  items: NavItem[];
};

export const PRIMARY_TABS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: Home },
  { label: "Comunidade", href: "/comunidade", icon: Users },
  { label: "Orar", href: "/pedidos-oracao", icon: HandHeart },
];

export const BOLETIM_TAB: NavItem = {
  label: "Boletim",
  href: "/boletim",
  icon: FileText,
  permission: "escalas:read",
  modulo: "boletim",
};

export const GESTAO_TAB: NavItem = {
  label: "Gestão",
  href: "/gestao",
  icon: Settings,
};

export const COMUNIDADE_SECTIONS: NavSection[] = [
  {
    titulo: "Conteúdo",
    items: [
      {
        label: "Ouvir",
        href: "/gravacoes",
        icon: Ear,
        description: "Sermões, estudos bíblicos e palestras",
        permission: "gravacoes:read",
        modulo: "gravacoes",
      },
      {
        label: "Repertório",
        href: "/louvor",
        icon: Music,
        description: "Cifras, letras e tons do louvor",
        permission: "louvor:read",
        modulo: "louvor",
      },
      {
        label: "Boletim",
        href: "/boletim",
        icon: FileText,
        description: "Boletim do próximo culto dominical",
        permission: "escalas:read",
        modulo: "boletim",
      },
    ],
  },
  {
    titulo: "Pessoas e espaços",
    items: [
      {
        label: "Diretório",
        href: "/diretorio",
        icon: BookOpen,
        description: "Contatos, aniversários e famílias",
        permission: "diretorio:read",
        modulo: "diretorio",
      },
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
        description: "Eventos e datas da igreja",
        permission: "calendario:read",
        modulo: "calendario",
      },
      {
        label: "Biblioteca",
        href: "/biblioteca",
        icon: Library,
        description: "Acervo de livros para empréstimo",
        permission: "biblioteca:read",
        modulo: "biblioteca",
      },
      {
        label: "Salas",
        href: "/salas",
        icon: DoorOpen,
        description: "Reserva de salas e espaços",
        permission: "salas:read",
        modulo: "salas",
      },
    ],
  },
];

export const GESTAO_SECTIONS: NavSection[] = [
  {
    titulo: "Culto",
    items: [
      {
        label: "Cultos e escalas",
        href: "/cultos",
        icon: Church,
        description: "Planejamento, liturgia e escalas",
        permission: "escalas:read",
        modulo: "escalas",
      },
      {
        label: "Multimídia",
        href: "/multimidia",
        icon: Monitor,
        description: "Painel operacional do culto",
        permission: "multimidia:read",
        modulo: "multimidia",
      },
      {
        label: "Gravações",
        href: "/admin/gravacoes",
        icon: Mic,
        description: "Upload, processamento IA e publicação",
        permission: "gravacoes:update",
        modulo: "gravacoes",
      },
      {
        label: "Avisos",
        href: "/avisos",
        icon: Megaphone,
        description: "Comunicados semanais",
        permission: "escalas:create",
      },
      {
        label: "Boletim (edição)",
        href: "/boletim",
        icon: FileText,
        description: "Editar boletim dominical",
        permission: "escalas:update",
        modulo: "boletim",
      },
    ],
  },
  {
    titulo: "Pessoas",
    items: [
      {
        label: "Membros",
        href: "/membros",
        icon: Users,
        description: "Cadastro e gestão da membresia",
        permission: "membros:read",
        modulo: "membros",
      },
      {
        label: "Entidades",
        href: "/entidades",
        icon: UserCircle,
        description: "Pessoas físicas e jurídicas vinculadas",
        permission: "entidades:read",
      },
      {
        label: "Pastoreio",
        href: "/pastoreio",
        icon: Heart,
        description: "Visitas, anotações e acompanhamento",
        permission: "pastoreio:read",
        modulo: "pastoreio",
      },
      {
        label: "Pequenos Grupos",
        href: "/pequenos-grupos",
        icon: UsersRound,
        description: "PGs, encontros e remanejamento",
        permission: "pequenos_grupos:read",
        modulo: "pequenos-grupos",
      },
      {
        label: "Ministérios",
        href: "/ministerios",
        icon: Users,
        description: "Equipes, papéis e escalas",
        permission: "ministerios:read",
        modulo: "ministerios",
      },
    ],
  },
  {
    titulo: "Educacional",
    items: [
      {
        label: "Turmas e relatórios",
        href: "/educacional",
        icon: Baby,
        description: "Crianças, escalas e relatórios de aula",
        permission: "educacional:read",
        modulo: "educacional",
      },
      {
        label: "Presença",
        href: "/educacional/presenca",
        icon: ClipboardList,
        description: "Registro de presença das crianças",
        permission: "educacional:write",
        modulo: "educacional",
      },
    ],
  },
  {
    titulo: "Operação",
    items: [
      {
        label: "Tarefas",
        href: "/tarefas",
        icon: ListTodo,
        description: "Acompanhamento e TODO",
        permission: "tarefas:read",
        modulo: "tarefas",
      },
      {
        label: "Turmas e cursos",
        href: "/turmas",
        icon: GraduationCap,
        description: "Catecúmenos, novos membros e inscrições",
        permission: "turmas:read",
        modulo: "turmas",
      },
      {
        label: "Biblioteca (admin)",
        href: "/biblioteca",
        icon: Library,
        description: "Acervo, exemplares e empréstimos",
        permission: "biblioteca:update",
        modulo: "biblioteca",
      },
    ],
  },
  {
    titulo: "Admin",
    items: [
      {
        label: "Permissões",
        href: "/admin/permissoes",
        icon: Shield,
        description: "Roles, convites e matriz de acesso",
      },
      {
        label: "Módulos",
        href: "/admin/modulos",
        icon: LayoutGrid,
        description: "Ligar e desligar funcionalidades",
      },
      {
        label: "Campanhas",
        href: "/admin/campanhas",
        icon: Megaphone,
        description: "WhatsApp em massa para atualização de cadastro",
        permission: "campanhas:manage",
      },
      {
        label: "Atos Pastorais",
        href: "/admin/atos-pastorais",
        icon: BookOpen,
        description: "Registro de sacramentos e verificação do livro físico",
        permission: "atos_pastorais:manage",
      },
      {
        label: "Auditoria",
        href: "/admin/auditoria",
        icon: History,
        description: "Logs de alterações no sistema",
        permission: "audit:read",
      },
    ],
  },
];

export function isDomingoWindow(date: Date = new Date()): boolean {
  const day = date.getDay(); // 0 = domingo, 6 = sábado
  const hour = date.getHours();
  if (day === 0) return true;
  if (day === 6 && hour >= 18) return true;
  return false;
}
