"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

interface Props {
  firstName: string;
}

export function CompletionStep({ firstName }: Props) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/dashboard"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center text-center gap-4 py-12">
      <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in duration-300">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Tudo pronto, {firstName}!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Redirecionando para o inicio...
        </p>
      </div>
    </div>
  );
}
