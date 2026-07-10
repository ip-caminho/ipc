import {
  Home,
  Users,
  HandHeart,
  Ear,
  Music,
  BookOpen,
  CalendarDays,
  CalendarOff,
  Library,
  DoorOpen,
  Church,
  Monitor,
  Mic,
  Megaphone,
  Heart,
  UsersRound,
  Baby,
  ClipboardList,
  Tent,
  ListTodo,
  GraduationCap,
  Shield,
  KeyRound,
  LayoutGrid,
  History,
  ClipboardCheck,
  Globe,
  UserPlus,
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
  { label: "Louvor", href: "/louvor", icon: Music, permission: "louvor:read", modulo: "louvor" },
  { label: "Diretório", href: "/diretorio", icon: BookOpen, permission: "diretorio:read", modulo: "diretorio" },
  { label: "Calendário", href: "/calendario", icon: CalendarDays, permission: "calendario:read", modulo: "calendario" },
  { label: "Orar", href: "/pedidos-oracao", icon: HandHeart, modulo: "pedidos-oracao" },
];

// Tabs candidatas da bottom bar mobile (filtradas por RBAC/modulo; "Membros"
// aponta pro Rol consolidado e so aparece para quem tem rol:read).
export const MOBILE_PRIMARY_TABS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: Home },
  { label: "Gravações", href: "/comunidade", icon: Ear, modulo: "gravacoes" },
  { label: "Louvor", href: "/louvor", icon: Music, permission: "louvor:read", modulo: "louvor" },
  { label: "Diretório", href: "/diretorio", icon: BookOpen, permission: "diretorio:read", modulo: "diretorio" },
  { label: "Calendário", href: "/calendario", icon: CalendarDays, permission: "calendario:read", modulo: "calendario" },
  { label: "Orar", href: "/pedidos-oracao", icon: HandHeart, modulo: "pedidos-oracao" },
];

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
    titulo: "Pastoral",
    items: [
      {
        label: "Membros",
        href: "/membros",
        icon: Users,
        description: "Membresia: rol IPB, dados pessoais e eclesiásticos, família e impressão",
        permission: "rol:read",
        modulo: "membros",
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
        label: "Pastoreio",
        href: "/pastoreio",
        icon: Heart,
        description: "Visitas, anotações e acompanhamento",
        permission: "pastoreio:read",
        modulo: "pastoreio",
      },
      {
        label: "Tarefas",
        href: "/tarefas",
        icon: ListTodo,
        description: "Acompanhamento e TODO",
        permission: "tarefas:read",
        modulo: "tarefas",
      },
    ],
  },
  {
    titulo: "Secretaria",
    items: [
      {
        label: "Cadastro Vivo",
        href: "/admin/cadastro-vivo",
        icon: ClipboardCheck,
        description: "Completude e saude dos perfis de membros",
        permission: "membros:read",
      },
      {
        label: "Inscrições",
        href: "/admin/inscricoes",
        icon: ClipboardList,
        description: "Inscrições genéricas de eventos e suas respostas",
        permission: "inscricoes:manage",
      },
      {
        label: "Solicitações de cadastro",
        href: "/admin/solicitacoes-familia",
        icon: UserPlus,
        description: "Pedidos de cadastro de familiar (filho/cônjuge) para aprovar",
        permission: "membros:create",
      },
      {
        label: "Retiro",
        href: "/admin/retiro",
        icon: Tent,
        description: "Inscrições do retiro anual: grupos, quartos e pagamentos",
        permission: "inscricoes:manage",
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
        description: "Manutenção do site: informações, agenda, avisos e textos",
        permission: "site_publico:manage",
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
    ],
  },
  {
    titulo: "Culto",
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
        label: "Cadastrar Aviso",
        href: "/avisos",
        icon: Megaphone,
        description: "Comunicados semanais",
        permission: "avisos:create",
      },
      {
        label: "Ausências",
        href: "/ausencias",
        icon: CalendarOff,
        description: "Avisar que estará ausente e ver ausências da liderança",
        permission: "ausencias:read",
      },
      {
        label: "Multimídia",
        href: "/multimidia",
        icon: Monitor,
        description: "Painel operacional do culto",
        permission: "multimidia:read",
        modulo: "multimidia",
      },
    ],
  },
  {
    titulo: "Ensino",
    items: [
      {
        label: "Turmas e cursos",
        href: "/turmas",
        icon: GraduationCap,
        description: "Catecúmenos, novos membros e inscrições",
        permission: "turmas:read",
        modulo: "turmas",
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
    ],
  },
  {
    titulo: "Sistema",
    items: [
      {
        label: "Acesso ao sistema",
        href: "/admin/acesso",
        icon: KeyRound,
        description: "Links de ativação, reset de senha, link de convidado e atividade",
        permission: "acesso:manage",
        modulo: "membros",
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
        label: "Gerenciar gravações",
        href: "/admin/gravacoes",
        icon: Mic,
        description: "Upload, processamento IA e publicação",
        permission: "gravacoes:update",
        modulo: "gravacoes",
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
