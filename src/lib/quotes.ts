// Live indicative prices from Yahoo Finance's public chart endpoint. Never fabricated:
// when Yahoo is unreachable the functions return null/[] and the UI hides the widget.

export type Quote = { symbol: string; price: number; changePct: number; decimals: number; ts: string; source: string };
export type Candle = { t: number; o: number; h: number; l: number; c: number };

/** Display symbol → Yahoo tickers to try in order. */
export const SYMBOLS: { symbol: string; yahoo: string[]; decimals: number }[] = [
  { symbol: "XAUUSD", yahoo: ["XAUUSD=X", "GC=F"], decimals: 2 },
  { symbol: "XAGUSD", yahoo: ["XAGUSD=X", "SI=F"], decimals: 2 },
  { symbol: "DXY", yahoo: ["DX-Y.NYB"], decimals: 2 },
  { symbol: "US30", yahoo: ["^DJI"], decimals: 0 },
  { symbol: "NAS100", yahoo: ["^NDX"], decimals: 0 },
  { symbol: "BTCUSD", yahoo: ["BTC-USD"], decimals: 0 },
];

const TTL_MS = 60_000;
const memo = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fn();
  memo.set(key, { at: Date.now(), value });
  return value;
}

type YahooChart = { chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketTime?: number; symbol?: string };
  timestamp?: number[]; indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }[] } }[]; error?: unknown } };

export async function fetchYahooChart(ticker: string, interval: string, range: string): Promise<YahooChart | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "user-agent": "Mozilla/5.0 (compatible; SamTrading/1.0)", accept: "application/json" }, cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as YahooChart;
    return j.chart?.result?.[0] ? j : null;
  } catch { return null; }
}

/** Parse a Yahoo chart payload into a Quote (exported for tests). */
export function parseQuote(j: YahooChart, symbol: string, decimals: number, source: string): Quote | null {
  const r = j.chart?.result?.[0]; const m = r?.meta;
  if (!m?.regularMarketPrice) return null;
  const prev = m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice;
  const changePct = prev ? ((m.regularMarketPrice - prev) / prev) * 100 : 0;
  return { symbol, price: m.regularMarketPrice, changePct, decimals, ts: new Date((m.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(), source };
}

export function parseCandles(j: YahooChart): Candle[] {
  const r = j.chart?.result?.[0]; const q = r?.indicators?.quote?.[0]; const ts = r?.timestamp ?? [];
  if (!q) return [];
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    out.push({ t: ts[i], o, h, l, c });
  }
  return out;
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const spec = SYMBOLS.find((s) => s.symbol === symbol);
  if (!spec) return null;
  return cached(`q:${symbol}`, TTL_MS, async () => {
    for (const y of spec.yahoo) {
      const j = await fetchYahooChart(y, "5m", "1d");
      const q = j && parseQuote(j, symbol, spec.decimals, y);
      if (q) return q;
    }
    return null;
  });
}

export async function getQuotes(): Promise<Quote[]> {
  const all = await Promise.all(SYMBOLS.map((s) => getQuote(s.symbol)));
  return all.filter((q): q is Quote => Boolean(q));
}

/** Intraday candles since `since` (ms). 5m for ≤5 days, 1h up to a month. */
export async function getCandlesSince(symbol: string, since: number): Promise<Candle[]> {
  const spec = SYMBOLS.find((s) => s.symbol === symbol);
  if (!spec) return [];
  const age = Date.now() - since;
  const [interval, range] = age < 5 * 864e5 ? ["5m", "5d"] : age < 30 * 864e5 ? ["1h", "1mo"] : ["1d", "3mo"];
  return cached(`c:${symbol}:${interval}:${range}`, TTL_MS, async () => {
    for (const y of spec.yahoo) {
      const j = await fetchYahooChart(y, interval, range);
      const c = j ? parseCandles(j) : [];
      if (c.length) return c.filter((k) => k.t * 1000 >= since - 5 * 60_000);
    }
    return [];
  });
}

export type Timeframe = "1h" | "4h" | "1d";
const TF: Record<Timeframe, { interval: string; range: string; group: number }> = {
  "1h": { interval: "1h", range: "5d", group: 1 },
  "4h": { interval: "1h", range: "1mo", group: 4 },
  "1d": { interval: "1d", range: "6mo", group: 1 },
};
/** OHLC candles for a chart timeframe. 4h is aggregated from 1h bars (Yahoo has no 4h). */
export async function getCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  const spec = SYMBOLS.find((s) => s.symbol === symbol);
  const cfg = TF[tf];
  if (!spec || !cfg) return [];
  return cached(`tf:${symbol}:${tf}`, TTL_MS, async () => {
    for (const y of spec.yahoo) {
      const j = await fetchYahooChart(y, cfg.interval, cfg.range);
      const c = j ? parseCandles(j) : [];
      if (!c.length) continue;
      if (cfg.group === 1) return c;
      const out: Candle[] = [];
      for (const k of c) {
        const bucket = Math.floor(k.t / (cfg.group * 3600)) * cfg.group * 3600;
        const last = out[out.length - 1];
        if (last && last.t === bucket) { last.h = Math.max(last.h, k.h); last.l = Math.min(last.l, k.l); last.c = k.c; }
        else out.push({ t: bucket, o: k.o, h: k.h, l: k.l, c: k.c });
      }
      return out;
    }
    return [];
  });
}
