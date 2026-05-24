import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  duration?: number;
  decimals?: number;
}

/**
 * Anime un compteur numérique de 0 (ou la valeur précédente) jusqu'à `target`.
 * Easing : ease-out (cubic) pour un atterrissage en douceur.
 */
export function useCountUp(target: number, { duration = 700, decimals = 0 }: UseCountUpOptions = {}): number {
  const [value, setValue] = useState(0);
  const startValueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion : pas d'anim si l'utilisateur a demandé moins de mouvement
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const from = startValueRef.current;
    const to = target;
    if (from === to) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const factor = Math.pow(10, decimals);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setValue(Math.round(current * factor) / factor);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startValueRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, decimals]);

  return value;
}
