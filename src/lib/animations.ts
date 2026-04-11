import type { Variants, Transition } from "framer-motion";

/* ══════════════════════════════════════════════════════════
   Biblioteca de animações compartilhada — Framer Motion
   ══════════════════════════════════════════════════════════ */

// ── Durations ────────────────────────────────────────────
export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

// ── Easings ──────────────────────────────────────────────
export const easings = {
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  spring: { type: "spring", stiffness: 400, damping: 30 } as const,
} as const;

// ── Prefers Reduced Motion ───────────────────────────────
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Retorna variants vazias quando o usuário pede pouca animação */
export function safeVariants(variants: Variants): Variants {
  if (prefersReducedMotion()) {
    return {
      initial: {},
      animate: {},
      exit: {},
    };
  }
  return variants;
}

// ── Fade ─────────────────────────────────────────────────
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

// ── Scale ────────────────────────────────────────────────
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ── Slide ────────────────────────────────────────────────
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

// ── Stagger ──────────────────────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// ── Transition presets ───────────────────────────────────
export const transitionFast: Transition = {
  duration: durations.fast,
  ease: easings.smooth,
};

export const transitionNormal: Transition = {
  duration: durations.normal,
  ease: easings.smooth,
};

export const transitionSlow: Transition = {
  duration: durations.slow,
  ease: easings.smooth,
};

export const transitionSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};
