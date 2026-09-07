import { desc, eq, inArray, isNotNull, and } from "drizzle-orm";
import { db } from "@/db";
import { signals } from "@/db/schema";

export type ClosedSignal = { id: string; instrument: string; side: string; resultR: number; resultPips: number; closedAt: Date; status: string };

export async function closedSignals(instrument?: string): Promise<ClosedSignal[]> {
  const rows = await db.select().from(signals)
    .where(and(isNotNull(signals.closedAt), isNotNull(signals.resultR), instrument ? eq(signals.instrument, instrument) : undefined))
    .orderBy(signals.closedAt);
  return rows.map((r) => ({
    id: r.id, instrument: r.instrument, side: r.side, status: r.status,
    resultR: Number(r.resultR), resultPips: Number(r.resultPips ?? 0), closedAt: r.closedAt as Date,
  }));
}

export function computeStats(rows: ClosedSignal[]) {
  const n = rows.length;
  if (!n) return { n: 0, winRate: 0, avgR: 0, expectancy: 0, maxDdR: 0, totalR: 0, totalPips: 0, equity: [] as { t: number; v: number }[] };
  const wins = rows.filter((r) => r.resultR > 0);
  const losses = rows.filter((r) => r.resultR <= 0);
  const winRate = wins.length / n;
  const avgWin = wins.length ? wins.reduce((s, r) => s + r.resultR, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, r) => s + r.resultR, 0) / losses.length : 0;
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
  let cum = 0, peak = 0, maxDd = 0;
  const equity = rows.map((r) => {
    cum += r.resultR; peak = Math.max(peak, cum); maxDd = Math.max(maxDd, peak - cum);
    return { t: Math.floor(r.closedAt.getTime() / 1000), v: Number(cum.toFixed(2)) };
  });
  return {
    n, winRate, avgR: rows.reduce((s, r) => s + r.resultR, 0) / n, expectancy, maxDdR: maxDd,
    totalR: cum, totalPips: rows.reduce((s, r) => s + r.resultPips, 0), equity,
  };
}

export function monthlyBreakdown(rows: ClosedSignal[]) {
  const m = new Map<string, { trades: number; pips: number; r: number; wins: number }>();
  for (const r of rows) {
    const k = r.closedAt.toISOString().slice(0, 7);
    const cur = m.get(k) ?? { trades: 0, pips: 0, r: 0, wins: 0 };
    cur.trades++; cur.pips += r.resultPips; cur.r += r.resultR; if (r.resultR > 0) cur.wins++;
    m.set(k, cur);
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, v]) => ({ month, ...v }));
}

export async function latestSignals(visibility: string[] = ["public"], limit = 10) {
  return db.select().from(signals).where(inArray(signals.visibility, visibility)).orderBy(desc(signals.publishedAt)).limit(limit);
}

export function recent(rows: ClosedSignal[], days: number) {
  const cutoff = Date.now() - days * 864e5;
  return rows.filter((r) => r.closedAt.getTime() > cutoff);
}
