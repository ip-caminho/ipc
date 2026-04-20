"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { haptic } from "@shared/lib/haptic";
import { getDailyVerse } from "@shared/lib/daily-verses";

type Phase = "radial" | "verse";

interface Origin {
  x: number;
  y: number;
}

interface Props {
  origin: Origin;
  onComplete: () => void;
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const;

function RadialOpening({
  origin,
  onComplete,
}: {
  origin: Origin;
  onComplete: () => void;
}) {
  const SIZE = "300vmax";
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.8, ease: IOS_EASE }}
        onAnimationComplete={onComplete}
        style={{
          position: "absolute",
          left: origin.x,
          top: origin.y,
          width: SIZE,
          height: SIZE,
          marginLeft: `calc(${SIZE} / -2)`,
          marginTop: `calc(${SIZE} / -2)`,
          borderRadius: "50%",
          backgroundColor: "#fafaf5",
          transformOrigin: "center center",
          willChange: "transform",
        }}
      />
    </div>
  );
}

function DailyVerseCard({ onComplete }: { onComplete: () => void }) {
  const [verse] = useState(() => getDailyVerse());
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 3400);
    const completeTimer = setTimeout(onComplete, 4000);
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

export function IntroSequence({ origin, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("radial");

  return (
    <AnimatePresence mode="wait">
      {phase === "radial" && (
        <motion.div
          key="radial"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <RadialOpening origin={origin} onComplete={() => setPhase("verse")} />
        </motion.div>
      )}
      {phase === "verse" && (
        <motion.div
          key="verse"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <DailyVerseCard
            onComplete={() => {
              haptic(20);
              onComplete();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
