// High-impact economic events from Forex Factory's public weekly JSON. Cached 30 min; [] when unreachable.
export type NewsEvent = { title: string; country: string; date: Date; impact: "High" | "Medium" | "Low" | "Holiday"; forecast?: string; previous?: string; actual?: string };

const URL_ = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const TTL = 30 * 60_000;
let memo: { at: number; value: NewsEvent[] } | null = null;

type Raw = { title: string; country: string; date: string; impact: string; forecast?: string; previous?: string; actual?: string };

export async function getWeekEvents(): Promise<NewsEvent[]> {
  if (memo && Date.now() - memo.at < TTL) return memo.value;
  try {
    const r = await fetch(URL_, { signal: AbortSignal.timeout(6000), headers: { "user-agent": "Mozilla/5.0 (compatible; SamTrading/1.0)" }, cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const raw = (await r.json()) as Raw[];
    const value = raw.map((e) => ({ ...e, date: new Date(e.date), impact: e.impact as NewsEvent["impact"] })).filter((e) => !Number.isNaN(e.date.getTime())).sort((a, b) => a.date.getTime() - b.date.getTime());
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return memo?.value ?? [];
  }
}

/** Currencies that move gold: USD dominates; add EUR/GBP for risk sentiment. */
export const GOLD_CURRENCIES = ["USD"];

export async function getHighImpact(opts: { currencies?: string[]; from?: Date; hours?: number } = {}) {
  const from = opts.from ?? new Date();
  const to = new Date(from.getTime() + (opts.hours ?? 24 * 7) * 36e5);
  const cur = opts.currencies ?? GOLD_CURRENCIES;
  const all = await getWeekEvents();
  return all.filter((e) => e.impact === "High" && cur.includes(e.country) && e.date >= new Date(from.getTime() - 36e5) && e.date <= to);
}

/** Red USD event within ±`minutes` of now → don't open new setups. */
export async function inNewsWindow(minutes = 30, now = new Date()) {
  const ev = await getHighImpact({ from: new Date(now.getTime() - minutes * 60_000), hours: minutes / 60 + 1 });
  return ev.find((e) => Math.abs(e.date.getTime() - now.getTime()) <= minutes * 60_000) ?? null;
}

export async function nextRedEvent(now = new Date()) {
  const ev = await getHighImpact({ from: now });
  return ev.find((e) => e.date > now) ?? null;
}

/** Events with a `soon` flag (within ±2h) computed here, so server components stay pure. */
export async function upcomingWithFlags(limit = 6, now = new Date()) {
  const ev = await getHighImpact({ from: now }).catch(() => []);
  return ev.slice(0, limit).map((e) => ({ ...e, soon: Math.abs(e.date.getTime() - now.getTime()) < 2 * 36e5 }));
}

export function fmtMyt(d: Date) {
  return d.toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
