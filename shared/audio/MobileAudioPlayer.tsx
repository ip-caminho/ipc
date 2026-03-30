"use client";

import { GlobalAudioPlayer } from "./GlobalAudioPlayer";

export function MobileAudioPlayer() {
  return (
    <div className="fixed bottom-14 inset-x-0 z-50 md:hidden">
      <GlobalAudioPlayer />
    </div>
  );
}
