"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { OnboardingWizard } from "@features/onboarding/components/OnboardingWizard";

export default function BemVindoPage() {
  const data = useQuery(api.membros.onboarding.getOnboardingData);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="h-96 w-full max-w-md" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Perfil nao encontrado.</p>
      </div>
    );
  }

  return <OnboardingWizard data={data} />;
}
