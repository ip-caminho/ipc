"use client";

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/shared/components/ui/empty";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EduEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

// Estado vazio padrao do modulo educacional: icone + titulo + descricao + CTA.
export function EduEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EduEmptyStateProps) {
  return (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
