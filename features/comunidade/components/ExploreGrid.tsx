"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, DoorOpen, Library, type LucideIcon } from "lucide-react";
import { useAuth } from "@shared/providers/PermissionsProvider";
import type { Permission } from "@/types/auth";
import { SectionLabel } from "@features/dashboard/components/SectionLabel";

type Item = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
};

const ITEMS: Item[] = [
  { label: "Diretório", href: "/diretorio", icon: BookOpen, permission: "diretorio:read" },
  { label: "Calendário", href: "/calendario", icon: CalendarDays, permission: "calendario:read" },
  { label: "Biblioteca", href: "/biblioteca", icon: Library, permission: "biblioteca:read" },
  { label: "Salas", href: "/salas", icon: DoorOpen, permission: "salas:read" },
];

export function ExploreGrid() {
  const { can } = useAuth();
  const visibleItems = ITEMS.filter((item) => can(item.permission));

  if (visibleItems.length === 0) return null;

  return (
    <section className="px-4">
      <SectionLabel className="mb-2">Explorar</SectionLabel>

      <div className="grid grid-cols-2 gap-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 bg-secondary rounded-md p-2.5 min-h-11 active:opacity-80 transition-opacity"
          >
            <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
