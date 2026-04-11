import { useEffect, useRef, useState } from "react";
import { useMotionValue, animate } from "framer-motion";
import { prefersReducedMotion } from "@/lib/animations";

interface AnimatedCounterProps {
  /** Valor final a ser alcançado */
  value: number;
  /** Duração da animação em ms (padrão 800) */
  duration?: number;
  /** Casas decimais (padrão 0) */
  decimals?: number;
  /** Prefixo (ex: "R$ ") */
  prefix?: string;
  /** Sufixo (ex: "%") */
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 800,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(formatNumber(0, decimals));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(formatNumber(value, decimals));
      return;
    }

    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(formatNumber(latest, decimals));
      },
    });

    return () => controls.stop();
  }, [value, duration, decimals, motionValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}

function formatNumber(n: number, decimals: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
