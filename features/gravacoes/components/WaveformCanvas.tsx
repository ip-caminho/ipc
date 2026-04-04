"use client";

import { useRef, useEffect, useCallback } from "react";

export interface WaveformRegion {
  start: number;
  end: number;
  color: string;
  label: string;
}

interface WaveformCanvasProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  regions?: WaveformRegion[];
  onSeek: (timeInSeconds: number) => void;
  className?: string;
}

// Cores via CSS variables
const PLAYED_COLOR = "hsl(var(--primary))";
const UNPLAYED_COLOR = "hsl(var(--muted-foreground) / 0.3)";
const PLAYHEAD_COLOR = "hsl(var(--primary))";

export function WaveformCanvas({
  peaks,
  duration,
  currentTime,
  regions = [],
  onSeek,
  className,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastDrawnTime = useRef(-1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || peaks.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Só redimensionar se necessário
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const barCount = peaks.length;
    const barWidth = width / barCount;
    const playedX = duration > 0 ? (currentTime / duration) * width : 0;

    // Regiões (fundo colorido)
    for (const region of regions) {
      const x1 = (region.start / duration) * width;
      const x2 = (region.end / duration) * width;
      ctx.fillStyle = region.color;
      ctx.fillRect(x1, 0, x2 - x1, height);
    }

    // Barras da waveform
    const gap = Math.max(1, barWidth * 0.2);
    const barDrawWidth = barWidth - gap;
    const centerY = height / 2;

    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth + gap / 2;
      const peakHeight = peaks[i] * (height * 0.9);
      const halfHeight = peakHeight / 2;

      ctx.fillStyle = x + barDrawWidth <= playedX ? PLAYED_COLOR : UNPLAYED_COLOR;
      // Barra simétrica (cima + baixo)
      ctx.fillRect(x, centerY - halfHeight, barDrawWidth, peakHeight || 1);
    }

    // Playhead
    if (duration > 0 && currentTime >= 0) {
      ctx.fillStyle = PLAYHEAD_COLOR;
      ctx.fillRect(playedX - 1, 0, 2, height);
    }
  }, [peaks, duration, currentTime, regions]);

  // Redesenhar quando peaks/regions/duration mudam
  useEffect(() => {
    draw();
  }, [draw]);

  // Animação do playhead com rAF (throttled ~30fps)
  useEffect(() => {
    const animate = () => {
      if (Math.abs(currentTime - lastDrawnTime.current) > 0.05) {
        draw();
        lastDrawnTime.current = currentTime;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentTime, draw]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || duration <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      onSeek(Math.max(0, Math.min(duration, ratio * duration)));
    },
    [duration, onSeek]
  );

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="cursor-pointer w-full h-full"
      />
    </div>
  );
}
