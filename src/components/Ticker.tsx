"use client";
import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/quotes";
import { cn } from "@/lib/utils";

/** Live indicative prices (Yahoo, ~60s delay). Renders nothing until real data arrives. */
export function Ticker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const prev = useRef<Map<string, number>>(new Map());
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/quotes", { cache: "no-store" });
        const j = (await r.json()) as { configured: boolean; asOf: string; quotes: Quote[] };
        if (!alive || !j.configured) return;
        const next: Record<string, "up" | "down"> = {};
        for (const q of j.quotes) {
          const was = prev.current.get(q.symbol);
          if (was !== undefined && was !== q.price) next[q.symbol] = q.price > was ? "up" : "down";
          prev.current.set(q.symbol, q.price);
        }
        setQuotes(j.quotes); setAsOf(j.asOf);
        if (Object.keys(next).length) { setFlash(next); setTimeout(() => setFlash({}), 900); }
      } catch { /* keep last */ }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!quotes.length) return null;
  const stamp = asOf ? new Date(asOf).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "";
  const item = (q: Quote, k: string) => (
    <span key={k} className="whitespace-nowrap font-mono tabular-nums">
      <span className="text-muted">{q.symbol}</span>{" "}
      <span className={cn("rounded px-0.5", flash[q.symbol] === "up" && "flash-up", flash[q.symbol] === "down" && "flash-down")}>{q.price.toLocaleString("en-US", { minimumFractionDigits: q.decimals, maximumFractionDigits: q.decimals })}</span>{" "}
      <span className={q.changePct > 0 ? "text-win" : q.changePct < 0 ? "text-loss" : "text-muted"}>{q.changePct > 0 ? "▲" : q.changePct < 0 ? "▼" : ""}{Math.abs(q.changePct).toFixed(2)}%</span>
    </span>
  );
  const row = (p: string) => [...quotes.map((q) => item(q, `${p}${q.symbol}`)), <span key={`${p}s`} className="whitespace-nowrap text-[11px] text-muted/70">indicative · {stamp} MYT</span>];
  return (
    <div className="ticker-wrap bg-black/60 border-b border-border text-xs">
      <div className="ticker-track px-4 py-1">{row("a")}{row("b")}</div>
    </div>
  );
}
