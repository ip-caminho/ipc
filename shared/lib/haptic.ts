export function haptic(pattern: number | number[] = 20) {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // silencioso — browsers sem suporte ou permissao negada
  }
}
