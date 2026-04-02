"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushSubscription } from "./usePushSubscription";

export function PushPermissionBanner() {
  const { status, subscribe, isSupported } = usePushSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    // Check if already granted or dismissed
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    if (sessionStorage.getItem("push-banner-dismissed")) return;
    setShow(true);
  }, [isSupported]);

  if (!show || dismissed || status === "granted" || status === "unsupported") return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("push-banner-dismissed", "1");
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 md:hidden">
      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Ativar notificações</p>
        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Receba avisos da igreja no celular</p>
      </div>
      <button
        onClick={subscribe}
        disabled={status === "loading"}
        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 min-h-[36px] shrink-0"
      >
        {status === "loading" ? "..." : "Ativar"}
      </button>
      <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-600 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
