import { cn } from "@shared/lib/utils/cn";
import { Logo } from "./Logo";

/**
 * Loader de marca: o logo da igreja pulsando suavemente. Usado nas telas de
 * carregamento global (auth, modulos) no lugar de um spinner generico.
 */
export function BrandLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-dvh w-full items-center justify-center bg-background",
        className,
      )}
    >
      <Logo className="h-12 w-auto animate-pulse motion-reduce:animate-none" />
    </div>
  );
}
