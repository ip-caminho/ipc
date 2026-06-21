"use client";

import { useState, useEffect, useRef } from "react";

interface WaveformPeaksResult {
  peaks: number[] | null;
  loading: boolean;
  progress: number; // 0-100
  error: string | null;
  duration: number;
}

const DEFAULT_SAMPLES = 2000; // Mais samples para suportar zoom

// decodeAudioData aloca >600MB de RAM para sermões de 1h — mata a tab em mobile.
// maxTouchPoints > 1 detecta iOS/Android/tablets de forma confiável.
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.maxTouchPoints > 1;
}

function calculatePeaks(channelData: Float32Array, samplesCount: number): number[] {
  const bucketSize = Math.max(1, Math.floor(channelData.length / samplesCount));
  const peaks: number[] = [];

  for (let i = 0; i < samplesCount; i++) {
    let max = 0;
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, channelData.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  // Normalizar para [0, 1]
  const globalMax = Math.max(...peaks, 0.01);
  return peaks.map((p) => p / globalMax);
}

export function useWaveformPeaks(
  audioUrl: string | undefined,
  samplesCount = DEFAULT_SAMPLES
): WaveformPeaksResult {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const cachedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioUrl || cachedUrlRef.current === audioUrl) return;
    if (isTouchDevice()) return;

    let cancelled = false;
    cachedUrlRef.current = audioUrl;
    setLoading(true);
    setError(null);
    setProgress(0);

    async function decode() {
      try {
        // Fetch com progresso
        const response = await fetch(audioUrl!);
        if (!response.ok) throw new Error(`Fetch falhou: ${response.status}`);

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        let arrayBuffer: ArrayBuffer;

        if (total > 0 && response.body) {
          // Ler com progresso
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (cancelled) return;
            chunks.push(value);
            received += value.length;
            setProgress(Math.round((received / total) * 50)); // 0-50% = download
          }

          const combined = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          arrayBuffer = combined.buffer;
        } else {
          arrayBuffer = await response.arrayBuffer();
          setProgress(50);
        }

        if (cancelled) return;

        // Decodificar com AudioContext
        setProgress(60);
        const audioCtx = new AudioContext();

        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (cancelled) return;

          setProgress(80);

          // Pegar o primeiro canal e calcular peaks
          const channelData = audioBuffer.getChannelData(0);
          const computedPeaks = calculatePeaks(channelData, samplesCount);

          setPeaks(computedPeaks);
          setDuration(audioBuffer.duration);
          setProgress(100);
        } finally {
          await audioCtx.close();
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[Waveform] Erro ao processar áudio:", err);
        setError(err instanceof Error ? err.message : "Erro ao processar áudio");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    decode();
    return () => { cancelled = true; };
  }, [audioUrl, samplesCount]);

  return { peaks, loading, progress, error, duration };
}
