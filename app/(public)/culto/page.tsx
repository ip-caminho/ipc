import { BoletimContent } from "@features/boletim/components/BoletimContent";
import Link from "next/link";
import { Logo } from "@shared/components/layout/Logo";
import { Button } from "@/shared/components/ui/button";

export default function BoletimPublicoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6" />
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/signin">Área do membro</Link>
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <BoletimContent />
      </main>
    </div>
  );
}
