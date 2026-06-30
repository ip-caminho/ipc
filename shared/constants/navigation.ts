import {
  Home,
  Users,
  HandHeart,
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
  ClipboardCheck,
  Globe,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { Permission, Role } from "@/types/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  permission?: Permission;
  modulo?: string;
  // Restringe o item a papeis especificos. Usado para itens administrativos
  // que nao tem uma permission natural no catalogo (Permissoes, Modulos).
  roles?: Role[];
};

export type NavSection = {
  titulo: string;
  items: NavItem[];
};

// Tabs primarias do sidebar desktop (sempre no topo, fora dos grupos).
export const PRIMARY_TABS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: Home },
  { label: "Gravações", href: "/comunidade", icon: Ear, modulo: "gravacoes" },
  { label: "Orar", href: "/pedidos-oracao", icon: HandHeart, modulo: "pedidos-oracao" },
];

// Tabs candidatas da bottom bar mobile (filtradas por RBAC/modulo; "Membros"
// so aparece para quem tem membros:read).
export const MOBILE_PRIMARY_TABS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: Home },
  { label: "Gravações", href: "/comunidade", icon: Ear, modulo: "gravacoes" },
  { label: "Membros", href: "/membros", icon: Users, permission: "membros:read", modulo: "membros" },
];

export const BOLETIM_TAB: NavItem = {
  label: "Boletim",
  href: "/boletim",
  icon: FileText,
  permission: "escalas:read",
  modulo: "boletim",
};

export const MORE_TAB: NavItem = {
  label: "Mais",
  href: "/__more__",
  icon: MoreHorizontal,
};

// Secoes do sidebar/MoreSheet. Visibilidade 100% por RBAC: cada item aparece
// se can(permission) (ou roles) e o modulo estiver ativo. Uma secao vazia
// (sem itens visiveis) some sozinha. Sem "modo gestao".
export const GESTAO_SECTIONS: NavSection[] = [
  {
    titulo: "Cultos e Louvor",
    items: [
      {
        label: "Planejamento",
        href: "/cultos",
        icon: Church,
        description: "Planejamento, liturgia e escalas",
        permission: "escalas:read",
        modulo: "escalas",
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
      {
        label: "Avisos",
        href: "/avisos",
        icon: Megaphone,
        description: "Comunicados semanais",
        permission: "escalas:create",
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
        label: "Rol de Membros",
        href: "/secretario-executivo",
        icon: BookOpen,
        description: "Rol IPB, família, dados eclesiásticos e impressão para assembleia",
        permission: "rol:read",
        modulo: "membros",
      },
      {
        label: "Diretório",
        href: "/diretorio",
        icon: BookOpen,
        description: "Contatos, aniversários e famílias",
        permission: "diretorio:read",
        modulo: "diretorio",
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
      {
        label: "Educacional",
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
      {
        label: "Turmas e cursos",
        href: "/turmas",
        icon: GraduationCap,
        description: "Catecúmenos, novos membros e inscrições",
        permission: "turmas:read",
        modulo: "turmas",
      },
    ],
  },
  {
    titulo: "Administração",
    items: [
      {
        label: "Calendário",
        href: "/calendario",
        icon: CalendarDays,
        description: "Eventos e datas da igreja",
        permission: "calendario:read",
        modulo: "calendario",
      },
      {
        label: "Salas",
        href: "/salas",
        icon: DoorOpen,
        description: "Reserva de salas e espaços",
        permission: "salas:read",
        modulo: "salas",
      },
      {
        label: "Biblioteca",
        href: "/biblioteca",
        icon: Library,
        description: "Acervo, exemplares e empréstimos",
        permission: "biblioteca:read",
        modulo: "biblioteca",
      },
      {
        label: "Tarefas",
        href: "/tarefas",
        icon: ListTodo,
        description: "Acompanhamento e TODO",
        permission: "tarefas:read",
        modulo: "tarefas",
      },
      {
        label: "Cadastro Vivo",
        href: "/admin/cadastro-vivo",
        icon: ClipboardCheck,
        description: "Completude e saude dos perfis de membros",
        permission: "membros:read",
      },
      {
        label: "Campanhas",
        href: "/admin/campanhas",
        icon: Megaphone,
        description: "WhatsApp em massa para atualização de cadastro",
        permission: "campanhas:manage",
      },
      {
        label: "Site público",
        href: "/admin/site-publico",
        icon: Globe,
        description: "Manutenção do site: informações, agenda, avisos, inscrições",
        permission: "site_publico:manage",
      },
      {
        label: "Atos Pastorais",
        href: "/admin/atos-pastorais",
        icon: BookOpen,
        description: "Registro de sacramentos e verificação do livro físico",
        permission: "atos_pastorais:manage",
      },
      {
        label: "Permissões",
        href: "/admin/permissoes",
        icon: Shield,
        description: "Roles, convites e matriz de acesso",
        roles: ["admin"],
      },
      {
        label: "Módulos",
        href: "/admin/modulos",
        icon: LayoutGrid,
        description: "Ligar e desligar funcionalidades",
        roles: ["admin"],
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
