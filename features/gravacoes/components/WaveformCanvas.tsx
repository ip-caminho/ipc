"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

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

const PLAYED_COLOR = "hsl(215, 70%, 55%)";
const UNPLAYED_COLOR = "hsl(215, 15%, 60%)";
const PLAYHEAD_COLOR = "hsl(0, 85%, 55%)";

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

  // Zoom: viewStart e viewEnd em segundos
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);

  // Se viewEnd não foi inicializado, usar duration
  const effectiveViewEnd = viewEnd > 0 ? viewEnd : duration || 1;

  const viewDuration = Math.max(effectiveViewEnd - viewStart, 1);
  const zoomLevel = duration > 0 ? duration / viewDuration : 1;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || peaks.length === 0 || duration <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Calcular quais peaks estão visíveis
    const startRatio = viewStart / duration;
    const endRatio = effectiveViewEnd / duration;
    const startPeak = Math.floor(startRatio * peaks.length);
    const endPeak = Math.ceil(endRatio * peaks.length);
    const visiblePeaks = peaks.slice(startPeak, endPeak);
    const barCount = visiblePeaks.length;
    if (barCount === 0) return;

    const barWidth = width / barCount;
    const playedRatio = (currentTime - viewStart) / viewDuration;
    const playedX = Math.max(0, Math.min(width, playedRatio * width));
    const centerY = height / 2;

    // Regiões (fundo colorido)
    for (const region of regions) {
      const x1 = Math.max(0, ((region.start - viewStart) / viewDuration) * width);
      const x2 = Math.min(width, ((region.end - viewStart) / viewDuration) * width);
      if (x2 > 0 && x1 < width) {
        ctx.fillStyle = region.color;
        ctx.fillRect(x1, 0, x2 - x1, height);
      }
    }

    // Barras da waveform
    const gap = barWidth > 3 ? Math.max(0.5, barWidth * 0.15) : 0;
    const barDrawWidth = Math.max(0.5, barWidth - gap);

    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth + gap / 2;
      const peakHeight = visiblePeaks[i] * (height * 0.88);
      const halfHeight = peakHeight / 2;

      ctx.fillStyle = x + barDrawWidth <= playedX ? PLAYED_COLOR : UNPLAYED_COLOR;
      ctx.fillRect(x, centerY - halfHeight, barDrawWidth, peakHeight || 0.5);
    }

    // Playhead
    if (currentTime >= viewStart && currentTime <= effectiveViewEnd) {
      ctx.fillStyle = PLAYHEAD_COLOR;
      ctx.fillRect(playedX - 1, 0, 2, height);
    }

    // Timestamps nas bordas da view (zoom)
    if (zoomLevel > 1.5) {
      ctx.fillStyle = "hsl(215, 15%, 45%)";
      ctx.font = "10px monospace";
      ctx.textBaseline = "bottom";
      ctx.fillText(formatSec(viewStart), 4, height - 2);
      ctx.textAlign = "end";
      ctx.fillText(formatSec(effectiveViewEnd), width - 4, height - 2);
      ctx.textAlign = "start";
    }
  }, [peaks, duration, currentTime, regions, viewStart, effectiveViewEnd, viewDuration, zoomLevel]);

  // Animar playhead
  useEffect(() => {
    let lastTime = 0;
    const animate = () => {
      if (Math.abs(currentTime - lastTime) > 0.03) {
        draw();
        lastTime = currentTime;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentTime, draw]);

  // Resize
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
      const time = viewStart + ratio * viewDuration;
      onSeek(Math.max(0, Math.min(duration, time)));
    },
    [duration, onSeek, viewStart, viewDuration]
  );

  // Zoom centrado no playhead ou no centro da view
  const zoomIn = useCallback(() => {
    const center = currentTime >= viewStart && currentTime <= effectiveViewEnd
      ? currentTime
      : (viewStart + effectiveViewEnd) / 2;
    const newDuration = viewDuration / 2;
    const minDuration = 10; // Mínimo 10 segundos de view
    if (newDuration < minDuration) return;
    setViewStart(Math.max(0, center - newDuration / 2));
    setViewEnd(Math.min(duration, center + newDuration / 2));
  }, [currentTime, viewStart, effectiveViewEnd, viewDuration, duration]);

  const zoomOut = useCallback(() => {
    const center = (viewStart + effectiveViewEnd) / 2;
    const newDuration = Math.min(duration, viewDuration * 2);
    setViewStart(Math.max(0, center - newDuration / 2));
    setViewEnd(Math.min(duration, center + newDuration / 2));
  }, [viewStart, effectiveViewEnd, viewDuration, duration]);

  const resetZoom = useCallback(() => {
    setViewStart(0);
    setViewEnd(duration);
  }, [duration]);

  // Scroll horizontal com wheel quando em zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (zoomLevel <= 1.05) return;
      e.preventDefault();
      const shift = (e.deltaY / 500) * viewDuration;
      const newStart = Math.max(0, Math.min(duration - viewDuration, viewStart + shift));
      setViewStart(newStart);
      setViewEnd(newStart + viewDuration);
    },
    [zoomLevel, viewDuration, viewStart, duration]
  );

  return (
    <div className="space-y-1">
      <div ref={containerRef} className={className} style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onWheel={handleWheel}
          className="cursor-crosshair w-full h-full"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={zoomIn}
          disabled={viewDuration <= 10}
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={zoomOut}
          disabled={zoomLevel <= 1.05}
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={resetZoom}
          disabled={zoomLevel <= 1.05}
          title="Ver tudo"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        {zoomLevel > 1.05 && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {zoomLevel.toFixed(1)}x zoom — scroll para navegar
          </span>
        )}
      </div>
    </div>
  );
}

function formatSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
