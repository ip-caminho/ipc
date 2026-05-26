"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/shared/components/ui/drawer";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@shared/components/ui/progress";
import { cn } from "@shared/lib/utils/cn";

const STORAGE_KEY = "profile-nudge-dismissed";

export function ProfileNudgeDialog() {
  const data = useQuery(api.membros.cadastroVivo.getMyCompleteness);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (data === undefined || data === null) return;
    if (data.percentage >= 100) return;
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [data]);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(STORAGE_KEY, "1");
  };

  if (!data || data.percentage >= 100) return null;

  const progressColor =
    data.percentage > 80
      ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
      : data.percentage >= 50
        ? "[&_[data-slot=progress-indicator]]:bg-amber-500"
        : "[&_[data-slot=progress-indicator]]:bg-red-500";

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-lg">Complete seu perfil</DrawerTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Seu cadastro esta {data.percentage}% completo
          </p>
        </DrawerHeader>

        <div className="px-6 pb-2 space-y-3">
          <Progress value={data.percentage} className={cn("h-2", progressColor)} />

          {data.missing.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {data.missing.slice(0, 5).map((f: { key: string; label: string }) => (
                <span
                  key={f.key}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {f.label}
                </span>
              ))}
              {data.missing.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{data.missing.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" onClick={dismiss} className="flex-1">
            Depois
          </Button>
          <Button
            onClick={() => {
              dismiss();
              router.push("/meu-perfil/completar");
            }}
            className="flex-1"
          >
            Completar agora
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
