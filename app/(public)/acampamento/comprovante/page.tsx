import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ComprovanteForm } from "@features/acampamento/components/ComprovanteForm";

export const metadata = { title: "Enviar comprovante — IPC" };

export default function ComprovantePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <ComprovanteForm />
    </Suspense>
  );
}
