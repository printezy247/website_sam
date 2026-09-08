// Marks running signals as TP1/TP2/TP3/SL from live candles, records R, and notifies Telegram.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { signalEvents, signals } from "@/db/schema";
import { getCandlesSince, type Candle } from "@/lib/quotes";
import { fanoutUpdate } from "@/lib/signals-fanout";

export type Outcome = { status: "running" | "tp1" | "tp2" | "tp3" | "sl"; resultR: number | null; hitAt: number | null; bestTp: 0 | 1 | 2 | 3 };

/**
 * Walk candles in order. SL before any TP → -1R. TP hits upgrade bestTp; an SL after a TP
 * closes the trade at the best TP reached (partial-profit assumption). Pure, exported for tests.
 */
export function evaluate(side: "buy" | "sell", entry: number, sl: number, tps: (number | null)[], candles: Candle[]): Outcome {
  const risk = Math.abs(entry - sl);
  if (!risk) return { status: "running", resultR: null, hitAt: null, bestTp: 0 };
  const rOf = (p: number) => Number((Math.abs(p - entry) / risk).toFixed(2));
  let best: 0 | 1 | 2 | 3 = 0; let hitAt: number | null = null;
  const tp = tps.map((v) => (v == null ? null : Number(v)));
  for (const k of candles) {
    const slHit = side === "buy" ? k.l <= sl : k.h >= sl;
    const reached = (n: number) => side === "buy" ? k.h >= n : k.l <= n;
    // Same-candle ambiguity: assume stop first when no TP reached yet (conservative).
    if (slHit && best === 0) return { status: "sl", resultR: -1, hitAt: k.t, bestTp: 0 };
    for (const i of [3, 2, 1] as const) { const v = tp[i - 1]; if (v != null && reached(v) && i > best) { best = i; hitAt = k.t; break; } }
    if (best === 3) return { status: "tp3", resultR: rOf(tp[2]!), hitAt, bestTp: 3 };
    if (slHit && best > 0) return { status: best === 2 ? "tp2" : "tp1", resultR: rOf(tp[best - 1]!), hitAt: k.t, bestTp: best };
  }
  return { status: "running", resultR: null, hitAt, bestTp: best };
}

let lastRun = 0;
/** Evaluate all running signals against live data. Throttled to once per `minGapMs` unless forced. */
export async function evaluateRunningSignals(opts: { force?: boolean; minGapMs?: number } = {}) {
  const gap = opts.minGapMs ?? 5 * 60_000;
  if (!opts.force && Date.now() - lastRun < gap) return { checked: 0, updated: 0, skipped: true };
  lastRun = Date.now();
  const rows = await db.select().from(signals).where(eq(signals.status, "running"));
  let updated = 0;
  for (const s of rows) {
    const candles = await getCandlesSince(s.instrument, s.publishedAt.getTime());
    if (!candles.length) continue;
    const out = evaluate(s.side as "buy" | "sell", Number(s.entry), Number(s.sl), [s.tp1, s.tp2, s.tp3].map((v) => (v == null ? null : Number(v))), candles);
    if (out.status === "running") continue;
    const risk = Math.abs(Number(s.entry) - Number(s.sl));
    const pips = out.resultR == null ? null : (out.resultR * risk * (s.instrument === "XAUUSD" ? 10 : 10000)).toFixed(1);
    await db.update(signals).set({ status: out.status, resultR: String(out.resultR), resultPips: pips, closedAt: new Date((out.hitAt ?? Date.now() / 1000) * 1000) }).where(eq(signals.id, s.id));
    const text = out.status === "sl" ? `🛑 <b>SL hit</b> · -1.0R` : `✅ <b>${out.status.toUpperCase()} hit</b> · +${out.resultR}R`;
    await db.insert(signalEvents).values({ signalId: s.id, type: out.status, text });
    await fanoutUpdate(s.id, text).catch((e) => console.error("[evaluate] fanout", e));
    updated++;
  }
  return { checked: rows.length, updated, skipped: false };
}
