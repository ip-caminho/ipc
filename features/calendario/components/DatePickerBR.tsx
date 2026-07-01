"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils/cn";

type Props = {
  id?: string;
  value: string; // ISO yyyy-MM-dd ("" = vazio)
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
};

// Date picker para eventos: exibe dd/MM/yyyy (independente do locale do
// navegador), navegação livre passado/futuro, mantém value em ISO (yyyy-MM-dd).
export function DatePickerBR({ id, value, onChange, placeholder = "dd/mm/aaaa", className }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal",
            !valid && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
          {valid ? format(valid, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={valid}
          captionLayout="dropdown"
          startMonth={new Date(2015, 0)}
          endMonth={new Date(2035, 11)}
          defaultMonth={valid ?? new Date()}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
