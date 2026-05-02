import { useEffect, useRef, useState } from "react";

const DURATION_MS = 500;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Smoothly counts from the previous numeric value to the next over ~500ms
 * using requestAnimationFrame and an easeOutCubic curve. The format function
 * controls how the interpolated number is rendered (e.g. fmtMoney).
 *
 * On the very first render (no previous value), it shows the target instantly
 * so the initial mount doesn't animate from 0.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevValueRef = useRef(value);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const fromRef = useRef(value);
  const toRef = useRef(value);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevValueRef.current = value;
      setDisplay(value);
      return;
    }
    if (value === prevValueRef.current) return;

    fromRef.current = prevValueRef.current;
    toRef.current = value;
    startedAtRef.current = performance.now();
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const tick = (now: number) => {
      const elapsed = now - startedAtRef.current;
      const t = Math.min(1, elapsed / DURATION_MS);
      const eased = easeOutCubic(t);
      setDisplay(fromRef.current + (toRef.current - fromRef.current) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    prevValueRef.current = value;

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}
