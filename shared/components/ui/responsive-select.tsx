"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/shared/lib/utils/cn"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer"

export interface ResponsiveSelectOption {
  value: string
  label: string
  keywords?: string[]
  disabled?: boolean
}

interface ResponsiveSelectProps {
  options: ResponsiveSelectOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  title?: string
  disabled?: boolean
  triggerClassName?: string
  align?: "start" | "center" | "end"
  renderOption?: (
    option: ResponsiveSelectOption,
    selected: boolean,
  ) => React.ReactNode
  renderTrigger?: (
    selected: ResponsiveSelectOption | undefined,
  ) => React.ReactNode
}

export function ResponsiveSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecionar",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado",
  title,
  disabled,
  triggerClassName,
  align = "start",
  renderOption,
  renderTrigger,
}: ResponsiveSelectProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  )

  const triggerNode = renderTrigger ? (
    renderTrigger(selected)
  ) : (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        !selected && "text-muted-foreground",
        triggerClassName,
      )}
    >
      <span className="truncate text-left">
        {selected ? selected.label : placeholder}
      </span>
      <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
    </button>
  )

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
  }

  const list = (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList className={isMobile ? "max-h-[60dvh]" : undefined}>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <CommandItem
                key={option.value}
                value={option.value}
                keywords={[option.label, ...(option.keywords ?? [])]}
                disabled={option.disabled}
                onSelect={() => handleSelect(option.value)}
                className="min-h-[44px]"
              >
                {renderOption ? (
                  renderOption(option, isSelected)
                ) : (
                  <>
                    <span className="flex-1 truncate">{option.label}</span>
                    {isSelected && (
                      <CheckIcon className="ml-auto size-4 shrink-0" />
                    )}
                  </>
                )}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerNode}</DrawerTrigger>
        <DrawerContent className="max-h-[85dvh] pb-safe">
          {title ? (
            <DrawerHeader className="border-b">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
          ) : (
            <DrawerHeader className="sr-only">
              <DrawerTitle>{placeholder}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="flex-1 min-h-0">{list}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
      <PopoverContent align={align} className="w-64 max-w-[95vw] p-0">
        {list}
      </PopoverContent>
    </Popover>
  )
}
