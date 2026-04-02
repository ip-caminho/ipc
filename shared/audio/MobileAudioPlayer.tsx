"use client";

import { useAudioPlayer } from "./useAudioPlayer";
import { GlobalAudioPlayer } from "./GlobalAudioPlayer";

export function MobileAudioPlayer() {
  const { isActive } = useAudioPlayer();
  if (!isActive) return null;

  return (
    <div className="fixed bottom-17 inset-x-0 z-[55] md:hidden">
      <GlobalAudioPlayer />
    </div>
  );
}

/** Altura total do player + tab bar no mobile (para compensar em overlays) */
export const MOBILE_BOTTOM_OFFSET = "calc(56px + 56px)"; // tab bar + player
