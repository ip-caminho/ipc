"use client";

import { createContext, useContext, useCallback, useState } from "react";
import { useAuth } from "./PermissionsProvider";
import { ELEVATED_ROLES } from "@shared/constants/navigation";

type NavigationMode = "member" | "admin";

interface NavigationModeContext {
  mode: NavigationMode;
  setMode: (mode: NavigationMode) => void;
  isAdminMode: boolean;
  canToggle: boolean;
}

const Context = createContext<NavigationModeContext>({
  mode: "member",
  setMode: () => {},
  isAdminMode: false,
  canToggle: false,
});

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 365}`;
}

export function NavigationModeProvider({ children }: { children: React.ReactNode }) {
  const { hasAnyRole } = useAuth();
  const canToggle = hasAnyRole(ELEVATED_ROLES);

  const [mode, setModeState] = useState<NavigationMode>(() => {
    if (!canToggle) return "member";
    const stored = getCookie("nav-mode");
    return stored === "admin" ? "admin" : "member";
  });

  const setMode = useCallback(
    (newMode: NavigationMode) => {
      if (!canToggle) return;
      setModeState(newMode);
      setCookie("nav-mode", newMode);
    },
    [canToggle]
  );

  const effectiveMode = canToggle ? mode : "member";

  return (
    <Context.Provider
      value={{
        mode: effectiveMode,
        setMode,
        isAdminMode: effectiveMode === "admin",
        canToggle,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useNavigationMode() {
  return useContext(Context);
}
