"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, ColorType, LineStyle, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/lib/quotes";

export type ChartLines = { entry: number; sl: number; tps: number[]; side: string } | null;
const TFS = ["1h", "4h", "1d"] as const;

/** Live XAUUSD candlesticks from Yahoo with timeframe tabs and optional signal price lines. Hidden when no data. */
export function GoldChart({ lines, labels, symbol = "XAUUSD" }: { lines?: ChartLines; labels: { title: string; entry: string; sl: string; tp: string; empty: string; asOf: string }; symbol?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tf, setTf] = useState<(typeof TFS)[number]>("1h");
  const [data, setData] = useState<Candle[] | null>(null);
  const [asOf, setAsOf] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/candles?tf=${tf}&symbol=${symbol}`, { cache: "no-store" }).then((r) => r.json()).then((j) => { if (alive) { setData(j.candles ?? []); setAsOf(j.asOf ?? ""); } }).catch(() => alive && setData([]));
    return () => { alive = false; };
  }, [tf, symbol]);

  useEffect(() => {
    if (!ref.current || !data?.length) return;
    const chart = createChart(ref.current, {
      height: 320, autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9aa3b2", fontFamily: "ui-monospace, monospace" },
      grid: { vertLines: { color: "#161a24" }, horzLines: { color: "#161a24" } },
      rightPriceScale: { borderColor: "#1e2330" }, timeScale: { borderColor: "#1e2330", timeVisible: tf !== "1d" },
      crosshair: { horzLine: { color: "#d4af37", labelBackgroundColor: "#d4af37" }, vertLine: { color: "#d4af37", labelBackgroundColor: "#d4af37" } },
    });
    chartRef.current = chart;
    const s = chart.addSeries(CandlestickSeries, { upColor: "#00c46a", downColor: "#ff4d4f", borderVisible: false, wickUpColor: "#00c46a", wickDownColor: "#ff4d4f" });
    const seen = new Set<number>();
    s.setData(data.filter((c) => { if (seen.has(c.t)) return false; seen.add(c.t); return true; }).map((c) => ({ time: c.t as UTCTimestamp, open: c.o, high: c.h, low: c.l, close: c.c })));
    if (lines) {
      s.createPriceLine({ price: lines.entry, color: "#d4af37", lineWidth: 1, lineStyle: LineStyle.Solid, title: labels.entry });
      s.createPriceLine({ price: lines.sl, color: "#ff4d4f", lineWidth: 1, lineStyle: LineStyle.Dashed, title: labels.sl });
      lines.tps.forEach((tp, i) => s.createPriceLine({ price: tp, color: "#00c46a", lineWidth: 1, lineStyle: LineStyle.Dotted, title: `${labels.tp}${i + 1}` }));
    }
    chart.timeScale().fitContent();
    return () => { chart.remove(); chartRef.current = null; };
  }, [data, lines, labels, tf]);

  if (data && !data.length) return null;
  return (
    <div className="glass rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold">{labels.title} <span className="text-muted font-mono text-xs">{symbol}</span></h2>
        <div className="flex gap-1 text-xs font-mono">
          {TFS.map((k) => <button key={k} onClick={() => setTf(k)} className={`px-2.5 py-1 rounded border ${tf === k ? "border-gold text-gold" : "border-border text-muted hover:text-fg"}`}>{k.toUpperCase()}</button>)}
        </div>
      </div>
      <div ref={ref} className="mt-3 w-full h-80">{data === null && <div className="h-full flex items-center justify-center text-xs text-muted animate-pulse">…</div>}</div>
      {asOf && <div className="mt-2 text-[11px] text-muted">{labels.asOf} {new Date(asOf).toLocaleTimeString("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit" })} MYT · Yahoo Finance</div>}
    </div>
  );
}
