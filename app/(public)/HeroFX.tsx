"use client";

import { useEffect, useRef } from "react";

type Ember = {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  phase: number;
  flicker: number;
  alpha: number;
  color: string;
};

const CORES = ["#F0732B", "#F49B5C", "#FBD9BF", "#DE5F18"];

// Brasas flutuantes + parallax do fundo do hero.
// Canvas com rAF; pausa quando o hero sai da viewport ou a aba fica oculta;
// desativado por completo sob prefers-reduced-motion.
export function HeroFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = canvas.closest<HTMLElement>(".hero");
    const bg = hero?.querySelector<HTMLElement>(".hero-bg") ?? null;

    // ---------- Parallax do fundo ----------
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf || !bg) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const y = Math.min(window.scrollY, window.innerHeight * 1.2);
        bg.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
      });
    };
    if (!reduced && bg) {
      bg.style.willChange = "transform";
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    if (reduced) {
      canvas.style.display = "none";
      return () => window.removeEventListener("scroll", onScroll);
    }

    // ---------- Brasas ----------
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => window.removeEventListener("scroll", onScroll);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let embers: Ember[] = [];

    function spawn(inicial: boolean): Ember {
      return {
        x: Math.random() * w,
        // No primeiro frame espalha pela tela toda; depois nasce embaixo
        y: inicial ? Math.random() * h : h * (0.75 + Math.random() * 0.35),
        r: 0.8 + Math.random() * 2.2,
        vy: 0.12 + Math.random() * 0.35,
        drift: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        flicker: 0.4 + Math.random() * 1.2,
        alpha: 0.35 + Math.random() * 0.55,
        color: CORES[Math.floor(Math.random() * CORES.length)],
      };
    }

    function resize() {
      if (!hero || !canvas) return;
      const rect = hero.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const alvo = Math.max(20, Math.min(60, Math.round((w * h) / 22000)));
      embers = Array.from({ length: alvo }, () => spawn(true));
    }

    let running = true;
    let raf = 0;
    let t = 0;

    function frame() {
      if (!running) return;
      t += 0.016;
      ctx!.clearRect(0, 0, w, h);
      for (const e of embers) {
        e.y -= e.vy;
        e.x += Math.sin(t * e.drift + e.phase) * 0.25;
        if (e.y < -8) Object.assign(e, spawn(false));
        const tremor = 0.55 + 0.45 * Math.sin(t * e.flicker * 2 + e.phase);
        const a = e.alpha * tremor;
        const glow = e.r * 3.8;
        const grad = ctx!.createRadialGradient(e.x, e.y, 0, e.x, e.y, glow);
        grad.addColorStop(0, e.color);
        grad.addColorStop(1, "transparent");
        ctx!.globalAlpha = a;
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, glow, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    if (hero) ro.observe(hero);

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? play() : pause()),
      { threshold: 0 },
    );
    if (hero) io.observe(hero);

    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      pause();
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-embers" aria-hidden="true" />;
}
