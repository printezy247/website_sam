// Rule-based live XAUUSD setups from market data. One running auto setup at a time; the evaluator
// closes it on TP/SL so the public history fills with real outcomes over time.
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { getCandlesSince, getQuote } from "@/lib/quotes";
import { fanoutSignal } from "@/lib/signals-fanout";

export const AUTO_NOTE = "Auto setup from live market data. Education only.";
export type SignalType = "scalping" | "intraday" | "swing";
/** Stop distance as a fraction of price, per type. TPs at 1R/2R/3R. */
const STOP_PCT: Record<SignalType, number> = { scalping: 0.0018, intraday: 0.0035, swing: 0.008 };
const MIN_GAP_MS = 4 * 36e5; // at most one new auto setup every 4h

let lastCheck = 0;
export async function ensureAutoSignal(force = false) {
  if (!force && Date.now() - lastCheck < 5 * 60_000) return null;
  lastCheck = Date.now();
  const [running] = await db.select().from(signals).where(and(eq(signals.status, "running"), eq(signals.note, AUTO_NOTE))).limit(1);
  if (running) return running;
  const [last] = await db.select().from(signals).where(eq(signals.note, AUTO_NOTE)).orderBy(desc(signals.publishedAt)).limit(1);
  if (last && Date.now() - last.publishedAt.getTime() < MIN_GAP_MS) return null;

  const q = await getQuote("XAUUSD");
  if (!q || Date.now() - new Date(q.ts).getTime() > 30 * 60_000) return null; // market closed / stale
  const candles = await getCandlesSince("XAUUSD", Date.now() - 6 * 36e5);
  const recent = candles.slice(-6);
  const momentum = recent.length >= 2 ? recent[recent.length - 1].c - recent[0].o : q.changePct;
  const side: "buy" | "sell" = momentum >= 0 ? "buy" : "sell";
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(signals).where(eq(signals.note, AUTO_NOTE));
  const type: SignalType = (["scalping", "intraday", "swing"] as const)[Number(n) % 3];
  const entry = q.price; const risk = entry * STOP_PCT[type]; const dir = side === "buy" ? 1 : -1;
  const f = (v: number) => v.toFixed(2);
  const [row] = await db.insert(signals).values({
    instrument: "XAUUSD", type, side, entry: f(entry), sl: f(entry - dir * risk),
    tp1: f(entry + dir * risk), tp2: f(entry + dir * 2 * risk), tp3: f(entry + dir * 3 * risk),
    note: AUTO_NOTE, visibility: "public",
  }).returning();
  await fanoutSignal(row.id).catch((e) => console.error("[auto-signal] fanout", e));
  return row;
}

/** One-time: shift seed sample signals so their prices sit near the live price (keeps R/pips). */
export async function rebaseSeedSignals() {
  const seeds = await db.select().from(signals).where(like(signals.note, "Seed sample%"));
  if (!seeds.length) return 0;
  const q = await getQuote("XAUUSD");
  if (!q) return 0;
  const avg = seeds.reduce((s, r) => s + Number(r.entry), 0) / seeds.length;
  if (Math.abs(q.price - avg) / q.price < 0.03) return 0; // already near
  const delta = q.price - avg;
  const types: SignalType[] = ["scalping", "intraday", "swing"];
  let i = 0;
  for (const s of seeds) {
    const sh = (v: string | null) => (v == null ? null : (Number(v) + delta + (Math.random() - 0.5) * 6).toFixed(2));
    await db.update(signals).set({ entry: sh(s.entry)!, sl: sh(s.sl)!, tp1: sh(s.tp1), tp2: sh(s.tp2), tp3: sh(s.tp3), type: types[i++ % 3], note: "Seed sample (rebased). Replace with real signals." }).where(eq(signals.id, s.id));
  }
  return seeds.length;
}
