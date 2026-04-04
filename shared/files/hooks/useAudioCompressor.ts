"use client";

import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const CORE_VERSION = "0.12.10";
const BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => {
      resolve(0); // fallback: assume curto
      URL.revokeObjectURL(audio.src);
    };
    audio.src = URL.createObjectURL(file);
  });
}

export function useAudioCompressor() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  const ensureLoaded = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  const compress = useCallback(
    async (file: File): Promise<File> => {
      // Skip if already a small MP3 (< 5MB)
      if (file.type === "audio/mpeg" && file.size < 5 * 1024 * 1024) {
        return file;
      }

      setIsCompressing(true);
      setProgress(0);

      try {
        // Detectar duração para escolher bitrate
        const durationSec = await getAudioDuration(file);
        // >1h = 32kbps, senão 64kbps
        const bitrate = durationSec > 3600 ? "32k" : "64k";

        const ffmpeg = await ensureLoaded();

        const inputName = `input.${file.name.split(".").pop() || "mp3"}`;
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        await ffmpeg.exec([
          "-i", inputName,
          "-vn",               // strip album art
          "-ac", "1",          // mono
          "-af", "dynaudnorm=f=150:g=15", // normalizar volume dinâmico
          "-ab", bitrate,
          "-acodec", "libmp3lame",
          "output.mp3",
        ]);

        const data = await ffmpeg.readFile("output.mp3");
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile("output.mp3");

        const blob = new Blob([data], { type: "audio/mpeg" });
        return new File([blob], file.name.replace(/\.[^.]+$/, ".mp3"), {
          type: "audio/mpeg",
        });
      } finally {
        setIsCompressing(false);
        setProgress(0);
      }
    },
    [ensureLoaded]
  );

  return { compress, isCompressing, progress };
}
