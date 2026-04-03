"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function SubPageHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="md:hidden flex items-center gap-2 -mt-2 mb-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] justify-center"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
