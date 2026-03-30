"use client";

import { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "./useAudioPlayer";
import { useMediaSession } from "./useMediaSession";
import { formatTime } from "./utils";
import { Slider } from "@/shared/components/ui/slider";
import { Button } from "@/shared/components/ui/button";
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward, MessageCircle } from "lucide-react";
import Link from "next/link";

export function GlobalAudioPlayer() {
  const player = useAudioPlayer();
  const { track, isPlaying, isActive, relativeTime, segmentDuration, volume, maxVolume, togglePlayPause, seek, seekRelative, setVolume, close } = player;

  useMediaSession(player);

  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const wasActive = useRef(false);

  // Slide-up animation on mount, slide-down on unmount
  useEffect(() => {
    if (isActive && !wasActive.current) {
      // Just became active — trigger slide-up
      requestAnimationFrame(() => setVisible(true));
    }
    if (!isActive && wasActive.current) {
      setVisible(false);
      setExpanded(false);
    }
    wasActive.current = isActive;
  }, [isActive]);

  if (!isActive || !track) return null;

  const progress = segmentDuration > 0 ? relativeTime / segmentDuration : 0;

  const handleClose = () => {
    setVisible(false);
    setExpanded(false);
    // Wait for animation to finish before actually closing
    setTimeout(() => close(), 200);
  };

  return (
    <div
      className={`shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-all duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      {/* Mobile progress bar on top (only when collapsed) */}
      {!expanded && (
        <div className="block md:hidden h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Compact bar */}
      <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5">
        {/* Equalizer bars */}
        <style>{`
          @keyframes eq1 { 0%,100%{height:4px} 50%{height:14px} }
          @keyframes eq2 { 0%,100%{height:10px} 50%{height:5px} }
          @keyframes eq3 { 0%,100%{height:6px} 50%{height:16px} }
        `}</style>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 16, flexShrink: 0 }}>
          <span style={{ width: 3, borderRadius: 9999, backgroundColor: "#3b82f6", opacity: isPlaying ? 1 : 0.3, height: isPlaying ? 4 : 4, animation: isPlaying ? "eq1 0.8s ease-in-out infinite" : "none" }} />
          <span style={{ width: 3, borderRadius: 9999, backgroundColor: "#3b82f6", opacity: isPlaying ? 1 : 0.3, height: isPlaying ? 10 : 6, animation: isPlaying ? "eq2 0.6s ease-in-out infinite" : "none" }} />
          <span style={{ width: 3, borderRadius: 9999, backgroundColor: "#3b82f6", opacity: isPlaying ? 1 : 0.3, height: isPlaying ? 6 : 4, animation: isPlaying ? "eq3 0.9s ease-in-out infinite" : "none" }} />
        </div>

        {/* Title area — tap to expand on mobile */}
        <button
          type="button"
          className="min-w-0 flex-1 mr-1 text-left md:pointer-events-none"
          onClick={() => setExpanded(!expanded)}
        >
          <p className="text-sm font-medium truncate">{track.title}</p>
          {track.artist && (
            <p className="text-xs text-muted-foreground truncate hidden md:block">{track.artist}</p>
          )}
        </button>

        {/* Play/Pause — desktop only in compact bar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 hidden md:flex"
          onClick={togglePlayPause}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Desktop: slider + time + volume */}
        <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatTime(relativeTime)}
          </span>
          <Slider
            min={0}
            max={segmentDuration || 1}
            step={0.5}
            value={[Math.max(0, Math.min(relativeTime, segmentDuration))]}
            onValueChange={([v]) => seek(v)}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatTime(segmentDuration)}
          </span>

          {/* Volume */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
            >
              {volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            <Slider
              min={0}
              max={maxVolume}
              step={0.05}
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              className="w-20 cursor-pointer"
            />
          </div>
        </div>

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile expanded panel */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-200 ease-out ${
          expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-3 space-y-3">
          {/* Artist (shown when expanded) */}
          {track.artist && (
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          )}

          {/* Progress slider */}
          <div className="space-y-1">
            <Slider
              min={0}
              max={segmentDuration || 1}
              step={0.5}
              value={[Math.max(0, Math.min(relativeTime, segmentDuration))]}
              onValueChange={([v]) => seek(v)}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{formatTime(relativeTime)}</span>
              <span>{formatTime(segmentDuration)}</span>
            </div>
          </div>

          {/* Controls: skip back, play/pause, skip forward */}
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => seekRelative(-10)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => seekRelative(30)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Link para pregação — não mostrar para avisos */}
          {track.gravacaoId && !track.title.toLowerCase().includes("aviso") && (
            <Link
              href={`/gravacoes/${track.gravacaoId}`}
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
            >
              <MessageCircle className="h-4 w-4" />
              Ver pregação e comentários
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
