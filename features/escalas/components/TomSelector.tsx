"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TOM_OPTIONS } from "@features/louvor/lib/constants";

interface TomSelectorProps {
  value: string | null | undefined;
  onChange: (tom: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TomSelector({ value, onChange, disabled, className }: TomSelectorProps) {
  return (
    <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className || "w-[70px] h-7 text-xs"}>
        <SelectValue placeholder="Tom" />
      </SelectTrigger>
      <SelectContent>
        {TOM_OPTIONS.map((tom) => (
          <SelectItem key={tom} value={tom} className="text-xs">
            {tom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
