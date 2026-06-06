import Image from "next/image";
import { cn } from "@shared/lib/utils/cn";

/**
 * Logo do IPC (public/logo.png — preto sobre transparente).
 * `dark:invert` deixa o logo branco no modo escuro.
 * Controle o tamanho pela altura via className (ex: "h-6", "h-12").
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="IPC"
      width={234}
      height={179}
      priority
      className={cn("h-8 w-auto dark:invert", className)}
    />
  );
}
