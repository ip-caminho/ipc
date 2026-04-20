"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { haptic } from "@shared/lib/haptic";
import { getDailyVerse } from "@shared/lib/daily-verses";

interface Props {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: Props) {
  const [verse] = useState(() => getDailyVerse());
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 3400);
    const completeTimer = setTimeout(() => {
      haptic(20);
      onComplete();
    }, 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-8"
      style={{ backgroundColor: "#fafaf5" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isFading ? 0 : 1, y: 0 }}
        transition={{ duration: isFading ? 0.6 : 0.8, ease: "easeOut" }}
        className="text-center max-w-md"
      >
        <p className="text-lg italic leading-relaxed mb-6 text-foreground font-serif">
          &ldquo;{verse.text}&rdquo;
        </p>
        <p
          className="text-xs text-muted-foreground uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          {verse.reference}
        </p>
      </motion.div>
    </div>
  );
}
