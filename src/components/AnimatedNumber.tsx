"use client";
import { useEffect, useRef } from "react";

/** Counts the numeric part of a display string up from 0 on mount. Keeps prefix/suffix (e.g. "+2.30R", "68%"). */
export function AnimatedNumber({ value, duration = 900 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = value.match(/^([^\d-]*)(-?\d[\d,]*\.?\d*)(.*)$/);
    const target = m ? Number(m[2].replace(/,/g, "")) : NaN;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!m || reduce || !Number.isFinite(target)) { el.textContent = value; return; }
    const decimals = (m[2].split(".")[1] ?? "").length;
    const useGroup = m[2].includes(",");
    const t0 = performance.now(); let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration); const e = 1 - Math.pow(1 - p, 3);
      const v = target * e;
      el.textContent = p < 1 ? `${m[1]}${useGroup ? Math.round(v).toLocaleString("en-US") : v.toFixed(decimals)}${m[3]}` : value;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span ref={ref}>{value}</span>;
}
