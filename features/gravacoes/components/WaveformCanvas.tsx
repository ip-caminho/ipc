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

interface DragState {
  startClientX: number;
  startClientY: number;
  startCanvasX: number;
  startViewStart: number;
  startViewDuration: number;
  moved: boolean;
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
  const dragRef = useRef<DragState | null>(null);

  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const effectiveViewEnd = viewEnd > 0 ? viewEnd : duration || 1;
  const viewDuration = Math.max(effectiveViewEnd - viewStart, 1);
  const zoomLevel = duration > 0 ? duration / viewDuration : 1;

  // Ref para evitar stale closures no listener nativo de wheel
  const stateRef = useRef({ viewStart, viewDuration, duration, zoomLevel });
  useEffect(() => {
    stateRef.current = { viewStart, viewDuration, duration, zoomLevel };
  });

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

    const startRatio = viewStart / duration;
    const endRatio = effectiveViewEnd / duration;
    const startPeak = Math.floor(startRatio * peaks.length);
    const endPeak = Math.ceil(endRatio * peaks.length);
    const visiblePeaks = peaks.slice(startPeak, endPeak);

    // Downsample para não exceder pixels disponíveis — evita barras sub-pixel ("gominhos")
    const maxBars = Math.floor(width);
    let sampledPeaks: number[];
    if (visiblePeaks.length > maxBars) {
      const step = visiblePeaks.length / maxBars;
      sampledPeaks = Array.from({ length: maxBars }, (_, i) => {
        const from = Math.floor(i * step);
        const to = Math.min(Math.ceil((i + 1) * step), visiblePeaks.length);
        let max = 0;
        for (let j = from; j < to; j++) {
          if (visiblePeaks[j] > max) max = visiblePeaks[j];
        }
        return max;
      });
    } else {
      sampledPeaks = visiblePeaks;
    }

    const barCount = sampledPeaks.length;
    if (barCount === 0) return;

    const barWidth = width / barCount;
    const playedRatio = (currentTime - viewStart) / viewDuration;
    const playedX = Math.max(0, Math.min(width, playedRatio * width));
    const centerY = height / 2;

    for (const region of regions) {
      const x1 = Math.max(0, ((region.start - viewStart) / viewDuration) * width);
      const x2 = Math.min(width, ((region.end - viewStart) / viewDuration) * width);
      if (x2 > 0 && x1 < width) {
        ctx.fillStyle = region.color;
        ctx.fillRect(x1, 0, x2 - x1, height);
      }
    }

