"use client";

import { Button } from "@/shared/components/ui/button";
import { Church, ArrowRight } from "lucide-react";

interface Props {
  firstName: string;
  onNext: () => void;
}

export function WelcomeStep({ firstName, onNext }: Props) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Church className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bem-vindo a IPC, {firstName}!</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Este app conecta voce a sua comunidade. Vamos configurar seu perfil em poucos passos.
        </p>
      </div>

      <Button className="w-full" size="lg" onClick={onNext}>
        Comecar
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
