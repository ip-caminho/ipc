"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAudioPlayer } from "@shared/audio/useAudioPlayer";
import { haptic } from "@shared/lib/haptic";

type MobileFabProps = { label: string; mostrarRotulo?: boolean } & (
  | { onClick: () => void; href?: never }
  | { href: string; onClick?: never }
);

// Acao primaria flutuante, so no mobile, acima da FloatingBottomBar (e do player
// quando ativo). No desktop a acao fica no PageHeader (prop action).
export function MobileFab({ label, mostrarRotulo, onClick, href }: MobileFabProps) {
  const { isActive } = useAudioPlayer();

  const tamanho = mostrarRotulo
    ? "h-14 gap-2 pl-5 pr-6 text-base font-semibold transition-transform duration-100 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
    : "size-14";
  const className = `md:hidden fixed right-4 z-[45] flex ${tamanho} items-center justify-center rounded-full bg-foreground text-background shadow-lg active:opacity-90`;
  const style = {
    bottom: `calc(${isActive ? "10.5rem" : "6rem"} + env(safe-area-inset-bottom, 0px))`,
  };
  const icon = (
    <>
      <Plus className={mostrarRotulo ? "h-5 w-5" : "h-6 w-6"} strokeWidth={mostrarRotulo ? 2.5 : 2} aria-hidden />
      {mostrarRotulo && label}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className} style={style} onClick={() => haptic(20)}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      style={style}
      onClick={() => {
        haptic(20);
        onClick?.();
      }}
    >
      {icon}
    </button>
  );
}
