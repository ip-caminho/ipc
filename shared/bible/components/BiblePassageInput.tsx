"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/shared/components/ui/popover";
import { useBibleLookup } from "../hooks/useBibleLookup";
import { BibleVersePreview } from "./BibleVersePreview";

interface BiblePassageInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  variant?: "form" | "inline";
  placeholder?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
}

export function BiblePassageInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  variant = "form",
  placeholder = "Ex: João 3:16; Rm 8:28",
  className,
  id,
  autoFocus,
}: BiblePassageInputProps) {
  const { loading, results, error } = useBibleLookup(value);
  const [open, setOpen] = useState(false);
  const hasPreview = loading || results.length > 0 || error;
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  if (variant === "inline") {
    const handleBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (popoverRef.current?.contains(active)) return;
        setOpen(false);
        onBlur?.();
      }, 200);
    };

    return (
      <Popover open={open && !!hasPreview}>
        <PopoverAnchor asChild>
          <Input
            id={id}
            className={className}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
          />
        </PopoverAnchor>
        <PopoverContent
          ref={popoverRef}
          className="w-96 p-0"
          side="bottom"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <BibleVersePreview
            loading={loading}
            results={results}
            error={error}
            maxHeight="250px"
          />
        </PopoverContent>
      </Popover>
    );
  }

  // variant="form" — preview abaixo do input
  return (
    <div className="space-y-1">
      <Input
        id={id}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
      />
      {hasPreview && (
        <div className="rounded-md border bg-muted/30">
          <BibleVersePreview
            loading={loading}
            results={results}
            error={error}
          />
        </div>
      )}
    </div>
  );
}
