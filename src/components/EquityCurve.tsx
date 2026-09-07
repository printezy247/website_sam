"use client";
import { useEffect, useRef } from "react";
import { createChart, LineSeries, ColorType, type UTCTimestamp } from "lightweight-charts";

export function EquityCurve({ data }: { data: { t: number; v: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !data.length) return;
    const chart = createChart(ref.current, {
      height: 280, autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9aa3b2", fontFamily: "ui-monospace, monospace" },
      grid: { vertLines: { color: "#1e2330" }, horzLines: { color: "#1e2330" } },
      rightPriceScale: { borderColor: "#1e2330" }, timeScale: { borderColor: "#1e2330" },
    });
    const series = chart.addSeries(LineSeries, { color: "#d4af37", lineWidth: 2 });
    // lightweight-charts requires strictly increasing time; collapse same-second points.
    const seen = new Set<number>();
    series.setData(data.filter((p) => { if (seen.has(p.t)) return false; seen.add(p.t); return true; }).map((p) => ({ time: p.t as UTCTimestamp, value: p.v })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [data]);
  return <div ref={ref} className="w-full" />;
}
