"use client";

import { useEffect } from "react";

// Revela os blocos [data-rise] conforme entram na viewport
// (a transicao em si vive no landing.css, respeitando reduced-motion).
export function RiseObserver() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-rise]");
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => obs.observe(el));

    // Rede de seguranca: revela o que ja esta visivel mas nao disparou
    const timer = setTimeout(() => {
      document.querySelectorAll("[data-rise]:not(.in)").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
      });
    }, 2000);

    return () => {
      obs.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
