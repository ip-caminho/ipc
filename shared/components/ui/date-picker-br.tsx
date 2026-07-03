"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { type Matcher } from "react-day-picker";
import { cn } from "@/shared/lib/utils/cn";

type Props = {
  id?: string;
  value: string; // ISO yyyy-MM-dd ("" = vazio)
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string; // ISO yyyy-MM-dd: bloqueia datas anteriores
  max?: string; // ISO yyyy-MM-dd: bloqueia datas posteriores
};

// Date picker que exibe dd/MM/yyyy independente do locale do navegador
// (substitui <input type="date">, que renderiza no locale do SO e vira
// MM/DD/YYYY em navegadores em ingles). Mantem o value em ISO (yyyy-MM-dd).
export function DatePickerBR({
  id,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className,
  disabled,
  min,
  max,
}: Props) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;

  const bloqueio: Matcher[] = [];
  if (min) bloqueio.push({ before: parseISO(min) });
  if (max) bloqueio.push({ after: parseISO(max) });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          type="button"
          disabled={disabled}
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
          disabled={bloqueio.length ? bloqueio : undefined}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// Wrapper para React Hook Form: <DateFieldBR control={form.control} name="data" />
export function DateFieldBR<T extends FieldValues>({
  control,
  name,
  id,
  placeholder,
  className,
  disabled,
}: {
  control: Control<T>;
  name: Path<T>;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DatePickerBR
          id={id}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
      )}
    />
  );
}
