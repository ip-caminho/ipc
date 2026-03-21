"use client";

import { useEffect } from "react";
import type { AudioPlayerContextType } from "./AudioPlayerProvider";

export function useMediaSession(player: AudioPlayerContextType) {
  const { track, isPlaying, relativeTime, segmentDuration, togglePlayPause, seekRelative, close } = player;

  // Update metadata
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? "",
    });
  }, [track]);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying, track]);

  // Action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => togglePlayPause()],
      ["pause", () => togglePlayPause()],
      ["seekbackward", () => seekRelative(-10)],
      ["seekforward", () => seekRelative(30)],
      ["stop", () => close()],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      }
    };
  }, [track, togglePlayPause, seekRelative, close]);

  // Update position state
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track || !segmentDuration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: segmentDuration,
        playbackRate: 1,
        position: Math.min(Math.max(0, relativeTime), segmentDuration),
      });
    } catch {
      // Invalid state
    }
  }, [track, relativeTime, segmentDuration]);
}
