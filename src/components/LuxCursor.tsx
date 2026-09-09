"use client";
import { useEffect } from "react";

/**
 * Feeds the pointer position to premium cards as --mx / --my so their spotlight follows the cursor.
 * One document listener for every card on the page, skipped when the visitor asked for less motion.
 */
export function LuxCursor() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let queued = false;
    let last: PointerEvent | null = null;
    const apply = () => {
      queued = false;
      const e = last;
      if (!e) return;
      const card = (e.target as HTMLElement | null)?.closest?.(".lux") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    const onMove = (e: PointerEvent) => { last = e; if (!queued) { queued = true; requestAnimationFrame(apply); } };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
