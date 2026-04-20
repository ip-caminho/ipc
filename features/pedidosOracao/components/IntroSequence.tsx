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
  return (
    <div className="absolute inset-0 bg-black">
      <motion.div
        initial={{
          clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
        }}
        animate={{
          clipPath: `circle(150vmax at ${origin.x}px ${origin.y}px)`,
        }}
        transition={{ duration: 0.6, ease: IOS_EASE }}
        onAnimationComplete={onComplete}
        className="absolute inset-0"
        style={{ backgroundColor: "#fafaf5" }}
      />
    </div>
  );
}

function DailyVerseCard({ onComplete }: { onComplete: () => void }) {
  const verse = getDailyVerse();

  useEffect(() => {
    const timer = setTimeout(onComplete, 3800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-8"
      style={{ backgroundColor: "#fafaf5" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 0.8, ease: "easeOut" },
          y: { duration: 0.8, ease: "easeOut" },
        }}
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
