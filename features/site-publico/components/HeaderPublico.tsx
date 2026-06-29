"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/shared/lib/utils/cn";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { NAV_PUBLICO } from "@features/site-publico/lib/nav";

// Header público sticky. Vira translúcido com blur + borda ao rolar.
export function HeaderPublico() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-200 motion-reduce:transition-none",
        scrolled
          ? "border-b border-[#E5E3DC] bg-[#FAFAF7]/85 backdrop-blur-md"
          : "border-b border-transparent bg-[#FAFAF7]",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:h-16 md:px-8">
        <Link
          href="/"
          aria-label="Igreja Presbiteriana do Caminho — início"
          className="inline-flex items-center"
        >
          <span className="border-[1.5px] border-[#1A1A1A] px-2.5 py-1 font-[family-name:var(--font-spectral)] text-[16px] font-medium leading-none text-[#1A1A1A]">
            ipc
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_PUBLICO.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-[family-name:var(--font-source-sans)] text-[13px] text-[#595959] transition-colors hover:text-[#1A1A1A]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden items-center border border-[#1A1A1A] px-3.5 py-1.5 font-[family-name:var(--font-source-sans)] text-[12px] text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-[#FAFAF7] md:inline-flex"
          >
            Área de membros →
          </Link>

          <Sheet>
            <SheetTrigger
              aria-label="Abrir menu"
              className="inline-flex h-10 w-10 items-center justify-center text-[#1A1A1A] md:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#FAFAF7]">
              <SheetTitle className="font-[family-name:var(--font-spectral)] text-[18px] text-[#1A1A1A]">
                Igreja Presbiteriana do Caminho
              </SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV_PUBLICO.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="py-3 font-[family-name:var(--font-source-sans)] text-[15px] text-[#1A1A1A]"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/dashboard"
                    className="mt-4 inline-flex items-center justify-center border border-[#1A1A1A] px-4 py-3 font-[family-name:var(--font-source-sans)] text-[14px] text-[#1A1A1A]"
                  >
                    Área de membros →
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
