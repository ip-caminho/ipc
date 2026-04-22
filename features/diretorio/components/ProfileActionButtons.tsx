"use client";

import { MessageCircle, Phone } from "lucide-react";
import { cn } from "@shared/lib/utils/cn";
import { cleanPhoneForWhatsApp } from "@shared/lib/validations/brazilian";

interface Props {
  whatsapp: string | null;
}

export function ProfileActionButtons({ whatsapp }: Props) {
  const enabled = !!whatsapp;
  const phone = enabled ? cleanPhoneForWhatsApp(whatsapp as string) : "";

  return (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton
        label="WhatsApp"
        icon={<MessageCircle className="h-5 w-5 text-white" />}
        bg="bg-emerald-500"
        disabled={!enabled}
        onClick={() =>
          enabled && window.open(`https://wa.me/${phone}`, "_blank")
        }
      />
      <ActionButton
        label="Ligar"
        icon={<Phone className="h-5 w-5 text-white" />}
        bg="bg-blue-500"
        disabled={!enabled}
        onClick={() => {
          if (enabled) window.location.href = `tel:+${phone}`;
        }}
      />
    </div>
  );
}

function ActionButton({
  label,
  icon,
  bg,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 min-h-[76px] active:opacity-80 transition-opacity",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", bg)}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
