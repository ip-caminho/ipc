"use client";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { VELOCIDADES } from "./AudioPlayerProvider";

function rotulo(v: number): string {
  return `${String(v).replace(".", ",")}×`;
}

/** Seletor de velocidade de reproducao (1×–2×). */
export function VelocidadeButton({
  playbackRate,
  setPlaybackRate,
  className,
  size = "sm",
}: {
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Velocidade de reprodução: ${rotulo(playbackRate)}`}
          className={cn(
            "shrink-0 px-2 tabular-nums text-muted-foreground hover:text-foreground",
            size === "sm" ? "h-7 text-xs" : "h-11 min-w-[44px] text-sm",
            playbackRate !== 1 && "text-primary hover:text-primary",
            className,
          )}
        >
          {rotulo(playbackRate)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[7rem]">
        {VELOCIDADES.map((v) => (
          <DropdownMenuItem
            key={v}
            onSelect={() => setPlaybackRate(v)}
            className="justify-between tabular-nums"
          >
            {rotulo(v)}
            {v === playbackRate && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
