"use client";

import { useAuth } from "@shared/providers/PermissionsProvider";
import { HeaderLayout } from "@shared/components/layout/HeaderLayout";
import { PageHeader } from "@shared/components/layout/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CampaignForm } from "@features/campanhas/components/CampaignForm";

export default function NovaCampanhaPage() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) {
    return (
      <HeaderLayout>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout>
      <PageHeader title="Nova campanha" />
      <div className="max-w-2xl">
        <CampaignForm />
      </div>
    </HeaderLayout>
  );
}