    const gap = barWidth > 3 ? Math.max(0.5, barWidth * 0.15) : 0;
    const barDrawWidth = Math.max(0.5, barWidth - gap);

    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth + gap / 2;
      const peakHeight = sampledPeaks[i] * (height * 0.88);
      const halfHeight = peakHeight / 2;
      ctx.fillStyle = x + barDrawWidth <= playedX ? PLAYED_COLOR : UNPLAYED_COLOR;
      ctx.fillRect(x, centerY - halfHeight, barDrawWidth, peakHeight || 0.5);
    }

    if (currentTime >= viewStart && currentTime <= effectiveViewEnd) {
      ctx.fillStyle = PLAYHEAD_COLOR;
      ctx.fillRect(playedX - 1, 0, 2, height);
    }

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  // Listener nativo de wheel (passive: false para poder chamar preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { viewStart, viewDuration, duration, zoomLevel } = stateRef.current;

      if (e.ctrlKey) {
        // Ctrl+scroll = zoom centrado no cursor
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const centerRatio = mouseX / rect.width;
        const centerTime = viewStart + centerRatio * viewDuration;
        const factor = e.deltaY > 0 ? 1.3 : 1 / 1.3;
        const newDuration = Math.max(10, Math.min(duration, viewDuration * factor));
        const newStart = Math.max(0, Math.min(duration - newDuration, centerTime - centerRatio * newDuration));
        setViewStart(newStart);
        setViewEnd(newStart + newDuration);
      } else {
        // Scroll horizontal (só quando em zoom)
        if (zoomLevel <= 1.05) return;
        const shift = (e.deltaY / 500) * viewDuration;
        const newStart = Math.max(0, Math.min(duration - viewDuration, viewStart + shift));
        setViewStart(newStart);
        setViewEnd(newStart + viewDuration);
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // Libera drag se o mouse soltar fora do canvas
  useEffect(() => {
    const onMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
      }
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  // Drag Ableton-style: X = scroll, Y = zoom (cima = zoom in, baixo = zoom out)
  // Clique curto (<4px de movimento total) continua sendo seek
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { viewStart, viewDuration } = stateRef.current;
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCanvasX: e.clientX - rect.left,
      startViewStart: viewStart,
      startViewDuration: viewDuration,
      moved: false,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const totalDx = e.clientX - drag.startClientX;
    const totalDy = e.clientY - drag.startClientY;

    if (!drag.moved && Math.abs(totalDx) + Math.abs(totalDy) > 4) {
      drag.moved = true;
      setIsDragging(true);
    }
    if (!drag.moved) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { duration } = stateRef.current;

    // Zoom pelo eixo Y: 200px = 2× zoom. Centrado na posição X do clique inicial.
    const zoomFactor = Math.pow(2, totalDy / 200);
    const newDuration = Math.max(10, Math.min(duration, drag.startViewDuration * zoomFactor));
    const centerRatio = drag.startCanvasX / rect.width;
    const centerTime = drag.startViewStart + centerRatio * drag.startViewDuration;
    const zoomedStart = centerTime - centerRatio * newDuration;

    // Scroll pelo eixo X
    const timePerPixel = drag.startViewDuration / rect.width;
    const scrollShift = -totalDx * timePerPixel;

    const finalStart = Math.max(0, Math.min(duration - newDuration, zoomedStart + scrollShift));
    setViewStart(finalStart);
    setViewEnd(finalStart + newDuration);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);

    if (!drag || !drag.moved) {
      // Clique curto = seek
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { viewStart, viewDuration, duration } = stateRef.current;
      if (duration <= 0) return;
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const time = viewStart + ratio * viewDuration;
      onSeek(Math.max(0, Math.min(duration, time)));
    }
  }, [onSeek]);

  const zoomIn = useCallback(() => {
    const { viewStart, viewDuration, duration } = stateRef.current;
    const effectiveEnd = viewStart + viewDuration;
    const center = currentTime >= viewStart && currentTime <= effectiveEnd
      ? currentTime
      : (viewStart + effectiveEnd) / 2;
    const newDuration = viewDuration / 2;
    if (newDuration < 10) return;
    setViewStart(Math.max(0, center - newDuration / 2));
    setViewEnd(Math.min(duration, center + newDuration / 2));
  }, [currentTime]);

  const zoomOut = useCallback(() => {
    const { viewStart, viewDuration, duration } = stateRef.current;
    const effectiveEnd = viewStart + viewDuration;
    const center = (viewStart + effectiveEnd) / 2;
    const newDuration = Math.min(duration, viewDuration * 2);
    setViewStart(Math.max(0, center - newDuration / 2));
    setViewEnd(Math.min(duration, center + newDuration / 2));
  }, []);

  const resetZoom = useCallback(() => {
    const { duration } = stateRef.current;
    setViewStart(0);
    setViewEnd(duration);
  }, []);

  return (
    <div className="space-y-1">
      <div ref={containerRef} className={className} style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`w-full h-full select-none ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
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
        <span className="text-[10px] text-muted-foreground ml-1">
          {zoomLevel > 1.05
            ? `${zoomLevel.toFixed(1)}x zoom`
            : "arrastar ↕ zoom · ↔ scrolla · ctrl+scroll zoom"}
        </span>
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
