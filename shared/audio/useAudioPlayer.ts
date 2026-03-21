"use client";

import { useContext } from "react";
import { AudioPlayerContext, type AudioPlayerContextType } from "./AudioPlayerProvider";

export function useAudioPlayer(): AudioPlayerContextType {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}
