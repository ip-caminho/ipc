"use client";

import { GuidedProfileFlow } from "@features/membros/components/GuidedProfileFlow";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";

export default function CompletarPerfilPage() {
  return (
    <HeaderLayout showUserMenu={false}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <GuidedProfileFlow />
      </div>
    </HeaderLayout>
  );
}
