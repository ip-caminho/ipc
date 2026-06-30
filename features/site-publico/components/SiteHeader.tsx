"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { NAV_PUBLICO } from "@features/site-publico/lib/nav";

// Header público compartilhado (identidade da landing, .site-v2). Sticky + blur
// vêm da landing.css; o menu mobile (≤920px) usa Sheet.
export function SiteHeader() {
  return (
    <div className="site-v2">
      <header className="site">
        <div className="site-inner">
          <Link href="/" className="brand" aria-label="Igreja Presbiteriana do Caminho — início">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="IPC" />
            <span className="bar" />
            <span className="name">
              <span className="l1">Igreja Presbiteriana</span>
              <span className="l2">do Caminho</span>
            </span>
          </Link>

          <nav className="primary" aria-label="Principal">
            {NAV_PUBLICO.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-cta">
            <Link href="/dashboard" className="btn btn-outline">
              Área de membros&nbsp;→
            </Link>

            <Sheet>
              <SheetTrigger aria-label="Abrir menu" className="menu-toggle">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="site-v2 bg-[var(--surface-page)]">
                <SheetTitle className="font-[family-name:var(--font-spectral)] text-[18px] text-[color:var(--text-strong)]">
                  Igreja Presbiteriana do Caminho
                </SheetTitle>
                <nav className="mt-6 flex flex-col gap-1">
                  {NAV_PUBLICO.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="py-3 font-[family-name:var(--font-source-sans)] text-[15px] text-[color:var(--text-body)]"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link href="/dashboard" className="btn btn-outline mt-4 justify-center">
                      Área de membros →
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </div>
  );
}
