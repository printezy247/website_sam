import { getCandles, type Timeframe } from "@/lib/quotes";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const tf = (["1h", "4h", "1d"].includes(u.searchParams.get("tf") ?? "") ? u.searchParams.get("tf") : "1h") as Timeframe;
  const symbol = u.searchParams.get("symbol") ?? "XAUUSD";
  const candles = await getCandles(symbol, tf);
  return Response.json({ symbol, tf, candles, asOf: new Date().toISOString() }, { headers: { "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60" } });
}
