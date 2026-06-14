import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SubirAudioForm } from "@features/gravacoes/components/SubirAudioForm";

export default function SubirAudioPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <SubirAudioForm />
    </Suspense>
  );
}
