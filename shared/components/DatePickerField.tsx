"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils/cn";

type Props = {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
  disabled?: boolean;
};

export function DatePickerField({
  value,
  onChange,
  placeholder = "Selecione",
  maxDate,
  minDate,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !valid && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 mr-2 opacity-60" />
          {valid
            ? format(valid, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={valid}
          captionLayout="dropdown"
          startMonth={minDate ?? new Date(1900, 0)}
          endMonth={maxDate ?? new Date()}
          defaultMonth={valid ?? maxDate ?? new Date()}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          disabled={(d) => {
            if (maxDate && d > maxDate) return true;
            if (minDate && d < minDate) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
