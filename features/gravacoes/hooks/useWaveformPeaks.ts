"use client";

import { useState, useEffect, useRef } from "react";

interface WaveformPeaksResult {
  peaks: number[] | null;
  loading: boolean;
  error: string | null;
  duration: number;
}

const SAMPLE_RATE = 8000; // Baixo para reduzir memória (~28MB/hora)
const DEFAULT_SAMPLES = 800;

function calculatePeaks(channelData: Float32Array, samplesCount: number): number[] {
  const bucketSize = Math.floor(channelData.length / samplesCount);
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
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const cachedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioUrl || cachedUrlRef.current === audioUrl) return;

    let cancelled = false;
    cachedUrlRef.current = audioUrl;
    setLoading(true);
    setError(null);

    async function decode() {
      try {
        const response = await fetch(audioUrl!);
        if (!response.ok) throw new Error(`Fetch falhou: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        if (cancelled) return;

        // Usar OfflineAudioContext para não conflitar com player
        // Primeiro, decodificar com AudioContext temporário para saber a duração
        const tempCtx = new AudioContext();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
        const audioDuration = audioBuffer.duration;

        if (cancelled) { await tempCtx.close(); return; }

        // Re-decodificar com sample rate baixo para reduzir memória
        const offlineCtx = new OfflineAudioContext(
          1,
          Math.ceil(audioDuration * SAMPLE_RATE),
          SAMPLE_RATE
        );
        const offlineBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
        const channelData = offlineBuffer.getChannelData(0);

        if (cancelled) { await tempCtx.close(); return; }

        const computedPeaks = calculatePeaks(channelData, samplesCount);
        setPeaks(computedPeaks);
        setDuration(audioDuration);
        await tempCtx.close();
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

  return { peaks, loading, error, duration };
}
