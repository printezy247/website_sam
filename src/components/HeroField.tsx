"use client";
import { useEffect, useRef } from "react";

/** Decorative canvas behind the hero: candles, ticks and glyphs drift and lean away from the pointer. */
type Sprite = { kind: "candle" | "tick" | "line" | "glyph"; x: number; y: number; vx: number; vy: number; size: number; alpha: number; up: boolean; glyph: string; depth: number };
const GLYPHS = ["XAU", "$", "%", "R", "TP", "SL"];

export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    if (window.innerWidth < 640) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let w = 0, h = 0, raf = 0, visible = true; let sprites: Sprite[] = [];
    const pointer = { x: -1e4, y: -1e4, has: false }; const target = { x: 0, y: 0 }; const offset = { x: 0, y: 0 };
    const make = (i: number): Sprite => { const kinds = ["candle", "candle", "tick", "line", "glyph"] as const; const kind = kinds[i % kinds.length]; const depth = 0.4 + Math.random() * 0.6;
      return { kind, x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.12 * depth, vy: -(0.04 + Math.random() * 0.1) * depth, size: (kind === "glyph" ? 14 : 22) * depth + 8, alpha: 0.12 + depth * 0.25, up: Math.random() > 0.5, glyph: GLYPHS[i % GLYPHS.length], depth }; };
    const resize = () => { const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); w = r.width; h = r.height; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); sprites = Array.from({ length: Math.round(Math.min(56, (w * h) / 22000)) }, (_, i) => make(i)); };
    const draw = (s: Sprite) => { const x = s.x + offset.x * s.depth, y = s.y + offset.y * s.depth; const gold = `rgba(212,175,55,${s.alpha})`, slate = `rgba(154,163,178,${s.alpha})`; ctx.lineWidth = 1;
      if (s.kind === "candle") { ctx.strokeStyle = s.up ? gold : slate; ctx.beginPath(); ctx.moveTo(x, y - s.size / 2); ctx.lineTo(x, y + s.size / 2); ctx.stroke(); ctx.strokeRect(x - s.size * 0.18, y - s.size * 0.27, s.size * 0.36, s.size * 0.55); }
      else if (s.kind === "tick") { const d = s.size * 0.35; ctx.strokeStyle = s.up ? gold : slate; ctx.beginPath(); if (s.up) { ctx.moveTo(x - d, y + d * 0.6); ctx.lineTo(x, y - d * 0.6); ctx.lineTo(x + d, y + d * 0.6); } else { ctx.moveTo(x - d, y - d * 0.6); ctx.lineTo(x, y + d * 0.6); ctx.lineTo(x + d, y - d * 0.6); } ctx.stroke(); }
      else if (s.kind === "line") { const lw = s.size * 1.6; ctx.strokeStyle = slate; ctx.beginPath(); ctx.moveTo(x - lw / 2, y + s.size * 0.2); ctx.lineTo(x - lw / 6, y - s.size * 0.15); ctx.lineTo(x + lw / 6, y + s.size * 0.05); ctx.lineTo(x + lw / 2, y - s.size * 0.3); ctx.stroke(); }
      else { ctx.fillStyle = gold; ctx.font = `500 ${s.size}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.glyph, x, y); } };
    const frame = () => { raf = 0; ctx.clearRect(0, 0, w, h); offset.x += (target.x - offset.x) * 0.06; offset.y += (target.y - offset.y) * 0.06;
      for (const s of sprites) { if (!reduced) { s.x += s.vx; s.y += s.vy; if (pointer.has) { const dx = s.x + offset.x * s.depth - pointer.x, dy = s.y + offset.y * s.depth - pointer.y, d2 = dx * dx + dy * dy, r = 140; if (d2 < r * r && d2 > 1) { const d = Math.sqrt(d2), push = ((r - d) / r) * 0.9 * s.depth; s.x += (dx / d) * push; s.y += (dy / d) * push; } }
        if (s.y < -40) { s.y = h + 40; s.x = Math.random() * w; } if (s.x < -60) s.x = w + 60; if (s.x > w + 60) s.x = -60; } draw(s); }
      if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const host = canvas.parentElement ?? canvas;
    const onMove = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.has = true; target.x = (pointer.x / w - 0.5) * -24; target.y = (pointer.y / h - 0.5) * -16; };
    const onLeave = () => { pointer.has = false; target.x = 0; target.y = 0; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    resize(); start(); io.observe(canvas);
    window.addEventListener("resize", resize); host.addEventListener("pointermove", onMove); host.addEventListener("pointerleave", onLeave); document.addEventListener("visibilitychange", start);
    return () => { io.disconnect(); window.removeEventListener("resize", resize); host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerleave", onLeave); document.removeEventListener("visibilitychange", start); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
